import { logger } from '@/lib/logger';
const DEFAULT_API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

/** Desktop mode: no fetch to localhost; all API goes via IPC to main, which proxies to backend. */
export function isElectron(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.protocol === 'file:' || !!(window as any).desktop;
}

/**
 * Resolve image URL for display. In Electron uses virela:// (main serves from userData); in web uses API base URL.
 * Sync so it can be used directly in img src.
 */
export function getImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath) return '';
  if (imagePath.startsWith('http') || imagePath.startsWith('virela:')) return imagePath;
  const normalized = imagePath.replace(/\\/g, '/').replace(/^\/+/, '').replace(/^uploads\//, '');
  if (isElectron()) {
    const relative = normalized.replace(/^uploads\//, '');
    try {
      console.debug('[getImageUrl] electron mode', { imagePath, normalized, relative });
    } catch (e) {
      // ignore logging failures
    }
    return relative ? `virela://images/${relative}` : '';
  }
  const webPath = imagePath.startsWith('/') ? imagePath : `/uploads/${normalized}`;
  try {
    console.debug('[getImageUrl] web mode', { imagePath, normalized, webPath, result: `${DEFAULT_API_URL}${webPath}` });
  } catch (e) { }
  return `${DEFAULT_API_URL}${webPath}`;
}

// In-memory token storage for Electron; persisted to localStorage for app restarts
let electronAccessToken: string | null = null;
let electronRefreshToken: string | null = null;
const ELECTRON_SESSION_KEY = "virela_desktop_session";

function persistElectronSession(access: string | null, refresh: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (!access && !refresh) {
      window.localStorage.removeItem(ELECTRON_SESSION_KEY);
      return;
    }
    const payload = { accessToken: access, refreshToken: refresh };
    window.localStorage.setItem(ELECTRON_SESSION_KEY, JSON.stringify(payload));
  } catch {
    // Swallow storage errors silently
  }
}

function loadElectronSessionFromStorage() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(ELECTRON_SESSION_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.accessToken === "string") {
      electronAccessToken = parsed.accessToken;
      electronRefreshToken = typeof parsed.refreshToken === "string" ? parsed.refreshToken : null;
    }
  } catch {
    // Corrupted or invalid; clear it
    try {
      window.localStorage.removeItem(ELECTRON_SESSION_KEY);
    } catch {
      // ignore
    }
  }
}

function setElectronTokens(access: string | null, refresh: string | null) {
  electronAccessToken = access;
  electronRefreshToken = refresh;
  if (isElectron()) {
    persistElectronSession(access, refresh);
  }
}

/** Redirect to auth page in a way that works with both HashRouter (Electron) and BrowserRouter (web). */
function redirectToAuth() {
  if (typeof window === 'undefined') return;
  if (window.location.protocol === 'file:' || (window as any).desktop) {
    window.location.hash = '#/auth';
  } else {
    window.location.href = '/auth';
  }
}

type RequestParams = Record<string, string | number | boolean | null | undefined>;

interface RequestOptions extends Omit<RequestInit, 'body'> {
  data?: any;
  params?: RequestParams;
}

class ApiClient {
  private readonly baseUrl: string;
  public auth: {
    signUp: (args: { email: string; password: string; options?: { data?: Record<string, any> } }) => Promise<any>;
    signInWithPassword: (args: { email: string; password: string }) => Promise<any>;
    signOut: () => Promise<{ error: null }>;
    getSession: () => Promise<any>;
    getUser: () => Promise<any>;
  };

  constructor() {
    this.baseUrl = DEFAULT_API_URL;

    // On Electron startup, try to restore persisted session tokens so the user stays logged in
    if (isElectron()) {
      loadElectronSessionFromStorage();
    }

    this.auth = {
      signUp: async ({ email, password, options }) => {
        await this.signUp(email, password, options?.data || {});
        return this.signIn(email, password);
      },
      signInWithPassword: ({ email, password }) => this.signIn(email, password),
      signOut: async () => {
        await this.signOut();
        return { error: null };
      },
      getSession: () => this.getSession(),
      getUser: async () => {
        const session = await this.getSession();
        return {
          data: { user: session.data.session?.user || null },
          error: session.error,
        };
      },
    };
  }

  /** Manually set session tokens and persist them (useful after sync) */
  public setSession(accessToken: string, refreshToken: string | null) {
    setElectronTokens(accessToken, refreshToken);
  }

  private buildUrl(path: string, params?: RequestParams) {
    const base = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const url = new URL(base);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          return;
        }
        url.searchParams.set(key, String(value));
      });
    }

    return url.toString();
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { data, params, headers: _headers, method: methodOpt, ...rest } = options;
    const method = (methodOpt || (data !== undefined ? 'POST' : 'GET')) as string;

    if (isElectron() && (window as any).desktop) {
      return this.requestViaIpc<T>(path, { method, data, params });
    }

    const url = this.buildUrl(path, params);
    const headers = new Headers(_headers);
    if (electronAccessToken) headers.set('Authorization', `Bearer ${electronAccessToken}`);
    const fetchOptions: RequestInit = { ...rest, method, headers, credentials: 'include' };
    if (data instanceof FormData) {
      fetchOptions.body = data;
    } else if (data !== undefined) {
      if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
      fetchOptions.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, fetchOptions);
      const contentType = response.headers.get('content-type') || '';
      let payload: any = null;
      if (response.status !== 204) {
        payload = contentType.includes('application/json')
          ? await response.json().catch(() => null)
          : await response.text();
      }
      if (response.status === 401) {
        if (payload?.code === 'TOKEN_EXPIRED') {
          const refreshed = await this.refreshAccessToken();
          if (refreshed) return this.request(path, options);
        }
        setElectronTokens(null, null);
        redirectToAuth();
        throw new Error((payload?.error) || 'Session expired');
      }
      if (!response.ok) {
        throw new Error((payload && payload.error) || response.statusText || 'Request failed');
      }
      return payload as T;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  private async requestViaIpc<T>(path: string, options: { method: string; data?: any; params?: RequestParams }): Promise<T> {
    const { method, data, params } = options;
    const desktop = (window as any).desktop;
    if (!desktop) throw new Error('Desktop API not found');

    const requestId = Math.random().toString(36).substring(7);
    // LOGGING ADDED HERE
    logger.debug(`[API] ${method} ${path}`, { requestId, params });

    const token = electronAccessToken;

    // Helper to process data for IPC (convert File to base64)
    let payload = data;
    if (data instanceof FormData) {
      payload = {};
      for (const [key, value] of data.entries()) {
        if (value instanceof File) {
          // Convert File to simple object with base64
          const buffer = await value.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          payload = {
            ...payload,
            fileBase64: base64,
            filename: value.name,
            mimeType: value.type,
            _multipart: true, // Flag for main process
          };
        } else {
          payload[key] = value;
        }
      }
    }

    try {
      // --- AUTH ---
      if (path === '/api/auth/signup') return await desktop.auth.signUp(payload);
      if (path === '/api/auth/signin') return await desktop.auth.signIn(payload);
      if (path === '/api/auth/refresh') return await desktop.auth.refresh(payload?.refreshToken);
      if (path === '/api/auth/me') return await desktop.auth.me(token);
      if (path === '/api/auth/profile' && method === 'PUT') return await desktop.auth.updateProfile(token, payload);
      if (path === '/api/auth/logout' && method === 'POST') return await desktop.auth.logout(token);

      // --- ANALYTICS ---
      if (path === '/api/analytics') return await desktop.analytics.getStats(token);

      // --- PATIENTS ---
      if (path === '/api/patients' && method === 'GET') {
        return await desktop.patients.list(token, params);
      }
      if (path === '/api/patients' && method === 'POST') {
        return await desktop.patients.create(token, payload);
      }
      if (path.match(/\/api\/patients\/[^/]+$/)) {
        const id = path.split('/').pop();
        if (method === 'GET') return await desktop.patients.get(token, id);
        if (method === 'PUT') return await desktop.patients.update(token, id, payload);
        if (method === 'DELETE') return await desktop.patients.delete(token, id);
      }
      if (path.match(/\/api\/patients\/[^/]+\/billing$/)) {
        const id = path.split('/')[3]; // /api/patients/:id/billing
        if (method === 'GET') return await desktop.patients.billing(token, id);
      }

      // --- APPOINTMENTS ---
      if (path === '/api/appointments' && method === 'GET') {
        return await desktop.appointments.list(token, params);
      }
      if (path === '/api/appointments' && method === 'POST') {
        return await desktop.appointments.create(token, payload);
      }
      if (path.match(/\/api\/appointments\/[^/]+$/)) {
        const id = path.split('/').pop();
        if (method === 'PUT') return await desktop.appointments.update(token, id, payload);
        if (method === 'DELETE') return await desktop.appointments.delete(token, id);
      }

      // --- TREATMENTS ---
      if (path === '/api/treatments' && method === 'GET') {
        return await desktop.treatments.list(token, params);
      }
      if (path === '/api/treatments' && method === 'POST') {
        return await desktop.treatments.create(token, payload);
      }
      if (path.match(/\/api\/treatments\/[^/]+$/)) {
        const id = path.split('/').pop();
        if (method === 'PUT') return await desktop.treatments.update(token, id, payload);
        if (method === 'DELETE') return await desktop.treatments.delete(token, id);
      }
      // --- TREATMENTS BY PATIENT ---
      if (path.match(/\/api\/treatments\/patient\/[^/]+$/)) {
        const patientId = path.split('/').pop();
        return await desktop.treatments.list(token, { patientId });
      }

      // --- PRESCRIPTIONS ---
      if (path.match(/\/api\/patients\/[^/]+\/prescriptions$/)) {
        const patientId = path.split('/')[3];
        if (method === 'GET') return await desktop.prescriptions.list(token, patientId);
      }
      // Alternative prescription route format
      if (path.match(/\/api\/prescriptions\/patient\/[^/]+$/)) {
        const patientId = path.split('/').pop();
        return await desktop.prescriptions.list(token, patientId);
      }
      if (path === '/api/prescriptions' && method === 'POST') {
        return await desktop.prescriptions.create(token, payload);
      }
      if (path.match(/\/api\/prescriptions\/[^/]+$/)) {
        const id = path.split('/').pop();
        if (method === 'DELETE') return await desktop.prescriptions.delete(token, id);
      }

      // --- UPLOADS ---
      if (path.match(/\/api\/uploads\/patient-mouth-photos\/[^/]+$/) && method === 'GET') {
        const patientId = path.split('/').pop();
        return await desktop.uploads.getPatientMouthPhotos(token, patientId!);
      }
      if (path.match(/\/api\/uploads\/patient-mouth-photos\/[^/]+$/) && method === 'POST') {
        const patientId = path.split('/').pop();
        return await desktop.uploads.uploadPatientMouthPhoto(token, patientId!, payload);
      }
      if (path === '/api/uploads/tooth-treatment-photos' && method === 'POST') {
        return await desktop.uploads.uploadToothTreatmentPhoto(token, payload);
      }

      // --- EXCEL ---
      if (path === '/api/excel/import/select') return await desktop.excel.importSelectFile(token);
      if (path === '/api/excel/import/confirm') return await desktop.excel.importConfirm({ ...payload, token });
      if (path === '/api/excel/export/patients') return await desktop.excel.exportPatients({ ...payload, token });
      if (path === '/api/excel/export/patient/full') return await desktop.excel.exportPatientFullData(token, payload.patientId);
      if (path === '/api/excel/export/patient/treatments') return await desktop.excel.exportPatientTreatments(token, payload.patientId);
      if (path === '/api/excel/export/failed') return await desktop.excel.exportFailed({ ...payload, token });

      // Fallback
      console.warn(`[IPC] Unmapped route: ${method} ${path}`);
      throw new Error(`Route not found: ${path}`);

    } catch (err: any) {
      if (err?.status === 401 || err?.code === 'TOKEN_EXPIRED') {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) return this.requestViaIpc(path, { ...options, data: payload }); // Use processed payload
        setElectronTokens(null, null);
        redirectToAuth();
      }

      // LOGGING ERROR HERE
      logger.error(`[API] Error ${method} ${path}`, { requestId, error: err });

      // Re-throw with normalized error
      const error = new Error(err.message || 'Unknown error');
      (error as any).status = err.status;
      (error as any).code = err.code;
      throw error;
    }
  }

  async signUp(email: string, password: string, metadata: Record<string, any> = {}) {
    const result = await this.request<{
      user: any;
      accessToken?: string;
      refreshToken?: string;
    }>('/api/auth/signup', {
      method: 'POST',
      data: { email, password, ...metadata },
    });
    // In Electron, store tokens from signup response so immediate signIn or /me works
    if (isElectron() && result.accessToken) {
      setElectronTokens(result.accessToken, result.refreshToken ?? null);
    }
  }

  async signIn(email: string, password: string) {
    const result = await this.request<{
      user: { id: string; email: string; role: string; first_name?: string; last_name?: string };
      message: string;
      accessToken?: string;
      refreshToken?: string;
    }>('/api/auth/signin', {
      method: 'POST',
      data: { email, password },
    });

    // In Electron, store tokens so subsequent requests send Authorization header
    if (isElectron() && result.accessToken) {
      setElectronTokens(result.accessToken, result.refreshToken ?? null);
    }

    return {
      data: {
        user: result.user,
        session: { user: result.user },
      },
      error: null,
    };
  }

  async signOut() {
    setElectronTokens(null, null);
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      redirectToAuth();
    }
  }

  async getSession() {
    try {
      // ✅ CHANGED: Just fetch current user, cookies sent automatically
      const response = await this.request<{ user: any }>('/api/auth/me');
      return {
        data: {
          session: {
            user: response.user
          }
        },
        error: null
      };
    } catch (error) {
      return { data: { session: null }, error };
    }
  }

  async refreshAccessToken() {
    try {
      if (isElectron() && electronRefreshToken) {
        const result = await this.request<{ accessToken?: string; refreshToken?: string }>('/api/auth/refresh', {
          method: 'POST',
          data: { refreshToken: electronRefreshToken },
        });
        if (result.accessToken) {
          setElectronTokens(result.accessToken, result.refreshToken ?? null);
          return true;
        }
      } else {
        await this.request('/api/auth/refresh', { method: 'POST' });
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      setElectronTokens(null, null);
      return false;
    }
    return false;
  }

  async updateProfile(updates: Record<string, any>) {
    return this.request('/api/auth/profile', {
      method: 'PUT',
      data: updates,
    });
  }

  async getCurrentUser() {
    const session = await this.getSession();
    if (!session.data.session) {
      throw new Error('Not authenticated');
    }
    return session.data.session.user;
  }

  /**
   * Returns current access token for Electron IPC Excel flows only.
   * Main process needs it to call the API (file dialog + HTTP); renderer does not expose token elsewhere.
   */
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return isElectron() ? electronAccessToken : null;
  }
}

export const apiClient = new ApiClient();
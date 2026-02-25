/**
 * API Service Layer
 *
 * Centralized HTTP API calls for auth and dashboard resources.
 */

import type {
  DentistProfile,
  LicenseInfo,
  SystemStatus,
  RemindersStats,
  DashboardData,
  SignUpPayload,
  SignInPayload,
  ClientRecord,
  AdminStats,
} from "@/types/dentist";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1";
const ACCESS_TOKEN_KEY = "virela_access_token";
const REFRESH_TOKEN_KEY = "virela_refresh_token";

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface AuthResponse {
  profile: DentistProfile;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

const saveTokens = (tokens: { accessToken: string; refreshToken: string }) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
};

export const clearSessionTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);

const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

const apiFetch = async <T>(path: string, init: RequestInit = {}, skipAuth = false): Promise<T> => {
  const token = skipAuth ? null : getAccessToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed (${response.status})`);
  }

  const payload = (await response.json()) as ApiResponse<T>;
  return payload.data;
};

/* ── Auth ───────────────────────────────────────────────── */

export async function signUp(payload: SignUpPayload): Promise<{ success: true; profile: DentistProfile; tokens: { accessToken: string; refreshToken: string } }> {
  const data = await apiFetch<AuthResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  saveTokens(data.tokens);
  return { success: true, profile: data.profile, tokens: data.tokens };
}

export async function signIn(payload: SignInPayload): Promise<{ success: true; profile: DentistProfile; tokens: { accessToken: string; refreshToken: string } }> {
  const data = await apiFetch<AuthResponse>("/auth/signin", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  saveTokens(data.tokens);
  return { success: true, profile: data.profile, tokens: data.tokens };
}

/* ── Dashboard ──────────────────────────────────────────── */

export async function getDashboard(): Promise<DashboardData> {
  if (!getAccessToken() && getRefreshToken()) {
    const tokens = await apiFetch<{ tokens: { accessToken: string; refreshToken: string } }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: getRefreshToken() }),
    });
    saveTokens(tokens.tokens);
  }

  const [profile, license, system, reminders] = await Promise.all([
    apiFetch<DentistProfile>("/dentist/profile"),
    apiFetch<LicenseInfo>("/licenses/current"),
    apiFetch<SystemStatus>("/system/status"),
    apiFetch<RemindersStats>("/reminders/stats"),
  ]);

  return {
    profile,
    license,
    system,
    reminders,
  };
}

/* ── Admin ──────────────────────────────────────────────── */

export async function getAdminClients(): Promise<ClientRecord[]> {
  return await apiFetch<ClientRecord[]>("/admin/clients", {}, true);
}

export async function getAdminStats(): Promise<AdminStats> {
  return await apiFetch<AdminStats>("/admin/stats", {}, true);
}

export async function grantLicense(dentistId: string): Promise<{ success: boolean }> {
  return await apiFetch<{ success: boolean }>("/admin/license/grant", {
    method: "POST",
    body: JSON.stringify({ dentistId }),
  }, true);
}

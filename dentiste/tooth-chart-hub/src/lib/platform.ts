/**
 * Platform Abstraction Layer
 * 
 * Provides a unified interface for platform-specific features (browser vs Electron).
 * The web app uses this instead of directly accessing browser APIs or Electron APIs.
 */

/**
 * Platform detection
 */
export const isDesktop = typeof window !== 'undefined' && !!(window as any).desktop;

/**
 * Platform interface - implemented by browser or desktop
 */
export interface Platform {
  // Printing
  printHtml(html: string, options?: PrintOptions): Promise<void>;
  printPdf(pdfBlob: Blob | ArrayBuffer | string, options?: PrintOptions): Promise<void>;

  // File operations
  openFileDialog(filters?: FileFilter[]): Promise<string | null>;
  saveFileDialog(filters?: FileFilter[], defaultPath?: string): Promise<string | null>;

  // App info
  getAppVersion(): Promise<string>;

  // Network
  getNetworkStatus(): Promise<{ online: boolean }>;

  // Licensing (desktop only)
  licensing?: {
    activate(key: string): Promise<{ success: boolean; message?: string }>;
    getStatus(): Promise<LicenseStatus>;
    validate(): Promise<boolean>;
  };

  // Local storage (desktop only - encrypted)
  storage?: {
    get(entity: string, id?: string): Promise<any>;
    put(entity: string, record: any): Promise<any>;
    delete(entity: string, id: string): Promise<void>;
    query(entity: string, filters?: Record<string, any>): Promise<any[]>;
  };
}

export interface PrintOptions {
  silent?: boolean;
  printBackground?: boolean;
  margins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface LicenseStatus {
  valid: boolean;
  activated: boolean;
  expiresAt?: string;
  gracePeriodEndsAt?: string;
  clinicId?: string;
  features?: string[];
}

/**
 * Browser platform implementation
 */
class BrowserPlatform implements Platform {
  async printHtml(html: string, options?: PrintOptions): Promise<void> {
    // Create a temporary window and print
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Failed to open print window');
    }

    printWindow.document.write(html);
    printWindow.document.close();

    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for content to load

    printWindow.print();

    // Close window after print dialog closes (user may cancel)
    setTimeout(() => {
      printWindow.close();
    }, 1000);
  }

  async printPdf(pdfBlob: Blob | ArrayBuffer | string, options?: PrintOptions): Promise<void> {
    let blob: Blob;

    if (typeof pdfBlob === 'string') {
      // Assume base64
      const byteCharacters = atob(pdfBlob);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
    } else if (pdfBlob instanceof ArrayBuffer) {
      blob = new Blob([pdfBlob], { type: 'application/pdf' });
    } else {
      blob = pdfBlob;
    }

    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');

    if (!printWindow) {
      throw new Error('Failed to open print window');
    }

    await new Promise(resolve => setTimeout(resolve, 700));
    printWindow.print();

    setTimeout(() => {
      URL.revokeObjectURL(url);
      printWindow.close();
    }, 1000);
  }

  async openFileDialog(filters?: FileFilter[]): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';

      if (filters && filters.length > 0) {
        input.accept = filters
          .flatMap(f => f.extensions.map(ext => `.${ext}`))
          .join(',');
      }

      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        resolve(file ? file.name : null);
      };

      input.oncancel = () => resolve(null);
      input.click();
    });
  }

  async saveFileDialog(filters?: FileFilter[], defaultPath?: string): Promise<string | null> {
    // Browser doesn't support save dialogs directly
    // Return null - caller should handle download via blob URL
    return null;
  }

  async getAppVersion(): Promise<string> {
    return 'web';
  }

  async getNetworkStatus(): Promise<{ online: boolean }> {
    return { online: navigator.onLine };
  }
}

/**
 * Desktop (Electron) platform implementation
 */
class DesktopPlatform implements Platform {
  private desktop: any;

  constructor() {
    this.desktop = (window as any).desktop;
    if (!this.desktop) {
      throw new Error('Desktop API not available');
    }
  }

  async printHtml(html: string, options?: PrintOptions): Promise<void> {
    await this.desktop.printing.printHtml(html, options);
  }

  async printPdf(pdfBlob: Blob | ArrayBuffer | string, options?: PrintOptions): Promise<void> {
    // Convert to base64 if needed
    let base64: string;

    if (typeof pdfBlob === 'string') {
      base64 = pdfBlob;
    } else if (pdfBlob instanceof ArrayBuffer) {
      const bytes = new Uint8Array(pdfBlob);
      base64 = btoa(String.fromCharCode(...bytes));
    } else {
      // Blob - convert to base64
      base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1] || result); // Remove data:application/pdf;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });
    }

    await this.desktop.printing.printPdf(base64, options);
  }

  async openFileDialog(filters?: FileFilter[]): Promise<string | null> {
    return this.desktop.dialogs.openFile({ filters, title: 'Select File' });
  }

  async saveFileDialog(filters?: FileFilter[], defaultPath?: string): Promise<string | null> {
    return this.desktop.dialogs.saveFile({ filters, title: 'Save File', defaultPath });
  }

  async getAppVersion(): Promise<string> {
    return this.desktop.app.getVersion();
  }

  async getNetworkStatus(): Promise<{ online: boolean }> {
    return this.desktop.network.getStatus();
  }

  get licensing() {
    return {
      activate: (key: string) => this.desktop.licensing.activate(key),
      getStatus: () => this.desktop.licensing.getStatus(),
      validate: () => this.desktop.licensing.validate(),
    };
  }

  get storage() {
    return {
      get: (entity: string, id?: string) => this.desktop.storage.get(entity, id),
      put: (entity: string, record: any) => this.desktop.storage.put(entity, record),
      delete: (entity: string, id: string) => this.desktop.storage.delete(entity, id),
      query: (entity: string, filters?: Record<string, any>) =>
        this.desktop.storage.query(entity, filters),
    };
  }
}

/**
 * Platform instance - automatically selects browser or desktop
 */
export const platform: Platform = isDesktop
  ? new DesktopPlatform()
  : new BrowserPlatform();

/**
 * Type declaration for window.desktop (for TypeScript)
 */
declare global {
  interface Window {
    desktop?: {
      app: {
        getVersion(): Promise<string>;
        getPath(name: string): Promise<string>;
        onUpdateReady(callback: () => void): () => void;
        onUpdateAvailable(callback: () => void): () => void;
        restartToUpdate(): void;
      };
      auth: {
        signUp(data: any): Promise<any>;
        signIn(data: any): Promise<any>;
        refresh(refreshToken: string): Promise<any>;
        me(token: string): Promise<any>;
        updateProfile(token: string, data: any): Promise<any>;
        logout(token: string): Promise<any>;
      };
      analytics: {
        getStats(token: string): Promise<({
          totalPatients: number;
          totalAppointments: number;
          totalTreatments: number;
          totalRevenue: number;
          recentAppointments: any[];
        })>;
      };
      patients: {
        list(token: string, filters: any): Promise<any>;
        get(token: string, id: string): Promise<any>;
        create(token: string, data: any): Promise<any>;
        update(token: string, id: string, data: any): Promise<any>;
        delete(token: string, id: string): Promise<any>;
        billing(token: string, id: string): Promise<any>;
      };
      appointments: {
        list(token: string, filters: any): Promise<any>;
        create(token: string, data: any): Promise<any>;
        update(token: string, id: string, data: any): Promise<any>;
        delete(token: string, id: string): Promise<any>;
      };
      treatments: {
        list(token: string, filters: any): Promise<any>;
        create(token: string, data: any): Promise<any>;
        update(token: string, id: string, data: any): Promise<any>;
        delete(token: string, id: string): Promise<any>;
      };
      prescriptions: {
        list(token: string, patientId: string): Promise<any>;
        create(token: string, data: any): Promise<any>;
        delete(token: string, id: string): Promise<any>;
      };
      licensing: {
        activate(key: string): Promise<any>;
        getStatus(): Promise<LicenseStatus>;
        validate(): Promise<boolean>;
      };
      storage: {
        get(entity: string, id?: string): Promise<any>;
        put(entity: string, record: any): Promise<any>;
        delete(entity: string, id: string): Promise<void>;
        query(entity: string, filters?: Record<string, any>): Promise<any[]>;
      };
      printing: {
        printHtml(html: string, options?: PrintOptions): Promise<void>;
        printPdf(pdfBlob: string, options?: PrintOptions): Promise<void>;
      };
      dialogs: {
        openFile(options?: { filters?: FileFilter[]; title?: string }): Promise<string | null>;
        saveFile(options?: { filters?: FileFilter[]; title?: string; defaultPath?: string }): Promise<string | null>;
      };
      network: {
        getStatus(): Promise<{ online: boolean }>;
      };
      excel: {
        importSelectFile(token: string): Promise<{ headers: string[]; preview: Record<string, unknown>[]; columnMappingSuggestions: Record<string, string>; filePath: string } | null>;
        importConfirm(payload: { filePath: string; mapping: Record<string, string>; skipDuplicates?: boolean; token: string }): Promise<{ imported: number; failed: number; errors: unknown[]; failedRows: Record<string, unknown>[] }>;
        exportPatients(payload: { token: string; startDate?: string; endDate?: string }): Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>;
        exportPatientFullData: (payload: { token: string; patientId: string }) => Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>;
        exportPatientTreatments: (payload: { token: string; patientId: string }) => Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>;
        exportFailed(payload: { token: string; failedRows: unknown[]; headers?: string[] }): Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>;
      };
    };
  }
}

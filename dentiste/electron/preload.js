/**
 * Electron Preload Script
 * 
 * Secure IPC bridge between renderer (web app) and main process.
 * Exposes only whitelisted, validated APIs via contextBridge.
 */

const { contextBridge, ipcRenderer } = require('electron');

window.addEventListener('error', (event) => {
  console.error('[Renderer error]', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled promise rejection]', event.reason);
});

/**
 * Desktop API exposed to renderer
 */
const desktopAPI = {
  // ========== APP INFO ==========
  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version'),
    getPath: (name) => ipcRenderer.invoke('app:get-path', { name }),
    onUpdateReady: (callback) => {
      const listener = () => callback();
      ipcRenderer.on('update:ready', listener);
      return () => ipcRenderer.removeListener('update:ready', listener);
    },
    onUpdateAvailable: (callback) => {
      const listener = () => callback();
      ipcRenderer.on('update:available', listener);
      return () => ipcRenderer.removeListener('update:available', listener);
    },
    restartToUpdate: () => ipcRenderer.send('update:restart'),
  },

  // ========== AUTH ==========
  auth: {
    signUp: (data) => ipcRenderer.invoke('auth:signup', data),
    signIn: (data) => ipcRenderer.invoke('auth:signin', data),
    refresh: (refreshToken) => ipcRenderer.invoke('auth:refresh', { refreshToken }),
    me: (token) => ipcRenderer.invoke('auth:me', { token }),
    updateProfile: (token, data) => ipcRenderer.invoke('auth:profile:update', { token, ...data }),
    logout: (token) => ipcRenderer.invoke('auth:logout', { token }),
  },

  // ========== ANALYTICS ==========
  analytics: {
    getStats: (token) => ipcRenderer.invoke('analytics:stats', { token }),
  },

  // ========== PATIENTS ==========
  patients: {
    list: (token, filters) => ipcRenderer.invoke('patients:list', { token, ...filters }),
    get: (token, id) => ipcRenderer.invoke('patients:get', { token, id }),
    create: (token, data) => ipcRenderer.invoke('patients:create', { token, ...data }),
    update: (token, id, data) => ipcRenderer.invoke('patients:update', { token, id, ...data }),
    delete: (token, id) => ipcRenderer.invoke('patients:delete', { token, id }),
    billing: (token, id) => ipcRenderer.invoke('patients:billing', { token, id }),
  },

  // ========== APPOINTMENTS ==========
  appointments: {
    list: (token, filters) => ipcRenderer.invoke('appointments:list', { token, ...filters }),
    create: (token, data) => ipcRenderer.invoke('appointments:create', { token, ...data }),
    update: (token, id, data) => ipcRenderer.invoke('appointments:update', { token, id, ...data }),
    delete: (token, id) => ipcRenderer.invoke('appointments:delete', { token, id }),
  },

  // ========== TREATMENTS ==========
  treatments: {
    list: (token, filters) => ipcRenderer.invoke('treatments:list', { token, ...filters }),
    create: (token, data) => ipcRenderer.invoke('treatments:create', { token, ...data }),
    update: (token, id, data) => ipcRenderer.invoke('treatments:update', { token, id, ...data }),
    delete: (token, id) => ipcRenderer.invoke('treatments:delete', { token, id }),
  },

  // ========== PRESCRIPTIONS ==========
  prescriptions: {
    list: (token, patientId) => ipcRenderer.invoke('prescriptions:list', { token, patientId }),
    create: (token, data) => ipcRenderer.invoke('prescriptions:create', { token, ...data }),
    delete: (token, id) => ipcRenderer.invoke('prescriptions:delete', { token, id }),
  },

  // ========== LICENSING ==========
  licensing: {
    activate: async (key) => {
      if (typeof key !== 'string' || key.length < 8) {
        throw new Error('Cle de licence invalide');
      }
      return ipcRenderer.invoke('licensing:activate', { key });
    },
    getStatus: () => ipcRenderer.invoke('licensing:get-status'),
    validate: () => ipcRenderer.invoke('licensing:validate'),
  },

  // ========== LOCAL STORAGE (Encrypted) ==========
  storage: {
    get: async (entity, id) => {
      return ipcRenderer.invoke('storage:get', { entity, id });
    },
    put: async (entity, record) => {
      return ipcRenderer.invoke('storage:put', { entity, record });
    },
    delete: async (entity, id) => {
      return ipcRenderer.invoke('storage:delete', { entity, id });
    },
    query: async (entity, filters = {}) => {
      return ipcRenderer.invoke('storage:query', { entity, filters });
    },
  },

  // ========== PRINTING ==========
  printing: {
    printHtml: async (html, options = {}) => {
      return ipcRenderer.invoke('print:html', { html, options });
    },
    printPdf: async (pdfBlob, options = {}) => {
      return ipcRenderer.invoke('print:pdf', { pdfBlob, options });
    },
  },

  // ========== FILE DIALOGS ==========
  dialogs: {
    openFile: async (options = {}) => {
      return ipcRenderer.invoke('dialog:openFile', options);
    },
    saveFile: async (options = {}) => {
      return ipcRenderer.invoke('dialog:saveFile', options);
    },
  },

  // ========== NETWORK ==========
  network: {
    getStatus: () => ipcRenderer.invoke('network:get-status'),
  },

  // ========== UPLOADS ==========
  uploads: {
    uploadPatientMouthPhoto: (token, patientId, data) => ipcRenderer.invoke('uploads:patient-mouth-photo', { token, patientId, ...data }),
    getPatientMouthPhotos: (token, patientId) => ipcRenderer.invoke('uploads:get-patient-mouth-photos', { token, patientId }),
    uploadToothTreatmentPhoto: (token, data) => ipcRenderer.invoke('uploads:tooth-treatment-photo', { token, ...data }),
    getFile: (token, relativePath) => ipcRenderer.invoke('uploads:get-file', { token, relativePath }),
    deletePatientMouthPhoto: (token, photoId) => ipcRenderer.invoke('uploads:delete-patient-mouth-photo', { token, photoId }),
  },

  // ========== EXCEL IMPORT/EXPORT ==========
  excel: {
    importSelectFile: async (token) => {
      return ipcRenderer.invoke('excel:import:selectFile', { token });
    },
    importConfirm: async (payload) => {
      return ipcRenderer.invoke('excel:import:confirm', payload);
    },
    exportPatients: async (payload) => {
      // payload: { token, startDate, endDate }
      return ipcRenderer.invoke('excel:export:patients', payload);
    },
    exportPatientFullData: async (token, patientId) => {
      return ipcRenderer.invoke('excel:export:patientFull', { token, patientId });
    },
    exportPatientTreatments: async (token, patientId) => {
      return ipcRenderer.invoke('excel:export:patientTreatments', { token, patientId });
    },
    exportFailed: async (payload) => {
      // payload: { token, failedRows, headers }
      return ipcRenderer.invoke('excel:export:failed', payload);
    },
  },
  // ========== LOGGING ==========
  log: {
    info: (message, ...args) => ipcRenderer.send('log:info', message, ...args),
    warn: (message, ...args) => ipcRenderer.send('log:warn', message, ...args),
    error: (message, ...args) => ipcRenderer.send('log:error', message, ...args),
    debug: (message, ...args) => ipcRenderer.send('log:debug', message, ...args),
  },
  // ========== GENERIC IPC ==========
  electron: {
    on: (channel, callback) => {
      const subscription = (event, ...args) => callback(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    },
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  },
};

// Expose API to renderer
contextBridge.exposeInMainWorld('desktop', desktopAPI);
contextBridge.exposeInMainWorld('api', desktopAPI); // Alias for easier migration if needed

console.log('[Preload] Desktop API exposed');

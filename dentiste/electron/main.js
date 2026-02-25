/**
 * Electron Main Process
 * 
 * Security-hardened main process for Virela desktop app.
 * Handles window management, IPC, auto-updates, licensing, and local storage.
 */

const { app, BrowserWindow, ipcMain, dialog, shell, session, protocol } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const log = require('electron-log'); // Moved up

// Configure electron-log
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.info('App starting...');

// Some versions of electron-log don't expose an initialize() helper — guard the call
if (typeof log.initialize === 'function') {
  try {
    log.initialize();
  } catch (e) {
    // ignore initialization errors; we still configure transports below
  }
}

// Handle unhandled errors
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled Rejection:', reason);
});

const { initialize: initializeDatabase } = require('./modules/database');
const { setupHandlers } = require('./ipcHandlers');
const { autoUpdater } = require('electron-updater');
const backupService = require('./services/backup.service');
const database = require('./modules/database');

// Configure auto-updater logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Register custom scheme before app.ready (required for protocol.handle)
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'virela',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,  // ← change false to true
      corsEnabled: true,       // ← add this
      bypassCSP: false
    }
  },
]);

// Import secure modules
const licensing = require('./modules/licensing');
const storage = require('./modules/storage');
const printing = require('./modules/printing');
const userDataPaths = require('./modules/userDataPaths');


let mainWindow = null;
let licenseWindow = null;
/** Dev = Vite server (localhost). Use NODE_ENV so "npm run dev" always uses URL; packaged app always uses file. */
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Local backend configuration
const BACKEND_PORT = process.env.BACKEND_PORT || 3000;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
let backendProcess = null;
let backendStarted = false;

/**
 * Create the main application window with security hardening.
 * Dev: load from Vite dev server (localhost:8080).
 * Production: load from packaged static files (index.html next to main.js in asar or unpacked app).
 */
function createMainWindow() {
  log.info('Creating main window...');
  const preloadPath = path.join(__dirname, 'preload.js');
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      enableRemoteModule: false,
      // Temporarily allow DevTools to be opened for debugging (remove before production)
      devTools: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, 'frontend', 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
    // after mainWindow.loadURL(...) or mainWindow.loadFile(...)
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // Focus window
    if (isDev) {
      mainWindow.focus();
    }
  });

  // Prevent navigation to external sites (allow file:// and virela:// for images)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url);
    if (isDev && parsedUrl.origin === 'http://localhost:8080') return;
    if (parsedUrl.protocol === 'file:') return;
    if (parsedUrl.protocol === 'virela:' && parsedUrl.hostname === 'images') return;
    event.preventDefault();
    log.warn('Blocked navigation to:', url);
  });

  // Handle external links - open in system browser with allowlist
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsedUrl = new URL(url);
      const allowedDomains = [
        'virela.com',
        'docs.virela.com',
        'support.virela.com',
        'localhost',
      ];

      const isAllowed = allowedDomains.some(domain =>
        parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
      );

      // Allow https for all allowed domains, and http ONLY for localhost
      const isSecure = parsedUrl.protocol === 'https:';
      const isLocalHttp = parsedUrl.hostname === 'localhost' && parsedUrl.protocol === 'http:';

      if (isAllowed && (isSecure || isLocalHttp)) {
        shell.openExternal(url);
      }
    } catch (e) {
      log.error('Failed to parse URL in setWindowOpenHandler:', url);
    }

    return { action: 'deny' };
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Create the license / activation window.
 * Shown when no valid license and trial is expired/invalid.
 */
function createLicenseWindow() {
  if (licenseWindow) {
    licenseWindow.focus();
    return;
  }

  licenseWindow = new BrowserWindow({
    width: 520,
    height: 420,
    resizable: false,
    maximizable: false,
    minimizable: false,
    show: false,
    title: 'Virela – Activation de licence',
    autoHideMenuBar: true,
    backgroundColor: '#f5f7fb',
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      enableRemoteModule: false,
      // Allow DevTools for license window during debugging
      devTools: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
  });

  const licenseHtmlPath = path.join(__dirname, 'license.html');
  licenseWindow.loadFile(licenseHtmlPath).catch((err) => {
    log.error('[license] Failed to load license.html:', err);
    licenseWindow.webContents.loadURL(
      'data:text/html;charset=utf-8,' +
      encodeURIComponent(
        '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Virela – Activation de licence</title></head><body style="font-family:system-ui;padding:24px;max-width:400px;margin:40px auto;background:#f5f7fb;color:#1f2933;">' +
        '<h2 style="margin-top:0;">Licence requise</h2>' +
        '<p>Votre essai est termine. Pour continuer, vous avez besoin d\'une cle de licence Virela.</p>' +
        '<p><strong>Comment obtenir une cle :</strong> Contactez votre representant Virela ou le support. Ils vous fourniront une cle (ex. VIRELA-2026-XXXX). Saisissez-la dans l\'ecran d\'activation apres reinstallation ou mise a jour.</p>' +
        '<p style="font-size:12px;color:#6b7280;">Si vous voyez ce message a la place du formulaire d\'activation, l\'application doit peut-etre etre reinstallee.</p>' +
        '</body></html>'
      )
    );
  });

  licenseWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    if (validatedURL && !validatedURL.startsWith('data:')) {
      log.error('[license] Page failed to load:', errorCode, errorDescription, validatedURL);
    }
  });

  licenseWindow.once('ready-to-show', () => {
    licenseWindow.show();
    if (isDev) {
      licenseWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  licenseWindow.on('closed', () => {
    licenseWindow = null;
  });
}

/**
 * Configure session security
 */
async function configureSession() {
  const ses = session.defaultSession;

  // Deny all permission requests (handle explicitly if needed)
  await ses.setPermissionRequestHandler((webContents, permission, callback) => {
    // Only allow notifications if explicitly needed
    if (permission === 'notifications') {
      callback(true);
      return;
    }
    callback(false);
  });

  // Block new window creation except for allowed cases
  ses.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    return false; // Deny by default
  });

  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = { ...details.requestHeaders };
    try {
      const url = new URL(details.url);
      if (
        url.hostname === 'localhost' &&
        String(url.port || '80') === String(BACKEND_PORT) &&
        (details.resourceType === 'xhr' || details.resourceType === 'fetch')
      ) {
        headers.Origin = 'http://localhost:8080';
        headers.Referer = headers.Referer || 'http://localhost:8080/';
      }
    } catch (e) { }
    callback({ requestHeaders: headers });
  });

  // ← ADD THIS BLOCK RIGHT HERE, before the closing }
  ses.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' http://localhost:8080; " +
          "img-src 'self' virela: data: blob: http://localhost:8080; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:8080; " +
          "style-src 'self' 'unsafe-inline'; " +
          "connect-src 'self' http://localhost:8080 http://localhost:3000; " +
          "font-src 'self' data: http://localhost:8080;"
        ]
      }
    });
  });

} // ← this closes configureSession()

/**
 * Start local backend (dentist-api) as a child process.
 * Uses Electron's Node runtime (ELECTRON_RUN_AS_NODE) so no external Node install is required.
 */
// Backend startup removed
async function startBackend() {
  // Database initialization logic
  try {
    await userDataPaths.initialize();
    db.initialize();
  } catch (err) {
    log.error('Failed to initialize app data:', err);
  }
}

async function waitForBackendReady() {
  // No-op
  return Promise.resolve();
}

/**
 * Register secure IPC handlers
 */

const db = require('./modules/database');

function registerIpcHandlers() {
  // Add this anywhere in registerIpcHandlers() or after app.whenReady()
  const { globalShortcut } = require('electron');

  app.whenReady().then(() => {
    globalShortcut.register('F12', () => {
      if (mainWindow) mainWindow.webContents.openDevTools({ mode: 'detach' });
    });
    globalShortcut.register('CommandOrControl+Shift+I', () => {
      if (mainWindow) mainWindow.webContents.openDevTools({ mode: 'detach' });
    });
  });
  const { registerIpcHandlers: registerServiceHandlers } = require('./ipcHandlers');
  // Register all service-based handlers
  registerServiceHandlers();

  // ========== LICENSING ==========
  ipcMain.handle('licensing:activate', async (_event, { key }) => {
    if (typeof key !== 'string' || key.length < 8) {
      throw new Error('Format de cle de licence invalide');
    }

    const result = await licensing.activate(key);

    // If activation succeeded and app is now unlocked, open main app and close license window.
    if (result && result.success) {
      const status = result.status || (await licensing.getStatus());
      if (!status.locked) {
        if (!mainWindow) {
          createMainWindow();
        }
        if (licenseWindow) {
          licenseWindow.close();
        }
      }
    }

    return result;
  });

  ipcMain.handle('licensing:get-status', async () => {
    return licensing.getStatus();
  });

  ipcMain.handle('licensing:validate', async () => {
    return licensing.validate();
  });

  // ========== STORAGE (Local encrypted DB) ==========
  ipcMain.handle('storage:get', async (_event, { entity, id }) => {
    if (typeof entity !== 'string' || !entity.match(/^[a-z_]+$/)) {
      throw new Error('Invalid entity name');
    }
    if (id && typeof id !== 'string') {
      throw new Error('Invalid id');
    }
    return storage.get(entity, id);
  });

  ipcMain.handle('storage:put', async (_event, { entity, record }) => {
    if (typeof entity !== 'string' || !entity.match(/^[a-z_]+$/)) {
      throw new Error('Invalid entity name');
    }
    if (!record || typeof record !== 'object') {
      throw new Error('Invalid record');
    }
    return storage.put(entity, record);
  });

  ipcMain.handle('storage:delete', async (_event, { entity, id }) => {
    if (typeof entity !== 'string' || !entity.match(/^[a-z_]+$/)) {
      throw new Error('Invalid entity name');
    }
    if (typeof id !== 'string') {
      throw new Error('Invalid id');
    }
    return storage.delete(entity, id);
  });

  ipcMain.handle('storage:query', async (_event, { entity, filters }) => {
    if (typeof entity !== 'string' || !entity.match(/^[a-z_]+$/)) {
      throw new Error('Invalid entity name');
    }
    return storage.query(entity, filters || {});
  });

  // ========== PRINTING ==========
  ipcMain.handle('print:html', async (_event, { html, options }) => {
    if (typeof html !== 'string' || html.length === 0) {
      throw new Error('Invalid HTML content');
    }
    if (options && typeof options !== 'object') {
      throw new Error('Invalid print options');
    }
    return printing.printHtml(mainWindow, html, options || {});
  });

  ipcMain.handle('print:pdf', async (_event, { pdfBlob, options }) => {
    if (!(pdfBlob instanceof Buffer) && typeof pdfBlob !== 'string') {
      throw new Error('Invalid PDF data');
    }
    return printing.printPdf(mainWindow, pdfBlob, options || {});
  });

  // ========== FILE DIALOGS ==========
  ipcMain.handle('dialog:openFile', async (_event, { filters, title }) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: title || 'Selectionner un fichier',
      properties: ['openFile'],
      filters: filters || [
        { name: 'Tous les fichiers', extensions: ['*'] },
      ],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('dialog:saveFile', async (_event, { filters, title, defaultPath }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: title || 'Enregistrer le fichier',
      filters: filters || [
        { name: 'All Files', extensions: ['*'] },
      ],
      defaultPath,
    });
    return result.canceled ? null : result.filePath;
  });

  // ========== APP INFO ==========
  ipcMain.handle('app:get-version', () => {
    return app.getVersion();
  });

  ipcMain.handle('app:get-path', (_event, { name }) => {
    const allowedPaths = ['userData', 'appData', 'temp', 'home'];
    if (!allowedPaths.includes(name)) throw new Error('Invalid path name');
    return app.getPath(name);
  });

  // ========== NETWORK STATUS ==========
  ipcMain.handle('network:get-status', async () => {
    // Simple check - in production, you might want more sophisticated detection
    return { online: require('electron').net.isOnline() };
  });

  // ========== AUTO-UPDATE ==========
  ipcMain.on('update:restart', () => {
    if (app.isPackaged) {
      autoUpdater.quitAndInstall();
    }
  });
}

/**
 * Configure auto-updates
 */
function configureAutoUpdates() {
  if (!app.isPackaged) {
    console.log('Auto-updates disabled in development');
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', () => {
    console.log('Update available, downloading...');
    if (mainWindow) {
      mainWindow.webContents.send('update:available');
    }
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('Update downloaded, ready to install');
    if (mainWindow) {
      mainWindow.webContents.send('update:ready');
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-update error:', err);
    // Don't crash the app for update failures
  });

  // Check for updates on startup and periodically
  autoUpdater.checkForUpdates();
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 6 * 60 * 60 * 1000); // Every 6 hours
}

/**
 * Initialize application
 */
app.whenReady().then(async () => {
  await configureSession();

  // Initialize userData directory layout and first-launch default images (idempotent).
  try {
    await userDataPaths.initialize();
  } catch (err) {
    log.error('[userData] Failed to initialize userData paths:', err);
  }

  // Initialize SQLite database (userData); create schema if missing so "no such table" never occurs.
  try {
    const database = require('./modules/database');
    database.initialize();
  } catch (err) {
    log.error('[database] Failed to initialize SQLite:', err);
  }

  // Serve images from userData via virela:// so renderer never hits localhost for assets.
  const paths = userDataPaths.getPaths();
  const imagesRoot = path.resolve(paths.images);
  protocol.handle('virela', async (request) => {
    const u = new URL(request.url);

    if (u.hostname !== 'images') {
      return new Response('Not found', { status: 404 });
    }

    const segments = (u.pathname || '/')
      .split('/')
      .filter(s => s.length > 0 && s !== '..' && s !== '.');

    const normalized = path.normalize(path.join(imagesRoot, ...segments));

    if (!normalized.startsWith(path.normalize(imagesRoot))) {
      return new Response('Forbidden', { status: 403 });
    }

    const ext = path.extname(normalized).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.png': 'image/png', '.gif': 'image/gif',
      '.webp': 'image/webp', '.svg': 'image/svg+xml'
    };
    const mimeType = mimeTypes[ext] || 'application/octet-stream';

    try {
      const data = await fs.readFile(normalized);
      log.info('[virela] SUCCESS bytes:', data.length);
      return new Response(data, {
        status: 200,
        headers: { 'Content-Type': mimeType }
      });
    } catch (e) {
      log.error('[virela] FAILED:', e.code, normalized);
      return new Response('Not found', { status: 404 });
    }
  });

  // Start local backend API (main process proxies all renderer API calls to it).
  // Start local backend API (DB init now)
  try {
    await startBackend();
  } catch (err) {
    log.error('[backend] Failed to start backend:', err);
  }

  // Next steps continue regardless of DB init success (app might work in degraded mode or show error)
  {

    // Register IPC before creating windows so the license UI can talk to main.
    registerIpcHandlers();

    if (app.isPackaged) {
      configureAutoUpdates();
    }

    // Initialize storage (local DB) - non-critical for licensing.
    try {
      await storage.initialize();
    } catch (error) {
      console.error('Failed to initialize storage module:', error);
      // Continue anyway - app can work in degraded mode.
    }

    // Initialize licensing and decide what to show on startup.
    try {
      // 1. Run Integrity Check first
      log.info('[main] Running database integrity check...');
      const dbInstance = database.initialize();
      const integrity = dbInstance.pragma('integrity_check');
      if (integrity !== 'ok') {
        log.error('[main] Database integrity check FAILED:', integrity);
        dialog.showErrorBox(
          'Erreur de base de données',
          'La base de données locale semble corrompue. L\'application va tenter de démarrer, mais certaines données peuvent être manquantes.'
        );
      } else {
        log.info('[main] Database integrity check: OK');
      }

      // 2. Schedule a daily backup
      setInterval(async () => {
        log.info('[main] Running scheduled daily backup...');
        await backupService.executeBackup();
        await backupService.rotateBackups();
      }, 24 * 60 * 60 * 1000);

      // 3. Licensing init
      await licensing.initialize();
      const licenseStatus = await licensing.getStatus();

      if (licenseStatus && !licenseStatus.locked) {
        createMainWindow();
      } else {
        createLicenseWindow();
      }
    } catch (error) {
      log.error('Failed to initialize licensing module:', error);
      // If licensing fails completely, be conservative and show the license window
      // so the user is clearly blocked until the issue is resolved.
      createLicenseWindow();
    }
  }
});

// Logging IPC handlers (fire and forget)
ipcMain.on('log:info', (_, ...args) => log.info('[Renderer]', ...args));
ipcMain.on('log:warn', (_, ...args) => log.warn('[Renderer]', ...args));
ipcMain.on('log:error', (_, ...args) => log.error('[Renderer]', ...args));
ipcMain.on('log:debug', (_, ...args) => log.debug('[Renderer]', ...args));

app.on('window-all-closed', async () => {
  log.info('All windows closed. Running pre-shutdown backup...');
  try {
    // Perform a quick backup on exit if possible
    await backupService.executeBackup();
  } catch (e) {
    log.error('Pre-shutdown backup failed:', e);
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length > 0) {
    return;
  }

  // On re-activation (e.g. user clicks taskbar icon after closing windows),
  // re-check licensing to decide which window to show.
  try {
    const status = await licensing.getStatus();
    if (status && !status.locked) {
      createMainWindow();
    } else {
      createLicenseWindow();
    }
  } catch (error) {
    // If licensing fails here, be conservative and show the license window.
    console.error('Licensing error on activate:', error);
    createLicenseWindow();
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // Register as default protocol client
  // In development, we need to provide the path to the main script as an argument
  if (isDev) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('virela-app', process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    if (!app.isDefaultProtocolClient('virela-app')) {
      app.setAsDefaultProtocolClient('virela-app');
    }
  }

  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }

    // Windows deep link handling
    const url = commandLine.find(arg => arg.startsWith('virela-app://'));
    if (url) {
      handleDeepLink(url);
    }
  });

  // Handle URL opened (macOS)
  app.on('open-url', (event, url) => {
    event.preventDefault();
    if (url.startsWith('virela-app://')) {
      handleDeepLink(url);
    }
  });

  app.whenReady().then(() => {
    // Initial deep link for Windows (if opened via protocol)
    const url = process.argv.find(arg => arg.startsWith('virela-app://'));
    if (url) {
      handleDeepLink(url);
    }
  });
}

/**
 * Handle deep link URLs (e.g., virela-app://auth?token=...)
 */
function handleDeepLink(url) {
  log.info('[deep-link] Received URL:', url);
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname === 'auth' || parsedUrl.pathname.includes('/auth')) {
      const token = parsedUrl.searchParams.get('token');
      if (token && mainWindow) {
        mainWindow.webContents.send('auth:deep-link-token', token);
      }
    }
  } catch (err) {
    log.error('[deep-link] Failed to parse URL:', err);
  }
}


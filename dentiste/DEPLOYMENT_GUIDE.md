# Deployment Guide - Virela Desktop Application

## Table of Contents
- [Running the App](#running-the-app)
- [Building for Production](#building-for-production)
- [Installation Process](#installation-process)
- [Auto-Created Files](#auto-created-files)
- [File Structure](#file-structure)
- [Quick Reference](#quick-reference)
- [Troubleshooting](#troubleshooting)

---

## Running the App

### Development Mode

```powershell
# Navigate to the electron directory
cd c:\Users\MSI\Desktop\desktop_app\dentiste\electron

# Run in development mode (starts both Vite dev server and Electron)
npm run dev
```

**What happens:**
1. Starts the Vite dev server for the React app (port 8080)
2. Waits for the server to be ready
3. Launches Electron which loads `http://localhost:8080`
4. Enables hot-reload for React changes

### Production Mode (Local Testing)

```powershell
# First, build the React app
cd c:\Users\MSI\Desktop\desktop_app\dentiste\tooth-chart-hub
npm run build

# Then run Electron in production mode
cd ..\electron
npm start
```

---

## Building for Production

### Step 1: Build the React App

```powershell
cd c:\Users\MSI\Desktop\desktop_app\dentiste\tooth-chart-hub
npm run build
```

**Output:** Creates optimized static files in `tooth-chart-hub/dist/`

### Step 2: Build the Electron Installer

```powershell
cd c:\Users\MSI\Desktop\desktop_app\dentiste\electron
npm run build:win
```

**Output:** Creates installer in `electron/dist/`:
- `Virela Setup 1.0.0.exe` - The installer
- `win-unpacked/` - Portable version (for debugging)

### One-Command Build (Recommended)

```powershell
cd c:\Users\MSI\Desktop\desktop_app\dentiste\electron
npm run build:win:full
```

This builds both React and Electron in one command.

---

## Installation Process

### What Happens When a User Installs Your App

1. **User runs** `Virela Setup 1.0.0.exe`
2. **Installer extracts to** `C:\Program Files\Virela\` (or user-chosen location)
3. **Creates shortcuts:**
   - Desktop: `Virela.lnk`
   - Start Menu: `Virela.lnk`
4. **Registers uninstaller** in Windows Programs & Features

---

## Auto-Created Files

### On First Launch

When the user launches the app for the first time, Electron automatically creates:

#### User Data Directory: `%APPDATA%\Virela\`

```
%APPDATA%\Virela\
├── dentist_db.sqlite          # Main database
├── logs\
│   ├── main.log              # Application logs (from electron-log)
│   ├── renderer.log          # Renderer process logs
│   └── main.log.1            # Rotated log files (auto-rotated when large)
├── uploads\
│   └── images\               # User-uploaded patient photos
├── Cache\                    # Chromium cache (auto-managed)
├── Code Cache\               # V8 code cache (auto-managed)
├── GPUCache\                 # GPU cache (auto-managed)
└── Session Storage\          # Session data (auto-managed)
```

### Database Initialization Logic

**From `electron/modules/database.js`:**

```javascript
function initialize() {
  const userDataPath = app.getPath('userData'); // %APPDATA%\Virela
  const dbPath = path.join(userDataPath, 'dentist_db.sqlite');

  if (!fs.existsSync(dbPath)) {
    // First run: try to copy seed database
    const seedPath = path.join(process.resourcesPath, 'dentist_db.sqlite');
    if (fs.existsSync(seedPath)) {
      log.info('Copying seed database to userData...');
      fs.copySync(seedPath, dbPath);
    }
  }

  // Open database and create tables if needed
  db = new Database(dbPath);
  ensureSchema(); // Creates tables if they don't exist
  log.info(`Database ready at ${dbPath}`);
}
```

**Logic:**
1. Check if database exists in `%APPDATA%\Virela\`
2. If not, copy from `resources/` (bundled with app)
3. If no seed exists, create empty database
4. Run schema to ensure all tables exist

### Log Files Auto-Creation

**From `electron/main.js`:**

```javascript
log.initialize();
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
```

**Auto-created:**
- `%APPDATA%\Virela\logs\main.log` - Main process logs
- Automatically rotates when file exceeds size limit
- Keeps last 5 log files by default

---

## File Structure

### After Installation

```
C:\Program Files\Virela\
├── Virela.exe                 # Main executable
├── resources\
│   ├── app.asar              # Your bundled app code (compressed)
│   ├── default-images\       # Default patient images
│   └── dentist_db.sqlite     # Seed database (optional)
├── locales\                  # Chromium localization files
├── chrome_100_percent.pak    # Chromium resources
├── d3dcompiler_47.dll        # DirectX compiler
├── ffmpeg.dll                # Media codec
├── libEGL.dll                # OpenGL ES
├── libGLESv2.dll             # OpenGL ES
├── node.dll                  # Node.js runtime
└── ... (other Electron runtime files)
```

### User Data (Created on First Run)

```
%APPDATA%\Virela\
├── dentist_db.sqlite         # User's database (copied from seed or created)
├── logs\                     # Application logs
│   └── main.log
└── uploads\                  # User uploads
    └── images\
```

---

## Key Concepts

### 1. ASAR Archive
Your app code is packaged into `app.asar`:
- **Compressed archive** for faster loading
- **Protects source code** (not encrypted, but compressed)
- **Excludes native modules** like `better-sqlite3` (needs to be unpacked)

### 2. Two-Stage Build Process
1. **Vite builds React** → Static HTML/JS/CSS in `dist/`
2. **Electron-builder packages** → Installer with Electron runtime + React bundle

### 3. User Data Separation
- **Program Files** (`C:\Program Files\Virela\`): Read-only app code (requires admin to modify)
- **AppData** (`%APPDATA%\Virela\`): User-specific data (writable without admin)

### 4. Auto-Updates
Your app checks for updates on startup:

```javascript
autoUpdater.checkForUpdatesAndNotify();
```

Requires publishing `latest.yml` to your update server (configured in `package.json`).

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development mode (hot-reload) |
| `npm run build:win` | Build installer only (requires React build) |
| `npm run build:win:full` | Build React + Installer (one command) |
| `npm start` | Run production build locally |
| `npm run build:win:portable` | Build portable version (no installer) |

---

## Troubleshooting

### Database Not Found
**Check:** `%APPDATA%\Virela\dentist_db.sqlite`

**Solution:**
- Delete the file and restart the app (will recreate from seed)
- Or check `electron/dentist_db.sqlite` exists for seed copy

### White Screen on Launch
**Check:** `tooth-chart-hub/dist/` exists and contains files

**Solution:**
```powershell
cd tooth-chart-hub
npm run build
cd ..\electron
npm run build:win
```

### Logs Not Appearing
**Check:** `%APPDATA%\Virela\logs\main.log`

**Solution:**
- Ensure `electron-log` is installed: `npm install electron-log`
- Check `main.js` has `log.initialize()`

### Build Fails
**Common causes:**
- Missing dependencies: Run `npm install` in both `electron/` and `tooth-chart-hub/`
- React not built: Run `npm run build` in `tooth-chart-hub/` first
- Node version mismatch: Use Node.js 18+ (check with `node -v`)

### App Crashes on Startup
**Check logs:**
```powershell
# View main process logs
type %APPDATA%\Virela\logs\main.log
```

**Common issues:**
- Database schema mismatch: Delete `dentist_db.sqlite` and restart
- Missing native modules: Run `npm run postinstall` in `electron/`

---

## Distribution Checklist

Before distributing your app:

- [ ] Update version in `electron/package.json`
- [ ] Test the installer on a clean Windows machine
- [ ] Verify database initializes correctly
- [ ] Check all features work in production build
- [ ] Test auto-update mechanism (if configured)
- [ ] Include README or user guide
- [ ] Sign the executable (optional, for Windows SmartScreen)

---

## Environment Variables

### Development
- `NODE_ENV=development` - Enables dev tools and verbose logging
- `VITE_API_URL` - API URL for web mode (not used in Electron)

### Production
- Set automatically by electron-builder during packaging

---

## Additional Resources

- **Electron Documentation:** https://www.electronjs.org/docs
- **Electron Builder:** https://www.electron.build/
- **Vite Documentation:** https://vitejs.dev/
- **Better SQLite3:** https://github.com/WiseLibs/better-sqlite3

---

## Support

For issues or questions:
1. Check logs in `%APPDATA%\Virela\logs\`
2. Review this guide
3. Contact support with log files attached

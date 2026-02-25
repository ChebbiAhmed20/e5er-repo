# Project Architecture & Documentation

## 1. Project Overview

**Virela Desktop** is a modern dental practice management application built with **Electron**, **React**, and **SQLite**.
It is designed to run completely offline (local database) while providing a premium, responsive user experience.

### Tech Stack
- **Runtime**: Electron 32.x
- **Frontend**: React 18, Vite, TailwindCSS, Radix UI
- **Backend / Main Process**: Node.js (bundled with Electron)
- **Database**: SQLite (better-sqlite3)
- **Security**: Context Isolation, Sandboxing, IPC-only communication

### Architecture Model
The application follows a **local-first** desktop architecture:
1.  **Main Process**: Handles window management, database access, file system operations, and heavy lifting.
2.  **Renderer Process**: Runs the React UI. It **never** accesses Node.js directly. It communicates with the Main Process strictly via **IPC (Inter-Process Communication)** exposed in `preload.js`.
3.  **Data Persistence**: All data is stored in a local SQLite database file (`dentist_db.sqlite`) located in the user's data directory.

---

## 2. Folder Structure

```
dentiste/
├── electron/               # Main Process & Backend Logic
│   ├── main.js             # Application Entry Point
│   ├── preload.js          # Security Bridge (IPC)
│   ├── ipcHandlers.js      # Route handlers for frontend requests
│   ├── modules/            # Domain logic (database, licensing, storage)
│   ├── services/           # Business logic (patients, appointments)
│   └── resources/          # Static assets for the main process
│
├── tooth-chart-hub/        # Renderer Process (React App)
│   ├── src/
│   │   ├── main.tsx        # React Entry Point
│   │   ├── App.tsx         # Main Layout
│   │   ├── pages/          # Application Routes/Screens
│   │   ├── components/     # Reusable UI Components
│   │   └── lib/            # Utilities (api-client.ts)
│   ├── vite.config.ts      # Build configuration
│   └── index.html          # Browser entry point
│
└── docs/                   # Project documentation
```

---

## 3. Electron Architecture

### Main Process (`electron/main.js`)
- **Role**: The "Server" of the desktop app.
- **Responsibilities**:
    - Spawning windows (`BrowserWindow`).
    - managing SQLite database connection.
    - Hosting IPC handlers (API).
    - Handling auto-updates and system events.
- **Security**: Web preferences are set to `contextIsolation: true` and `nodeIntegration: false` to prevent malicious scripts from accessing system resources.

### Renderer Process (`tooth-chart-hub/`)
- **Role**: The "Client".
- **Responsibilities**:
    - Displaying UI.
    - managing client-side state (React Query, Context).
    - Requesting data via `window.desktop` (mapped to IPC).

### Preload Script (`electron/preload.js`)
- **Role**: The Bridge.
- **Responsibilities**:
    - Defines a secure valid API whitelist in `window.desktop`.
    - No direct Node.js access is leaked to the renderer.

---

## 4. IPC Architecture

The app uses a **Usage-based IPC** pattern rather than a REST API server.
Instead of `fetch('http://localhost:3000/api/...')`, the renderer calls `window.desktop.patients.list()`.

### Handler Structure (`electron/ipcHandlers.js`)
Handlers are registered to listen for specific channels (events).

**Example: Adding a new IPC handler**

1.  **Main Process (`ipcHandlers.js`)**:
    ```javascript
    ipcMain.handle('example:do-something', async (event, data) => {
        // validate data
        // perform database action
        return { success: true };
    });
    ```

2.  **Preload (`preload.js`)**:
    ```javascript
    contextBridge.exposeInMainWorld('desktop', {
        example: {
            doSomething: (data) => ipcRenderer.invoke('example:do-something', data)
        }
    });
    ```

3.  **Renderer (`React`)**:
    ```javascript
    await window.desktop.example.doSomething({ foo: 'bar' });
    ```

### Authentication Logic
Although local, the app uses **JWT tokens** for user session management to support multi-user behaviors (e.g., locking screen, audit logging).
- **Login**: `auth:signin` verifies credentials against SQLite `users` table and issues a JWT.
- **Middleware**: Most handlers in `ipcHandlers.js` wrap their logic to verify this token before executing.

---

## 5. Database Architecture (SQLite)

- **Library**: `better-sqlite3` ( Synchronous, fast, reliable).
- **Location**:
    - **Dev**: `electron/dentist_db.sqlite` (often) or `AppData` depending on config.
    - **Prod**: `%APPDATA%\Virela\dental_db.sqlite`.
- **Initialization**:
    - `modules/database.js` runs on startup.
    - It checks if tables exist.
    - It runs schema queries if tables are missing (Auto-migration for new installs).

### How to modify the database
1.  Open `electron/modules/database.js`.
2.  Add a generic table creation script in `initialize()`.
3.  **Note**: For complex schema changes in production, implementing a versioned migration system (e.g. `user_version` pragma) is recommended primarily to avoid data loss.

---

## 6. Development & Build

### Development
Run the app in hot-reload mode:

```powershell
npm run dev
# Starts Vite server (port 5173/8080) AND Electron main process
```

- **Renderer**: Hosted at `http://localhost:5173`.
- **Electron**: Lads that URL.
- **Changes**: React changes reload instantly. Main process changes require a restart (type `rs` in terminal or restart script).

### Production Build
Package the application as an executable (`.exe` / installer).

```powershell
# Build for Windows
npm run build:win
```

- **Output**: `electron/dist/`
- **Artifacts**:
    - `Virela Setup X.X.X.exe` (Installer)
    - `win-unpacked/` (Portable debuggable folder)

### CI/CD & Updates
- **Electron Updater** is configured.
- It checks the configured publish URL for `latest.yml`.
- If a new version exists, it downloads and installs on quit.

---

## 7. Maintenance & Best Practices

1.  **Keep `preload.js` thin**: Don't put business logic here. Just pass messages.
2.  **Validation**: Validate all inputs in `ipcHandlers.js` using `zod` or manual checks. Never trust the renderer.
3.  **Dependencies**:
    - `electron/package.json` has backend deps (`better-sqlite3`, `bcrypt`).
    - `tooth-chart-hub/package.json` has UI deps (`react`, `radix-ui`).
    - **Do not mix them**.
4.  **Backups**: Ensure the `dentist_db.sqlite` file is backed up regularly. The app should implement an export feature.

# Virela Desktop - Electron Application

Secure, production-ready Electron wrapper for Virela dental practice management platform.

## Quick Start

### Prerequisites

- Node.js 18+ 
- Windows 10+ (for building Windows installers)
- Built web app in `../tooth-chart-hub/dist/`

### Development

```bash
# Install dependencies
npm install

# Run Electron with dev server (if Vite is running)
npm run dev

# Or run with built files
npm run start
```

### Building

```bash
# Build Windows installer
npm run build:win

# Build portable executable
npm run build:win:portable
```

## Architecture

See `../ELECTRON_MIGRATION_GUIDE.md` for detailed architecture and security model.

## Key Files

- `main.js` - Main Electron process (window management, IPC, security)
- `preload.js` - Secure IPC bridge between renderer and main
- `modules/` - Core modules:
  - `licensing.js` - License activation and validation
  - `storage.js` - Encrypted local storage
  - `printing.js` - Print handling

## Security

- ✅ Context isolation enabled
- ✅ Node integration disabled in renderer
- ✅ Sandbox enabled
- ✅ CSP headers configured
- ✅ External navigation blocked
- ✅ IPC input validation

## Configuration

### Environment Variables

```bash
# Backend URL for license activation
BACKEND_URL=https://api.virela.com

# Update server URL
UPDATE_SERVER_URL=https://updates.virela.com

# Code signing (Windows)
CERT_FILE=/path/to/certificate.pfx
CERT_PASSWORD=your-password
```

### License Public Key

Update `modules/licensing.js` with your backend's public key:

```javascript
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
YOUR_PUBLIC_KEY_HERE
-----END PUBLIC KEY-----`;
```

## Auto-Updates

Configured via `electron-updater`. Set `UPDATE_SERVER_URL` environment variable.

Update server should serve:
- `latest.yml` - Version metadata
- `Virela-Setup-X.X.X.exe` - Installer files

## Troubleshooting

### "window.desktop is undefined"

Ensure `preload.js` path is correct in `main.js`:
```javascript
preload: path.join(__dirname, 'preload.js'),
```

### IPC calls fail

Check that:
1. Handler registered in `main.js`
2. Preload validates input
3. No generic IPC channels

### Auto-updates not working

1. Verify `UPDATE_SERVER_URL` is set
2. Check `latest.yml` format
3. Ensure HTTPS is used
4. App must be packaged (not dev mode)

## Production Checklist

- [ ] Update license public key
- [ ] Configure code signing certificate
- [ ] Set `UPDATE_SERVER_URL`
- [ ] Test license activation
- [ ] Test auto-updates
- [ ] Test offline mode
- [ ] Verify printing works
- [ ] Security audit completed

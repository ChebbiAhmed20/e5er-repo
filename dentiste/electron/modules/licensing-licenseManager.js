// Simple offline license management.
// Stores license under: app.getPath('appData') + "/Virela/license.json"

const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { getMachineFingerprint } = require('./licensing-fingerprint');

function getLicenseFilePath() {
  const baseDir = path.join(app.getPath('appData'), 'Virela');
  return path.join(baseDir, 'license.json');
}

function ensureBaseDirExists(filePath) {
  const dir = path.dirname(filePath);
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // Ignore directory creation errors; subsequent file writes will fail gracefully.
  }
}

function readLicenseFile() {
  const filePath = getLicenseFilePath();
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    if (!data || !data.key || !data.fingerprint) {
      return null;
    }
    return data;
  } catch {
    // Missing or invalid file -> treat as no license.
    return null;
  }
}

function writeLicenseFile(data) {
  const filePath = getLicenseFilePath();
  ensureBaseDirExists(filePath);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch {
    // If writing fails, the app should continue running; activation simply won't persist.
    return false;
  }
}

/**
 * Basic license key format check.
 * This is intentionally permissive: we only enforce a simple prefix.
 */
function isLicenseKeyFormatValid(key) {
  if (typeof key !== 'string') return false;
  if (!key.startsWith('VIRELA-')) return false;
  // Example format: VIRELA-2026-XXXX (we don't enforce exact year/pattern here)
  return key.length >= 'VIRELA-2026-XXXX'.length - 2; // allow small variations
}

/**
 * Check if there is a valid license for this machine.
 * - File must exist and parse.
 * - Fingerprint must match current machine fingerprint.
 */
function isLicenseValid() {
  const license = readLicenseFile();
  if (!license) return false;

  const currentFingerprint = getMachineFingerprint();
  if (license.fingerprint !== currentFingerprint) {
    return false;
  }

  // Optionally, we could re-check the key format here, but it's not critical.
  return true;
}

/**
 * Activate license for this machine.
 * - Validates basic key format.
 * - Binds to current machine fingerprint.
 * - Stores to disk.
 */
function activateLicense(key) {
  if (!isLicenseKeyFormatValid(key)) {
    return {
      success: false,
      message: 'Format de cle de licence invalide.',
    };
  }

  const fingerprint = getMachineFingerprint();
  const license = {
    key,
    fingerprint,
    activatedAt: Date.now(),
  };

  const saved = writeLicenseFile(license);
  if (!saved) {
    return {
      success: false,
      message: 'Echec de l\'enregistrement de la licence sur le disque.',
    };
  }

  return {
    success: true,
    message: 'Licence activee avec succes.',
    license,
  };
}

module.exports = {
  isLicenseValid,
  activateLicense,
};


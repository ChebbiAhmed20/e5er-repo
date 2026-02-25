/**
 * User Data Paths & First-Launch Initialization
 *
 * Single-tenant desktop: all writable data lives under app.getPath('userData').
 * Never writes to installation directory or app.asar.
 * Idempotent directory creation and one-time copy of default images.
 */

const path = require('path');
const fs = require('fs').promises;
const { app } = require('electron');

const DIRS = {
  IMAGES: 'images',
  PATIENT_MOUTH_PHOTOS: 'patient-mouth-photos',
  TOOTH_TREATMENT_PHOTOS: 'tooth-treatment-photos',
  DATABASE: 'database',
  BACKUPS: 'backups',
  EXPORTS: 'exports',
  LOGS: 'logs',
};

const SENTINEL_FILE = '.defaults-copied';
const DEFAULT_IMAGES_RESOURCE = 'default-images';

let userDataRoot = null;

/**
 * Get userData root (cached after first call).
 */
function getUserDataRoot() {
  if (userDataRoot) return userDataRoot;
  userDataRoot = app.getPath('userData');
  return userDataRoot;
}

/**
 * Resolve a path under userData. No path traversal above userData.
 */
function resolveUnderUserData(...segments) {
  const root = getUserDataRoot();
  const joined = path.join(root, ...segments);
  const normalized = path.normalize(joined);
  if (!normalized.startsWith(path.normalize(root))) {
    throw new Error('Path would escape userData');
  }
  return normalized;
}

/**
 * Get standard paths under userData.
 */
function getPaths() {
  const root = getUserDataRoot();
  const images = path.join(root, DIRS.IMAGES);
  return {
    root,
    images,
    imagesPatientMouthPhotos: path.join(images, DIRS.PATIENT_MOUTH_PHOTOS),
    imagesToothTreatmentPhotos: path.join(images, DIRS.TOOTH_TREATMENT_PHOTOS),
    database: path.join(root, DIRS.DATABASE),
    backups: path.join(root, DIRS.BACKUPS),
    exports: path.join(root, DIRS.EXPORTS),
    logs: path.join(root, DIRS.LOGS),
  };
}

/**
 * Create all required directories. Idempotent.
 */
async function ensureDirectories() {
  const paths = getPaths();
  const dirsToCreate = [
    paths.images,
    paths.imagesPatientMouthPhotos,
    paths.imagesToothTreatmentPhotos,
    paths.database,
    paths.backups,
    paths.exports,
    paths.logs,
  ];
  for (const dir of dirsToCreate) {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * Copy default images from extraResources to userData/images once.
 * Uses a sentinel file so we only copy on first launch.
 */
async function copyDefaultImagesOnce() {
  const paths = getPaths();
  const sentinelPath = path.join(paths.images, SENTINEL_FILE);

  try {
    await fs.access(sentinelPath);
    return; // Already initialized
  } catch {
    // Sentinel missing; may need to copy
  }

  const isPackaged = app.isPackaged;
  const sourceDir = isPackaged
    ? path.join(process.resourcesPath, DEFAULT_IMAGES_RESOURCE)
    : path.join(__dirname, '..', 'resources', DEFAULT_IMAGES_RESOURCE);

  let exists = false;
  try {
    await fs.access(sourceDir);
    exists = true;
  } catch {
    // No default images folder (dev or not included)
  }

  if (!exists) {
    await fs.writeFile(sentinelPath, new Date().toISOString(), 'utf8');
    return;
  }

  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const src = path.join(sourceDir, entry.name);
    const dest = path.join(paths.images, entry.name);
    if (entry.isDirectory()) {
      await fs.mkdir(dest, { recursive: true });
      const subEntries = await fs.readdir(src, { withFileTypes: true });
      for (const sub of subEntries) {
        const subSrc = path.join(src, sub.name);
        const subDest = path.join(dest, sub.name);
        if (sub.isFile()) {
          await fs.copyFile(subSrc, subDest);
        }
      }
    } else {
      await fs.copyFile(src, dest);
    }
  }

  await fs.writeFile(sentinelPath, new Date().toISOString(), 'utf8');
}

/**
 * Full initialization: create directory layout and copy default images once.
 * Safe to call on every app launch; idempotent.
 */
async function initialize() {
  await ensureDirectories();
  await copyDefaultImagesOnce();
}

module.exports = {
  getPaths,
  getUserDataRoot,
  resolveUnderUserData,
  ensureDirectories,
  copyDefaultImagesOnce,
  initialize,
  DIRS,
};

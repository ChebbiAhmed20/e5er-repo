/**
 * Local Encrypted Storage Module
 * 
 * Provides encrypted SQLite storage for offline data.
 * Uses SQLCipher or similar for encryption at rest.
 */

const path = require('path');
const { app } = require('electron');
const crypto = require('crypto');
const fs = require('fs').promises;

// In production, use better-sqlite3 with sqlcipher or similar
// For now, using a simple JSON-based storage with encryption
const STORAGE_PATH = path.join(app.getPath('userData'), 'data');

let storageInitialized = false;
let encryptionKey = null;

/**
 * Get or create encryption key (stored securely)
 */
async function getEncryptionKey() {
  if (encryptionKey) {
    return encryptionKey;
  }
  
  const keyPath = path.join(app.getPath('userData'), '.key');
  
  try {
    const keyData = await fs.readFile(keyPath, 'utf-8');
    encryptionKey = Buffer.from(keyData, 'hex');
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Generate new key
      encryptionKey = crypto.randomBytes(32);
      await fs.writeFile(keyPath, encryptionKey.toString('hex'), { mode: 0o600 });
    } else {
      throw error;
    }
  }
  
  return encryptionKey;
}

/**
 * Encrypt data
 */
function encrypt(text) {
  const key = encryptionKey;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    iv: iv.toString('hex'),
    data: encrypted,
  };
}

/**
 * Decrypt data
 */
function decrypt(encryptedData) {
  const key = encryptionKey;
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    key,
    Buffer.from(encryptedData.iv, 'hex')
  );
  
  let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Get entity file path
 */
function getEntityPath(entity) {
  return path.join(STORAGE_PATH, `${entity}.json.enc`);
}

/**
 * Read entity data
 */
async function readEntity(entity) {
  const filePath = getEntityPath(entity);
  
  try {
    const encryptedData = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(encryptedData);
    const decrypted = decrypt(parsed);
    return JSON.parse(decrypted);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {}; // New entity
    }
    throw error;
  }
}

/**
 * Write entity data
 */
async function writeEntity(entity, data) {
  const filePath = getEntityPath(entity);
  const text = JSON.stringify(data, null, 2);
  const encrypted = encrypt(text);
  
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(encrypted), 'utf-8');
}

/**
 * Initialize storage
 */
async function initialize() {
  await getEncryptionKey();
  await fs.mkdir(STORAGE_PATH, { recursive: true });
  storageInitialized = true;
}

/**
 * Get record by ID
 */
async function get(entity, id) {
  if (!storageInitialized) await initialize();
  
  const data = await readEntity(entity);
  return data[id] || null;
}

/**
 * Put record
 */
async function put(entity, record) {
  if (!storageInitialized) await initialize();
  
  if (!record.id) {
    record.id = crypto.randomUUID();
  }
  
  record.updatedAt = new Date().toISOString();
  record.syncStatus = 'pending'; // pending/dirty/synced
  
  const data = await readEntity(entity);
  data[record.id] = record;
  
  await writeEntity(entity, data);
  
  return record;
}

/**
 * Delete record
 */
async function deleteRecord(entity, id) {
  if (!storageInitialized) await initialize();
  
  const data = await readEntity(entity);
  delete data[id];
  
  await writeEntity(entity, data);
}

/**
 * Query records with filters
 */
async function query(entity, filters = {}) {
  if (!storageInitialized) await initialize();
  
  const data = await readEntity(entity);
  let records = Object.values(data);
  
  // Apply filters
  if (filters.syncStatus) {
    records = records.filter(r => r.syncStatus === filters.syncStatus);
  }
  
  if (filters.updatedAfter) {
    const date = new Date(filters.updatedAfter);
    records = records.filter(r => new Date(r.updatedAt) > date);
  }
  
  // Simple field filters
  Object.entries(filters).forEach(([key, value]) => {
    if (key !== 'syncStatus' && key !== 'updatedAfter') {
      records = records.filter(r => r[key] === value);
    }
  });
  
  return records;
}

module.exports = {
  initialize,
  get,
  put,
  delete: deleteRecord,
  query,
};

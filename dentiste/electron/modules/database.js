const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const fs = require('fs-extra');
const log = require('electron-log');

let db = null;

// Embedded schema for first-run: create all tables if missing (matches dentist_db.sqlite.sql)
const INITIAL_SCHEMA = `
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, dentist_id TEXT NOT NULL, date_time TEXT NOT NULL,
  notes TEXT, status TEXT NOT NULL DEFAULT 'upcoming', reminder_type TEXT DEFAULT 'email', reminder_sent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS patient_mouth_photos (
  id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, image_url TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), created_by TEXT
);
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY, dentist_id TEXT NOT NULL, first_name TEXT NOT NULL, last_name TEXT NOT NULL,
  cin TEXT, email TEXT, phone TEXT, date_of_birth TEXT, address TEXT, medical_notes TEXT,
  sms_reminders_enabled INTEGER DEFAULT 1, email_reminders_enabled INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS payment_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT, sub_date TEXT NOT NULL, expire_date TEXT NOT NULL,
  user_name TEXT NOT NULL, user_email TEXT NOT NULL, pack_chosen TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS prescriptions (
  id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, medication_list TEXT NOT NULL, dosage TEXT,
  instructions TEXT, duration TEXT, date_issued TEXT NOT NULL, created_by TEXT
);
CREATE TABLE IF NOT EXISTS patient_billing_summary (
  patient_id TEXT PRIMARY KEY,
  total_treatment_cost REAL DEFAULT 0,
  total_paid REAL DEFAULT 0,
  balance_remaining REAL DEFAULT 0,
  last_payment_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY, email TEXT NOT NULL, first_name_english TEXT NOT NULL DEFAULT '', last_name_english TEXT NOT NULL DEFAULT '',
  first_name_arabic TEXT NOT NULL DEFAULT '', last_name_arabic TEXT NOT NULL DEFAULT '', sex TEXT NOT NULL DEFAULT 'male',
  clinic_name TEXT, clinic_address TEXT NOT NULL DEFAULT '', clinic_address_arabic TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', trial_end_date TEXT, subscription_status TEXT DEFAULT 'trial',
  subscription_expiry_date TEXT, last_payment_date TEXT, referral_code TEXT, referral_count INTEGER DEFAULT 0, referred_by_code TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY, referrer_id TEXT NOT NULL, referred_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL, converted_at TEXT
);
CREATE TABLE IF NOT EXISTS reminder_logs (
  id TEXT PRIMARY KEY, appointment_id TEXT, patient_id TEXT, channel TEXT NOT NULL, status TEXT NOT NULL,
  error_message TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY, dentist_id TEXT NOT NULL, payment_id TEXT, amount REAL NOT NULL, currency TEXT DEFAULT 'TND',
  status TEXT NOT NULL, payment_method TEXT, konnect_payment_ref TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tooth_treatments (
  id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, tooth_number INTEGER NOT NULL, treatment_type TEXT NOT NULL,
  notes TEXT, treatment_date TEXT NOT NULL, image_url TEXT, treatment_cost REAL DEFAULT 0, payment_status TEXT NOT NULL DEFAULT 'unpaid',
  amount_paid REAL DEFAULT 0, balance_remaining REAL, created_by TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT NOT NULL, password_hash TEXT NOT NULL, raw_user_meta_data TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

function ensureSchema() {
  try {
    const row = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='users'").get();
    if (row) return;
  } catch (_) { /* no users table */ }
  log.info('Applying initial database schema...');
  db.exec(INITIAL_SCHEMA);
}

/**
 * Initialize the SQLite database.
 * Uses userData directory. Copies seed from resources if present; otherwise creates file and applies schema.
 */
function initialize() {
  if (db) return db;

  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'dentist_db.sqlite');

  if (!fs.existsSync(dbPath)) {
    const seedPath = path.join(process.resourcesPath || path.join(__dirname, '..'), 'dentist_db.sqlite');
    if (fs.existsSync(seedPath)) {
      log.info('Copying seed database to userData...');
      fs.copySync(seedPath, dbPath);
    }
  }

  // Use verbose logging in dev, or a custom logger function that pipes to electron-log
  const verbose = (msg) => log.debug(`[SQLite] ${msg}`);

  try {
    db = new Database(dbPath, { verbose });
    // Golden Config for Data Integrity & Performance
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
    
    ensureSchema();
    log.info(`Database ready at ${dbPath}`);
  } catch (err) {
    log.error('Failed to initialize database:', err);
    throw err;
  }
  return db;
}

/**
 * Execute a query with PostgreSQL-style parameters ($1, $2, etc.)
 * Converts them to SQLite style (?) and matches the return format of 'pg'.
 * 
 * @param {string} text - The SQL query text
 * @param {Array} params - Array of parameters
 * @returns {Promise<{rows: Array, rowCount: number}>} - 'pg' compatible result object
 */
async function query(text, params = []) {
  if (!db) initialize();

  // Convert $1, $2... to ?
  const sql = text.replace(/\$\d+/g, '?');

  try {
    const isSelect = /^\s*(SELECT|WITH)/i.test(sql);

    // log.debug('Executing SQL:', sql, params); // Uncomment for verbose logging

    if (isSelect) {
      const stmt = db.prepare(sql);
      const rows = stmt.all(...params);
      return {
        rows: rows,
        rowCount: rows.length,
        command: 'SELECT', // pg compat
      };
    } else {
      const stmt = db.prepare(sql);
      const info = stmt.run(...params);
      return {
        rows: [],
        rowCount: info.changes,
        command: 'UPDATE', // simplified, could be INSERT/DELETE
        oid: null,
      };
    }
  } catch (error) {
    log.error('Database Error:', error.message);
    log.error('Failed SQL:', sql);
    throw error;
  }
}

/**
 * Get a single row
 */
async function getOne(text, params) {
  const res = await query(text, params);
  return res.rows[0] || null;
}

/**
 * Get all rows (alias for query for select)
 */
async function getAll(text, params) {
  const result = await query(text, params);
  return result.rows;
}

// Transaction support
const transactionStack = [];

async function beginTransaction() {
  if (!db) initialize();
  // log.debug('BEGIN Transaction');
  db.prepare('BEGIN').run();

  return {
    query: async (text, params) => query(text, params),
    release: () => { }, // no-op for sqlite
  };
}

async function commitTransaction(client) {
  // log.debug('COMMIT Transaction');
  db.prepare('COMMIT').run();
}

async function rollbackTransaction(client) {
  log.warn('ROLLBACK Transaction');
  db.prepare('ROLLBACK').run();
}

module.exports = {
  initialize,
  query,
  getOne,
  getAll,
  beginTransaction,
  commitTransaction,
  rollbackTransaction
};

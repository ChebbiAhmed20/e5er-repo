-- dentist_db.sqlite.sql
-- Complete schema migration from PostgreSQL to SQLite
-- Run: sqlite3 dentist_db.sqlite < dentist_db.sqlite.sql

BEGIN TRANSACTION;

-- Skip VIEW: patient_billing_summary (recreate with query in app)

-- Table: appointments
CREATE TABLE appointments (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    dentist_id TEXT NOT NULL,
    date_time TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'upcoming',
    reminder_type TEXT DEFAULT 'email',
    reminder_sent TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Table: patient_mouth_photos
CREATE TABLE patient_mouth_photos (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    image_url TEXT NOT NULL,
    created_at TEXT NOT NULL,
    created_by TEXT
);

-- Table: patients
CREATE TABLE patients (
    id TEXT PRIMARY KEY,
    dentist_id TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    cin TEXT,
    email TEXT,
    phone TEXT,
    date_of_birth TEXT,
    address TEXT,
    medical_notes TEXT,
    sms_reminders_enabled INTEGER DEFAULT 1,
    email_reminders_enabled INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Table: payment_history
CREATE TABLE payment_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sub_date TEXT NOT NULL,
    expire_date TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    pack_chosen TEXT NOT NULL
);

-- Table: prescriptions
CREATE TABLE prescriptions (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    medication_list TEXT NOT NULL,
    dosage TEXT,
    instructions TEXT,
    duration TEXT,
    date_issued TEXT NOT NULL
);

-- Table: profiles
CREATE TABLE profiles (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    first_name_english TEXT NOT NULL DEFAULT '',
    last_name_english TEXT NOT NULL DEFAULT '',
    first_name_arabic TEXT NOT NULL DEFAULT '',
    last_name_arabic TEXT NOT NULL DEFAULT '',
    sex TEXT NOT NULL DEFAULT 'male',
    clinic_name TEXT,
    clinic_address TEXT NOT NULL DEFAULT '',
    clinic_address_arabic TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    trial_end_date TEXT,
    subscription_status TEXT DEFAULT 'trial',
    subscription_expiry_date TEXT,
    last_payment_date TEXT,
    referral_code TEXT,
    referral_count INTEGER DEFAULT 0,
    referred_by_code TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Table: referrals
CREATE TABLE referrals (
    id TEXT PRIMARY KEY,
    referrer_id TEXT NOT NULL,
    referred_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    converted_at TEXT
);

-- Table: reminder_logs
CREATE TABLE reminder_logs (
    id TEXT PRIMARY KEY,
    appointment_id TEXT,
    patient_id TEXT,
    channel TEXT NOT NULL,
    status TEXT NOT NULL,
    error_message TEXT,
    created_at TEXT NOT NULL
);

-- Table: subscriptions
CREATE TABLE subscriptions (
    id TEXT PRIMARY KEY,
    dentist_id TEXT NOT NULL,
    payment_id TEXT,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'TND',
    status TEXT NOT NULL,
    payment_method TEXT,
    konnect_payment_ref TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Table: tooth_treatments
CREATE TABLE tooth_treatments (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    tooth_number INTEGER NOT NULL,
    treatment_type TEXT NOT NULL,
    notes TEXT,
    treatment_date TEXT NOT NULL,
    image_url TEXT,
    treatment_cost REAL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    amount_paid REAL DEFAULT 0,
    balance_remaining REAL,
    created_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Table: users
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    raw_user_meta_data TEXT,
    created_at TEXT NOT NULL
);

COMMIT;

-- Usage:
-- sqlite3 dentist_db.sqlite < dentist_db.sqlite.sql
-- .tables
-- .schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'dentist' CHECK (role IN ('admin', 'dentist')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS dentists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  first_name VARCHAR(60) NOT NULL,
  last_name VARCHAR(60) NOT NULL,
  name_arabic VARCHAR(120) NOT NULL,
  cin CHAR(8) NOT NULL UNIQUE CHECK (cin ~ '^[0-9]{8}$'),
  city VARCHAR(120) NOT NULL,
  phone VARCHAR(40) NULL,
  clinic_name VARCHAR(120) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dentist_id UUID NOT NULL REFERENCES dentists(id),
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'trial', 'expired', 'pending')),
  type VARCHAR(20) NOT NULL CHECK (type IN ('trial', 'full')),
  activated_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS backups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dentist_id UUID NOT NULL REFERENCES dentists(id),
  file_name VARCHAR(255) NOT NULL,
  backup_size_mb NUMERIC(10,2) NOT NULL CHECK (backup_size_mb >= 0),
  patients_count INT NOT NULL DEFAULT 0 CHECK (patients_count >= 0),
  treatments_count INT NOT NULL DEFAULT 0 CHECK (treatments_count >= 0),
  backuped_at TIMESTAMPTZ NOT NULL,
  imported_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dentist_id UUID NOT NULL REFERENCES dentists(id),
  patient_name VARCHAR(120) NOT NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('sms', 'email', 'whatsapp')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('queued', 'sent', 'failed')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ NULL,
  fail_reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dentist_id UUID NULL REFERENCES dentists(id),
  level VARCHAR(20) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  event_type VARCHAR(120) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dentists_user_id ON dentists(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_licenses_dentist_created ON licenses(dentist_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_backups_dentist_backuped ON backups(dentist_id, backuped_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reminders_dentist_status ON reminders(dentist_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_at ON reminders(scheduled_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_dentist_created ON system_logs(dentist_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level_created ON system_logs(level, created_at DESC);

INSERT INTO users (id, email, password_hash, role)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'amine@clinique-sourire.tn', '$2a$12$0xEgx24yv9N.6vBR7Vwv7ObuJ22ut7fFQK6KrQicSR7A2yWfBiQzS', 'dentist')
ON CONFLICT (email) DO NOTHING;

INSERT INTO dentists (id, user_id, first_name, last_name, name_arabic, cin, city, phone, clinic_name)
VALUES
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Amine', 'Ben Salah', 'أمين بن صالح', '09876543', 'Tunis', '+216 98 765 432', 'Clinique du Sourire')
ON CONFLICT (cin) DO NOTHING;

INSERT INTO licenses (dentist_id, status, type, activated_at, expires_at)
VALUES
  ('22222222-2222-2222-2222-222222222222', 'trial', 'trial', NOW() - INTERVAL '3 days', NOW() + INTERVAL '11 days');

INSERT INTO backups (dentist_id, file_name, backup_size_mb, patients_count, treatments_count, backuped_at)
VALUES
  ('22222222-2222-2222-2222-222222222222', 'virela_backup_2026-02-23.vbk', 48.30, 347, 1205, NOW() - INTERVAL '1 day'),
  ('22222222-2222-2222-2222-222222222222', 'virela_backup_2026-02-20.vbk', 46.90, 338, 1174, NOW() - INTERVAL '4 days');

INSERT INTO reminders (dentist_id, patient_name, channel, status, scheduled_at, sent_at)
VALUES
  ('22222222-2222-2222-2222-222222222222', 'Patient 001', 'sms', 'sent', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('22222222-2222-2222-2222-222222222222', 'Patient 002', 'sms', 'sent', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
  ('22222222-2222-2222-2222-222222222222', 'Patient 003', 'email', 'failed', NOW() - INTERVAL '1 day', NULL),
  ('22222222-2222-2222-2222-222222222222', 'Patient 004', 'whatsapp', 'queued', NOW() + INTERVAL '2 hours', NULL);

INSERT INTO system_logs (dentist_id, level, event_type, message, metadata)
VALUES
  ('22222222-2222-2222-2222-222222222222', 'info', 'auth.signin', 'Dentist signed in', '{"ip":"127.0.0.1"}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'info', 'backup.created', 'Backup completed', '{"file":"virela_backup_2026-02-23.vbk"}'::jsonb);

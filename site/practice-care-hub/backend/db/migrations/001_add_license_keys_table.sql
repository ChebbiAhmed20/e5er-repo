-- Migration 001: Add license_keys table for remote license activation
-- Run once; idempotent via IF NOT EXISTS

CREATE TABLE IF NOT EXISTS license_keys (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key_value    VARCHAR(120) NOT NULL UNIQUE,
  type         VARCHAR(20)  NOT NULL DEFAULT 'full' CHECK (type IN ('trial', 'full')),
  duration_days INT         NOT NULL DEFAULT 365,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ  NULL,         -- when the key itself expires (before use)
  used_by      UUID         NULL REFERENCES dentists(id),
  used_at      TIMESTAMPTZ  NULL,
  revoked_at   TIMESTAMPTZ  NULL
);

CREATE INDEX IF NOT EXISTS idx_license_keys_value  ON license_keys(key_value);
CREATE INDEX IF NOT EXISTS idx_license_keys_used_by ON license_keys(used_by) WHERE used_by IS NOT NULL;

-- Seed a test license key for development (password: VIRELA-2026-TEST1)
INSERT INTO license_keys (key_value, type, duration_days)
VALUES ('VIRELA-2026-TEST1', 'full', 365)
ON CONFLICT (key_value) DO NOTHING;

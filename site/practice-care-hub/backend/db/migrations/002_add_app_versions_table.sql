-- Migration 002: Add app_versions table for version compatibility checks
-- Run once; idempotent via IF NOT EXISTS

CREATE TABLE IF NOT EXISTS app_versions (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version              VARCHAR(20)  NOT NULL,
  platform             VARCHAR(20)  NOT NULL DEFAULT 'all' CHECK (platform IN ('windows', 'mac', 'linux', 'all')),
  min_required_version VARCHAR(20)  NOT NULL,
  release_notes        TEXT         NULL,
  download_url         TEXT         NULL,
  is_latest            BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_versions_platform_latest
  ON app_versions(platform) WHERE is_latest = TRUE;

CREATE INDEX IF NOT EXISTS idx_app_versions_version ON app_versions(version);

-- Seed initial version
INSERT INTO app_versions (version, platform, min_required_version, release_notes, is_latest)
VALUES ('1.0.0', 'windows', '1.0.0', 'Initial release', TRUE)
ON CONFLICT DO NOTHING;

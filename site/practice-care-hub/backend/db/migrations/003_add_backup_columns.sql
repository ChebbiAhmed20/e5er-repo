-- Migration 003: Extend backups table with storage URL, checksum, app version
-- Run once; idempotent via IF NOT EXISTS / IF COLUMN NOT EXISTS workaround

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='backups' AND column_name='storage_url') THEN
    ALTER TABLE backups ADD COLUMN storage_url TEXT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='backups' AND column_name='checksum') THEN
    ALTER TABLE backups ADD COLUMN checksum VARCHAR(64) NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='backups' AND column_name='app_version') THEN
    ALTER TABLE backups ADD COLUMN app_version VARCHAR(20) NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='backups' AND column_name='notes') THEN
    ALTER TABLE backups ADD COLUMN notes TEXT NULL;
  END IF;
END;
$$;

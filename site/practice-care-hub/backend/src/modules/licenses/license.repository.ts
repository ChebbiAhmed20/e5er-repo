import { pool } from "../../config/db.js";

interface LicenseRow {
  status: "active" | "trial" | "expired" | "pending";
  type: "trial" | "full";
  activated_at: string;
  expires_at: string | null;
}

interface LicenseKeyRow {
  id: string;
  key_value: string;
  type: "trial" | "full";
  duration_days: number;
  expires_at: string | null;
  used_by: string | null;
  revoked_at: string | null;
}

export const licenseRepository = {
  async findCurrentByDentistId(dentistId: string): Promise<LicenseRow | null> {
    const result = await pool.query<LicenseRow>(
      `SELECT status, type, activated_at, expires_at
       FROM licenses
       WHERE dentist_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [dentistId],
    );
    return result.rows[0] ?? null;
  },

  async findKeyByValue(keyValue: string): Promise<LicenseKeyRow | null> {
    const result = await pool.query<LicenseKeyRow>(
      `SELECT id, key_value, type, duration_days, expires_at, used_by, revoked_at
       FROM license_keys
       WHERE key_value = $1`,
      [keyValue],
    );
    return result.rows[0] ?? null;
  },

  async markKeyUsed(keyId: string, dentistId: string): Promise<void> {
    await pool.query(
      `UPDATE license_keys
       SET used_by = $1, used_at = NOW()
       WHERE id = $2`,
      [dentistId, keyId],
    );
  },

  async upsertActiveLicense(
    dentistId: string,
    type: "trial" | "full",
    expiresAt: string | null,
  ): Promise<LicenseRow> {
    // Soft-delete old license rows for this dentist first, then insert a fresh active one
    await pool.query(
      `UPDATE licenses SET deleted_at = NOW(), updated_at = NOW()
       WHERE dentist_id = $1 AND deleted_at IS NULL`,
      [dentistId],
    );

    const result = await pool.query<LicenseRow>(
      `INSERT INTO licenses (dentist_id, status, type, activated_at, expires_at)
       VALUES ($1, 'active', $2, NOW(), $3)
       RETURNING status, type, activated_at, expires_at`,
      [dentistId, type, expiresAt],
    );
    return result.rows[0];
  },
};

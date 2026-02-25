import { pool } from "../../config/db.js";

interface BackupRow {
  id: string;
  file_name: string;
  backup_size_mb: number;
  patients_count: number;
  treatments_count: number;
  backuped_at: string;
  imported_at: string | null;
  storage_url: string | null;
  checksum: string | null;
  app_version: string | null;
  notes: string | null;
}

export const backupRepository = {
  async findLatestByDentistId(dentistId: string): Promise<BackupRow | null> {
    const result = await pool.query<BackupRow>(
      `SELECT id, file_name, backup_size_mb, patients_count, treatments_count,
              backuped_at, imported_at, storage_url, checksum, app_version, notes
       FROM backups
       WHERE dentist_id = $1 AND deleted_at IS NULL
       ORDER BY backuped_at DESC
       LIMIT 1`,
      [dentistId],
    );
    return result.rows[0] ?? null;
  },

  async findAllByDentistId(dentistId: string, limit = 50, offset = 0): Promise<BackupRow[]> {
    const result = await pool.query<BackupRow>(
      `SELECT id, file_name, backup_size_mb, patients_count, treatments_count,
              backuped_at, imported_at, storage_url, checksum, app_version, notes
       FROM backups
       WHERE dentist_id = $1 AND deleted_at IS NULL
       ORDER BY backuped_at DESC
       LIMIT $2 OFFSET $3`,
      [dentistId, limit, offset],
    );
    return result.rows;
  },

  async findByIdAndDentistId(id: string, dentistId: string): Promise<BackupRow | null> {
    const result = await pool.query<BackupRow>(
      `SELECT id, file_name, backup_size_mb, patients_count, treatments_count,
              backuped_at, imported_at, storage_url, checksum, app_version, notes
       FROM backups
       WHERE id = $1 AND dentist_id = $2 AND deleted_at IS NULL`,
      [id, dentistId],
    );
    return result.rows[0] ?? null;
  },

  async createBackup(dentistId: string, input: {
    fileName: string;
    sizeMb: number;
    patientsCount: number;
    treatmentsCount: number;
    backedAt: string;
    storageUrl?: string;
    checksum?: string;
    appVersion?: string;
    notes?: string;
  }): Promise<BackupRow> {
    const result = await pool.query<BackupRow>(
      `INSERT INTO backups (dentist_id, file_name, backup_size_mb, patients_count, treatments_count,
                            backuped_at, storage_url, checksum, app_version, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, file_name, backup_size_mb, patients_count, treatments_count,
                 backuped_at, imported_at, storage_url, checksum, app_version, notes`,
      [
        dentistId,
        input.fileName,
        input.sizeMb,
        input.patientsCount,
        input.treatmentsCount,
        input.backedAt,
        input.storageUrl ?? null,
        input.checksum ?? null,
        input.appVersion ?? null,
        input.notes ?? null,
      ],
    );
    return result.rows[0];
  },

  async restoreBackup(dentistId: string, backupId: string): Promise<BackupRow | null> {
    const result = await pool.query<BackupRow>(
      `UPDATE backups
       SET imported_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND dentist_id = $2 AND deleted_at IS NULL
       RETURNING id, file_name, backup_size_mb, patients_count, treatments_count,
                 backuped_at, imported_at, storage_url, checksum, app_version, notes`,
      [backupId, dentistId],
    );
    return result.rows[0] ?? null;
  },
};

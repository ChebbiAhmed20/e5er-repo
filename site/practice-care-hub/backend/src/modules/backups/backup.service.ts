import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/AppError.js";
import { backupRepository } from "./backup.repository.js";
import type { UploadBackupInput } from "./backup.dto.js";

const toDto = (row: Awaited<ReturnType<typeof backupRepository.findLatestByDentistId>>) => {
  if (!row) return null;
  return {
    id: row.id,
    fileName: row.file_name,
    sizeMb: Number(row.backup_size_mb),
    patientsCount: row.patients_count,
    treatmentsCount: row.treatments_count,
    backedAt: row.backuped_at,
    importedAt: row.imported_at,
    storageUrl: row.storage_url,
    checksum: row.checksum,
    appVersion: row.app_version,
    notes: row.notes,
  };
};

export const backupService = {
  async getLatest(dentistId: string) {
    const row = await backupRepository.findLatestByDentistId(dentistId);
    if (!row) {
      throw new AppError("No backup found", StatusCodes.NOT_FOUND, "BACKUP_NOT_FOUND");
    }
    return toDto(row);
  },

  async list(dentistId: string, page = 1, pageSize = 20) {
    const limit = Math.min(Math.max(pageSize, 1), 100);
    const offset = (Math.max(page, 1) - 1) * limit;
    const rows = await backupRepository.findAllByDentistId(dentistId, limit, offset);
    return rows.map(toDto);
  },

  async getById(dentistId: string, backupId: string) {
    const row = await backupRepository.findByIdAndDentistId(backupId, dentistId);
    if (!row) {
      throw new AppError("Backup not found", StatusCodes.NOT_FOUND, "BACKUP_NOT_FOUND");
    }
    return toDto(row);
  },

  async upload(dentistId: string, input: UploadBackupInput) {
    const row = await backupRepository.createBackup(dentistId, {
      fileName: input.fileName,
      sizeMb: input.sizeMb,
      patientsCount: input.patientsCount,
      treatmentsCount: input.treatmentsCount,
      backedAt: input.backedAt,
      storageUrl: input.storageUrl,
      checksum: input.checksum,
      appVersion: input.appVersion,
      notes: input.notes,
    });
    return toDto(row);
  },

  async restore(dentistId: string, backupId: string) {
    const row = await backupRepository.restoreBackup(dentistId, backupId);
    if (!row) {
      throw new AppError("Backup not found or already restored", StatusCodes.NOT_FOUND, "BACKUP_NOT_FOUND");
    }
    return {
      success: true,
      backup: toDto(row),
      restoredAt: row.imported_at,
    };
  },

  /** Legacy — kept for backward compat */
  async importBackup(dentistId: string, backupId: string) {
    return this.restore(dentistId, backupId);
  },
};

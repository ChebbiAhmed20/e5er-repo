import { systemRepository } from "./system.repository.js";

export const systemService = {
  async getStatus(dentistId: string) {
    const row = await systemRepository.getSystemStatusByDentistId(dentistId);
    return {
      appVersion: row.app_version,
      lastBackupDate: row.last_backup_date,
      lastUpdateDate: row.last_update_date,
    };
  },

  async getLatestVersion(platform?: string) {
    const version = await systemRepository.getLatestVersion(platform);
    return version ?? { version: "1.0.0", platform: "all", min_required_version: "1.0.0", release_notes: null, download_url: null, is_latest: true };
  },

  async checkCompatibility(appVersion: string, platform?: string) {
    return systemRepository.checkCompatibility(appVersion, platform);
  },
};

import { pool } from "../../config/db.js";

interface SystemStatusRow {
  app_version: string;
  last_backup_date: string | null;
  last_update_date: string;
}

interface AppVersionRow {
  version: string;
  platform: string;
  min_required_version: string;
  release_notes: string | null;
  download_url: string | null;
  is_latest: boolean;
}

export const systemRepository = {
  async getSystemStatusByDentistId(dentistId: string): Promise<SystemStatusRow> {
    const result = await pool.query<SystemStatusRow>(
      `SELECT
          '1.0.0'::text AS app_version,
          MAX(b.backuped_at) AS last_backup_date,
          NOW()::text AS last_update_date
       FROM dentists d
       LEFT JOIN backups b ON b.dentist_id = d.id AND b.deleted_at IS NULL
       WHERE d.id = $1
       GROUP BY d.id`,
      [dentistId],
    );

    if (!result.rows[0]) {
      return {
        app_version: "1.0.0",
        last_backup_date: null,
        last_update_date: new Date().toISOString(),
      };
    }

    return result.rows[0];
  },

  async getLatestVersion(platform = "windows"): Promise<AppVersionRow | null> {
    // Try platform-specific first, then fall back to 'all'
    const result = await pool.query<AppVersionRow>(
      `SELECT version, platform, min_required_version, release_notes, download_url, is_latest
       FROM app_versions
       WHERE (platform = $1 OR platform = 'all') AND is_latest = TRUE
       ORDER BY CASE WHEN platform = $1 THEN 0 ELSE 1 END
       LIMIT 1`,
      [platform],
    ).catch(() => ({ rows: [] as AppVersionRow[] }));

    return result.rows[0] ?? null;
  },

  async checkCompatibility(appVersion: string, platform = "windows"): Promise<{
    compatible: boolean;
    mustUpdate: boolean;
    currentVersion: string;
    latestVersion: string;
    minRequiredVersion: string;
    downloadUrl: string | null;
    releaseNotes: string | null;
  }> {
    const latest = await this.getLatestVersion(platform);

    if (!latest) {
      // No version data: assume compatible
      return {
        compatible: true,
        mustUpdate: false,
        currentVersion: appVersion,
        latestVersion: appVersion,
        minRequiredVersion: "1.0.0",
        downloadUrl: null,
        releaseNotes: null,
      };
    }

    const parseVer = (v: string) => v.split(".").map(Number);
    const cmp = (a: number[], b: number[]) => {
      for (let i = 0; i < 3; i++) {
        if ((a[i] ?? 0) < (b[i] ?? 0)) return -1;
        if ((a[i] ?? 0) > (b[i] ?? 0)) return 1;
      }
      return 0;
    };

    const current = parseVer(appVersion);
    const minRequired = parseVer(latest.min_required_version);
    const latestParsed = parseVer(latest.version);

    const mustUpdate = cmp(current, minRequired) < 0;
    const hasUpdate = cmp(current, latestParsed) < 0;

    return {
      compatible: !mustUpdate,
      mustUpdate,
      currentVersion: appVersion,
      latestVersion: latest.version,
      minRequiredVersion: latest.min_required_version,
      downloadUrl: latest.download_url,
      releaseNotes: hasUpdate ? latest.release_notes : null,
    };
  },
};

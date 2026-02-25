const path = require('path');
const fs = require('fs-extra');
const log = require('electron-log');
const { app } = require('electron');
const { initialize: getDb } = require('../modules/database');
const userDataPaths = require('../modules/userDataPaths');

/**
 * Service to manage local database backups with an focus on data integrity.
 */
const backupService = {
    /**
     * Execute an atomic backup of the clinical database.
     * @returns {Promise<{success: boolean, path?: string, error?: string}>}
     */
    async executeBackup() {
        try {
            log.info('[backup-service] Starting database backup...');

            const db = getDb();
            const paths = userDataPaths.getPaths();
            const backupDir = paths.backups;

            await fs.ensureDir(backupDir);

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(backupDir, `virela_backup_${timestamp}.sqlite`);

            // 1. Force a checkpoint to ensure WAL is as empty as possible before backup
            log.debug('[backup-service] Forcing WAL checkpoint...');
            db.pragma('wal_checkpoint(PASSIVE)');

            // 2. Perform Atomic Backup using VACUUM INTO
            // Use VACUUM INTO because it creates a clean, single-file, non-WAL database copy.
            log.debug('[backup-service] Executing VACUUM INTO...');
            db.prepare('VACUUM INTO ?').run(backupPath);

            // 3. Verify Integrity of the backup file
            log.debug('[backup-service] Verifying backup integrity...');
            const backupDb = new (require('better-sqlite3'))(backupPath);
            try {
                const result = backupDb.prepare('PRAGMA integrity_check').get();
                if (result.integrity_check !== 'ok') {
                    throw new Error(`Integrity check failed: ${result.integrity_check}`);
                }
            } finally {
                backupDb.close();
            }

            log.info(`[backup-service] Backup completed successfully: ${backupPath}`);
            return { success: true, path: backupPath };

        } catch (error) {
            log.error('[backup-service] Backup failed:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Clean up old backups based on rotation policy.
     * Keeps last 7 days of daily backups.
     */
    async rotateBackups() {
        try {
            const paths = userDataPaths.getPaths();
            const backupDir = paths.backups;

            if (!await fs.pathExists(backupDir)) return;

            const files = await fs.readdir(backupDir);
            const backupFiles = files
                .filter(f => f.startsWith('virela_backup_') && f.endsWith('.sqlite'))
                .map(f => ({
                    name: f,
                    path: path.join(backupDir, f),
                    time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time); // Newest first

            // Keep only the most recent 10 backups for simplicity in this version
            const MAX_BACKUPS = 10;
            if (backupFiles.length > MAX_BACKUPS) {
                const toDelete = backupFiles.slice(MAX_BACKUPS);
                for (const file of toDelete) {
                    log.info(`[backup-service] Rotating (deleting) old backup: ${file.name}`);
                    await fs.remove(file.path);
                }
            }

        } catch (error) {
            log.error('[backup-service] Backup rotation failed:', error);
        }
    }
};

module.exports = backupService;

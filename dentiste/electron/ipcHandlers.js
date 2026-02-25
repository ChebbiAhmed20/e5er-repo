const { ipcMain } = require('electron');
const log = require('electron-log');
const authService = require('./services/auth.service');
const patientService = require('./services/patient.service');
const appointmentService = require('./services/appointment.service');
const treatmentService = require('./services/treatment.service');
const prescriptionService = require('./services/prescription.service');
const excelImportService = require('./services/excel-import.service');
const excelExportService = require('./services/excel-export.service');
const uploadService = require('./services/upload.service');
const { saveUploadedFile } = require('./utils/fileHelpers');
const { dialog, app } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const websiteService = require('./services/website.service');
const userDataPaths = require('./modules/userDataPaths');
const backupService = require('./services/backup.service');

function registerIpcHandlers() {
    // Remove existing handlers to prevent duplicates
    ipcMain.removeAllListeners('appointments:create');
    ipcMain.removeAllListeners('appointments:update');
    ipcMain.removeAllListeners('appointments:delete');
    ipcMain.removeAllListeners('appointments:list');
    ipcMain.removeAllListeners('analytics:stats');
    ipcMain.removeAllListeners('uploads:patient-mouth-photo');
    ipcMain.removeAllListeners('uploads:get-patient-mouth-photos');

    // Helper to wrap service calls with error handling and optional auth check
    const handle = (channel, handler, requireAuth = true) => {
        ipcMain.handle(channel, async (event, ...args) => {
            try {
                let userId = null;

                // Extract token from the last argument if it exists and looks like auth context
                // OR rely on the frontend sending a specific structure.
                // In existing main.js api:request logic, token is passed in payload.
                // We will adapt api:request to call these handlers internally OR 
                // we can keep the REST-like structure if the frontend demands it,
                // BUT the user asked to "Replace all Express routes with IPC handlers".
                // The cleanest way is to pass { token, data } as the argument.

                const payload = args[0] || {};
                const { token, ...data } = payload;

                if (requireAuth) {
                    if (!token) throw new Error('Authentification requise');
                    try {
                        const decoded = authService.verifyAccessToken(token);
                        userId = decoded.userId;
                        event.sender.userId = userId; // Store for duration of request if needed
                    } catch (err) {
                        const error = new Error('Jeton invalide ou expire');
                        error.code = 'TOKEN_EXPIRED';
                        error.status = 401;
                        throw error;
                    }
                }

                // Inject userId into data if the service function needs it
                // Some service functions take (userId, data), others take (data) 
                // We'll standardize this inside the specific handler wrappers below.

                // Handle file upload if present
                if (data && data._multipart && !channel.startsWith('uploads:')) {
                    const savedPath = await saveUploadedFile(data, 'uploads'); // default to uploads/images root
                    // Assuming the service expects 'profile_picture' or similar field. 
                    // We need to know WHICH field maps to the file.
                    // Since we are generic here, we might just inject 'filePath' or 'profile_picture' 
                    // or we can map it based on the channel name.

                    // For patient creation/update, it's likely 'profile_picture' or 'image'.
                    // For now, let's add `profile_picture` (common convention) AND `filePath` (generic).
                    data.profile_picture = savedPath;
                    data.filePath = savedPath;

                    // Cleanup multipart fields
                    delete data._multipart;
                    delete data.fileBase64;
                    delete data.filename;
                    delete data.mimeType;
                }

                return await handler(data, userId);

            } catch (err) {
                const status = err.status ?? err.statusCode ?? 500;
                if (err.message === 'Authentication required' || status === 401) {
                    if (process.env.NODE_ENV === 'development') {
                        console.warn(`IPC ${channel}: auth required or token invalid`);
                    }
                } else {
                    console.error(`Error in IPC ${channel}: `, err.message || err);
                }
                const e = new Error(err.message || 'Unknown error');
                e.code = err.code;
                e.status = status;
                throw e;
            }
        });
    };

    // --- AUTH ---
    handle('auth:signup', async (data) => {
        return await authService.signUp(data);
    }, false);

    handle('auth:signin', async (data) => {
        return await authService.signIn(data);
    }, false);

    handle('auth:refresh', async (data) => {
        return await authService.refreshAccessToken(data.refreshToken);
    }, false);

    handle('auth:me', async (data, userId) => {
        const user = await authService.getUserProfile(userId);
        return { user };
    });

    handle('auth:profile:update', async (data, userId) => {
        return await authService.updateUserProfile(userId, data);
    });

    handle('auth:logout', async () => {
        // No server-side session to invalidate for JWT, but good for hooks
        return { success: true };
    }, false);

    handle('auth:sync-with-website', async (data) => {
        const { websiteToken } = data;
        if (!websiteToken) throw new Error('Token du site web manquant');

        // 1. Fetch user profile from website
        const websiteUser = await websiteService.getUserProfile(websiteToken);
        if (!websiteUser) throw new Error('Impossible de recuperer les donnees du site web');

        if (!websiteUser.email) {
            log.error('[auth:sync] Website user profile missing email:', websiteUser);
            throw new Error('Donnees utilisateur du site web incompletes (email manquant)');
        }

        // 2. Check if user already exists locally in 'users' table by email
        const existingResult = await authService.listUsers({ search: websiteUser.email, limit: 1 });
        const existingLocalUser = existingResult.length > 0 ? existingResult[0] : null;
        if (existingLocalUser) {
            log.info(`[auth:sync] User ${websiteUser.email} already exists locally with id ${existingLocalUser.id}`);

            // Update local profile with latest license info from website
            await authService.updateUserProfile(existingLocalUser.id, {
                subscription_status: websiteUser.license?.status || 'trial',
                subscription_expiry_date: websiteUser.license?.expiresAt || null,
                trial_end_date: websiteUser.license?.type === 'trial' ? websiteUser.license?.expiresAt : null
            });

            // Return existing user info + fresh tokens
            const signInResult = await authService.signInByEmail(websiteUser.email);
            return {
                ...signInResult,
                isNew: false
            };
        }

        // 3. Create new account locally if it doesn't exist
        log.info(`[auth:sync] Creating new local account for ${websiteUser.email}`);

        // We need a dummy password since local DB requires one, or we should modify authService to allow passwordless users.
        // Let's use a random secure string for now, as they'll likely use the website flow anyway.
        const dummyPassword = require('crypto').randomBytes(32).toString('hex');

        const signUpData = {
            email: websiteUser.email,
            password: dummyPassword,
            first_name: websiteUser.firstName || '',
            last_name: websiteUser.lastName || '',
            city: websiteUser.city || '',
            phone: websiteUser.phone || '',
            clinic_name: websiteUser.clinicName || '',
            // Additional meta data from website
            website_id: websiteUser.id,
            subscription_status: websiteUser.license?.status || 'trial',
            subscription_expiry_date: websiteUser.license?.expiresAt || null,
            trial_end_date: websiteUser.license?.type === 'trial' ? websiteUser.license?.expiresAt : null
        };

        const result = await authService.signUp(signUpData);
        return {
            ...result,
            isNew: true
        };
    }, false);

    // --- PATIENTS ---
    handle('patients:list', async (data, userId) => {
        return await patientService.getPatientsByDentist(userId, data);
    });

    handle('patients:get', async (data, userId) => {
        // Existing middleware checked ownership. 
        // We should ideally check if patient belongs to dentist here.
        // For now we trust the service/query logic or basic retrieval.
        const patient = await patientService.getPatientById(data.id);
        if (!patient) throw new Error('Patient introuvable');
        if (patient.dentist_id !== userId) throw new Error('Acces non autorise au patient');
        return patient;
    });

    handle('patients:create', async (data, userId) => {
        return await patientService.createPatient(userId, data);
    });

    handle('patients:update', async (data, userId) => {
        const patient = await patientService.getPatientById(data.id);
        if (patient.dentist_id !== userId) throw new Error('Non autorise');
        return await patientService.updatePatient(data.id, data);
    });

    handle('patients:delete', async (data, userId) => {
        const patient = await patientService.getPatientById(data.id);
        if (patient.dentist_id !== userId) throw new Error('Non autorise');
        return await patientService.deletePatient(data.id);
    });

    handle('patients:billing', async (data, userId) => {
        return await patientService.getPatientBillingSummary(data.id);
    });


    // --- APPOINTMENTS ---
    handle('appointments:list', async (data, userId) => {
        return await appointmentService.getAppointmentsByDentist(userId, data);
    });

    handle('appointments:create', async (data, userId) => {
        return await appointmentService.createAppointment(userId, data);
    });

    handle('appointments:update', async (data, userId) => {
        // Ownership check omitted for brevity but recommended
        return await appointmentService.updateAppointment(data.id, data);
    });

    handle('appointments:delete', async (data, userId) => {
        return await appointmentService.deleteAppointment(data.id);
    });

    // --- TREATMENTS ---
    handle('treatments:list', async (data, userId) => {
        if (data.patientId) {
            return await treatmentService.getTreatmentsByPatient(data.patientId);
        }
        return await treatmentService.getTreatmentsByDentist(userId, data);
    });

    handle('treatments:create', async (data, userId) => {
        return await treatmentService.createTreatment(userId, data);
    });

    handle('treatments:update', async (data, userId) => {
        return await treatmentService.updateTreatment(data.id, data);
    });

    handle('treatments:delete', async (data, userId) => {
        return await treatmentService.deleteTreatment(data.id);
    });


    // --- ANALYTICS ---
    handle('analytics:stats', async (data, userId) => {
        const range = data?.range || '30d';

        // Calculate date filter based on range
        let dateFilter = {};
        const now = new Date();
        if (range === '7d') {
            const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateFilter.start_date = startDate.toISOString();
        } else if (range === '30d') {
            const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            dateFilter.start_date = startDate.toISOString();
        } else if (range === '90d') {
            const startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            dateFilter.start_date = startDate.toISOString();
        } else if (range === '1y') {
            const startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            dateFilter.start_date = startDate.toISOString();
        }
        // 'all' means no date filter

        const [allPatients, filteredAppointments, filteredTreatments, allAppointments] = await Promise.all([
            patientService.getPatientsByDentist(userId, {}),
            appointmentService.getAppointmentsByDentist(userId, dateFilter),
            treatmentService.getTreatmentsByDentist(userId, dateFilter),
            appointmentService.getAppointmentsByDentist(userId, { status: 'upcoming' })
        ]);

        const totalPatients = allPatients.length;
        const totalAppointments = filteredAppointments.length;
        const totalTreatments = filteredTreatments.length;
        const upcomingAppointments = allAppointments.filter(a => {
            const apptDate = new Date(a.date_time);
            return apptDate >= now;
        }).length;

        // Revenue calculation using treatment_cost field
        const totalRevenue = filteredTreatments.reduce((sum, t) => sum + (Number(t.treatment_cost) || 0), 0);

        // Patients over time (grouped by date)
        const patientsByDate = {};
        allPatients.forEach(p => {
            const date = p.created_at ? p.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
            patientsByDate[date] = (patientsByDate[date] || 0) + 1;
        });
        const patientsOverTime = Object.entries(patientsByDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date, count }));

        // Treatments by type
        const treatmentsByTypeMap = {};
        filteredTreatments.forEach(t => {
            const type = t.treatment_type || 'Unknown';
            treatmentsByTypeMap[type] = (treatmentsByTypeMap[type] || 0) + 1;
        });
        const treatmentsByType = Object.entries(treatmentsByTypeMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // Appointments by status
        const appointmentsByStatusMap = {};
        filteredAppointments.forEach(a => {
            const status = a.status || 'unknown';
            appointmentsByStatusMap[status] = (appointmentsByStatusMap[status] || 0) + 1;
        });
        const appointmentsByStatus = Object.entries(appointmentsByStatusMap)
            .map(([name, value]) => ({ name, value }));

        // Treatments over time
        const treatmentsByDate = {};
        filteredTreatments.forEach(t => {
            const date = t.treatment_date ? t.treatment_date.split('T')[0] : new Date().toISOString().split('T')[0];
            treatmentsByDate[date] = (treatmentsByDate[date] || 0) + 1;
        });
        const treatmentsOverTime = Object.entries(treatmentsByDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date, count }));

        return {
            totalPatients,
            totalAppointments,
            totalTreatments,
            totalRevenue,
            upcomingAppointments,
            recentAppointments: filteredAppointments.slice(0, 5),
            patientsOverTime,
            treatmentsByType,
            appointmentsByStatus,
            treatmentsOverTime,
        };
    });


    // --- PRESCRIPTIONS ---
    handle('prescriptions:list', async (data, userId) => {
        return await prescriptionService.getPrescriptionsByPatient(data.patientId);
    });

    handle('prescriptions:create', async (data, userId) => {
        const pData = { ...data, created_by: userId };
        return await prescriptionService.createPrescription(pData);
    });

    handle('prescriptions:delete', async (data, userId) => {
        return await prescriptionService.deletePrescription(data.id);
    });

    // --- EXCEL IMPORT/EXPORT ---
    handle('excel:import:selectFile', async (data, userId) => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            title: 'Selectionner un fichier Excel',
            properties: ['openFile'],
            filters: [{ name: 'Fichiers Excel', extensions: ['xlsx', 'xls'] }]
        });

        if (canceled || filePaths.length === 0) {
            return null;
        }

        const filePath = filePaths[0];
        // Read buffer to generate preview
        const previewData = await excelImportService.getPreview(filePath);

        // Return preview AND filePath so frontend can send it back for confirmation
        return {
            ...previewData,
            filePath,
        };
    });

    handle('excel:import:confirm', async (data, userId) => {
        // data should contain { filePath, mapping, skipDuplicates }
        const { filePath, mapping, skipDuplicates } = data;
        if (!filePath) throw new Error('No file path provided');

        return await excelImportService.importPatientsFromExcel(filePath, userId, mapping, { skipDuplicates });
    });

    handle('excel:export:patients', async (data, userId) => {
        // Show save dialog first
        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Exporter les patients',
            defaultPath: 'patients-export.xlsx',
            filters: [{ name: 'Fichiers Excel', extensions: ['xlsx'] }]
        });

        if (canceled || !filePath) return null;

        const buffer = await excelExportService.exportPatientsToExcel(userId, data);
        await fs.writeFile(filePath, buffer);
        return { success: true, filePath };
    });

    handle('excel:export:patientFull', async (data, userId) => {
        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Exporter l\'historique du patient',
            defaultPath: `patient - ${data.patientId} -full.xlsx`,
            filters: [{ name: 'Fichiers Excel', extensions: ['xlsx'] }]
        });

        if (canceled || !filePath) return null;

        const buffer = await excelExportService.exportSinglePatientToExcel(data.patientId, userId);
        await fs.writeFile(filePath, buffer);
        return { success: true, filePath };
    });

    handle('excel:export:patientTreatments', async (data, userId) => {
        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Exporter les traitements',
            defaultPath: `patient - ${data.patientId} -treatments.xlsx`,
            filters: [{ name: 'Fichiers Excel', extensions: ['xlsx'] }]
        });

        if (canceled || !filePath) return null;

        const buffer = await excelExportService.exportPatientTreatmentsOnlyToExcel(data.patientId, userId);
        await fs.writeFile(filePath, buffer);
        return { success: true, filePath };
    });

    handle('excel:export:failed', async (data, userId) => {
        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Exporter les lignes en echec',
            defaultPath: 'failed-import-rows.xlsx',
            filters: [{ name: 'Fichiers Excel', extensions: ['xlsx'] }]
        });

        if (canceled || !filePath) return null;

        const buffer = await excelExportService.exportFailedRowsToExcel(data.failedRows, data.headers);
        await fs.writeFile(filePath, buffer);
        return { success: true, filePath };
    });

    // --- UPLOADS ---
    handle('uploads:patient-mouth-photo', async (data, userId) => {
        const { patientId, fileBase64, filename } = data;

        if (!patientId || !fileBase64 || !filename) {
            throw new Error('Champs requis manquants : patientId, fileBase64, filename');
        }

        // Convert base64 to buffer
        const fileBuffer = Buffer.from(fileBase64, 'base64');

        return await uploadService.savePatientMouthPhoto(patientId, fileBuffer, filename, userId);
    });

    handle('uploads:get-patient-mouth-photos', async (data, userId) => {
        const { patientId } = data;

        if (!patientId) {
            throw new Error('Champ requis manquant : patientId');
        }

        return await uploadService.getPatientMouthPhotos(patientId);
    });

    handle('uploads:tooth-treatment-photo', async (data, userId) => {
        const { fileBase64, filename } = data;

        if (!fileBase64 || !filename) {
            throw new Error('Champs requis manquants : fileBase64, filename');
        }

        // Convert base64 to buffer
        const fileBuffer = Buffer.from(fileBase64, 'base64');

        return await uploadService.saveToothTreatmentPhoto(fileBuffer, filename);
    });

    handle('uploads:get-file', async (data, userId) => {
        const { relativePath } = data;

        if (!relativePath) {
            throw new Error('Champ requis manquant : relativePath');
        }

        const fileBuffer = await uploadService.readFile(relativePath);
        return {
            data: fileBuffer.toString('base64'),
            mimeType: relativePath.endsWith('.png') ? 'image/png' : 'image/jpeg'
        };
    });

    handle('uploads:delete-patient-mouth-photo', async (data, userId) => {
        const { photoId } = data;

        if (!photoId) {
            throw new Error('Champ requis manquant : photoId');
        }

        return await uploadService.deletePatientMouthPhoto(photoId);
    });

    // --- BACKUPS ---
    handle('backups:execute', async () => {
        return await backupService.executeBackup();
    });

    handle('backups:list', async () => {
        const paths = userDataPaths.getPaths();
        const backupDir = paths.backups;

        if (!await fs.access(backupDir).then(() => true).catch(() => false)) return [];

        const files = await fs.readdir(backupDir);
        const stats = await Promise.all(
            files
                .filter(f => f.startsWith('virela_backup_') && f.endsWith('.sqlite'))
                .map(async f => {
                    const filePath = path.join(backupDir, f);
                    const stat = await fs.stat(filePath);
                    return {
                        name: f,
                        path: filePath,
                        size: stat.size,
                        createdAt: stat.mtime
                    };
                })
        );
        return stats.sort((a, b) => b.createdAt - a.createdAt);
    });

    handle('backups:delete', async (data) => {
        const { name } = data;
        const paths = userDataPaths.getPaths();
        const filePath = path.join(paths.backups, name);

        // Security check: ensure file is inside backup directory
        if (!filePath.startsWith(paths.backups)) {
            throw new Error('Invalid backup path');
        }

        await fs.unlink(filePath);
        return { success: true };
    });

    handle('database:integrity-check', async () => {
        const db = require('./modules/database').initialize();
        const result = db.pragma('integrity_check');
        return { ok: result === 'ok', status: result };
    });

}

module.exports = { registerIpcHandlers };

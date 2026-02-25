const { query } = require('../modules/database');
const { generateUUID } = require('../utils/uuid');
const path = require('path');
const fs = require('fs-extra');
const { app } = require('electron');

const userDataPaths = require('../modules/userDataPaths');

/**
 * Get the uploads directory path (aligned with virela://images protocol)
 */
function getUploadsDir() {
    return userDataPaths.getPaths().images;
}

/**
 * Save a patient mouth photo
 * @param {string} patientId - Patient ID
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original filename
 * @param {string} createdBy - User ID who uploaded
 * @returns {Promise<object>} Photo record
 */
async function savePatientMouthPhoto(patientId, fileBuffer, fileName, createdBy) {
    const uploadsDir = getUploadsDir();
    const patientPhotosDir = path.join(uploadsDir, 'patient-mouth-photos', patientId);

    // Ensure directory exists
    await fs.ensureDir(patientPhotosDir);

    // Generate unique filename
    const ext = path.extname(fileName);
    const uniqueFileName = `${generateUUID()}${ext}`;
    const filePath = path.join(patientPhotosDir, uniqueFileName);

    // Save file
    await fs.writeFile(filePath, fileBuffer);

    // Store in database - path relative to images root for virela:// protocol
    const photoId = generateUUID();
    const relativePath = path.join('patient-mouth-photos', patientId, uniqueFileName).replace(/\\/g, '/');

    await query(
        `INSERT INTO patient_mouth_photos (
            id, patient_id, image_url, created_by, created_at
        ) VALUES ($1, $2, $3, $4, datetime('now'))`,
        [photoId, patientId, relativePath, createdBy]
    );

    return {
        id: photoId,
        patient_id: patientId,
        image_url: relativePath,
        created_by: createdBy
    };
}

/**
 * Get patient mouth photos
 * @param {string} patientId - Patient ID
 * @returns {Promise<Array>} Array of photo records
 */
async function getPatientMouthPhotos(patientId) {
    const result = await query(
        'SELECT * FROM patient_mouth_photos WHERE patient_id = $1 ORDER BY created_at DESC',
        [patientId]
    );

    return result.rows;
}

/**
 * Save a tooth treatment photo
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original filename
 * @returns {Promise<object>} Photo info with path
 */
async function saveToothTreatmentPhoto(fileBuffer, fileName) {
    const uploadsDir = getUploadsDir();
    const treatmentPhotosDir = path.join(uploadsDir, 'tooth-treatment-photos');

    // Ensure directory exists
    await fs.ensureDir(treatmentPhotosDir);

    // Generate unique filename
    const ext = path.extname(fileName);
    const uniqueFileName = `${generateUUID()}${ext}`;
    const filePath = path.join(treatmentPhotosDir, uniqueFileName);

    // Save file
    await fs.writeFile(filePath, fileBuffer);

    // Return relative path
    const relativePath = path.join('tooth-treatment-photos', uniqueFileName).replace(/\\/g, '/');

    return {
        path: relativePath,
        fileName: uniqueFileName
    };
}

/**
 * Get file absolute path from relative path
 * @param {string} relativePath - Relative path from uploads directory
 * @returns {string} Absolute file path
 */
function getFilePath(relativePath) {
    const uploadsDir = getUploadsDir();
    return path.join(uploadsDir, relativePath);
}

/**
 * Read file as buffer
 * @param {string} relativePath - Relative path from uploads directory
 * @returns {Promise<Buffer>} File buffer
 */
async function readFile(relativePath) {
    const filePath = getFilePath(relativePath);
    return await fs.readFile(filePath);
}

/**
 * Delete a patient mouth photo
 * @param {string} photoId - Photo ID
 */
async function deletePatientMouthPhoto(photoId) {
    // Get photo record
    const result = await query(
        'SELECT image_url FROM patient_mouth_photos WHERE id = $1',
        [photoId]
    );

    if (result.rows.length > 0) {
        const relativePath = result.rows[0].image_url;
        const filePath = getFilePath(relativePath);

        // Delete file if exists
        if (await fs.pathExists(filePath)) {
            await fs.remove(filePath);
        }

        // Delete from database
        await query('DELETE FROM patient_mouth_photos WHERE id = $1', [photoId]);
    }

    return { message: 'Photo deleted successfully' };
}

module.exports = {
    savePatientMouthPhoto,
    getPatientMouthPhotos,
    saveToothTreatmentPhoto,
    getFilePath,
    readFile,
    deletePatientMouthPhoto
};

/**
 * Excel Export Service.
 * Exports patients (and optionally treatments) to .xlsx with proper formatting,
 * date formatting, auto-sized columns, and formula-injection-safe cell values.
 */

const ExcelJS = require('exceljs');
const { getPatientsByDentist, getPatientById } = require('./patient.service');
const { getTreatmentsByPatient } = require('./treatment.service');
const { query } = require('../modules/database');
const { escapeForExcel } = require('../utils/excel-sanitize');

const PATIENT_EXPORT_COLUMNS = [
    { key: 'first_name', header: 'Prenom', width: 18 },
    { key: 'last_name', header: 'Nom', width: 18 },
    { key: 'cin', header: 'CIN', width: 14 },
    { key: 'email', header: 'E-mail', width: 24 },
    { key: 'phone', header: 'Telephone', width: 16 },
    { key: 'date_of_birth', header: 'Date de naissance', width: 14 },
    { key: 'address', header: 'Adresse', width: 30 },
    { key: 'medical_notes', header: 'Notes medicales', width: 28 },
    { key: 'created_at', header: 'Cree le', width: 20 },
];

const TREATMENT_EXPORT_COLUMNS = [
    { key: 'patient_id', header: 'ID patient', width: 38 },
    { key: 'patient_name', header: 'Nom du patient', width: 24 },
    { key: 'tooth_number', header: 'Dent', width: 8 },
    { key: 'treatment_type', header: 'Type de traitement', width: 20 },
    { key: 'treatment_date', header: 'Date', width: 12 },
    { key: 'treatment_cost', header: 'Cout', width: 12 },
    { key: 'payment_status', header: 'Statut de paiement', width: 14 },
    { key: 'amount_paid', header: 'Montant paye', width: 12 },
    { key: 'notes', header: 'Notes', width: 24 },
];

const TREATMENT_EXPORT_COLUMNS_SINGLE = [
    { key: 'tooth_number', header: 'Dent', width: 8 },
    { key: 'treatment_type', header: 'Type de traitement', width: 20 },
    { key: 'treatment_date', header: 'Date', width: 12 },
    { key: 'treatment_cost', header: 'Cout', width: 12 },
    { key: 'payment_status', header: 'Statut de paiement', width: 14 },
    { key: 'amount_paid', header: 'Montant paye', width: 12 },
    { key: 'notes', header: 'Notes', width: 24 },
];

/**
 * Safe cell value: escape formula injection for export.
 * @param {*} value
 * @returns {string|number}
 */
function safeCellValue(value) {
    if (value == null) return '';
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return escapeForExcel(value);
}

/**
 * Export all patients for a dentist, optionally filtered by date (created_at).
 * @param {string} dentistId
 * @param {{ startDate?: string, endDate?: string }} filters - ISO date strings
 * @returns {Promise<Buffer>}
 */
async function exportPatientsToExcel(dentistId, filters = {}) {
    let patients = await getPatientsByDentist(dentistId, { limit: 50000 });
    if (filters.startDate || filters.endDate) {
        const start = filters.startDate ? new Date(filters.startDate) : null;
        const end = filters.endDate ? new Date(filters.endDate) : null;
        patients = patients.filter((p) => {
            // In SQLite, dates are strings.
            const d = p.created_at ? new Date(p.created_at) : null;
            if (!d) return false;
            if (start && d < start) return false;
            if (end && d > end) return false;
            return true;
        });
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Virela Desktop';
    const ws = wb.addWorksheet('Patients', { views: [{ state: 'frozen', ySplit: 1 }] });

    PATIENT_EXPORT_COLUMNS.forEach((col, i) => {
        ws.getColumn(i + 1).width = col.width;
        ws.getCell(1, i + 1).value = col.header;
        ws.getCell(1, i + 1).font = { bold: true };
    });

    patients.forEach((row, rowIndex) => {
        PATIENT_EXPORT_COLUMNS.forEach((col, colIndex) => {
            const raw = row[col.key];
            let val = raw;
            if (raw instanceof Date) val = raw.toISOString().slice(0, 10);
            else if (typeof raw === 'string' || (raw != null && typeof raw === 'object')) val = safeCellValue(raw);
            ws.getCell(rowIndex + 2, colIndex + 1).value = val;
        });
    });

    // Sheet 2: All Treatments (with patient reference)
    // SQLite concatenation: ||
    const treatmentsResult = await query(
        `SELECT t.id, t.patient_id, t.tooth_number, t.treatment_type, t.treatment_date, t.treatment_cost, t.payment_status, t.amount_paid, t.notes,
            p.first_name || ' ' || p.last_name AS patient_name
     FROM tooth_treatments t
     JOIN patients p ON t.patient_id = p.id
     WHERE p.dentist_id = $1
     ORDER BY p.last_name, p.first_name, t.treatment_date DESC
     LIMIT 50000`,
        [dentistId]
    );
    const allTreatments = treatmentsResult.rows;
    const wsTreatments = wb.addWorksheet('Traitements', { views: [{ state: 'frozen', ySplit: 1 }] });
    TREATMENT_EXPORT_COLUMNS.forEach((col, i) => {
        wsTreatments.getColumn(i + 1).width = col.width;
        wsTreatments.getCell(1, i + 1).value = col.header;
        wsTreatments.getCell(1, i + 1).font = { bold: true };
    });
    allTreatments.forEach((row, rowIndex) => {
        const rowData = {
            ...row,
            patient_name: row.patient_name,
        };
        TREATMENT_EXPORT_COLUMNS.forEach((col, colIndex) => {
            wsTreatments.getCell(rowIndex + 2, colIndex + 1).value = safeCellValue(rowData[col.key]);
        });
    });

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

/**
 * Export a single patient with their treatments to Excel.
 * @param {string} patientId
 * @param {string} dentistId - For ownership check
 * @returns {Promise<Buffer>}
 */
async function exportSinglePatientToExcel(patientId, dentistId) {
    const patient = await getPatientById(patientId);
    if (!patient || patient.dentist_id !== dentistId) {
        throw new Error('Patient not found or access denied');
    }
    const treatments = await getTreatmentsByPatient(patientId);

    const wb = new ExcelJS.Workbook();
    const wsPatient = wb.addWorksheet('Informations patient', { views: [{ state: 'frozen', ySplit: 1 }] });
    PATIENT_EXPORT_COLUMNS.forEach((col, i) => {
        wsPatient.getColumn(i + 1).width = col.width;
        wsPatient.getCell(1, i + 1).value = col.header;
        wsPatient.getCell(1, i + 1).font = { bold: true };
        wsPatient.getCell(2, i + 1).value = safeCellValue(patient[col.key]);
    });

    const wsTreatments = wb.addWorksheet('Historique des traitements', { views: [{ state: 'frozen', ySplit: 1 }] });
    TREATMENT_EXPORT_COLUMNS_SINGLE.forEach((col, i) => {
        wsTreatments.getColumn(i + 1).width = col.width;
        wsTreatments.getCell(1, i + 1).value = col.header;
        wsTreatments.getCell(1, i + 1).font = { bold: true };
    });
    treatments.forEach((row, rowIndex) => {
        TREATMENT_EXPORT_COLUMNS_SINGLE.forEach((col, colIndex) => {
            wsTreatments.getCell(rowIndex + 2, colIndex + 1).value = safeCellValue(row[col.key]);
        });
    });

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

/**
 * Export treatments only for a single patient (one sheet).
 * @param {string} patientId
 * @param {string} dentistId - For ownership check
 * @returns {Promise<Buffer>}
 */
async function exportPatientTreatmentsOnlyToExcel(patientId, dentistId) {
    const patient = await getPatientById(patientId);
    if (!patient || patient.dentist_id !== dentistId) {
        throw new Error('Patient not found or access denied');
    }
    const treatments = await getTreatmentsByPatient(patientId);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Historique des traitements', { views: [{ state: 'frozen', ySplit: 1 }] });
    TREATMENT_EXPORT_COLUMNS_SINGLE.forEach((col, i) => {
        ws.getColumn(i + 1).width = col.width;
        ws.getCell(1, i + 1).value = col.header;
        ws.getCell(1, i + 1).font = { bold: true };
    });
    treatments.forEach((row, rowIndex) => {
        TREATMENT_EXPORT_COLUMNS_SINGLE.forEach((col, colIndex) => {
            ws.getCell(rowIndex + 2, colIndex + 1).value = safeCellValue(row[col.key]);
        });
    });

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

/**
 * Build Excel file from failed import rows (for download).
 * @param {Record<string, unknown>[]} failedRows
 * @param {string[]} headers - Optional column order
 * @returns {Promise<Buffer>}
 */
async function exportFailedRowsToExcel(failedRows, headers = []) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Failed Rows', { views: [{ state: 'frozen', ySplit: 1 }] });
    const allKeys = headers.length ? headers : [...new Set(failedRows.flatMap((r) => Object.keys(r)))];
    allKeys.forEach((k, i) => {
        ws.getColumn(i + 1).width = 16;
        ws.getCell(1, i + 1).value = k;
        ws.getCell(1, i + 1).font = { bold: true };
    });
    failedRows.forEach((row, rowIndex) => {
        allKeys.forEach((key, colIndex) => {
            ws.getCell(rowIndex + 2, colIndex + 1).value = safeCellValue(row[key]);
        });
    });
    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

module.exports = {
    exportPatientsToExcel,
    exportSinglePatientToExcel,
    exportPatientTreatmentsOnlyToExcel,
    exportFailedRowsToExcel
};

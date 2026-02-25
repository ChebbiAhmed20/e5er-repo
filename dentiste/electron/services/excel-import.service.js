/**
 * Excel Import Service.
 * Reads .xlsx, applies column mapping, validates, checks duplicates, inserts in batches with transaction.
 * Uses parameterized queries only. Does not block; suitable for async + progress reporting.
 */

const ExcelJS = require('exceljs');
const { query, beginTransaction, commitTransaction, rollbackTransaction } = require('../modules/database');
const { generateUUID } = require('../utils/uuid');
const { sanitizeRowForImport } = require('../utils/excel-sanitize');
const {
    EXCEL_IMPORT_BATCH_SIZE,
    EXCEL_PREVIEW_MAX_ROWS,
    PATIENT_IMPORT_FIELDS,
    PATIENT_HEADER_ALIASES,
} = require('../utils/excel-constants');
const {
    validatePatientRow,
    normalizePatientRow,
} = require('../utils/excel.validator');

const PATIENT_STRING_KEYS = ['first_name', 'last_name', 'cin', 'email', 'phone', 'address', 'medical_notes'];

/**
 * Load workbook from buffer or file path.
 * @param {Buffer|string} input - Buffer or file path
 * @returns {Promise<ExcelJS.Workbook>}
 */
async function loadWorkbook(input) {
    const wb = new ExcelJS.Workbook();
    if (Buffer.isBuffer(input)) {
        await wb.xlsx.load(input);
    } else if (typeof input === 'string') {
        await wb.xlsx.readFile(input);
    } else {
        throw new Error('Invalid input arguments to loadWorkbook');
    }
    return wb;
}

/**
 * Get first worksheet and read header row (row 1) and all data rows.
 * ExcelJS row.values is 1-based (index 0 unused); we use 0-based arrays.
 * @param {ExcelJS.Workbook} wb
 * @returns {{ headers: string[], rows: unknown[][] }}
 */
function getSheetData(wb) {
    const sheet = wb.worksheets[0];
    if (!sheet) throw new Error('Excel file has no worksheets');
    const headerRow = sheet.getRow(1);
    const headerValues = headerRow.values || [];
    const headers = [];
    for (let i = 1; i < headerValues.length; i++) {
        const v = headerValues[i] != null ? String(headerValues[i]).trim() : '';
        headers.push(v || `Column_${i}`);
    }
    if (headers.length === 0) headers.push('Column_1');
    const rows = [];
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;
        const raw = row.values || [];
        const values = [];
        for (let i = 1; i < headers.length + 1; i++) {
            // ExcelJS row.values is 1-based, index 1 corresponds to column 1
            values.push(raw[i] !== undefined ? raw[i] : null);
        }
        rows.push(values);
    });
    return { headers, rows };
}

/**
 * Map Excel row (array by column index) to object using columnMapping.
 * columnMapping: { "0": "first_name", "1": "last_name", ... } (index as string) or by header name.
 * We support mapping by header: { "First Name": "first_name", "Last Name": "last_name" }.
 * @param {unknown[]} rowValues
 * @param {string[]} headers
 * @param {Record<string, string>} columnMapping - keys are header names or column indices
 */
function mapRowToObject(rowValues, headers, columnMapping) {
    const obj = {};
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        const dbField = columnMapping[header] ?? columnMapping[String(i)];
        if (dbField && PATIENT_IMPORT_FIELDS.includes(dbField)) {
            const raw = rowValues[i];
            if (raw !== undefined && raw !== null && raw !== '') {
                obj[dbField] = raw;
            }
        }
    }
    return obj;
}

/**
 * Resolve header alias to DB field (e.g. "full_name" -> first_name; caller may map full_name to first_name and last_name separately).
 */
function resolveHeaderToField(header) {
    const trimmed = (header || '').trim().toLowerCase().replace(/\s+/g, '_');
    return PATIENT_HEADER_ALIASES[trimmed] || trimmed;
}

/**
 * Build default column mapping: each header maps to itself or alias.
 * @param {string[]} headers
 * @returns {Record<string, string>}
 */
function buildDefaultColumnMapping(headers) {
    const mapping = {};
    headers.forEach((h, i) => {
        const field = resolveHeaderToField(h);
        if (PATIENT_IMPORT_FIELDS.includes(field)) {
            mapping[h] = field;
        } else {
            mapping[h] = field || `column_${i}`;
        }
    });
    return mapping;
}

/**
 * Parse Excel buffer and return headers + first N rows for preview.
 * @param {Buffer|string} input
 * @param {number} maxRows
 * @returns {Promise<{ headers: string[], preview: Record<string, unknown>[], columnMappingSuggestions: Record<string, string> }>}
 */
async function getPreview(input, maxRows = EXCEL_PREVIEW_MAX_ROWS) {
    const wb = await loadWorkbook(input);
    const { headers, rows } = getSheetData(wb);
    const columnMappingSuggestions = buildDefaultColumnMapping(headers);
    const preview = [];
    const mapping = columnMappingSuggestions;
    for (let i = 0; i < Math.min(rows.length, maxRows); i++) {
        const rowValues = rows[i];
        const obj = mapRowToObject(rowValues, headers, mapping);
        preview.push(obj);
    }
    return { headers, preview, columnMappingSuggestions: mapping };
}

/**
 * Fetch existing patient identifiers (phone, cin) for dentist in one query.
 * Returns a Set of composite keys "phone:value" and "cin:value" for quick lookup.
 * @param {string} dentistId
 * @param {{ phone?: string | null, cin?: string | null }[]} rows - normalized rows with phone/cin
 * @returns {Promise<Set<string>>} set of keys like "phone:123" or "cin:ABC"
 */
async function getExistingPatientKeys(dentistId, rows) {
    const phones = [];
    const cins = [];
    for (const row of rows) {
        const p = row.phone != null && String(row.phone).trim() !== '' ? String(row.phone).trim() : null;
        const c = row.cin != null && String(row.cin).trim() !== '' ? String(row.cin).trim() : null;
        if (p) phones.push(p);
        if (c) cins.push(c);
    }
    const uniquePhones = [...new Set(phones)];
    const uniqueCins = [...new Set(cins)];
    if (uniquePhones.length === 0 && uniqueCins.length === 0) return new Set();

    const conditions = [];
    const params = [dentistId];
    let paramIndex = 2;

    // SQLite doesn't natively support ANY(array), using IN (...)
    if (uniquePhones.length > 0) {
        const placeholders = uniquePhones.map(() => `$${paramIndex++}`).join(',');
        conditions.push(`phone IN (${placeholders})`);
        params.push(...uniquePhones);
    }

    if (uniqueCins.length > 0) {
        const placeholders = uniqueCins.map(() => `$${paramIndex++}`).join(',');
        conditions.push(`cin IN (${placeholders})`);
        params.push(...uniqueCins);
    }

    const q = `SELECT phone, cin FROM patients WHERE dentist_id = $1 AND (${conditions.join(' OR ')})`;
    const res = await query(q, params);
    const keys = new Set();
    for (const r of res.rows) {
        if (r.phone) keys.add('phone:' + String(r.phone).trim());
        if (r.cin) keys.add('cin:' + String(r.cin).trim());
    }
    return keys;
}

/** @param {Record<string, unknown>} row - normalized patient row */
function getRowDuplicateKey(row) {
    const hasPhone = row.phone != null && String(row.phone).trim() !== '';
    const hasCin = row.cin != null && String(row.cin).trim() !== '';
    if (hasPhone) return 'phone:' + String(row.phone).trim();
    if (hasCin) return 'cin:' + String(row.cin).trim();
    return null;
}

/**
 * Insert a batch of patients. Uses parameterized queries. Call within transaction (client).
 * @param {import('../modules/database').TransactionClient} client
 * @param {string} dentistId
 * @param {Record<string, unknown>[]} batch
 * @returns {Promise<{ inserted: number }>}
 */
async function insertPatientBatch(client, dentistId, batch) {
    let inserted = 0;
    for (const row of batch) {
        const id = generateUUID();
        await client.query(
            `INSERT INTO patients (
        id, dentist_id, first_name, last_name, cin, email, phone,
        date_of_birth, address, medical_notes,
        sms_reminders_enabled, email_reminders_enabled,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 
        datetime('now'), datetime('now')
      )`,
            [
                id,
                dentistId,
                row.first_name ?? '',
                row.last_name ?? '',
                row.cin ?? null,
                row.email ?? null,
                row.phone ?? null,
                row.date_of_birth ?? null,
                row.address ?? null,
                row.medical_notes ?? null,
                row.sms_reminders_enabled !== false ? 1 : 0,
                row.email_reminders_enabled !== false ? 1 : 0,
            ]
        );
        inserted++;
    }
    return { inserted };
}

/**
 * Full import: validate, dedupe, batch insert in transaction. Returns summary and failed rows.
 * @param {Buffer|string} input - Excel file buffer or path
 * @param {string} dentistId - From JWT
 * @param {Record<string, string>} columnMapping - e.g. { "First Name": "first_name", "Last Name": "last_name" }
 * @param {{ skipDuplicates?: boolean }} options - If true, skip duplicate rows instead of failing them
 * @returns {Promise<{ imported: number, failed: number, errors: Array<{ row: number, field?: string, message: string }>, failedRows: Record<string, unknown>[], preview?: { headers: string[], preview: Record<string, unknown>[] }>}>}
 */
async function importPatientsFromExcel(input, dentistId, columnMapping, options = {}) {
    const wb = await loadWorkbook(input);
    const { headers, rows } = getSheetData(wb);
    const allErrors = [];
    const validRows = [];
    const failedRows = [];
    const skipDuplicates = options.skipDuplicates === true;

    // First pass: validate and normalize all rows
    const normalizedCandidates = [];
    for (let i = 0; i < rows.length; i++) {
        const rowIndex = i + 2;
        const rowValues = rows[i];
        const rawObj = mapRowToObject(rowValues, headers, columnMapping);
        const sanitized = sanitizeRowForImport(rawObj, PATIENT_STRING_KEYS);
        const validation = validatePatientRow(sanitized, rowIndex);
        if (!validation.valid) {
            allErrors.push(...validation.errors);
            failedRows.push({ _row: rowIndex, ...rawObj });
            continue;
        }
        const normalized = normalizePatientRow(sanitized);
        normalizedCandidates.push({ rowIndex, normalized });
    }

    // Batch duplicate check: one query for all existing phone/cin
    if (normalizedCandidates.length > 0) {
        const existingKeys = await getExistingPatientKeys(
            dentistId,
            normalizedCandidates.map((c) => c.normalized)
        );

        for (const { rowIndex, normalized } of normalizedCandidates) {
            const dupKey = getRowDuplicateKey(normalized);
            const isDup = dupKey !== null && existingKeys.has(dupKey);
            if (isDup && !skipDuplicates) {
                allErrors.push({ row: rowIndex, field: 'phone/cin', message: 'Duplicate patient (phone or CIN already exists)' });
                failedRows.push({ _row: rowIndex, ...normalized });
                continue;
            }
            if (isDup && skipDuplicates) {
                continue;
            }
            validRows.push(normalized);
        }
    }

    let imported = 0;

    if (validRows.length > 0) {
        const client = await beginTransaction();
        try {
            for (let b = 0; b < validRows.length; b += EXCEL_IMPORT_BATCH_SIZE) {
                const batch = validRows.slice(b, b + EXCEL_IMPORT_BATCH_SIZE);
                const { inserted } = await insertPatientBatch(client, dentistId, batch);
                imported += inserted;
            }
            await commitTransaction(client);
        } catch (err) {
            await rollbackTransaction(client);
            throw err;
        }
    }

    return {
        imported,
        failed: failedRows.length,
        errors: allErrors,
        failedRows,
    };
}

module.exports = {
    getPreview,
    importPatientsFromExcel,
    buildDefaultColumnMapping
};

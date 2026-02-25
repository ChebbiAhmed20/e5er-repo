/**
 * Validation for Excel import rows.
 * Returns structured error objects; does not throw.
 * All string inputs should be sanitized (formula injection) before or inside here.
 */

const validator = require('validator');
const {
    PATIENT_IMPORT_FIELDS,
    TREATMENT_IMPORT_FIELDS,
} = require('./excel-constants');

const PAYMENT_STATUSES = ['paid', 'unpaid', 'partially_paid'];

/** Max lengths (DB / business) */
const LIMITS = {
    first_name: 255,
    last_name: 255,
    cin: 50,
    email: 255,
    phone: 50,
    address: 1000,
    medical_notes: 5000,
    treatment_type: 255,
    notes: 5000,
};

/**
 * Validate a single patient row. Row keys should already be DB field names.
 * @param {Record<string, unknown>} row - One row (object)
 * @param {number} rowIndex - 1-based row number for error messages
 * @returns {{ valid: boolean, errors: Array<{ row: number, field: string, message: string }> }}
 */
function validatePatientRow(row, rowIndex) {
    const errors = [];

    const first_name = row.first_name != null ? String(row.first_name).trim() : '';
    const last_name = row.last_name != null ? String(row.last_name).trim() : '';
    if (!first_name) {
        errors.push({ row: rowIndex, field: 'first_name', message: 'First name is required' });
    } else if (first_name.length > LIMITS.first_name) {
        errors.push({ row: rowIndex, field: 'first_name', message: `First name must be at most ${LIMITS.first_name} characters` });
    }
    if (!last_name) {
        errors.push({ row: rowIndex, field: 'last_name', message: 'Last name is required' });
    } else if (last_name.length > LIMITS.last_name) {
        errors.push({ row: rowIndex, field: 'last_name', message: `Last name must be at most ${LIMITS.last_name} characters` });
    }

    if (row.cin != null && row.cin !== '') {
        const cin = String(row.cin).trim();
        if (cin.length > LIMITS.cin) {
            errors.push({ row: rowIndex, field: 'cin', message: `CIN must be at most ${LIMITS.cin} characters` });
        }
    }

    if (row.email != null && row.email !== '') {
        const email = String(row.email).trim();
        if (!validator.isEmail(email)) {
            errors.push({ row: rowIndex, field: 'email', message: 'Invalid email format' });
        } else if (email.length > LIMITS.email) {
            errors.push({ row: rowIndex, field: 'email', message: `Email must be at most ${LIMITS.email} characters` });
        }
    }

    if (row.phone != null && row.phone !== '') {
        const phone = String(row.phone).trim();
        if (phone.length > LIMITS.phone) {
            errors.push({ row: rowIndex, field: 'phone', message: `Phone must be at most ${LIMITS.phone} characters` });
        }
    }

    if (row.date_of_birth != null && row.date_of_birth !== '') {
        const dob = row.date_of_birth;
        let dateObj = null;
        if (dob instanceof Date) {
            dateObj = dob;
        } else if (typeof dob === 'string' || typeof dob === 'number') {
            const parsed = new Date(dob);
            if (Number.isNaN(parsed.getTime())) {
                errors.push({ row: rowIndex, field: 'date_of_birth', message: 'Invalid date format for date of birth' });
            } else {
                dateObj = parsed;
            }
        }
        if (dateObj && dateObj > new Date()) {
            errors.push({ row: rowIndex, field: 'date_of_birth', message: 'Date of birth cannot be in the future' });
        }
    }

    if (row.address != null && String(row.address).length > LIMITS.address) {
        errors.push({ row: rowIndex, field: 'address', message: `Address must be at most ${LIMITS.address} characters` });
    }
    if (row.medical_notes != null && String(row.medical_notes).length > LIMITS.medical_notes) {
        errors.push({ row: rowIndex, field: 'medical_notes', message: `Medical notes must be at most ${LIMITS.medical_notes} characters` });
    }

    if (row.sms_reminders_enabled != null && row.sms_reminders_enabled !== '' && typeof row.sms_reminders_enabled !== 'boolean') {
        const v = String(row.sms_reminders_enabled).toLowerCase();
        if (v !== 'true' && v !== 'false' && v !== '1' && v !== '0' && v !== 'yes' && v !== 'no') {
            errors.push({ row: rowIndex, field: 'sms_reminders_enabled', message: 'Must be boolean-like (true/false/yes/no)' });
        }
    }
    if (row.email_reminders_enabled != null && row.email_reminders_enabled !== '' && typeof row.email_reminders_enabled !== 'boolean') {
        const v = String(row.email_reminders_enabled).toLowerCase();
        if (v !== 'true' && v !== 'false' && v !== '1' && v !== '0' && v !== 'yes' && v !== 'no') {
            errors.push({ row: rowIndex, field: 'email_reminders_enabled', message: 'Must be boolean-like (true/false/yes/no)' });
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Validate a single treatment row. patient_id is set server-side; we validate other fields.
 * @param {Record<string, unknown>} row
 * @param {number} rowIndex
 * @returns {{ valid: boolean, errors: Array<{ row: number, field: string, message: string }> }}
 */
function validateTreatmentRow(row, rowIndex) {
    const errors = [];

    const tooth_number = row.tooth_number != null ? Number(row.tooth_number) : NaN;
    if (Number.isNaN(tooth_number) || tooth_number < 1 || tooth_number > 32) {
        errors.push({ row: rowIndex, field: 'tooth_number', message: 'Tooth number must be between 1 and 32' });
    }

    const treatment_type = row.treatment_type != null ? String(row.treatment_type).trim() : '';
    if (!treatment_type) {
        errors.push({ row: rowIndex, field: 'treatment_type', message: 'Treatment type is required' });
    } else if (treatment_type.length > LIMITS.treatment_type) {
        errors.push({ row: rowIndex, field: 'treatment_type', message: `Treatment type must be at most ${LIMITS.treatment_type} characters` });
    }

    // treatment_date: when provided must be valid; when empty we allow default on normalize
    if (row.treatment_date != null && row.treatment_date !== '') {
        const d = row.treatment_date;
        let dateObj = null;
        if (d instanceof Date) dateObj = d;
        else {
            const parsed = new Date(d);
            if (Number.isNaN(parsed.getTime())) {
                errors.push({ row: rowIndex, field: 'treatment_date', message: 'Invalid treatment date' });
            } else {
                dateObj = parsed;
            }
        }
    }

    const cost = row.treatment_cost != null && row.treatment_cost !== '' ? Number(row.treatment_cost) : 0;
    if (row.treatment_cost != null && row.treatment_cost !== '') {
        if (Number.isNaN(cost) || cost < 0) {
            errors.push({ row: rowIndex, field: 'treatment_cost', message: 'Treatment cost must be a non-negative number' });
        } else if (cost > 9999999.99) {
            errors.push({ row: rowIndex, field: 'treatment_cost', message: 'Treatment cost exceeds maximum (9999999.99)' });
        }
    }

    if (row.payment_status != null && row.payment_status !== '') {
        const status = String(row.payment_status).toLowerCase().trim();
        if (!PAYMENT_STATUSES.includes(status)) {
            errors.push({ row: rowIndex, field: 'payment_status', message: `payment_status must be one of: ${PAYMENT_STATUSES.join(', ')}` });
        }
    }

    const amount_paid = row.amount_paid != null && row.amount_paid !== '' ? Number(row.amount_paid) : 0;
    if (row.amount_paid != null && row.amount_paid !== '') {
        if (Number.isNaN(amount_paid) || amount_paid < 0) {
            errors.push({ row: rowIndex, field: 'amount_paid', message: 'Amount paid must be a non-negative number' });
        } else if (amount_paid > 9999999.99) {
            errors.push({ row: rowIndex, field: 'amount_paid', message: 'Amount paid exceeds maximum (9999999.99)' });
        }
    }

    if (row.notes != null && String(row.notes).length > LIMITS.notes) {
        errors.push({ row: rowIndex, field: 'notes', message: `Notes must be at most ${LIMITS.notes} characters` });
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Normalize a patient row for DB: coerce types and apply defaults.
 * Call after validation. Sanitization (formula) should be done before.
 */
function normalizePatientRow(row) {
    const r = { ...row };
    if (r.date_of_birth != null && r.date_of_birth !== '') {
        const d = r.date_of_birth instanceof Date ? r.date_of_birth : new Date(r.date_of_birth);
        r.date_of_birth = Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    } else {
        r.date_of_birth = null;
    }
    if (r.sms_reminders_enabled === undefined || r.sms_reminders_enabled === '') r.sms_reminders_enabled = true;
    else if (typeof r.sms_reminders_enabled !== 'boolean') {
        const v = String(r.sms_reminders_enabled).toLowerCase();
        r.sms_reminders_enabled = ['true', '1', 'yes'].includes(v);
    }
    if (r.email_reminders_enabled === undefined || r.email_reminders_enabled === '') r.email_reminders_enabled = true;
    else if (typeof r.email_reminders_enabled !== 'boolean') {
        const v = String(r.email_reminders_enabled).toLowerCase();
        r.email_reminders_enabled = ['true', '1', 'yes'].includes(v);
    }
    ['first_name', 'last_name', 'cin', 'email', 'phone', 'address', 'medical_notes'].forEach((k) => {
        if (r[k] != null && r[k] !== '') r[k] = String(r[k]).trim();
        else r[k] = null;
    });
    return r;
}

/**
 * Normalize treatment row for DB.
 */
function normalizeTreatmentRow(row) {
    const r = { ...row };
    if (r.treatment_date != null && r.treatment_date !== '') {
        const d = r.treatment_date instanceof Date ? r.treatment_date : new Date(r.treatment_date);
        r.treatment_date = Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    } else {
        r.treatment_date = new Date().toISOString().slice(0, 10);
    }
    r.treatment_cost = r.treatment_cost != null && r.treatment_cost !== '' ? Number(r.treatment_cost) : 0;
    r.amount_paid = r.amount_paid != null && r.amount_paid !== '' ? Number(r.amount_paid) : 0;
    r.tooth_number = r.tooth_number != null ? Number(r.tooth_number) : null;
    r.payment_status = (r.payment_status && String(r.payment_status).toLowerCase().trim()) || 'unpaid';
    if (!PAYMENT_STATUSES.includes(r.payment_status)) r.payment_status = 'unpaid';
    if (r.notes != null && r.notes !== '') r.notes = String(r.notes).trim();
    else r.notes = null;
    return r;
}

module.exports = {
    validatePatientRow,
    normalizePatientRow,
    validateTreatmentRow,
    normalizeTreatmentRow,
};

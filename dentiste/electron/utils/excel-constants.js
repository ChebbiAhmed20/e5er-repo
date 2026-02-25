/**
 * Constants for Excel import/export.
 * Used to enforce limits and batch sizes without blocking UI or overloading memory.
 */

/** Max upload size in bytes (10 MB) */
const EXCEL_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Batch size for DB inserts (e.g. 500 rows per batch) */
const EXCEL_IMPORT_BATCH_SIZE = 500;

/** Number of rows to show in preview */
const EXCEL_PREVIEW_MAX_ROWS = 20;

/** Allowed patient DB fields for import (no id, dentist_id, created_at, updated_at) */
const PATIENT_IMPORT_FIELDS = [
    'first_name',
    'last_name',
    'cin',
    'email',
    'phone',
    'date_of_birth',
    'address',
    'medical_notes',
    'sms_reminders_enabled',
    'email_reminders_enabled',
];

/** Optional mapping from common Excel header names to DB fields */
const PATIENT_HEADER_ALIASES = {
    full_name: 'first_name', // caller can split or map to first_name + last_name
    name: 'first_name',
    birth_date: 'date_of_birth',
    dob: 'date_of_birth',
    tel: 'phone',
    telephone: 'phone',
    mobile: 'phone',
    notes: 'medical_notes',
};

/** tooth_treatments fields we allow for import (patient_id set server-side from mapping or from row) */
const TREATMENT_IMPORT_FIELDS = [
    'tooth_number',
    'treatment_type',
    'notes',
    'treatment_date',
    'treatment_cost',
    'payment_status',
    'amount_paid',
];

const TREATMENT_HEADER_ALIASES = {
    tooth: 'tooth_number',
    type: 'treatment_type',
    date: 'treatment_date',
    cost: 'treatment_cost',
    price: 'treatment_cost',
    status: 'payment_status',
    paid: 'amount_paid',
};

module.exports = {
    EXCEL_MAX_FILE_SIZE_BYTES,
    EXCEL_IMPORT_BATCH_SIZE,
    EXCEL_PREVIEW_MAX_ROWS,
    PATIENT_IMPORT_FIELDS,
    PATIENT_HEADER_ALIASES,
    TREATMENT_IMPORT_FIELDS,
    TREATMENT_HEADER_ALIASES,
};

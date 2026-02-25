const { query } = require('../modules/database');
const { generateUUID } = require('../utils/uuid');



const createPatient = async (dentistId, patientData) => {
    const patientId = generateUUID();

    await query(
        `INSERT INTO patients (
      id, dentist_id, first_name, last_name, cin, email, phone,
      date_of_birth, address, medical_notes,
      sms_reminders_enabled, email_reminders_enabled,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, datetime('now'), datetime('now'))`,
        [
            patientId,
            dentistId,
            patientData.first_name,
            patientData.last_name,
            patientData.cin || null,
            patientData.email || null,
            patientData.phone || null,
            patientData.date_of_birth || null,
            patientData.address || null,
            patientData.medical_notes || null,
            patientData.sms_reminders_enabled !== false ? 1 : 0, // SQLite uses 0/1 for booleans
            patientData.email_reminders_enabled !== false ? 1 : 0
        ]
    );

    return await getPatientById(patientId);
};

const getPatientById = async (patientId) => {
    const result = await query(
        'SELECT * FROM patients WHERE id = $1',
        [patientId]
    );
    return result.rows[0];
};

const getPatientsByDentist = async (dentistId, filters = {}) => {
    let queryStr = 'SELECT * FROM patients WHERE dentist_id = $1';
    const params = [dentistId];
    let paramIndex = 2; // handled by wrapper anyway

    if (filters.search) {
        // SQLite uses LIKE, case insensitive by default for ASCII
        queryStr += ` AND (first_name LIKE $${paramIndex} OR last_name LIKE $${paramIndex} OR cin LIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
    }

    if (filters.email) {
        queryStr += ` AND email = $${paramIndex}`;
        params.push(filters.email);
        paramIndex++;
    }

    // Date filtering for analytics
    if (filters.start_date) {
        queryStr += ` AND created_at >= $${paramIndex}`;
        params.push(filters.start_date);
        paramIndex++;
    }

    if (filters.end_date) {
        queryStr += ` AND created_at <= $${paramIndex}`;
        params.push(filters.end_date);
        paramIndex++;
    }

    queryStr += ' ORDER BY created_at DESC';

    if (filters.limit) {
        queryStr += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
        paramIndex++;

        if (filters.offset) {
            queryStr += ` OFFSET $${paramIndex}`;
            params.push(filters.offset);
        }
    }

    const result = await query(queryStr, params);
    return result.rows;
};

const updatePatient = async (patientId, updates) => {
    const allowedFields = [
        'first_name', 'last_name', 'cin', 'email', 'phone',
        'date_of_birth', 'address', 'medical_notes',
        'sms_reminders_enabled', 'email_reminders_enabled'
    ];

    const updatesArray = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
            updatesArray.push(`${key} = $${paramIndex}`);

            // Handle booleans for SQLite
            let val = value;
            if (key === 'sms_reminders_enabled' || key === 'email_reminders_enabled') {
                val = value ? 1 : 0;
            }
            values.push(val);
            paramIndex++;
        }
    }

    if (updatesArray.length === 0) {
        throw new Error('No valid fields to update');
    }

    values.push(patientId);

    // SQLite: updated_at = datetime('now')
    await query(
        `UPDATE patients SET ${updatesArray.join(', ')}, updated_at = datetime('now') WHERE id = $${paramIndex}`,
        values
    );

    return await getPatientById(patientId);
};

const deletePatient = async (patientId) => {
    await query('DELETE FROM patients WHERE id = $1', [patientId]);
    return { message: 'Patient deleted successfully' };
};

const getPatientBillingSummary = async (patientId) => {
    const result = await query(
        'SELECT * FROM patient_billing_summary WHERE patient_id = $1',
        [patientId]
    );
    return result.rows[0] || null;
};

module.exports = {
    createPatient,
    getPatientById,
    getPatientsByDentist,
    updatePatient,
    deletePatient,
    getPatientBillingSummary
};

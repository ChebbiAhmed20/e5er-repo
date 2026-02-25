const { query } = require('../modules/database');
const { generateUUID } = require('../utils/uuid');



const createTreatment = async (userId, treatmentData) => {
    const treatmentId = generateUUID();

    await query(
        `INSERT INTO tooth_treatments (
      id, patient_id, tooth_number, treatment_type, notes,
      treatment_date, image_url, treatment_cost,
      payment_status, amount_paid, created_by,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, datetime('now'), datetime('now'))`,
        [
            treatmentId,
            treatmentData.patient_id,
            treatmentData.tooth_number,
            treatmentData.treatment_type,
            treatmentData.notes || null,
            treatmentData.treatment_date || new Date().toISOString(),
            treatmentData.image_url || null,
            treatmentData.treatment_cost || 0,
            treatmentData.payment_status || 'unpaid',
            treatmentData.amount_paid || 0,
            userId
        ]
    );

    return await getTreatmentById(treatmentId);
};

const getTreatmentById = async (treatmentId) => {
    const result = await query(
        'SELECT * FROM tooth_treatments WHERE id = $1',
        [treatmentId]
    );
    return result.rows[0];
};

const getTreatmentsByPatient = async (patientId) => {
    const result = await query(
        'SELECT * FROM tooth_treatments WHERE patient_id = $1 ORDER BY treatment_date DESC',
        [patientId]
    );
    return result.rows;
};

const getTreatmentsByDentist = async (dentistId, filters = {}) => {
    let queryText = `
    SELECT t.*, p.first_name, p.last_name
    FROM tooth_treatments t
    JOIN patients p ON t.patient_id = p.id
    WHERE p.dentist_id = $1
  `;

    const params = [dentistId];
    let paramIndex = 2;

    if (filters.patientId) {
        queryText += ` AND t.patient_id = $${paramIndex}`;
        params.push(filters.patientId);
        paramIndex++;
    }

    if (filters.patient_id) {
        queryText += ` AND t.patient_id = $${paramIndex}`;
        params.push(filters.patient_id);
        paramIndex++;
    }

    if (filters.toothNumber) {
        queryText += ` AND t.tooth_number = $${paramIndex}`;
        params.push(Number(filters.toothNumber));
        paramIndex++;
    }

    if (filters.tooth_number) {
        queryText += ` AND t.tooth_number = $${paramIndex}`;
        params.push(Number(filters.tooth_number));
        paramIndex++;
    }

    const paymentStatus = filters.paymentStatus || filters.payment_status;
    if (paymentStatus) {
        queryText += ` AND t.payment_status = $${paramIndex}`;
        params.push(paymentStatus);
        paramIndex++;
    }

    // Date filtering for analytics
    if (filters.start_date) {
        queryText += ` AND t.treatment_date >= $${paramIndex}`;
        params.push(filters.start_date);
        paramIndex++;
    }

    if (filters.end_date) {
        queryText += ` AND t.treatment_date <= $${paramIndex}`;
        params.push(filters.end_date);
        paramIndex++;
    }

    const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 200, 1), 500);
    queryText += ` ORDER BY t.treatment_date DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await query(queryText, params);
    return result.rows;
};

const updateTreatment = async (treatmentId, updates) => {
    const allowedFields = [
        'tooth_number', 'treatment_type', 'notes', 'treatment_date',
        'image_url', 'treatment_cost', 'payment_status', 'amount_paid'
    ];

    const updatesArray = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
            updatesArray.push(`${key} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
        }
    }

    if (updatesArray.length === 0) {
        throw new Error('No valid fields to update');
    }

    values.push(treatmentId);

    await query(
        `UPDATE tooth_treatments SET ${updatesArray.join(', ')}, updated_at = datetime('now') WHERE id = $${paramIndex}`,
        values
    );

    return await getTreatmentById(treatmentId);
};

const deleteTreatment = async (treatmentId) => {
    await query('DELETE FROM tooth_treatments WHERE id = $1', [treatmentId]);
    return { message: 'Treatment deleted successfully' };
};

module.exports = {
    createTreatment,
    getTreatmentById,
    getTreatmentsByPatient,
    getTreatmentsByDentist,
    updateTreatment,
    deleteTreatment
};

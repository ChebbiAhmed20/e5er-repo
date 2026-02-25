const { query } = require('../modules/database');
const crypto = require('crypto');
const generateUUID = () => crypto.randomUUID();

const createAppointment = async (dentistId, appointmentData) => {
    const appointmentId = generateUUID();

    await query(
        `INSERT INTO appointments (
      id, patient_id, dentist_id, date_time, notes,
      status, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, datetime('now'), datetime('now'))`,
        [
            appointmentId,
            appointmentData.patient_id,
            dentistId,
            appointmentData.date_time,
            appointmentData.notes || null,
            appointmentData.status || 'upcoming'
        ]
    );

    return await getAppointmentById(appointmentId);
};

const getAppointmentById = async (appointmentId) => {
    const result = await query(
        'SELECT * FROM appointments WHERE id = $1',
        [appointmentId]
    );
    return result.rows[0];
};

const getAppointmentsByDentist = async (dentistId, filters = {}) => {
    // SQLite json_object
    let queryStr = `
    SELECT 
      a.*,
      json_object(
        'id', p.id,
        'first_name', p.first_name,
        'last_name', p.last_name,
        'email', p.email,
        'phone', p.phone
      ) AS patient
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE a.dentist_id = $1
  `;
    const params = [dentistId];
    let paramIndex = 2;

    if (filters.status) {
        queryStr += ` AND a.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
    }

    const patientId = filters.patientId || filters.patient_id;
    if (patientId) {
        queryStr += ` AND a.patient_id = $${paramIndex}`;
        params.push(patientId);
        paramIndex++;
    }

    if (filters.start_date) {
        queryStr += ` AND a.date_time >= $${paramIndex}`;
        params.push(filters.start_date);
        paramIndex++;
    }

    if (filters.end_date) {
        queryStr += ` AND a.date_time <= $${paramIndex}`;
        params.push(filters.end_date);
        paramIndex++;
    }

    queryStr += ' ORDER BY a.date_time ASC';

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
    return result.rows.map((row) => ({
        ...row,
        // SQLite returns JSON as string, need to parse
        patient: typeof row.patient === 'string' ? JSON.parse(row.patient) : row.patient,
    }));
};

const updateAppointment = async (appointmentId, updates) => {
    const allowedFields = [
        'patient_id', 'date_time', 'notes', 'status'
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

    values.push(appointmentId);

    await query(
        `UPDATE appointments SET ${updatesArray.join(', ')}, updated_at = datetime('now') WHERE id = $${paramIndex}`,
        values
    );

    return await getAppointmentById(appointmentId);
};

const deleteAppointment = async (appointmentId) => {
    await query('DELETE FROM appointments WHERE id = $1', [appointmentId]);
    return { message: 'Appointment deleted successfully' };
};

const getPendingReminders = async () => {
    // SQLite date math: datetime('now', '+24 hours')
    const result = await query(
        `SELECT a.*, p.first_name, p.last_name, p.email, p.phone,
      p.sms_reminders_enabled, p.email_reminders_enabled
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE a.status = 'upcoming'
      AND a.reminder_sent IS NULL
      AND a.date_time <= datetime('now', '+24 hours')
      AND a.date_time >= datetime('now')`
    );
    return result.rows;
};

module.exports = {
    createAppointment,
    getAppointmentById,
    getAppointmentsByDentist,
    updateAppointment,
    deleteAppointment,
    getPendingReminders
};

const { query } = require('../modules/database');
const { generateUUID } = require('../utils/uuid');



const createPrescription = async (prescriptionData) => {
    const prescriptionId = generateUUID();
    const medicationList = prescriptionData.medication_list;
    const medicationListJson = Array.isArray(medicationList)
        ? JSON.stringify(medicationList)
        : typeof medicationList === 'string'
            ? medicationList
            : '[]';

    await query(
        `INSERT INTO prescriptions (
      id, patient_id, medication_list, dosage,
      instructions, duration, date_issued, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
            prescriptionId,
            prescriptionData.patient_id,
            medicationListJson,
            prescriptionData.dosage || null,
            prescriptionData.instructions || null,
            prescriptionData.duration || null,
            prescriptionData.date_issued || new Date().toISOString(),
            prescriptionData.created_by ?? null,
        ]
    );

    return await getPrescriptionById(prescriptionId);
};

const getPrescriptionById = async (prescriptionId) => {
    const result = await query(
        'SELECT * FROM prescriptions WHERE id = $1',
        [prescriptionId]
    );

    if (result.rows[0]) {
        // SQLite stores JSON as string, so we must parse it
        if (typeof result.rows[0].medication_list === "string") {
            try {
                result.rows[0].medication_list = JSON.parse(result.rows[0].medication_list);
            } catch (e) {
                result.rows[0].medication_list = [];
            }
        }
    }

    return result.rows[0];
};

const getPrescriptionsByPatient = async (patientId) => {
    const result = await query(
        'SELECT * FROM prescriptions WHERE patient_id = $1 ORDER BY date_issued DESC',
        [patientId]
    );

    return result.rows.map(row => ({
        ...row,
        medication_list: typeof row.medication_list === "string"
            ? JSON.parse(row.medication_list)
            : row.medication_list
    }));
};

const deletePrescription = async (prescriptionId) => {
    await query('DELETE FROM prescriptions WHERE id = $1', [prescriptionId]);
    return { message: 'Prescription deleted successfully' };
};

module.exports = {
    createPrescription,
    getPrescriptionById,
    getPrescriptionsByPatient,
    deletePrescription
};

import { pool } from "../../config/db.js";

export interface DentistProfileRow {
  id: string;
  first_name: string;
  last_name: string;
  name_arabic: string;
  cin: string;
  email: string;
  city: string;
  phone: string | null;
  clinic_name: string | null;
  created_at: string;
}

export const dentistRepository = {
  async findByDentistId(dentistId: string): Promise<DentistProfileRow | null> {
    const result = await pool.query<DentistProfileRow>(
      `SELECT d.id, d.first_name, d.last_name, d.name_arabic, d.cin, u.email,
              d.city, d.phone, d.clinic_name, d.created_at
       FROM dentists d
       INNER JOIN users u ON u.id = d.user_id
       WHERE d.id = $1 AND d.deleted_at IS NULL AND u.deleted_at IS NULL
       LIMIT 1`,
      [dentistId],
    );
    return result.rows[0] ?? null;
  },

  async updateByDentistId(dentistId: string, fields: Partial<{ firstName: string; lastName: string; nameArabic: string; city: string; phone: string; clinicName: string }>): Promise<DentistProfileRow | null> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (fields.firstName !== undefined) {
      updates.push(`first_name = $${values.length + 1}`);
      values.push(fields.firstName);
    }
    if (fields.lastName !== undefined) {
      updates.push(`last_name = $${values.length + 1}`);
      values.push(fields.lastName);
    }
    if (fields.nameArabic !== undefined) {
      updates.push(`name_arabic = $${values.length + 1}`);
      values.push(fields.nameArabic);
    }
    if (fields.city !== undefined) {
      updates.push(`city = $${values.length + 1}`);
      values.push(fields.city);
    }
    if (fields.phone !== undefined) {
      updates.push(`phone = $${values.length + 1}`);
      values.push(fields.phone);
    }
    if (fields.clinicName !== undefined) {
      updates.push(`clinic_name = $${values.length + 1}`);
      values.push(fields.clinicName);
    }

    if (updates.length === 0) {
      return this.findByDentistId(dentistId);
    }

    values.push(dentistId);

    await pool.query(
      `UPDATE dentists
       SET ${updates.join(", ")}, updated_at = NOW()
       WHERE id = $${values.length} AND deleted_at IS NULL`,
      values,
    );

    return this.findByDentistId(dentistId);
  },
};

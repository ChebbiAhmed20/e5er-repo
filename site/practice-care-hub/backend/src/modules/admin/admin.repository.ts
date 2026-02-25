import { pool } from "../../config/db.js";

interface AdminClientRow {
    id: string;
    first_name: string;
    last_name: string;
    name_arabic: string | null;
    cin: string;
    email: string;
    city: string;
    phone: string | null;
    clinic_name: string | null;
    created_at: string;
    license_status: string;
    license_type: string;
    activated_at: string | null;
    expires_at: string | null;
}

export const adminRepository = {
    async findAllDentists(): Promise<AdminClientRow[]> {
        const query = `
      SELECT 
        d.id, 
        d.first_name, 
        d.last_name, 
        d.name_arabic, 
        d.cin, 
        u.email, 
        d.city, 
        d.phone, 
        d.clinic_name, 
        d.created_at,
        l.status AS license_status,
        l.type AS license_type,
        l.activated_at,
        l.expires_at
      FROM dentists d
      JOIN users u ON u.id = d.user_id
      LEFT JOIN LATERAL (
        SELECT status, type, activated_at, expires_at
        FROM licenses
        WHERE dentist_id = d.id AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      ) l ON true
      WHERE d.deleted_at IS NULL
      ORDER BY d.created_at DESC
    `;
        const result = await pool.query<AdminClientRow>(query);
        return result.rows;
    },

    async getAdminStats() {
        const totalDentists = await pool.query("SELECT COUNT(*) FROM dentists WHERE deleted_at IS NULL");
        const activeSubscribers = await pool.query(
            "SELECT COUNT(*) FROM licenses WHERE status = 'active' AND type = 'full' AND deleted_at IS NULL"
        );

        return {
            totalDentists: parseInt(totalDentists.rows[0].count),
            activeSubscribers: parseInt(activeSubscribers.rows[0].count),
        };
    }
};

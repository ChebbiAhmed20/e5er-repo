import { pool } from "../../config/db.js";

export interface UserRow {
  user_id: string;
  email: string;
  password_hash: string;
  role: "admin" | "dentist";
  dentist_id: string | null;
  first_name: string;
  last_name: string;
  name_arabic: string;
  cin: string;
  city: string;
  phone: string | null;
  clinic_name: string | null;
  created_at: string;
  license_status: string;
  license_type: string;
  license_expires_at: string | null;
}

export const authRepository = {
  async findUserByEmail(email: string): Promise<UserRow | null> {
    const query = `
      SELECT u.id AS user_id, u.email, u.password_hash, u.role, d.id AS dentist_id,
             d.first_name, d.last_name, d.name_arabic, d.cin, d.city, d.phone, d.clinic_name, d.created_at,
             l.status AS license_status, l.type AS license_type, l.expires_at AS license_expires_at
      FROM users u
      LEFT JOIN dentists d ON d.user_id = u.id AND d.deleted_at IS NULL
      LEFT JOIN LATERAL (
        SELECT status, type, expires_at
        FROM licenses
        WHERE dentist_id = d.id AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      ) l ON true
      WHERE u.email = $1 AND u.deleted_at IS NULL
      LIMIT 1
    `;
    const result = await pool.query<UserRow>(query, [email]);
    return result.rows[0] ?? null;
  },

  async findUserById(id: string): Promise<UserRow | null> {
    const query = `
      SELECT u.id AS user_id, u.email, u.password_hash, u.role, d.id AS dentist_id,
             d.first_name, d.last_name, d.name_arabic, d.cin, d.city, d.phone, d.clinic_name, d.created_at,
             l.status AS license_status, l.type AS license_type, l.expires_at AS license_expires_at
      FROM users u
      LEFT JOIN dentists d ON d.user_id = u.id AND d.deleted_at IS NULL
      LEFT JOIN LATERAL (
        SELECT status, type, expires_at
        FROM licenses
        WHERE dentist_id = d.id AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      ) l ON true
      WHERE u.id = $1 AND u.deleted_at IS NULL
      LIMIT 1
    `;
    const result = await pool.query<UserRow>(query, [id]);
    return result.rows[0] ?? null;
  },

  async createDentistUser(input: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    nameArabic: string;
    cin: string;
    city: string;
    phone?: string;
    clinicName?: string;
  }): Promise<UserRow> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const userResult = await client.query<{ id: string; email: string; password_hash: string; role: "admin" | "dentist" }>(
        `INSERT INTO users (email, password_hash, role)
         VALUES ($1, $2, 'dentist')
         RETURNING id, email, password_hash, role`,
        [input.email, input.passwordHash],
      );

      const dentistResult = await client.query<{
        id: string;
        first_name: string;
        last_name: string;
        name_arabic: string;
        cin: string;
        city: string;
        phone: string | null;
        clinic_name: string | null;
        created_at: string;
      }>(
        `INSERT INTO dentists (user_id, first_name, last_name, name_arabic, cin, city, phone, clinic_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, first_name, last_name, name_arabic, cin, city, phone, clinic_name, created_at`,
        [
          userResult.rows[0].id,
          input.firstName,
          input.lastName,
          input.nameArabic,
          input.cin,
          input.city,
          input.phone ?? null,
          input.clinicName ?? null,
        ],
      );

      const licenseResult = await client.query<{ status: string; type: string; expires_at: string | null }>(
        `INSERT INTO licenses (dentist_id, status, type, activated_at, expires_at)
         VALUES ($1, 'trial', 'trial', NOW(), NOW() + INTERVAL '14 days')
         RETURNING status, type, expires_at`,
        [dentistResult.rows[0].id],
      );

      await client.query("COMMIT");

      return {
        user_id: userResult.rows[0].id,
        email: userResult.rows[0].email,
        password_hash: userResult.rows[0].password_hash,
        role: userResult.rows[0].role,
        dentist_id: dentistResult.rows[0].id,
        ...dentistResult.rows[0],
        license_status: licenseResult.rows[0].status,
        license_type: licenseResult.rows[0].type,
        license_expires_at: licenseResult.rows[0].expires_at,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async saveRefreshToken(userId: string, tokenHash: string, expiresAt: string): Promise<void> {
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt],
    );
  },

  async hasValidRefreshToken(userId: string, tokenHash: string): Promise<boolean> {
    const result = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1
        FROM refresh_tokens
        WHERE user_id = $1
          AND token_hash = $2
          AND revoked_at IS NULL
          AND expires_at > NOW()
      )`,
      [userId, tokenHash],
    );
    return result.rows[0]?.exists ?? false;
  },

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await pool.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW()
       WHERE token_hash = $1 AND revoked_at IS NULL`,
      [tokenHash],
    );
  },
};

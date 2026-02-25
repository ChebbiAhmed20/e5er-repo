import { pool } from "../../config/db.js";

interface ReminderStatsRow {
  total_sent: number;
  total_successful: number;
  success_rate: number;
}

export const reminderRepository = {
  async getStatsByDentistId(dentistId: string): Promise<ReminderStatsRow> {
    const result = await pool.query<ReminderStatsRow>(
      `SELECT
          COUNT(*)::int AS total_sent,
          COUNT(*) FILTER (WHERE status = 'sent')::int AS total_successful,
          COALESCE(ROUND((COUNT(*) FILTER (WHERE status = 'sent')::numeric * 100) / NULLIF(COUNT(*), 0), 1), 0) AS success_rate
       FROM reminders
       WHERE dentist_id = $1 AND deleted_at IS NULL`,
      [dentistId],
    );

    return result.rows[0] ?? { total_sent: 0, total_successful: 0, success_rate: 0 };
  },
};

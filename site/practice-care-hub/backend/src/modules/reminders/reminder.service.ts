import { reminderRepository } from "./reminder.repository.js";

export const reminderService = {
  async getStats(dentistId: string) {
    const row = await reminderRepository.getStatsByDentistId(dentistId);

    return {
      totalSent: row.total_sent,
      totalSuccessful: row.total_successful,
      successRate: Number(row.success_rate),
    };
  },
};

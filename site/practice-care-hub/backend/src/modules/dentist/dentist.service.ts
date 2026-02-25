import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/AppError.js";
import { dentistRepository } from "./dentist.repository.js";

const toDto = (row: NonNullable<Awaited<ReturnType<typeof dentistRepository.findByDentistId>>>) => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  nameArabic: row.name_arabic,
  cin: row.cin,
  email: row.email,
  city: row.city,
  phone: row.phone,
  clinicName: row.clinic_name,
  createdAt: row.created_at,
});

export const dentistService = {
  async getProfile(dentistId: string) {
    const row = await dentistRepository.findByDentistId(dentistId);
    if (!row) {
      throw new AppError("Dentist profile not found", StatusCodes.NOT_FOUND, "PROFILE_NOT_FOUND");
    }
    return toDto(row);
  },

  async updateProfile(dentistId: string, input: Partial<{ firstName: string; lastName: string; nameArabic: string; city: string; phone: string; clinicName: string }>) {
    const row = await dentistRepository.updateByDentistId(dentistId, input);
    if (!row) {
      throw new AppError("Dentist profile not found", StatusCodes.NOT_FOUND, "PROFILE_NOT_FOUND");
    }
    return toDto(row);
  },
};

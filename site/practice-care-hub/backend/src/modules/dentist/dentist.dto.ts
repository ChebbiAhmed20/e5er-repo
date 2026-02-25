import { z } from "zod";

export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().trim().min(2).max(60).optional(),
    lastName: z.string().trim().min(2).max(60).optional(),
    nameArabic: z.string().trim().min(2).max(120).optional(),
    city: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().max(40).optional(),
    clinicName: z.string().trim().max(120).optional(),
  }),
});

import { z } from "zod";

export const signUpSchema = z.object({
  body: z.object({
    firstName: z.string().trim().min(2).max(60),
    lastName: z.string().trim().min(2).max(60),
    nameArabic: z.string().trim().min(2).max(120),
    cin: z.string().regex(/^\d{8}$/),
    email: z.string().trim().email().max(120),
    password: z
      .string()
      .min(8)
      .max(128)
      .regex(/[A-Z]/)
      .regex(/[0-9]/),
    city: z.string().trim().min(2).max(120),
    phone: z.string().trim().max(40).optional(),
    clinicName: z.string().trim().max(120).optional(),
  }),
});

export const signInSchema = z.object({
  body: z.object({
    email: z.string().trim().email().max(120),
    password: z.string().min(1).max(128),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(20),
  }),
});

import { z } from "zod";

export const importBackupSchema = z.object({
  body: z.object({
    backupId: z.string().uuid("Invalid backup ID"),
  }),
});

export const uploadBackupSchema = z.object({
  body: z.object({
    fileName: z.string().min(1).max(255),
    sizeMb: z.number().min(0).max(100000),
    patientsCount: z.number().int().min(0),
    treatmentsCount: z.number().int().min(0),
    backedAt: z.string().datetime({ message: "Invalid datetime" }),
    storageUrl: z.string().url().optional(),
    checksum: z.string().max(64).optional(),
    appVersion: z.string().max(20).optional(),
    notes: z.string().max(500).optional(),
  }),
});

export type UploadBackupInput = z.infer<typeof uploadBackupSchema>["body"];

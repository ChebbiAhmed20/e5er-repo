import { z } from "zod";

export const activateLicenseSchema = z.object({
    body: z.object({
        licenseKey: z.string().min(8, "License key too short").max(120, "License key too long").trim(),
    }),
});

export type ActivateLicenseInput = z.infer<typeof activateLicenseSchema>["body"];

import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/AppError.js";
import { licenseRepository } from "./license.repository.js";

const TRIAL_DURATION_DAYS = 14;

const calcTrialDaysRemaining = (expiresAt: string | null): number => {
  if (!expiresAt) return 0;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export const licenseService = {
  /** Get current license status for a dentist */
  async getCurrent(dentistId: string) {
    const row = await licenseRepository.findCurrentByDentistId(dentistId);
    if (!row) {
      throw new AppError("License not found", StatusCodes.NOT_FOUND, "LICENSE_NOT_FOUND");
    }

    return {
      status: row.status,
      type: row.type,
      activatedAt: row.activated_at,
      expiresAt: row.expires_at,
      trialDaysRemaining: row.status === "trial" ? calcTrialDaysRemaining(row.expires_at) : null,
    };
  },

  /** Full status object — used by desktop app to decide what to show */
  async getStatus(dentistId: string) {
    const row = await licenseRepository.findCurrentByDentistId(dentistId);

    if (!row) {
      // No license found → treat as anonymous trial (shouldn't happen post-registration)
      return {
        status: "trial" as const,
        type: "trial" as const,
        activatedAt: null,
        expiresAt: null,
        trialDaysRemaining: TRIAL_DURATION_DAYS,
        isLicensed: false,
        isTrial: true,
        isExpired: false,
      };
    }

    const now = new Date();
    const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
    const isExpiredByDate = expiresAt ? expiresAt < now : false;

    // Resolve actual status considering expiry
    let resolvedStatus = row.status;
    if (resolvedStatus === "active" && isExpiredByDate) {
      resolvedStatus = "expired";
    }
    if (resolvedStatus === "trial" && isExpiredByDate) {
      resolvedStatus = "expired";
    }

    return {
      status: resolvedStatus,
      type: row.type,
      activatedAt: row.activated_at,
      expiresAt: row.expires_at,
      trialDaysRemaining: row.status === "trial" ? calcTrialDaysRemaining(row.expires_at) : null,
      isLicensed: resolvedStatus === "active",
      isTrial: resolvedStatus === "trial",
      isExpired: resolvedStatus === "expired",
    };
  },

  /** Validate and activate a license key for a dentist */
  async activate(dentistId: string, licenseKey: string) {
    const keyRow = await licenseRepository.findKeyByValue(licenseKey);

    if (!keyRow) {
      throw new AppError("Invalid license key", StatusCodes.BAD_REQUEST, "INVALID_LICENSE_KEY");
    }

    if (keyRow.revoked_at) {
      throw new AppError("License key has been revoked", StatusCodes.BAD_REQUEST, "LICENSE_KEY_REVOKED");
    }

    if (keyRow.used_by) {
      // Allow the SAME dentist to re-activate (re-install scenario)
      if (keyRow.used_by !== dentistId) {
        throw new AppError("License key already in use", StatusCodes.CONFLICT, "LICENSE_KEY_ALREADY_USED");
      }
    }

    if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) {
      throw new AppError("License key has expired", StatusCodes.BAD_REQUEST, "LICENSE_KEY_EXPIRED");
    }

    // Calculate license expiry based on key duration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + keyRow.duration_days);

    // Mark key as used (idempotent for same dentist)
    if (!keyRow.used_by) {
      await licenseRepository.markKeyUsed(keyRow.id, dentistId);
    }

    // Upsert active license
    const license = await licenseRepository.upsertActiveLicense(
      dentistId,
      keyRow.type,
      expiresAt.toISOString(),
    );

    return {
      status: license.status,
      type: license.type,
      activatedAt: license.activated_at,
      expiresAt: license.expires_at,
      isLicensed: true,
    };
  },
};

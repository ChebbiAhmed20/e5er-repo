import { StatusCodes } from "http-status-codes";
import { AppError } from "../../core/errors/AppError.js";
import type { AuthClaims } from "../../core/types/auth.js";
import { comparePassword, hashPassword } from "../../shared/utils/password.js";
import { sha256 } from "../../shared/utils/crypto.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../shared/utils/token.js";
import { authRepository } from "./auth.repository.js";
import { licenseRepository } from "../licenses/license.repository.js";

const toProfile = (row: any) => ({
  id: row.user_id,
  email: row.email,
  firstName: row.first_name,
  lastName: row.last_name,
  nameArabic: row.name_arabic,
  cin: row.cin,
  city: row.city,
  phone: row.phone,
  clinicName: row.clinic_name,
  createdAt: row.created_at,
  license: {
    status: row.license_status,
    type: row.license_type,
    expiresAt: row.license_expires_at,
  },
});

const issueTokens = async (claims: AuthClaims) => {
  const accessToken = signAccessToken(claims);
  const refreshToken = signRefreshToken(claims);
  const decoded = verifyRefreshToken(refreshToken);

  if (!decoded) {
    throw new AppError("Token generation failed", StatusCodes.INTERNAL_SERVER_ERROR, "TOKEN_ERROR");
  }

  const payload = JSON.parse(Buffer.from(refreshToken.split(".")[1], "base64").toString("utf-8")) as { exp: number };
  const expiresAt = new Date(payload.exp * 1000).toISOString();

  await authRepository.saveRefreshToken(claims.sub, sha256(refreshToken), expiresAt);

  return { accessToken, refreshToken };
};

export const authService = {
  async signUp(input: {
    firstName: string;
    lastName: string;
    nameArabic: string;
    cin: string;
    email: string;
    password: string;
    city: string;
    phone?: string;
    clinicName?: string;
  }) {
    const existing = await authRepository.findUserByEmail(input.email);
    if (existing) {
      throw new AppError("Email already exists", StatusCodes.CONFLICT, "EMAIL_ALREADY_EXISTS");
    }

    const passwordHash = await hashPassword(input.password);
    const row = await authRepository.createDentistUser({ ...input, passwordHash });

    const claims: AuthClaims = {
      sub: row.user_id,
      dentistId: row.dentist_id,
      role: row.role,
      email: row.email,
    };

    const tokens = await issueTokens(claims);

    return {
      profile: toProfile(row),
      tokens,
    };
  },

  async signIn(input: { email: string; password: string }) {
    const row = await authRepository.findUserByEmail(input.email);
    if (!row) {
      throw new AppError("Invalid credentials", StatusCodes.UNAUTHORIZED, "INVALID_CREDENTIALS");
    }

    const valid = await comparePassword(input.password, row.password_hash);
    if (!valid) {
      throw new AppError("Invalid credentials", StatusCodes.UNAUTHORIZED, "INVALID_CREDENTIALS");
    }

    const claims: AuthClaims = {
      sub: row.user_id,
      dentistId: row.dentist_id,
      role: row.role,
      email: row.email,
    };

    const tokens = await issueTokens(claims);

    // Fetch license status so the desktop app has everything it needs in one call
    let licenseStatus: object = { status: "trial", type: "trial", isLicensed: false, isTrial: true, isExpired: false };
    if (row.dentist_id) {
      try {
        const licRow = await licenseRepository.findCurrentByDentistId(row.dentist_id);
        if (licRow) {
          const now = new Date();
          const expiresAt = licRow.expires_at ? new Date(licRow.expires_at) : null;
          const isExpired = expiresAt ? expiresAt < now : false;
          const resolvedStatus = isExpired ? "expired" : licRow.status;
          const trialDaysRemaining =
            licRow.status === "trial" && !isExpired && expiresAt
              ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
              : null;
          licenseStatus = {
            status: resolvedStatus,
            type: licRow.type,
            activatedAt: licRow.activated_at,
            expiresAt: licRow.expires_at,
            trialDaysRemaining,
            isLicensed: resolvedStatus === "active",
            isTrial: resolvedStatus === "trial",
            isExpired: resolvedStatus === "expired",
          };
        }
      } catch {
        // Non-fatal: license status enrichment failure should not block sign-in
      }
    }

    return {
      profile: toProfile(row),
      tokens,
      licenseStatus,
    };

  },

  async refreshToken(input: { refreshToken: string }) {
    const claims = verifyRefreshToken(input.refreshToken);
    if (!claims) {
      throw new AppError("Invalid refresh token", StatusCodes.UNAUTHORIZED, "INVALID_REFRESH_TOKEN");
    }

    const tokenHash = sha256(input.refreshToken);
    const valid = await authRepository.hasValidRefreshToken(claims.sub, tokenHash);
    if (!valid) {
      throw new AppError("Refresh token not recognized", StatusCodes.UNAUTHORIZED, "INVALID_REFRESH_TOKEN");
    }

    await authRepository.revokeRefreshToken(tokenHash);
    const tokens = await issueTokens(claims);

    return { tokens };
  },

  async signOut(input: { refreshToken: string }) {
    await authRepository.revokeRefreshToken(sha256(input.refreshToken));
  },

  async getMe(userId: string) {
    const row = await authRepository.findUserById(userId);
    if (!row) {
      throw new AppError("User not found", StatusCodes.NOT_FOUND, "USER_NOT_FOUND");
    }
    return toProfile(row);
  },
};

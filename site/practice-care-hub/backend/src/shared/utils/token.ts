import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env.js";
import type { AuthClaims } from "../../core/types/auth.js";

export const signAccessToken = (claims: AuthClaims): string => {
  const options: SignOptions = { expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, options);
};

export const signRefreshToken = (claims: AuthClaims): string => {
  const options: SignOptions = { expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(claims, env.JWT_REFRESH_SECRET, options);
};

export const verifyAccessToken = (token: string): AuthClaims | null => {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthClaims;
  } catch {
    return null;
  }
};

export const verifyRefreshToken = (token: string): AuthClaims | null => {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as AuthClaims;
  } catch {
    return null;
  }
};

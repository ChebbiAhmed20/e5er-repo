import type { AuthClaims } from "../core/types/auth.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthClaims;
    }
  }
}

export {};

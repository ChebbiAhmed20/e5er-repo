export type UserRole = "admin" | "dentist";

export interface AuthClaims {
  sub: string;
  dentistId: string | null;
  role: UserRole;
  email: string;
}

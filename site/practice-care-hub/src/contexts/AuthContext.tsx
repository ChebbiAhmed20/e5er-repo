/**
 * Lightweight auth context using local state.
 * Swap internals for real JWT / session management later.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { DentistProfile } from "@/types/dentist";
import { clearSessionTokens } from "@/services/api";

interface AuthState {
  isAuthenticated: boolean;
  profile: DentistProfile | null;
  login: (profile: DentistProfile) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<DentistProfile | null>(null);

  const login = useCallback((p: DentistProfile) => setProfile(p), []);
  const logout = useCallback(() => {
    clearSessionTokens();
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!profile, profile, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

/** Core domain types for the dentist platform */

export interface DentistProfile {
  id: string;
  firstName: string;
  lastName: string;
  nameArabic: string;
  cin: string;
  email: string;
  city: string;
  phone?: string;
  clinicName?: string;
  createdAt: string;
}

export interface LicenseInfo {
  status: "active" | "trial" | "expired" | "pending";
  type: "trial" | "full";
  activatedAt: string;
  expiresAt: string | null;
}

export interface SystemStatus {
  lastBackupDate: string;
  lastUpdateDate: string;
  appVersion: string;
}

export interface RemindersStats {
  totalSent: number;
  totalSuccessful: number;
  successRate: number;
}

export interface DashboardData {
  profile: DentistProfile;
  license: LicenseInfo;
  system: SystemStatus;
  reminders: RemindersStats;
}

export interface SignUpPayload {
  firstName: string;
  lastName: string;
  nameArabic: string;
  cin: string;
  email: string;
  password: string;
  city: string;
  phone?: string;
  clinicName?: string;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface ClientRecord extends DentistProfile {
  license: LicenseInfo;
  usesOnline: boolean;
}

export interface AdminStats {
  totalDentists: number;
  activeSubscribers: number;
}

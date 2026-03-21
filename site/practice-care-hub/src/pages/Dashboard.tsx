import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User, ShieldCheck, HardDrive, Bell, CheckCircle, Clock,
  Mail, Phone, MapPin, Building2, LogOut, RefreshCw,
  Upload, Calendar, FileArchive,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboard, getLatestBackup, importBackup } from "@/services/api";
import type { BackupRecord } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import type { DashboardData } from "@/types/dentist";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-green-500/15 text-green-700" },
  trial: { label: "Essai Gratuit", color: "bg-amber-500/15 text-amber-700" },
  expired: { label: "Expiré", color: "bg-destructive/15 text-destructive" },
  pending: { label: "En attente", color: "bg-muted text-muted-foreground" },
};

const Dashboard = () => {
  const { isAuthenticated, profile: authProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [backup, setBackup] = useState<BackupRecord | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { navigate("/signin"); return; }
    getDashboard().then(setData);
    getLatestBackup().then(setBackup);
  }, [isAuthenticated, navigate]);

  const handleImportBackup = async () => {
    if (!backup) return;
    setImporting(true);
    try {
      const result = await importBackup(backup.id);
      toast({
        title: "Sauvegarde importée avec succès",
        description: `${result.restoredPatients} patients et ${result.restoredTreatments} traitements restaurés.`,
      });
    } catch {
      toast({ title: "Erreur d'importation", description: "Impossible d'importer la sauvegarde.", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  if (!data) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-pulse text-muted-foreground">Chargement...</div>
    </div>
  );

  const { license, system, reminders } = data;
  const profile = authProfile ?? data.profile;
  const status = STATUS_MAP[license.status];
  const isMeaningfulDate = (value?: string | null) => {
    if (!value) return false;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return false;
    // Suppress epoch/default placeholders like 1970-01-01.
    return parsed.getFullYear() > 1971;
  };
  const fmtDate = (d?: string | null) =>
    isMeaningfulDate(d)
      ? new Date(d as string).toLocaleDateString("fr-TN", { day: "numeric", month: "long", year: "numeric" })
      : "Aucune";
  const fmtTime = (d?: string | null) =>
    isMeaningfulDate(d)
      ? new Date(d as string).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })
      : "--:--";
  const latestBackupDate = isMeaningfulDate(backup?.date)
    ? backup?.date
    : isMeaningfulDate(system.lastBackupDate)
      ? system.lastBackupDate
      : null;

  return (
    <div className="py-10 bg-background min-h-[80vh]">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Bienvenue, Dr. {profile.lastName}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Tableau de bord de votre cabinet</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              size="sm"
              onClick={async () => {
                const token = localStorage.getItem("virela_access_token");
                if (!token) {
                  toast({ title: "Erreur", description: "Veuillez vous reconnecter.", variant: "destructive" });
                  return;
                }
                
                // Try local dev server first, fall back to deep link
                try {
                  await fetch('http://127.0.0.1:45678/deep-link', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: `virela-app://auth?token=${token}` }),
                  });
                  toast({ title: "Synchronisation en cours..." });
                } catch {
                  // Fall back to deep link (works in production)
                  window.location.href = `virela-app://auth?token=${token}`;
                }
              }}
            >
              <RefreshCw className="w-4 h-4 mr-1" /> Synchroniser avec Desktop
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              toast({ title: "Aucune mise à jour disponible", description: "Vous avez la dernière version de Virela." });
            }}>
              <RefreshCw className="w-4 h-4 mr-1" /> Mise à jour
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/"); }}>
              <LogOut className="w-4 h-4 mr-1" /> Déconnexion
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="md:col-span-2">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="w-5 h-5 text-primary" /> Informations Personnelles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <InfoRow icon={User} label="Nom complet" value={`${profile.firstName} ${profile.lastName}`} />
                  <InfoRow icon={User} label="الاسم" value={profile.nameArabic} />
                  <InfoRow icon={ShieldCheck} label="CIN" value={profile.cin} />
                  <InfoRow icon={Mail} label="Email" value={profile.email} />
                  <InfoRow icon={MapPin} label="Ville" value={profile.city} />
                  {profile.phone && <InfoRow icon={Phone} label="Téléphone" value={profile.phone} />}
                  {profile.clinicName && <InfoRow icon={Building2} label="Clinique" value={profile.clinicName} />}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* License Card */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="w-5 h-5 text-primary" /> Licence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                    {status.label}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">{license.type}</span>
                </div>
                <div className="text-sm space-y-2 text-muted-foreground">
                  <p>Activée le : <span className="text-foreground">{fmtDate(license.activatedAt)}</span></p>
                  {license.expiresAt && (
                    <p>Expire le : <span className="text-foreground">{fmtDate(license.expiresAt)}</span></p>
                  )}
                </div>
                {license.status === "trial" && (
                  <Button size="sm" className="w-full bg-hero-gradient text-primary-foreground" onClick={() => navigate("/pricing")}>
                    Passer à la Licence Complète
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* System Status */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <HardDrive className="w-5 h-5 text-primary" /> Système
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dernière sauvegarde</span>
                  <span className="text-foreground font-medium">
                    {latestBackupDate ? fmtDate(latestBackupDate) : "Aucune sauvegarde"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dernière mise à jour</span>
                  <span className="text-foreground font-medium">
                    {isMeaningfulDate(system.lastUpdateDate) ? fmtDate(system.lastUpdateDate) : "Non disponible"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version</span>
                  <span className="text-foreground font-medium">v{system.appVersion}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Latest Backup */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            {backup ? (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileArchive className="w-5 h-5 text-primary" /> Dernière Sauvegarde
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Date :</span>
                      <span className="text-foreground font-medium">{fmtDate(backup.date)} à {fmtTime(backup.date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Taille :</span>
                      <span className="text-foreground font-medium">{backup.size}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Patients :</span>
                      <span className="text-foreground font-medium">{backup.patients}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Traitements :</span>
                      <span className="text-foreground font-medium">{backup.treatments}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full bg-hero-gradient text-primary-foreground"
                    onClick={handleImportBackup}
                    disabled={importing}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    {importing ? "Importation en cours..." : "Importer cette Sauvegarde"}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileArchive className="w-5 h-5 text-primary" /> Dernière Sauvegarde
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-6 text-center text-muted-foreground text-sm">
                  Aucune sauvegarde disponible
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* Reminders */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="md:col-span-2">
            <Card className="border-accent/30">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bell className="w-5 h-5 text-accent" /> Rappels Patients
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-6">
                  <StatBox icon={Bell} label="Total envoyés" value={reminders.totalSent} />
                  <StatBox icon={CheckCircle} label="Réussis" value={reminders.totalSuccessful} />
                  <StatBox icon={Clock} label="Taux de succès" value={`${reminders.successRate}%`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

/* ── Sub-components ─────────────────────────────────────── */

const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => (
  <div className="flex items-start gap-3">
    <Icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-foreground font-medium">{value}</p>
    </div>
  </div>
);

const StatBox = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number | string }) => (
  <div className="text-center p-4 rounded-xl bg-secondary/50">
    <Icon className="w-6 h-6 text-accent mx-auto mb-2" />
    <p className="text-2xl font-bold text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
  </div>
);

export default Dashboard;
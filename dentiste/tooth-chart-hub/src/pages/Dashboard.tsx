import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, Activity, Plus, Search, CalendarClock, Clock } from "lucide-react";
import PatientList from "@/components/PatientList";
import AddPatientDialog from "@/components/AddPatientDialog";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";

interface TodayAppointment {
  id: string;
  date_time: string;
  status: string;
  notes: string | null;
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    phone?: string;
  } | null;
}

const Dashboard = () => {
  const [patientCount, setPatientCount] = useState(0);
  const [treatmentCount, setTreatmentCount] = useState(0);
  const [addPatientOpen, setAddPatientOpen] = useState(false);
  const [listSearchTerm, setListSearchTerm] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchParams] = useSearchParams();
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const statusLabels: Record<string, string> = {
    upcoming: "A venir",
    done: "Termine",
    canceled: "Annule",
  };

  useEffect(() => {
    fetchStats();
    fetchTodayAppointments();
  }, []);
  // Handle payment success from Konnect redirect
useEffect(() => {
  const paymentStatus = searchParams.get("payment");
  const pack = searchParams.get("pack");
  
  if (paymentStatus === "success" && pack) {
    apiClient.request(`/api/subscriptions/payment-success?pack=${pack}`)
      .then((response) => {
        toast.success(`Paiement réussi! ${response.message}`);
        window.location.reload();
      })
      .catch(() => {
        toast.error("Erreur de verification du paiement");
      })
      .finally(() => {
        if (window.location.protocol === "file:" || (window as any).desktop) {
          window.location.hash = "#/dashboard";
        } else {
          window.history.replaceState({}, "", window.location.pathname);
        }
      });
  }
}, [searchParams]);


  const fetchStats = async () => {
    try {
      const analytics = await apiClient.request('/api/analytics', {
        params: { range: '30d' },
      });

      setPatientCount(analytics?.totalPatients ?? 0);
      setTreatmentCount(analytics?.totalTreatments ?? 0);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques :", error);
      setPatientCount(0);
      setTreatmentCount(0);
    }
  };

  const fetchTodayAppointments = async () => {
    setLoadingAppointments(true);
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const appointments = await apiClient.request<TodayAppointment[]>("/api/appointments", {
        params: {
          status: "upcoming",
          start_date: startOfDay.toISOString(),
          end_date: endOfDay.toISOString(),
          limit: 8,
        },
      });

      setTodayAppointments(Array.isArray(appointments) ? appointments : []);
    } catch (error) {
      console.error("Erreur lors du chargement des rendez-vous du jour :", error);
      setTodayAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total des patients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{patientCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Dossiers patients actifs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Traitements</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{treatmentCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Total des actes enregistres</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setAddPatientOpen(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un patient
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Today's Appointments - high-value clinical snapshot */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-medium">Rendez-vous d'aujourd'hui</CardTitle>
              <CardDescription>Patients prevus aujourd'hui</CardDescription>
            </div>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingAppointments ? (
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Clock className="h-3 w-3 animate-spin" />
                Chargement des rendez-vous d'aujourd'hui...
              </p>
            ) : todayAppointments.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Aucun rendez-vous prevu aujourd'hui.
              </p>
            ) : (
              <div className="space-y-2">
                {todayAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-start justify-between rounded-md border px-3 py-2 text-xs"
                  >
                    <div>
                      <div className="font-medium">
                        {appt.patient
                          ? `${appt.patient.first_name} ${appt.patient.last_name}`
                          : "Patient"}
                      </div>
                      <div className="text-muted-foreground">
                        {format(new Date(appt.date_time), "HH:mm")} ·{" "}
                        {appt.patient?.phone || "Sans telephone"}
                      </div>
                      {appt.notes && (
                        <div className="mt-1 text-muted-foreground line-clamp-1">
                          {appt.notes}
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {statusLabels[appt.status] ?? appt.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Liste des patients</CardTitle>
            <CardDescription>Gerez vos dossiers patients</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Rechercher par nom, CIN, e-mail ou telephone..."
                  value={listSearchTerm}
                  onChange={(e) => setListSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <PatientList key={refreshKey} onRefresh={fetchStats} searchTerm={listSearchTerm} />
          </CardContent>
        </Card>
      </main>

      <AddPatientDialog
        open={addPatientOpen}
        onOpenChange={setAddPatientOpen}
        onPatientAdded={fetchStats}
      />
    </div>
  );
};

export default Dashboard;
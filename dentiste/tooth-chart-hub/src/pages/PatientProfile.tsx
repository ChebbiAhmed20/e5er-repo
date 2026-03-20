import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { DentalChart } from "@/components/DentalChart";
import TreatmentDialog from "@/components/TreatmentDialog";
import MouthPhotos from "@/components/MouthPhotos";
import PrescriptionDialog from "@/components/PrescriptionDialog";
import PrescriptionList from "@/components/PrescriptionList";
import PatientBilling from "@/components/PatientBilling";
import  PatientTreatments  from "@/components/History";


interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  address: string;
  medical_notes: string;
  sms_reminders_enabled: boolean;
  email_reminders_enabled: boolean;
}

const PatientProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeeth, setSelectedTeeth] = useState<Set<string>>(new Set());
  const [selectedToothForDialog, setSelectedToothForDialog] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [prescriptionDialogOpen, setPrescriptionDialogOpen] = useState(false);
  const [prescriptionRefresh, setPrescriptionRefresh] = useState(0);
  const [treatmentRefreshKey, setTreatmentRefreshKey] = useState(0);
  const [treatments, setTreatments] = useState<Array<{ tooth_number: number }>>([]);

  useEffect(() => {
    if (id) {
      fetchPatient();
    }
  }, [id]);

  // Fetch treatments for this patient so we can mark treated teeth on the chart
  useEffect(() => {
    if (!id) return;
    const fetchTreatments = async () => {
      try {
        const data = await apiClient.request(`/api/treatments/patient/${id}`);
        setTreatments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load treatments", err);
        setTreatments([]);
      }
    };
    fetchTreatments();
  }, [id, treatmentRefreshKey]);

  const fetchPatient = async () => {
    setLoading(true);
    try {
      const data = await apiClient.request<Patient>(`/api/patients/${id}`);
      setPatient(data);
    } catch (error) {
      toast.error("Echec du chargement du patient");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/dashboard");
    }
  };

  const handleToggleReminder = async (field: 'sms_reminders_enabled' | 'email_reminders_enabled', value: boolean) => {
    if (!patient) return;

    try {
      await apiClient.request(`/api/patients/${patient.id}`, {
        method: "PUT",
        data: { [field]: value },
      });
      setPatient({ ...patient, [field]: value });
      toast.success("Preferences de rappel mises a jour");
    } catch (error) {
      toast.error("Echec de la mise a jour des preferences de rappel");
    }
  };

  /**
   * Handle tooth selection from DentalChart
   * Converts FDI string (e.g., "11", "33") to numeric format
   * Opens TreatmentDialog for the selected tooth
   */
  const handleToothSelect = (toothNumber: string, isSelected: boolean) => {
    const toothNum = parseInt(toothNumber, 10);
    
    // Update selected teeth set
    const newSelected = new Set(selectedTeeth);
    if (isSelected) {
      newSelected.add(toothNumber);
    } else {
      newSelected.delete(toothNumber);
    }
    setSelectedTeeth(newSelected);

    // Only open dialog when selecting (not deselecting)
    if (isSelected) {
      setSelectedToothForDialog(toothNum);
      setDialogOpen(true);

      // Demo: Log to browser console
      console.log(`[PatientProfile] Tooth ${toothNumber} selected`);
      console.log(`[PatientProfile] All selected teeth:`, Array.from(newSelected).sort());
      console.log(`[PatientProfile] Patient:`, patient?.first_name, patient?.last_name);
    }
  };

  const handleTreatmentAdded = () => {
    fetchPatient();
    setTreatmentRefreshKey((k) => k + 1);
    // Deselect tooth after treatment dialog closes
    setSelectedToothForDialog(null);
  };

  const handlePrescriptionAdded = () => {
    setPrescriptionRefresh(prev => prev + 1);
  };

  if (loading || !patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={handleBack} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-3xl font-bold">
            {patient.first_name} {patient.last_name}
          </h1>
          <p className="text-muted-foreground">Profil patient</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Informations patient</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">E-mail</p>
                <p className="text-sm">{patient.email || "Non renseigne"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Telephone</p>
                <p className="text-sm">{patient.phone || "Non renseigne"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date de naissance</p>
                <p className="text-sm">
                  {patient.date_of_birth
                    ? new Date(patient.date_of_birth).toLocaleDateString("fr-FR")
                    : "Non renseigne"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Adresse</p>
                <p className="text-sm">{patient.address || "Non renseigne"}</p>
              </div>
              {patient.medical_notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notes medicales</p>
                  <p className="text-sm">{patient.medical_notes}</p>
                </div>
              )}
              <div className="pt-4 space-y-4 border-t">
                <h4 className="text-sm font-semibold">Preferences de rappel</h4>
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-reminders" className="text-sm font-normal cursor-pointer">
                    Recevoir des rappels par e-mail ?
                  </Label>
                  <Switch
                    id="email-reminders"
                    checked={patient.email_reminders_enabled ?? true}
                    onCheckedChange={(checked) => handleToggleReminder('email_reminders_enabled', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="sms-reminders" className="text-sm font-normal cursor-pointer">
                    Recevoir des rappels par SMS ?
                  </Label>
                  <Switch
                    id="sms-reminders"
                    checked={patient.sms_reminders_enabled ?? true}
                    onCheckedChange={(checked) => handleToggleReminder('sms_reminders_enabled', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <Tabs defaultValue="dental-chart" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="dental-chart">Schema dentaire</TabsTrigger>
                <TabsTrigger value="prescriptions">Ordonnances</TabsTrigger>
                <TabsTrigger value="billing">Services en ligne</TabsTrigger>
                <TabsTrigger value="treatment-history">Historique des traitements</TabsTrigger>
              </TabsList>

              <TabsContent value="dental-chart" className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Schema dentaire interactif</CardTitle>
                    <CardDescription>
                      Cliquez sur une dent pour voir ou ajouter des traitements. Vous pouvez selectionner plusieurs dents.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <DentalChart
                      patientId={patient.id}
                      selectedTeeth={selectedTeeth}
                      onToothSelect={handleToothSelect}
                      treatedTeeth={new Set(treatments.map(t => String(t.tooth_number)))}
                    />
                  </CardContent>
                </Card>

                <MouthPhotos patientId={patient.id} />
              </TabsContent>

              <TabsContent value="prescriptions" className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Ordonnances</CardTitle>
                        <CardDescription>
                          Voir et gerer les ordonnances du patient
                        </CardDescription>
                      </div>
                      <Button onClick={() => setPrescriptionDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter une ordonnance
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <PrescriptionList
                      patientId={patient.id}
                      patientName={`${patient.first_name} ${patient.last_name}`}
                      refreshTrigger={prescriptionRefresh}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="billing" className="mt-6">
                <PatientBilling patientId={patient.id} />
              </TabsContent>

              <TabsContent value="treatment-history" className="mt-6">
              <PatientTreatments patientId={patient.id} refreshKey={treatmentRefreshKey} />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <TreatmentDialog
          patientId={patient.id}
          toothNumber={selectedToothForDialog}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            // If dialog is closing, deselect the tooth
            if (!open && selectedToothForDialog !== null) {
              setSelectedTeeth((prev) => {
                const next = new Set(prev);
                next.delete(String(selectedToothForDialog));
                return next;
              });
            }
          }}
          onTreatmentAdded={handleTreatmentAdded}
        />

        <PrescriptionDialog
          patientId={patient.id}
          open={prescriptionDialogOpen}
          onOpenChange={setPrescriptionDialogOpen}
          onPrescriptionAdded={handlePrescriptionAdded}
        />
      </main>
    </div>
  );
};

export default PatientProfile;

import { useEffect, useState, useRef } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  format,
  subMonths,
  subYears,
  isAfter,
} from "date-fns";
import {
  Download,
  Loader2,
  Stethoscope,
  User,
  CreditCard,
  Calendar,
  Phone,
  MapPin,
  FileText,
  MessageSquare,
  FileDown,
  FileUp,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { isDesktop } from "@/lib/platform";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface Treatment {
  id: string;
  treatment_type: string;
  notes: string;
  treatment_date: string;
  tooth_number: number;
  image_url?: string | null;
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  date_of_birth: string;
}

interface Doctor {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  clinic_name: string;
  clinic_address: string;
}

interface HistoryProps {
  patientId: string;
  refreshKey?: number;
}

const timeFilters = [
  { label: "Tout le temps", value: "all" },
  { label: "Dernier mois", value: "last_month" },
  { label: "Derniere annee", value: "last_year" },
];

const History = ({ patientId, refreshKey = 0 }: HistoryProps) => {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loadingTreatments, setLoadingTreatments] = useState(true);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [timeFilter, setTimeFilter] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [exportExcelLoading, setExportExcelLoading] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Fetch treatments when patientId or refreshKey (after adding a treatment) changes
  useEffect(() => {
    const fetchTreatments = async () => {
      setLoadingTreatments(true);
      try {
        const data = await apiClient.request<Treatment[]>(`/api/treatments/patient/${patientId}`);
        setTreatments(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Echec du chargement des traitements", error);
        setTreatments([]);
      } finally {
        setLoadingTreatments(false);
      }
    };
    fetchTreatments();
  }, [patientId, refreshKey]);

  // Fetch patient and doctor info separately
  useEffect(() => {
  const fetchInfo = async () => {
    setLoadingInfo(true);
    try {
      const patientData = await apiClient.request<Patient>(`/api/patients/${patientId}`);
      setPatient(patientData);

      // Removed doctor fetch

    } catch (error) {
      console.error("Echec du chargement des informations du patient", error);
      setPatient(null);
    } finally {
      setLoadingInfo(false);
    }
  };
  fetchInfo();
}, [patientId]);


  const filteredTreatments = treatments.filter(t => {
    if (timeFilter === "all") return true;
    const d = new Date(t.treatment_date);
    if (timeFilter === "last_month") return isAfter(d, subMonths(new Date(), 1));
    if (timeFilter === "last_year") return isAfter(d, subYears(new Date(), 1));
    return true;
  });

  const exportToPDF = async () => {
    if (!contentRef.current) return;
    try {
      setExporting(true);
      toast({
        title: "Generation du PDF",
        description: "Veuillez patienter pendant la creation du document...",
      });

      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#fff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `historique_traitements_${patient?.first_name}_${patient?.last_name}_${new Date()
        .toISOString()
        .slice(0,10)}.pdf`;
      pdf.save(fileName);

      toast({ title: "Succes", description: "PDF genere avec succes" });
    } catch (error) {
      console.error(error);
      toast({title:"Erreur", description:"Echec de la generation du PDF", variant:"destructive"});
    } finally {
      setExporting(false);
    }
  };

  const handleExportPatientFullData = async () => {
    if (!isDesktop || !(window as any).desktop?.excel) {
      toast({ title: "Non disponible", description: "L'export Excel est disponible uniquement dans l'application bureau.", variant: "destructive" });
      return;
    }
    const token = apiClient.getAccessToken();
    if (!token) {
      toast({ title: "Session expiree", description: "Veuillez vous reconnecter.", variant: "destructive" });
      return;
    }
    setExportExcelLoading(true);
    try {
      const res = await (window as any).desktop.excel.exportPatientFullData(token, patientId);
      if (res?.success) toast({ title: "Export termine", description: `Enregistre dans ${res.path}` });
      else if (res?.canceled) toast({ title: "Annule", description: "La boite de dialogue d'enregistrement a ete annulee." });
      else toast({ title: "Echec de l'export", description: res?.error || "Impossible d'enregistrer le fichier.", variant: "destructive" });
    } catch (e: any) {
      toast({ title: "Echec de l'export", description: e?.message || "Impossible d'exporter.", variant: "destructive" });
    } finally {
      setExportExcelLoading(false);
    }
  };

  const handleExportTreatments = async () => {
    if (!isDesktop || !(window as any).desktop?.excel) {
      toast({ title: "Non disponible", description: "L'export Excel est disponible uniquement dans l'application bureau.", variant: "destructive" });
      return;
    }
    const token = apiClient.getAccessToken();
    if (!token) {
      toast({ title: "Session expiree", description: "Veuillez vous reconnecter.", variant: "destructive" });
      return;
    }
    setExportExcelLoading(true);
    try {
      const res = await (window as any).desktop.excel.exportPatientTreatments(token, patientId);
      if (res?.success) toast({ title: "Export termine", description: `Enregistre dans ${res.path}` });
      else if (res?.canceled) toast({ title: "Annule", description: "La boite de dialogue d'enregistrement a ete annulee." });
      else toast({ title: "Echec de l'export", description: res?.error || "Impossible d'enregistrer le fichier.", variant: "destructive" });
    } catch (e: any) {
      toast({ title: "Echec de l'export", description: e?.message || "Impossible d'exporter.", variant: "destructive" });
    } finally {
      setExportExcelLoading(false);
    }
  };

  const handleImportPatientFullData = () => {
    toast({ title: "Import patient", description: "Utilisez la page Patients pour importer des donnees depuis Excel." });
  };

  const handleImportTreatments = () => {
    toast({ title: "Import traitements", description: "L'import des traitements pour ce patient arrive bientot." });
  };

  if (loadingTreatments || loadingInfo) return <p>Chargement...</p>;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <CardTitle>Historique des traitements</CardTitle>
            <CardDescription>Tous les traitements pour les dents de ce patient</CardDescription>
          </div>
          <div className="flex items-center flex-wrap gap-2">
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filtrer par periode" />
              </SelectTrigger>
              <SelectContent>
                {timeFilters.map(({ label, value }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={exportToPDF} disabled={exporting} size="sm" className="gap-2" variant="outline">
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generation...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Exporter en PDF
                </>
              )}
            </Button>

            {isDesktop && (window as any).desktop?.excel && (
              <>
                <Button onClick={handleExportPatientFullData} disabled={exportExcelLoading} size="sm" variant="outline" className="gap-2">
                  {exportExcelLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  Exporter le patient (donnees completes)
                </Button>
                <Button onClick={handleExportTreatments} disabled={exportExcelLoading} size="sm" variant="outline" className="gap-2">
                  {exportExcelLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  Exporter les traitements
                </Button>
                <Button onClick={handleImportPatientFullData} size="sm" variant="outline" className="gap-2">
                  <FileUp className="w-4 h-4" />
                  Importer le patient (donnees completes)
                </Button>
                <Button onClick={handleImportTreatments} size="sm" variant="outline" className="gap-2">
                  <FileUp className="w-4 h-4" />
                  Importer les traitements
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent ref={contentRef} className="bg-background p-6 rounded-lg">
        {/* Doctor Info */}
        {doctor && (
          <Card className="mb-6 bg-gradient-to-r from-primary/5 to-accent/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Stethoscope className="w-8 h-8 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-foreground mb-1">{doctor.first_name} {doctor.last_name}</h1>
                  <p className="text-muted-foreground mb-3">{doctor.clinic_name}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MessageSquare className="w-4 h-4" />
                      <span>{doctor.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{doctor.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground col-span-full">
                      <MapPin className="w-4 h-4" />
                      <span>{doctor.clinic_address}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Patient Info */}
        {patient && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Informations patient
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Nom complet</p>
                    <p className="font-semibold text-foreground">{patient.first_name} {patient.last_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">E-mail</p>
                      <p className="font-medium">{patient.email}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date de naissance</p>
                      <p className="font-medium">{new Date(patient.date_of_birth).toLocaleDateString("fr-FR")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Telephone</p>
                      <p className="font-medium">{patient.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Adresse</p>
                      <p className="font-medium">{patient.address}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Treatment History Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Historique des traitements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Date et heure</TableHead>
                    <TableHead className="w-[120px]">Numero de dent</TableHead>
                    <TableHead className="w-[200px]">Type de traitement</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTreatments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        Aucun traitement enregistre pour ce patient.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTreatments.map((treatment) => (
                      <TableRow key={treatment.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {new Date(treatment.treatment_date).toLocaleString("fr-FR")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                            {treatment.tooth_number || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{treatment.treatment_type}</TableCell>
                        <TableCell className="text-muted-foreground">{treatment.notes || "Aucune note"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

export default History;

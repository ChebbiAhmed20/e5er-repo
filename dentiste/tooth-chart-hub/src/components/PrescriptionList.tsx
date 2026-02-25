import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, Printer, Search } from "lucide-react";
import { toast } from "sonner";
import PrescriptionPrint from "./PrescriptionPrint";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
}

interface Prescription {
  id: string;
  patient_id: string;
  medication_list: Medication[];
  dosage: string | null;
  instructions: string | null;
  duration: string | null;
  date_issued: string;
  // Removed: status, created_at
}


interface PrescriptionListProps {
  patientId: string;
  patientName: string;
  refreshTrigger?: number;
}

const PrescriptionList = ({ patientId, patientName, refreshTrigger }: PrescriptionListProps) => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [filteredPrescriptions, setFilteredPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [showPrint, setShowPrint] = useState(false);

  useEffect(() => {
    fetchPrescriptions();
  }, [patientId, refreshTrigger]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredPrescriptions(prescriptions);
    } else {
      const filtered = prescriptions.filter((p) =>
        p.medication_list.some((m) =>
          m.name.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        p.instructions?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPrescriptions(filtered);
    }
  }, [searchTerm, prescriptions]);

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const data = await apiClient.request<Prescription[]>(`/api/prescriptions/patient/${patientId}`);
      const list = Array.isArray(data) ? data : [];
      setPrescriptions(list);
      setFilteredPrescriptions(list);
    } catch (error) {
      toast.error("Echec du chargement des ordonnances");
      console.error(error);
    }
    setLoading(false);
  };

  const handlePrint = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setShowPrint(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher des ordonnances..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {filteredPrescriptions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Aucune ordonnance trouvee</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPrescriptions.map((prescription) => (
              <Card key={prescription.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {new Date(prescription.date_issued).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </CardTitle>
                      <CardDescription>
                        {prescription.medication_list.length} medicament(s)
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">


                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrint(prescription)}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Imprimer
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium mb-1">Medicaments :</p>
                      <ul className="list-disc list-inside space-y-1">
                        {prescription.medication_list.map((med, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground">
                            {med.name} - {med.dosage} ({med.frequency})
                          </li>
                        ))}
                      </ul>
                    </div>
                    {prescription.duration && (
                      <p className="text-sm">
                        <span className="font-medium">Duree :</span> {prescription.duration}
                      </p>
                    )}
                    {prescription.instructions && (
                      <p className="text-sm">
                        <span className="font-medium">Instructions :</span> {prescription.instructions}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedPrescription && (
        <PrescriptionPrint
          prescription={selectedPrescription}
          patientName={patientName}
          open={showPrint}
          onOpenChange={setShowPrint}
        />
      )}
    </>
  );
};

export default PrescriptionList;

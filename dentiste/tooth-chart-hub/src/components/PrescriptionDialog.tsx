import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

interface PrescriptionDialogProps {
  patientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrescriptionAdded: () => void;
  
}


interface Medication {
  name: string;
  dosage: string;
  frequency: string;

}


const PrescriptionDialog = ({
  patientId,
  open,
  onOpenChange,
  onPrescriptionAdded,
}: PrescriptionDialogProps) => {
  const [medications, setMedications] = useState<Medication[]>([
    { name: "", dosage: "", frequency: "" },
  ]);
  const [instructions, setInstructions] = useState("");
  const [duration, setDuration] = useState("");
  const [loading, setLoading] = useState(false);

  const addMedication = () => {
    setMedications([...medications, { name: "", dosage: "", frequency: "" }]);
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  console.log("ID patient:", patientId);
    console.log("Medicaments avant traitement:", medications);
    console.log("Instructions:", instructions);
    console.log("Duree:", duration);

  const processedMedications = medications
    .map((m) => ({
      name: m.name.trim(),
      dosage: m.dosage.trim(),
      frequency: m.frequency.trim()
    }))
    .filter((m) => m.name && m.dosage && m.frequency);
    console.log("Medicaments traites:", processedMedications);

  if (processedMedications.length === 0) {
    toast.error("Veuillez ajouter au moins un medicament");
    setLoading(false);
    return;
  }

  try {
    await apiClient.request("/api/prescriptions", {
      method: "POST",
      data: {
        patient_id: patientId,
        medication_list: processedMedications,
        instructions: instructions.trim() || null,
        duration: duration.trim() || null,
        date_issued: new Date().toISOString().split("T")[0], // e.g., '2025-11-21'
        // Removed 'status' here
      }
    });

    toast.success("Ordonnance creee avec succes");
    onPrescriptionAdded();
    onOpenChange(false);
    setMedications([{ name: "", dosage: "", frequency: "" }]);
    setInstructions("");
    setDuration("");
  } catch (error: any) {
    console.error("Echec de la creation de l'ordonnance", error);
    toast.error(error?.message || "Echec de la creation de l'ordonnance");
  }

  setLoading(false);
};


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter une ordonnance</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Medicaments</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMedication}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un medicament
              </Button>
            </div>

            {medications.map((med, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Medicament {index + 1}</span>
                  {medications.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMedication(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-3">
                  <div>
                    <Label>Nom du medicament</Label>
                    <Input
                      value={med.name}
                      onChange={(e) =>
                        updateMedication(index, "name", e.target.value)
                      }
                      placeholder="ex. Amoxicilline"
                    />
                  </div>
                  <div>
                    <Label>Dosage</Label>
                    <Input
                      value={med.dosage}
                      onChange={(e) =>
                        updateMedication(index, "dosage", e.target.value)
                      }
                      placeholder="ex. 500 mg"
                    />
                  </div>
                  <div>
                    <Label>Frequence</Label>
                    <Input
                      value={med.frequency}
                      onChange={(e) =>
                        updateMedication(index, "frequency", e.target.value)
                      }
                      placeholder="ex. 3 fois par jour"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <Label>Duree</Label>
            <Input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="ex. 7 jours"
            />
          </div>

          <div>
            <Label>Instructions</Label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Instructions supplementaires pour le patient..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creation..." : "Creer l'ordonnance"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PrescriptionDialog;

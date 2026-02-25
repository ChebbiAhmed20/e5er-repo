import { useEffect, useState } from "react";
import { apiClient, getImageUrl } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { z } from "zod";

interface Treatment {
  id: string;
  treatment_type: string;
  notes: string;
  treatment_date: string;
  created_at: string;
  image_url: string | null;
  tooth_number?: number;
}

interface TreatmentHistoryProps {
  patientId: string;
  toothNumber: number;
}

const treatmentSchema = z.object({
  treatment_type: z.string()
    .trim()
    .min(1, { message: "Le type de traitement est requis" })
    .max(100, { message: "Le type de traitement doit contenir moins de 100 caracteres" }),
  notes: z.string()
    .trim()
    .max(2000, { message: "Les notes doivent contenir moins de 2000 caracteres" })
    .optional()
    .or(z.literal('')),
  treatment_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Format de date invalide" }),
});

const treatmentTypes = [
  { value: "Filling", label: "Obturation" },
  { value: "Root Canal", label: "Traitement de canal" },
  { value: "Crown", label: "Couronne" },
  { value: "Extraction", label: "Extraction" },
  { value: "Cleaning", label: "Detartrage" },
  { value: "Whitening", label: "Blanchiment" },
  { value: "Implant", label: "Implant" },
  { value: "Bridge", label: "Bridge" },
  { value: "Veneer", label: "Facette" },
  { value: "Other", label: "Autre" },
];

const TreatmentHistory = ({ patientId, toothNumber }: TreatmentHistoryProps) => {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTreatmentType, setSelectedTreatmentType] = useState("");
  const [customTreatment, setCustomTreatment] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchTreatments();
  }, [patientId, toothNumber]);

  const fetchTreatments = async () => {
    try {
      const data = await apiClient.request<Treatment[]>(`/api/treatments/patient/${patientId}`);
      const list = Array.isArray(data) ? data : [];
      const forTooth = list.filter((t: Treatment) => Number(t.tooth_number) === Number(toothNumber));
      setTreatments(forTooth);
    } catch (error) {
      console.error("Echec du chargement des traitements", error);
      setTreatments([]);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTreatment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    // Determine final treatment type
    const treatmentType = selectedTreatmentType === "Other" 
      ? customTreatment 
      : selectedTreatmentType;

    // Validate input data using Zod schema
    try {
      treatmentSchema.parse({
        treatment_type: treatmentType,
        notes: formData.get("notes") as string || "",
        treatment_date: formData.get("treatmentDate") as string,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error(firstError.message);
        setLoading(false);
        return;
      }
    }

    let imageUrl: string | null = null;

    // Upload image if selected
    if (selectedImage) {
      setUploadingImage(true);
      const fileExt = selectedImage.name.split(".").pop();
      const filename = `${patientId}-${toothNumber}-${Date.now()}.${fileExt}`;
      const uploadForm = new FormData();
      uploadForm.append("file", selectedImage, filename);

      try {
        const uploadResponse = await apiClient.request<{ url?: string; path?: string }>(
          "/api/uploads/tooth-treatment-photos",
          {
            method: "POST",
            data: uploadForm,
          }
        );
        imageUrl = uploadResponse.url || uploadResponse.path || null;
      } catch (uploadError) {
        toast.error("Echec de l'envoi de l'image");
        setLoading(false);
        setUploadingImage(false);
        return;
      } finally {
        setUploadingImage(false);
      }
    }

    try {
      await apiClient.request("/api/treatments", {
        method: "POST",
        data: {
          patient_id: patientId,
          tooth_number: toothNumber,
          treatment_type: treatmentType,
          notes: (formData.get("notes") as string) || null,
          treatment_date: formData.get("treatmentDate") as string,
          image_url: imageUrl,
        },
      });

      toast.success("Traitement ajoute avec succes !");
      setDialogOpen(false);
      fetchTreatments();
      e.currentTarget.reset();
      setSelectedTreatmentType("");
      setCustomTreatment("");
      setSelectedImage(null);
      setImagePreview(null);
    } catch (error) {
      console.error("Echec de l'ajout du traitement", error);
      toast.error("Echec de l'ajout du traitement");
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Historique des traitements - Dent #{toothNumber}</CardTitle>
            <CardDescription>Tous les traitements pour cette dent</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un traitement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un traitement</DialogTitle>
                <DialogDescription>Enregistrer un nouveau traitement pour la dent #{toothNumber}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddTreatment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="treatmentType">Type de traitement *</Label>
                  <Select 
                    value={selectedTreatmentType}
                    onValueChange={setSelectedTreatmentType}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner un type de traitement" />
                    </SelectTrigger>
                    <SelectContent>
                      {treatmentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTreatmentType === "Other" && (
                  <div className="space-y-2">
                    <Label htmlFor="customTreatment">Nom du traitement personnalise *</Label>
                    <Input
                      id="customTreatment"
                      value={customTreatment}
                      onChange={(e) => setCustomTreatment(e.target.value)}
                      placeholder="Saisir le nom du traitement"
                      maxLength={100}
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="treatmentDate">Date du traitement *</Label>
                  <Input
                    id="treatmentDate"
                    name="treatmentDate"
                    type="date"
                    defaultValue={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="treatmentImage">Photo du traitement</Label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      id="treatmentImage"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("treatmentImage")?.click()}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {selectedImage ? "Changer la photo" : "Importer une photo"}
                    </Button>
                    {imagePreview && (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Apercu"
                          className="w-full h-40 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6"
                          onClick={() => {
                            setSelectedImage(null);
                            setImagePreview(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Details du traitement, observations..."
                    maxLength={2000}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={loading || uploadingImage}>
                    {loading || uploadingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {uploadingImage ? "Envoi..." : "Ajout..."}
                      </>
                    ) : (
                      "Ajouter le traitement"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {treatments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucun traitement enregistre pour cette dent
          </p>
        ) : (
          <div className="space-y-4">
            {treatments.map((treatment) => (
              <div
                key={treatment.id}
                className="p-4 border rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold">{treatment.treatment_type}</h4>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(treatment.treatment_date), "dd MMM yyyy", { locale: fr })}
                  </span>
                </div>
                {treatment.notes && (
                  <p className="text-sm text-muted-foreground mb-2">{treatment.notes}</p>
                )}
                {treatment.image_url && (
                  <img
                    src={getImageUrl(treatment.image_url)}
                    alt={`Traitement pour la dent ${toothNumber}`}
                    className="w-full max-w-md h-48 object-cover rounded-lg border mt-2"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TreatmentHistory;

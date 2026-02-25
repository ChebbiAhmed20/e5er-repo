import { useEffect, useState } from "react";
import { apiClient, getImageUrl } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, X, Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
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
  treatment_cost: number;
  amount_paid: number;
  balance_remaining: number;
  payment_status: string;
  tooth_number?: number;
}

interface TreatmentDialogProps {
  patientId: string;
  toothNumber: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTreatmentAdded: () => void;
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
  treatment_cost: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, { message: "Format de cout invalide" })
    .transform(val => parseFloat(val))
    .refine(val => val >= 0, { message: "Le cout doit etre positif" }),
  payment_status: z.enum(['paid', 'unpaid', 'partially_paid'], { message: "Le statut de paiement est requis" }),
  amount_paid: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, { message: "Format du montant invalide" })
    .transform(val => parseFloat(val))
    .refine(val => val >= 0, { message: "Le montant paye doit etre positif" })
    .optional()
    .or(z.literal('')),
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

const TreatmentDialog = ({ patientId, toothNumber, open, onOpenChange, onTreatmentAdded }: TreatmentDialogProps) => {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTreatmentType, setSelectedTreatmentType] = useState("");
  const [customTreatment, setCustomTreatment] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>("unpaid");

  const normalizeTreatment = (t: any): Treatment => {
    const cost = Number(t.treatment_cost ?? 0);
    const paid = Number(t.amount_paid ?? 0);
    const balance =
      t.balance_remaining !== undefined && t.balance_remaining !== null
        ? Number(t.balance_remaining)
        : cost - paid;
    return {
      ...t,
      treatment_cost: Number.isFinite(cost) ? cost : 0,
      amount_paid: Number.isFinite(paid) ? paid : 0,
      balance_remaining: Number.isFinite(balance) ? balance : 0,
    };
  };

  useEffect(() => {
    if (open && toothNumber) {
      fetchTreatments();
    }
  }, [open, toothNumber, patientId]);

  const fetchTreatments = async () => {
    if (!toothNumber) return;

    try {
      const data = await apiClient.request<Treatment[]>(`/api/treatments/patient/${patientId}`);
      const list = Array.isArray(data) ? data : [];
      const forTooth = list.filter((t: Treatment) => Number(t.tooth_number) === Number(toothNumber));
      const normalized = forTooth.map(normalizeTreatment);
      setTreatments(normalized);
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
    if (!toothNumber) return;

    const form = e.currentTarget;
    setLoading(true);

    const formData = new FormData(form);
    const treatmentType = selectedTreatmentType === "Other"
      ? customTreatment
      : selectedTreatmentType;

    try {
      treatmentSchema.parse({
        treatment_type: treatmentType,
        notes: formData.get("notes") as string || "",
        treatment_date: formData.get("treatmentDate") as string,
        treatment_cost: formData.get("treatmentCost") as string || "0",
        payment_status: paymentStatus,
        amount_paid: paymentStatus === "partially_paid" ? (formData.get("amountPaid") as string || "0") : "0",
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

    if (selectedImage) {
      setUploadingImage(true);
      const fileExt = selectedImage.name.split(".").pop();
      const filename = `${patientId}-${toothNumber}-${Date.now()}.${fileExt}`;
      const uploadForm = new FormData();
      uploadForm.append("file", selectedImage, filename);

      try {
        const uploadResponse = await apiClient.request<{ path: string }>(
          "/api/uploads/tooth-treatment-photos",
          {
            method: "POST",
            data: uploadForm,
          }
        );
        imageUrl = uploadResponse.path;
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
      await apiClient.request('/api/treatments', {
        method: 'POST',
        data: {
          patient_id: patientId,
          tooth_number: toothNumber,
          treatment_type: treatmentType,
          notes: (formData.get("notes") as string) || null,
          treatment_date: formData.get("treatmentDate") as string,
          image_url: imageUrl,
          treatment_cost: parseFloat((formData.get("treatmentCost") as string) || "0"),
          payment_status: paymentStatus,
          amount_paid:
            paymentStatus === "partially_paid"
              ? parseFloat((formData.get("amountPaid") as string) || "0")
              : paymentStatus === "paid"
                ? parseFloat((formData.get("treatmentCost") as string) || "0")
                : 0,
        },
      });

      toast.success("Traitement ajoute avec succes !");
      fetchTreatments();
      onTreatmentAdded();
      form.reset();
      setSelectedTreatmentType("");
      setCustomTreatment("");
      setSelectedImage(null);
      setImagePreview(null);
      setPaymentStatus("unpaid");
    } catch (error) {
      console.error("Echec de l'ajout du traitement", error);
      toast.error("Echec de l'ajout du traitement");
    }
    setLoading(false);
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Paye
          </Badge>
        );
      case "partially_paid":
        return (
          <Badge className="bg-yellow-500">
            <Clock className="h-3 w-3 mr-1" />
            Partiellement paye
          </Badge>
        );
      case "unpaid":
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Impaye
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!toothNumber) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dent #{toothNumber} - Gestion des traitements</DialogTitle>
          <DialogDescription>
            Voir l'historique et ajouter des traitements
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history">Historique</TabsTrigger>
            <TabsTrigger value="add">Ajouter un traitement</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4 mt-4">
            {treatments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun traitement enregistre pour cette dent
              </div>
            ) : (
              <div className="space-y-3">
                {treatments.map((treatment) => (
                  <div
                    key={treatment.id}
                    className="p-4 border rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{treatment.treatment_type}</h4>
                        {getPaymentStatusBadge(treatment.payment_status)}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(treatment.treatment_date), "dd MMM yyyy", { locale: fr })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm">
                        <span className="font-medium">Cout :</span> {treatment.treatment_cost.toFixed(2)} TND
                      </div>
                      {treatment.payment_status === "partially_paid" && (
                        <div className="text-xs text-muted-foreground">
                          Paye : {treatment.amount_paid.toFixed(2)} TND |
                          Solde : {treatment.balance_remaining.toFixed(2)} TND
                        </div>
                      )}
                    </div>
                    {treatment.notes && (
                      <p className="text-sm text-muted-foreground mb-2">{treatment.notes}</p>
                    )}
                    {treatment.image_url && (
                      <img
                        src={getImageUrl(treatment.image_url)}
                        alt={`Traitement pour la dent ${toothNumber}`}
                        className="w-full max-w-md h-48 object-cover rounded-lg border mt-2"
                        onLoad={() => console.debug('[TreatmentDialog] image loaded', treatment.id, getImageUrl(treatment.image_url))}
                        onError={(e) => console.error('[TreatmentDialog] image failed to load', treatment.id, getImageUrl(treatment.image_url), e)}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="add" className="mt-4">
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
                  <Label htmlFor="treatmentCost">Cout du traitement (TND) *</Label>
                <Input
                  id="treatmentCost"
                  name="treatmentCost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                  <Label htmlFor="paymentStatus">Statut de paiement *</Label>
                <Select
                  value={paymentStatus}
                  onValueChange={setPaymentStatus}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionner un statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Impaye</SelectItem>
                    <SelectItem value="partially_paid">Partiellement paye</SelectItem>
                    <SelectItem value="paid">Paye</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentStatus === "partially_paid" && (
                <div className="space-y-2">
                  <Label htmlFor="amountPaid">Montant deja paye (TND) *</Label>
                  <Input
                    id="amountPaid"
                    name="amountPaid"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    required
                  />
                </div>
              )}

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
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Fermer
                </Button>
                <Button type="submit" disabled={loading || uploadingImage}>
                  {loading || uploadingImage ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {uploadingImage ? "Envoi..." : "Ajout..."}
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter un traitement
                    </>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default TreatmentDialog;

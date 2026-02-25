import { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { z } from "zod";

const patientSchema = z.object({
  firstName: z.string().trim().min(1, "Le prenom est requis").max(100, "Le prenom doit contenir moins de 100 caracteres"),
  lastName: z.string().trim().min(1, "Le nom est requis").max(100, "Le nom doit contenir moins de 100 caracteres"),
  cin: z.string().trim().max(50, "Le CIN doit contenir moins de 50 caracteres").optional().or(z.literal("")),
  email: z.string().trim().email("Adresse e-mail invalide").max(255, "L'e-mail doit contenir moins de 255 caracteres").optional().or(z.literal("")),
  phone: z.string().trim().regex(/^[\d\s\+\-\(\)]*$/, "Format de numero de telephone invalide").max(20, "Le numero de telephone doit contenir moins de 20 caracteres").optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  address: z.string().trim().max(500, "L'adresse doit contenir moins de 500 caracteres").optional().or(z.literal("")),
  medicalNotes: z.string().trim().max(2000, "Les notes medicales doivent contenir moins de 2000 caracteres").optional().or(z.literal("")),
});

interface AddPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatientAdded?: () => void;
}

const AddPatientDialog = ({ open, onOpenChange, onPatientAdded }: AddPatientDialogProps) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setLoading(true);

  const formData = new FormData(e.currentTarget);
  const rawData = {
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    cin: formData.get("cin") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    dateOfBirth: formData.get("dateOfBirth") as string,
    address: formData.get("address") as string,
    medicalNotes: formData.get("medicalNotes") as string,
  };

  // Validate input
  const validation = patientSchema.safeParse(rawData);
  if (!validation.success) {
    const firstError = validation.error.errors[0];
    toast.error(firstError.message);
    setLoading(false);
    return;
  }

  const validatedData = validation.data;
  try {
    // Get current user
    const { data: sessionData } = await apiClient.getSession();
    const user = sessionData?.session?.user;

    if (!user) {
      toast.error("Vous devez etre connecte pour ajouter des patients");
      setLoading(false);
      return;
    }

    const payload = {
      first_name: validatedData.firstName,
      last_name: validatedData.lastName,
      cin: validatedData.cin || null,
      email: validatedData.email || null,
      phone: validatedData.phone || null,
      date_of_birth: validatedData.dateOfBirth || null,
      address: validatedData.address || null,
      medical_notes: validatedData.medicalNotes || null,
    };
    // Create patient via API
    await apiClient.request('/api/patients', {
      method: 'POST',
      data: payload
    });

    toast.success("Patient ajoute avec succes !");
    onOpenChange(false);
    onPatientAdded?.();
    if (e.currentTarget) {
  	e.currentTarget.reset();
	}
  } catch (error: any) {
    toast.error(error.message || "Echec de l'ajout du patient");
    console.error(error);
  }
  
  setLoading(false);
};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un patient</DialogTitle>
          <DialogDescription>Renseignez les informations pour creer un nouveau dossier</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prenom *</Label>
              <Input id="firstName" name="firstName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom *</Label>
              <Input id="lastName" name="lastName" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cin">CIN</Label>
            <Input id="cin" name="cin" placeholder="Numero d'identite nationale" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telephone</Label>
              <Input id="phone" name="phone" type="tel" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date de naissance</Label>
              <Input id="dateOfBirth" name="dateOfBirth" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input id="address" name="address" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="medicalNotes">Notes medicales</Label>
            <Textarea
              id="medicalNotes"
              name="medicalNotes"
              placeholder="Allergies, medicaments, conditions medicales..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Ajout en cours..." : "Ajouter le patient"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPatientDialog;
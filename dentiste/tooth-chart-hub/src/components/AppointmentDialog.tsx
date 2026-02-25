import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { z } from "zod";

const appointmentSchema = z.object({
  patient_id: z.string().uuid("Veuillez selectionner un patient"),
  date_time: z.string().min(1, "La date et l'heure sont requises"),
  status: z.enum(["upcoming", "done", "canceled"], {
    errorMap: () => ({ message: "Veuillez selectionner un statut valide" })
  }),
  reminder_type: z.string().default("sms"),
  notes: z.string().trim().max(1000, "Les notes doivent contenir moins de 1000 caracteres").optional().or(z.literal("")),
});

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
}

interface Appointment {
  id: string;
  patient_id: string;
  date_time: string;
  notes: string | null;
  status: string;
  reminder_type?: string;
}

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  onAppointmentSaved: () => void;
}

const AppointmentDialog = ({
  open,
  onOpenChange,
  appointment,
  onAppointmentSaved,
}: AppointmentDialogProps) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [formData, setFormData] = useState({
    patient_id: "",
    date_time: "",
    notes: "",
    status: "upcoming",
    reminder_type: "sms",  // ← ADDED
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPatients();
      
      if (appointment) {
        setFormData({
          patient_id: appointment.patient_id || "",
          date_time: appointment.date_time 
            ? format(new Date(appointment.date_time), "yyyy-MM-dd'T'HH:mm")
            : "",
          notes: appointment.notes || "",
          status: appointment.status || "upcoming",
          reminder_type: appointment.reminder_type || "sms",
        });
      } else {
        setFormData({
          patient_id: "",
          date_time: "",
          notes: "",
          status: "upcoming",
          reminder_type: "sms",  // ← ADDED
        });
      }
    }
  }, [open, appointment]);

  const fetchPatients = async () => {
    try {
      const data = await apiClient.request<Patient[]>('/api/patients');
      const sorted = (Array.isArray(data) ? [...data] : []).sort((a: Patient, b: Patient) => 
        a.first_name.localeCompare(b.first_name)
      );
      
      setPatients(sorted);
    } catch (error) {
      console.error("Erreur lors du chargement des patients :", error);
      setPatients([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate input
    const validation = appointmentSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      setLoading(false);
      return;
    }

    const validatedData = validation.data;

    try {
      const formatTimezoneOffset = () => {
        const offset = -new Date().getTimezoneOffset(); // minutes
        const sign = offset >= 0 ? "+" : "-";
        const hh = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
        const mm = String(Math.abs(offset) % 60).padStart(2, "0");
        return `${sign}${hh}:${mm}`;
      };

      const appointmentData = {
        patient_id: validatedData.patient_id,
        // Send a timezone-aware timestamp so backend receives exact local time
        date_time: `${validatedData.date_time}${formatTimezoneOffset()}`,
        notes: validatedData.notes || null,
        status: validatedData.status,
        reminder_type: validatedData.reminder_type,  // ← ADDED
      };

      if (appointment?.id) {
        await apiClient.request(`/api/appointments/${appointment.id}`, {
          method: 'PUT',
          data: appointmentData
        });
        toast.success("Rendez-vous mis a jour avec succes");
      } else {
        await apiClient.request('/api/appointments', {
          method: 'POST',
          data: appointmentData
        });
        toast.success("Rendez-vous cree avec succes");
      }

      onAppointmentSaved();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erreur lors de l'enregistrement du rendez-vous :", error);
      toast.error(error.message || "Echec de l'enregistrement du rendez-vous");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!appointment?.id) return;
    
    if (!confirm("Voulez-vous vraiment supprimer ce rendez-vous ?")) return;
    
    setLoading(true);
    try {
      await apiClient.request(`/api/appointments/${appointment.id}`, {
        method: 'DELETE'
      });
      
      toast.success("Rendez-vous supprime avec succes");
      onAppointmentSaved();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erreur lors de la suppression du rendez-vous :", error);
      toast.error(error.message || "Echec de la suppression du rendez-vous");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {appointment?.id ? "Modifier le rendez-vous" : "Nouveau rendez-vous"}
          </DialogTitle>
          <DialogDescription>
            {appointment?.id 
              ? "Mettre a jour les details du rendez-vous" 
              : "Planifier un nouveau rendez-vous avec un patient"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patient">Patient</Label>
            <Select
              value={formData.patient_id}
              onValueChange={(value) =>
                setFormData({ ...formData, patient_id: value })
              }
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selectionner un patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date_time">Date et heure</Label>
            <Input
              id="date_time"
              type="datetime-local"
              value={formData.date_time}
              onChange={(e) =>
                setFormData({ ...formData, date_time: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Statut</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">A venir</SelectItem>
                <SelectItem value="done">Termine</SelectItem>
                <SelectItem value="canceled">Annule</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder_type">Type de rappel</Label>
            <Select
              value={formData.reminder_type}
              onValueChange={(value) =>
                setFormData({ ...formData, reminder_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sms">SMS uniquement</SelectItem>
                <SelectItem value="both">SMS + E-mail (a venir)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Le patient recevra un rappel 24 h avant le rendez-vous
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Ajouter des notes sur ce rendez-vous..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            {appointment?.id && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
              >
                Supprimer
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement..." : appointment?.id ? "Mettre a jour" : "Creer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentDialog;
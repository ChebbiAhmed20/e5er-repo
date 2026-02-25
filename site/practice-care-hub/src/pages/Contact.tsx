import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Send, CheckCircle } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(100),
  email: z.string().trim().email("Adresse email invalide").max(255),
  clinic: z.string().trim().max(100).optional(),
  category: z.string().min(1, "Veuillez sélectionner une catégorie"),
  message: z.string().trim().min(10, "Le message doit contenir au moins 10 caractères").max(2000),
});

type ContactForm = z.infer<typeof contactSchema>;

const categories = [
  "Rapport de Bug",
  "Suggestion de Fonctionnalité",
  "Commentaire Général",
  "Question de Facturation",
  "Demande de Partenariat",
];

const Contact = () => {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactForm, string>>>({});
  const [form, setForm] = useState<ContactForm>({
    name: "",
    email: "",
    clinic: "",
    category: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitted(true);
    toast({ title: "Message envoyé !", description: "Nous vous répondrons dans les 24 heures." });
  };

  const updateField = (field: keyof ContactForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  if (submitted) {
    return (
      <div className="py-32 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="container mx-auto px-4 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Merci !</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Votre message a été reçu. Notre équipe l'examinera et vous répondra dans les 24 heures.
          </p>
          <Button className="mt-8" variant="outline" onClick={() => setSubmitted(false)}>
            Envoyer un Autre Message
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="py-20 bg-background">
      <div className="container mx-auto px-4 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Contactez-Nous
          </h1>
          <p className="text-muted-foreground text-lg">
            Vous avez une suggestion, une question ou un commentaire ? Nous serions ravis de vous entendre.
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="bg-card rounded-2xl p-8 shadow-card border border-border/50 space-y-5"
        >
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="name">Nom *</Label>
              <Input id="name" value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Dr. Jean Dupont" />
              {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="jean@cabinet.com" />
              {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="clinic">Nom du Cabinet</Label>
              <Input id="clinic" value={form.clinic} onChange={(e) => updateField("clinic", e.target.value)} placeholder="Cabinet Dentaire Sourire" />
            </div>
            <div className="space-y-2">
              <Label>Catégorie *</Label>
              <Select value={form.category} onValueChange={(v) => updateField("category", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-destructive text-xs">{errors.category}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={form.message}
              onChange={(e) => updateField("message", e.target.value)}
              placeholder="Dites-nous votre suggestion, problème ou commentaire..."
              rows={5}
            />
            {errors.message && <p className="text-destructive text-xs">{errors.message}</p>}
          </div>

          <Button type="submit" size="lg" className="w-full bg-hero-gradient text-primary-foreground">
            <Send className="w-4 h-4 mr-2" />
            Envoyer le Message
          </Button>
        </motion.form>
      </div>
    </div>
  );
};

export default Contact;

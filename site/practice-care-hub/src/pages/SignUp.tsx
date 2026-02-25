import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { UserPlus, Eye, EyeOff } from "lucide-react";
import type { SignUpPayload } from "@/types/dentist";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { signUp } from "@/services/api";
import { toast } from "@/hooks/use-toast";

const signUpSchema = z.object({
  firstName: z.string().trim().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères"),
  nameArabic: z.string().trim().min(2, "الاسم بالعربية مطلوب"),
  cin: z.string().regex(/^\d{8}$/, "Le CIN doit contenir exactement 8 chiffres"),
  email: z.string().trim().email("Adresse email invalide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(/[A-Z]/, "Doit contenir au moins une majuscule")
    .regex(/[0-9]/, "Doit contenir au moins un chiffre"),
  city: z.string().trim().min(2, "La ville est requise"),
  phone: z.string().optional(),
  clinicName: z.string().optional(),
});

type SignUpValues = z.infer<typeof signUpSchema>;

const SignUp = () => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "", lastName: "", nameArabic: "", cin: "",
      email: "", password: "", city: "", phone: "", clinicName: "",
    },
  });

  const onSubmit = async (values: SignUpValues) => {
    setLoading(true);
    try {
      const { profile, tokens } = await signUp(values as SignUpPayload);
      login(profile);


      toast({ title: "Compte créé avec succès", description: "Bienvenue sur Virela !" });

      // Check for 'from=virela-app' in URL
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('from') === 'virela-app') {
        const token = tokens.accessToken;
        window.location.href = `virela-app://auth?token=${token}`;
        return;
      }

      navigate("/dashboard");
    } catch {
      toast({ title: "Erreur", description: "Impossible de créer le compte. Réessayez.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="rounded-2xl border border-border bg-card shadow-card p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-hero-gradient flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Créer un Compte</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Rejoignez Virela et gérez votre cabinet en toute simplicité
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom</FormLabel>
                    <FormControl><Input placeholder="Amine" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl><Input placeholder="Ben Salah" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="nameArabic" render={({ field }) => (
                <FormItem>
                  <FormLabel>الاسم بالعربية</FormLabel>
                  <FormControl><Input dir="rtl" placeholder="أمين بن صالح" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="cin" render={({ field }) => (
                <FormItem>
                  <FormLabel>Numéro CIN</FormLabel>
                  <FormControl><Input placeholder="09876543" maxLength={8} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="docteur@exemple.tn" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mot de passe</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                  <FormLabel>Ville</FormLabel>
                  <FormControl><Input placeholder="Tunis" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone <span className="text-muted-foreground text-xs">(optionnel)</span></FormLabel>
                    <FormControl><Input placeholder="+216 98 765 432" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="clinicName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clinique <span className="text-muted-foreground text-xs">(optionnel)</span></FormLabel>
                    <FormControl><Input placeholder="Clinique du Sourire" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <Button type="submit" size="lg" className="w-full bg-hero-gradient text-primary-foreground mt-2" disabled={loading}>
                {loading ? "Création en cours..." : "Créer mon Compte"}
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Vous avez déjà un compte ?{" "}
            <Link to="/signin" className="text-primary font-medium hover:underline">Se connecter</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default SignUp;

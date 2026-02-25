import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Heart, Package } from "lucide-react";
import { z } from "zod";
import axios from "axios";

const signUpSchema = z.object({
  firstName: z.string().trim().min(1, "Le prenom est requis").max(50, "Le prenom doit contenir moins de 50 caracteres"),
  lastName: z.string().trim().min(1, "Le nom est requis").max(50, "Le nom doit contenir moins de 50 caracteres"),
  firstNameArabic: z.string().trim().min(1, "Le prenom (arabe) est requis").max(50, "Le prenom (arabe) doit contenir moins de 50 caracteres"),
  lastNameArabic: z.string().trim().min(1, "Le nom (arabe) est requis").max(50, "Le nom (arabe) doit contenir moins de 50 caracteres"),
  sex: z.enum(["male", "female"], { required_error: "Le sexe est requis" }),
  phone: z.string().trim().min(8, "Le numero de telephone doit contenir au moins 8 chiffres").max(15, "Le numero de telephone doit contenir moins de 15 caracteres"),
  city: z.string().trim().min(1, "La ville est requise").max(100, "La ville doit contenir moins de 100 caracteres"),
  clinicAddress: z.string().trim().min(1, "L'adresse de la clinique est requise").max(200, "L'adresse de la clinique doit contenir moins de 200 caracteres"),
  clinicAddressArabic: z.string().trim().min(1, "L'adresse de la clinique (arabe) est requise").max(200, "L'adresse de la clinique (arabe) doit contenir moins de 200 caracteres"),
  email: z.string().trim().email("Adresse e-mail invalide").max(255, "L'e-mail doit contenir moins de 255 caracteres"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caracteres").max(100, "Le mot de passe doit contenir moins de 100 caracteres"),
  plan: z.enum(["free-trial", "basic", "premium", "pro"], { required_error: "Veuillez selectionner un pack" }),
});

const signInSchema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide").max(255, "L'e-mail doit contenir moins de 255 caracteres"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caracteres").max(100, "Le mot de passe doit contenir moins de 100 caracteres"),
});

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("free-trial");

  // If a persisted session is still valid, redirect directly to dashboard
  useEffect(() => {
    const checkExistingSession = async () => {
      const { data } = await apiClient.getSession();
      if (data?.session?.user) {
        navigate("/dashboard");
      }
    };
    checkExistingSession();
  }, [navigate]);

  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "fail") {
      toast.error("Echec");
      if (window.location.protocol === "file:" || (window as any).desktop) {
        window.location.hash = "#/auth";
      } else {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [searchParams]);

  // Plans shown in UI (keep underlying values stable to avoid backend changes)
  const plans = [
    { value: "free-trial", name: "Essai Gratuit (30 jours)", icon: "🎁", price: "0 DT" },
    { value: "basic", name: "Essentiel", icon: "🩺", price: "79 DT / mois" },
    { value: "premium", name: "Pro", icon: "⭐", price: "129 DT / mois" },
  ];

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const rawData = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      firstNameArabic: formData.get("firstNameArabic") as string,
      lastNameArabic: formData.get("lastNameArabic") as string,
      sex: formData.get("sex") as string,
      phone: formData.get("phone") as string,
      city: formData.get("city") as string,
      clinicAddress: formData.get("clinicAddress") as string,
      clinicAddressArabic: formData.get("clinicAddressArabic") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      plan: selectedPlan,
      // referralCode was removed
    };

    // Validate input
    const validation = signUpSchema.safeParse(rawData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      setLoading(false);
      return;
    }

    const { 
      email, password, firstName, lastName, firstNameArabic, lastNameArabic, 
      sex, phone, city, clinicAddress, clinicAddressArabic, plan 
    } = validation.data;

    try {
      // 1. Create account first
           // 1. Create account first
      const signUpResponse = await apiClient.signUp(email, password, {
        first_name_english: firstName,
        last_name_english: lastName,
        first_name_arabic: firstNameArabic,
        last_name_arabic: lastNameArabic,
        sex: sex,
        phone: phone,
        city: city,
        clinic_address: clinicAddress,
        clinic_address_arabic: clinicAddressArabic,
      });
      
      if (signUpResponse?.error) {
        toast.error(signUpResponse.error.message || signUpResponse.error);
        setLoading(false);
        return;
      }

      // 2. IMMEDIATELY sign in (get JWT)
      const signInResponse = await apiClient.signIn(email, password);
      if (signInResponse?.error) {
        toast.error("Compte cree mais erreur de connexion");
        setLoading(false);
        return;
      }

      toast.success("Compte cree et connecte !");

      // 3. Handle plan selection
      if (plan === "free-trial") {
        navigate("/dashboard");
      } else {
        // Paid plan - NOW user has JWT cookie!
        const paymentResponse = await apiClient.request('/api/plans/pay-plan', {
          method: 'POST',
          data: { 
            plan: plan,
            userId: email 
          }
        });
        
        window.location.href = paymentResponse.payUrl;
      }


    } catch (err: any) {
      toast.error(err.message || "Echec de la creation du compte");
    }

    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const rawData = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    };

    const validation = signInSchema.safeParse(rawData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      setLoading(false);
      return;
    }

    const { email, password } = validation.data;

    try {
      const response = await apiClient.signIn(email, password);
      
      if (response?.error) {
        toast.error(response.error.message || response.error);
      } else {
        toast.success("Connexion reussie !");
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message || "Echec de la connexion");
    }

    setLoading(false);
  };

   return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center overflow-hidden">
              <img
                src="/logo-icon.svg"
                alt="Virela logo"
                className="h-12 w-12"
              />
            </div>
          </div>
          <CardTitle className="text-3xl">Virela</CardTitle>
          <CardDescription>Plateforme de gestion moderne pour cliniques dentaires</CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Inscription</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    name="email"
                    type="email"
                    placeholder="dentiste@clinique.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Mot de passe</Label>
                  <Input
                    id="signin-password"
                    name="password"
                    type="password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Connexion..." : "Se connecter"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 max-h-[650px] overflow-y-auto px-1">
                {/* NAMES */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-firstname">Prenom</Label>
                    <Input id="signup-firstname" name="firstName" type="text" placeholder="Jean" maxLength={50} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-lastname">Nom de famille</Label>
                    <Input id="signup-lastname" name="lastName" type="text" placeholder="Dupont" maxLength={50} required />
                  </div>
                </div>

                {/* ARABIC NAMES */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-firstname-arabic">Prénom (Arabe)</Label>
                    <Input id="signup-firstname-arabic" name="firstNameArabic" type="text" placeholder="الاسم" maxLength={50} dir="rtl" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-lastname-arabic">Nom de famille (Arabe)</Label>
                    <Input id="signup-lastname-arabic" name="lastNameArabic" type="text" placeholder="اللقب" maxLength={50} dir="rtl" required />
                  </div>
                </div>

                {/* SEX */}
                <div className="space-y-2">
                  <Label htmlFor="signup-sex">Sexe</Label>
                  <select id="signup-sex" name="sex" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm" required>
                    <option value="">Sélectionner</option>
                    <option value="male">Homme</option>
                    <option value="female">Femme</option>
                  </select>
                </div>

                {/* PHONE */}
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Numéro de téléphone</Label>
                  <Input id="signup-phone" name="phone" type="text" placeholder="23456789" maxLength={15} required />
                </div>

                {/* CITY */}
                <div className="space-y-2">
                  <Label htmlFor="signup-city">Ville</Label>
                  <Input id="signup-city" name="city" type="text" placeholder="Tunis" maxLength={100} required />
                </div>

                {/* CLINIC ADDRESS */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-clinic-address">Adresse de la clinique</Label>
                    <textarea
                      id="signup-clinic-address"
                      name="clinicAddress"
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                      placeholder="Adresse complète"
                      maxLength={200}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-clinic-address-arabic">Adresse de la clinique (Arabe)</Label>
                    <textarea
                      id="signup-clinic-address-arabic"
                      name="clinicAddressArabic"
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                      placeholder="العنوان الكامل"
                      maxLength={200}
                      dir="rtl"
                      required
                    />
                  </div>
                </div>

                {/* EMAIL */}
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" name="email" type="email" placeholder="dentiste@clinique.com" required />
                </div>

                {/* PASSWORD */}
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Mot de passe</Label>
                  <Input id="signup-password" name="password" type="password" minLength={8} required />
                </div>

                {/* ⭐ PLAN SELECTOR */}
                <div className="space-y-2">
                  <Label htmlFor="signup-plan">Choisir un pack <span className="text-red-500">*</span></Label>
                  <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                    <SelectTrigger id="signup-plan" className="w-full">
                      <SelectValue placeholder="Sélectionnez votre pack" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.value} value={plan.value}>
                          <div className="flex items-center gap-3 p-2">
                            <span className="text-lg">{plan.icon}</span>
                            <div>
                              <div className="font-medium">{plan.name}</div>
                              <div className="text-sm text-muted-foreground">{plan.price}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Essai gratuit : acces complet pendant 30 jours. Vous pourrez ensuite choisir Essentiel ou Pro.
                  </p>
                  <input type="hidden" name="plan" value={selectedPlan} />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading
                    ? "Traitement en cours..."
                    : selectedPlan === "free-trial"
                      ? "🚀 Démarrer l'essai gratuit"
                      : `Continuer (${plans.find((p) => p.value === selectedPlan)?.price})`}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;

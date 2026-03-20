import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { LogIn, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { signIn } from "@/services/api";
import { toast } from "@/hooks/use-toast";

const signInSchema = z.object({
  email: z.string().trim().email("Adresse email invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

type SignInValues = z.infer<typeof signInSchema>;

const SignIn = () => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: SignInValues) => {
    setLoading(true);
    try {
      const { profile, tokens } = await signIn(values as { email: string; password: string });
      login(profile);


      toast({ title: "Connexion réussie", description: `Bienvenue, Dr. ${profile.lastName} !` });

      // Check for 'from=virela-app' in URL
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('from') === 'virela-app') {
        const token = tokens.accessToken;
        // Fire deep link to Electron
        window.location.href = `virela-app://auth?token=${token}`;
        // Also navigate to dashboard so user isn't stuck on signin
        setTimeout(() => navigate("/dashboard"), 500);
        return;
      }

      navigate("/dashboard");
    } catch {
      toast({ title: "Erreur", description: "Email ou mot de passe incorrect.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-border bg-card shadow-card p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-hero-gradient flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Se Connecter</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Accédez à votre espace dentiste
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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

              <Button type="submit" size="lg" className="w-full bg-hero-gradient text-primary-foreground" disabled={loading}>
                {loading ? "Connexion..." : "Se Connecter"}
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Pas encore de compte ?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">Créer un compte</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default SignIn;

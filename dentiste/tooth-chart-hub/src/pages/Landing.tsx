import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

/**
 * Simplified Landing page for Virela Desktop.
 * Single entry point for account synchronization with the website.
 */
const Landing = () => {
  const handleConnect = () => {
    // Open the website login page in the user's default browser
    // The 'from=virela-app' parameter tells the website to redirect back using the virela-app:// protocol
    const websiteLoginUrl = "http://localhost:8082/signin?from=virela-app";
    window.open(websiteLoginUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex flex-col items-center gap-4">
          <img
            src="./logo-icon.svg"
            alt="Virela logo"
            className="w-24 h-24 rounded-2xl shadow-lg"
          />
          <h1 className="text-4xl font-bold tracking-tight">Virela Desktop</h1>
          <p className="text-muted-foreground text-lg">
            Connectez-vous pour synchroniser votre cabinet et acceder a vos outils.
          </p>
        </div>

        <div className="bg-card border rounded-3xl p-8 shadow-sm space-y-6">
          <Button
            size="lg"
            className="w-full h-16 text-xl gap-3 rounded-2xl shadow-blue-500/20 shadow-lg hover:shadow-blue-500/40 transition-all"
            onClick={handleConnect}
          >
            <LogIn className="w-6 h-6" />
            Connectez-vous a votre compte
          </Button>

          <p className="text-xs text-muted-foreground">
            En vous connectant, vous acceptez nos conditions d'utilisation et notre politique de confidentialite.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Landing;


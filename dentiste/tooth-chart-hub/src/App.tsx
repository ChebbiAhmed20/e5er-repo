import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner, toast } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route, useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api-client";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import PatientProfile from "./pages/PatientProfile";
import Appointments from "./pages/Appointments";
import Billing from "./pages/Billing";
import Patients from "./pages/Patients";
import Reminders from "./pages/Reminders";
import Subscription from "./pages/Subscription";
import NotFound from "./pages/NotFound";
import { AppLayout } from "./components/AppLayout";
import { NavigationLogger } from "./components/NavigationLogger";

const queryClient = new QueryClient();

// In Electron (file://), BrowserRouter doesn't work: path is the file path, not "/".
// HashRouter uses the hash (#/) so routes work and "Return to Home" doesn't cause a white screen.
const isElectron = typeof window !== "undefined" && (window.location.protocol === "file:" || (window as any).desktop);
const Router = isElectron ? HashRouter : BrowserRouter;

/**
 * Handles deep links (virela-app://auth?token=...) throughout the app session.
 * This must be inside the Router to use navigate().
 */
const DeepLinkHandler = () => {
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const desktop = (window as any).desktop;
    if (desktop?.electron) {
      desktop.log.info('[App] Registering deep link token listener');
      const removeListener = desktop.electron.on('auth:deep-link-token', async (token: string) => {
        desktop.log.info('[App] Received token from deep link');
        setSyncing(true);
        try {
          const result = await desktop.electron.invoke('auth:sync-with-website', { websiteToken: token });
          desktop.log.info('[App] Sync result:', result);

          if (result.accessToken) {
            apiClient.setSession(result.accessToken, result.refreshToken || null);
          }

          toast.success("Synchronisation réussie !");
          navigate("/dashboard", { replace: true });
        } catch (error: any) {
          desktop.log.error('[App] Sync failed:', error);
          toast.error("Erreur de synchronisation : " + (error.message || "Inconnue"));
        } finally {
          setSyncing(false);
        }
      });
      return () => removeListener();
    }
  }, [navigate]);

  if (syncing) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground animate-pulse text-lg font-medium">Synchronisation en cours...</p>
      </div>
    );
  }

  return null;
};

/** On "/", if user has a valid session (e.g. logged in and reopened app), go straight to dashboard. */
const LandingOrRedirect = () => {
  const navigate = useNavigate();
  const [decided, setDecided] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiClient.getSession();
        if (cancelled) return;
        if (data?.session?.user) {
          navigate("/dashboard", { replace: true });
          return;
        }
      } catch {
        // Not logged in; show landing
      }
      if (!cancelled) setDecided(true);
    })();
    return () => { cancelled = true; };
  }, [navigate]);


  if (!decided) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  return <Landing />;
};


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Router>
        <NavigationLogger />
        <DeepLinkHandler />
        <Routes>
          <Route path="/" element={<LandingOrRedirect />} />
          <Route path="/auth" element={<Auth />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/patient/:id" element={<PatientProfile />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

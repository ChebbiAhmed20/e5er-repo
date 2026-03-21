import { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export function AppLayout() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // MODIFIED: Check session using new API client
    const checkSession = async () => {
      try {
        const { data } = await apiClient.getSession();
        setSession(data?.session);
        if (!data?.session) {
          navigate("/auth");
        }
      } catch (error) {
        console.error('Session check failed:', error);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Check session every 5 minutes
    const interval = setInterval(checkSession, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [navigate]);

  const handleSignOut = async () => {
    // MODIFIED: Sign out using new API client
    await apiClient.signOut();
    toast.success("Deconnexion reussie");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-card sticky top-0 z-10 flex items-center px-4 gap-4">
            <SidebarTrigger />
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {session?.user?.first_name_english 
                  ? `Dr. ${session.user.first_name_english} ${session.user.last_name_english}`
                  : "Docteur"}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Se deconnecter
              </Button>
            </div>
          </header>
          <main className="flex-1">
            <div className="container mx-auto p-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

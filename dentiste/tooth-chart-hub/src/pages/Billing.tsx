import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle2, CreditCard, Calendar, XCircle, Clock, Package, Lock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { features } from "@/config/features";

interface PaymentHistory {
  id: number;
  sub_date: string;
  expire_date: string;
  user_name: string;
  user_email: string;
  pack_chosen: string;
}

interface Profile {
  subscription_status: string | null;
  trial_end_date: string | null;
  subscription_expiry_date: string | null;
  last_payment_date: string | null;
}



const OnlineServicesLocked = () => {
  const [searchParams] = useSearchParams();

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              Services en ligne <span className="text-sm text-muted-foreground">(Pack)</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Modernisez votre clinique avec la communication patient et des fonctions cloud.
            </p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Verrouille
          </Badge>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Inclus</CardTitle>
            <CardDescription>
              Apercu des fonctionnalites disponibles avec le pack Services en ligne.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="font-medium">Rappels WhatsApp &amp; SMS</p>
                <p className="text-xs text-muted-foreground">
                  Reduisez les absences avec des rappels automatiques personnalises.
                </p>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Verrouille
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="font-medium">Sauvegarde cloud chiffree</p>
                <p className="text-xs text-muted-foreground">
                  Sauvegarde externe securisee des donnees cliniques.
                </p>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Verrouille
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="font-medium">Generation de factures</p>
                <p className="text-xs text-muted-foreground">
                  Generez des documents clairs et professionnels pour vos patients.
                </p>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Verrouille
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="font-medium">Support prioritaire</p>
                <p className="text-xs text-muted-foreground">
                  Reponses plus rapides et assistance a l'onboarding.
                </p>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Verrouille
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-center">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="lg" className="px-10">
                Demander l'acces anticipe
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Acces anticipe</DialogTitle>
                <DialogDescription>
                  Les services en ligne sont actuellement en acces anticipe.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Pour activer le pack Services en ligne pour votre clinique, contactez le support
                  Virela. L'activation est manuelle pour le moment et ne necessite aucun paiement dans l'application.
                </p>
                <p>
                  Une fois active, vous pourrez configurer les rappels, la sauvegarde cloud et
                  d'autres services directement depuis cet ecran.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
};

const Billing = () => {
  if (!features.onlineServices) {
    return <OnlineServicesLocked />;
  }
  return <BillingUnlocked />;
};

const BillingUnlocked = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscriptions, setSubscriptions] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<{ [key: string]: boolean }>({});
  

  // Pricing Plans (UI display only; keep IDs stable to avoid backend changes)
  const plans = [
    {
      id: "basic",
      name: "Essentiel",
      priceLabel: "79 DT",
      periodLabel: "/ mois",
      millimes: 25000,
      popular: false,
      features: [
        "Gestion des patients",
        "Planification des rendez-vous",
        "Rappels de base (1 rappel par rendez-vous)",
        "Connexion securisee",
        "Support de base",
      ],
    },
    {
      id: "premium",
      name: "Pro",
      priceLabel: "129 DT",
      periodLabel: "/ mois",
      millimes: 110000,
      popular: true,
      roiNote: "Un rendez-vous recupere paye l'abonnement.",
      features: [
        "Tout ce qui est dans Essentiel",
        "Rappels WhatsApp + SMS",
        "Plusieurs rappels par rendez-vous",
        "Historique des traitements",
        "Comptes du personnel",
        "Tableau de bord et analyses",
        "Support prioritaire",
      ],
    },
  ];

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      const { data: sessionData } = await apiClient.getSession();
      const user = sessionData?.session?.user;
      if (!user) return;

      const profileData = await apiClient.request(`/api/auth/me`);
      const statusData = await apiClient.request(`/api/subscriptions/status`);
      const subscriptionsHistory = await apiClient.request(`/api/subscriptions/history`);
      const subscriptionsData = Array.isArray(subscriptionsHistory) ? [...subscriptionsHistory] : [];

      setProfile({
        subscription_status: statusData?.subscription_status ?? profileData.subscription_status,
        trial_end_date: statusData?.trial_end_date ?? profileData.trial_end_date,
        subscription_expiry_date: statusData?.subscription_expiry_date ?? profileData.subscription_expiry_date,
        last_payment_date: statusData?.last_payment_date ?? profileData.last_payment_date,
      });
      
      // Sort by created_at descending
      subscriptionsData.sort((a: PaymentHistory, b: PaymentHistory) => 
  new Date(b.sub_date).getTime() - new Date(a.sub_date).getTime()
);

      
      setSubscriptions(subscriptionsData);
    } catch (error) {
      console.error("Erreur lors du chargement de la facturation:", error);
      setProfile({
        subscription_status: 'trial',
        trial_end_date: null,
        subscription_expiry_date: null,
        last_payment_date: null,
      });
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const initiatePayment = async (planId: string) => {
    setProcessing(prev => ({ ...prev, [planId]: true }));
    try {
      const { data: sessionData } = await apiClient.getSession();
      if (!sessionData?.session) {
        toast.error("Veuillez vous connecter pour continuer");
        return;
      }

      // Call Konnect payment API
      const response = await apiClient.request('/api/plans/pay-plan', {
        method: 'POST',
        data: {
          plan: planId,
          userId: sessionData.session.user.id || sessionData.session.user.email
        }
      });

      if (response.payUrl) {
        window.location.href = response.payUrl;
      } else {
        throw new Error("Aucune URL de paiement recue");
      }
    } catch (error: any) {
      console.error("Erreur lors du lancement du paiement:", error);
      toast.error(`Echec du lancement du paiement ${plans.find(p => p.id === planId)?.name}`);
    } finally {
      setProcessing(prev => ({ ...prev, [planId]: false }));
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (status === "active") {
      return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Actif</Badge>;
    }
    if (status === "trial") {
      return <Badge className="bg-blue-500"><Clock className="h-3 w-3 mr-1" />Essai</Badge>;
    }
    return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Inactif</Badge>;
  };

  

  const isTrialActive = profile?.subscription_status === "trial" && 
    profile?.trial_end_date && 
    new Date(profile.trial_end_date) > new Date();

  const isSubscriptionActive = profile?.subscription_status === "active" && 
    profile?.subscription_expiry_date && 
    new Date(profile.subscription_expiry_date) > new Date();
  
  const trialDaysLeft = profile?.trial_end_date 
    ? Math.max(0, Math.ceil((new Date(profile.trial_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement des services en ligne...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Services en ligne Virela</h1>
          <p className="text-muted-foreground">
            Gérez vos services en ligne (abonnement, rappels, analytics) et leur statut.
          </p>
        </div>

        {/* Online Services Status Card */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Statut des services en ligne
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Statut:</span>
                {getStatusBadge(profile?.subscription_status || null)}
              </div>
              
              {isTrialActive && profile?.trial_end_date && (
                <div>
                  <span className="text-sm font-medium">Essai gratuit se termine:</span>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(profile.trial_end_date), "PPP")} ({trialDaysLeft} {trialDaysLeft === 1 ? 'jour' : 'jours'} restants)
                  </p>
                </div>
              )}

              {isSubscriptionActive && profile?.subscription_expiry_date && (
                <div>
                  <span className="text-sm font-medium">Prochain renouvellement:</span>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(profile.subscription_expiry_date), "PPP")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Service Plans */}
        <div className="mb-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Plans de services</h2>
            <p className="text-muted-foreground text-lg">
              Choisissez le plan de services qui convient le mieux à votre clinique
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`border-2 transition-all hover:shadow-xl ${
                  plan.popular 
                    ? 'border-primary ring-4 ring-primary/20 bg-primary/5 scale-105' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {plan.popular && (
                  <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-bold mx-4 mt-4 w-fit">
                    Le plus populaire
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-5xl font-bold text-primary">{plan.priceLabel}</span>
                    <span className="text-2xl text-muted-foreground"> {plan.periodLabel}</span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {"roiNote" in plan && plan.roiNote && (
                    <div className="rounded-md border bg-background/60 p-3 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">ROI :</span> {plan.roiNote}
                    </div>
                  )}
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => initiatePayment(plan.id)}
                    disabled={processing[plan.id]}
                    className="w-full"
                    size="lg"
                  >
                    {processing[plan.id] ? `Traitement...` : `Passer au ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Service Activation History */}
        <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Historique des services
              </CardTitle>
              <CardDescription>Activations et renouvellements de vos services</CardDescription>
          </CardHeader>
          <CardContent>
            {subscriptions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Aucun historique de services</p>
            ) : (
              <Table>
                <TableHeader>
  <TableRow>
    <TableHead>Date</TableHead>
    <TableHead>Expire</TableHead>
    <TableHead>Pack</TableHead>
    <TableHead>Nom</TableHead>
    <TableHead>Email</TableHead>
  </TableRow>
</TableHeader>
<TableBody>
  {subscriptions.map((sub) => (
    <TableRow key={sub.id}>
      <TableCell>{format(new Date(sub.sub_date), "PPP")}</TableCell>
      <TableCell>{format(new Date(sub.expire_date), "PPP")}</TableCell>
      <TableCell>
        <Badge variant="secondary" className="text-xs">
          {sub.pack_chosen}
        </Badge>
      </TableCell>
      <TableCell>{sub.user_name}</TableCell>
      <TableCell className="font-mono text-xs">{sub.user_email}</TableCell>
    </TableRow>
  ))}
</TableBody>

              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Billing;

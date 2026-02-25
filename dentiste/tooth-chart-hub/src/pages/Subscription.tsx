import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Clock, RefreshCw, CreditCard, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface UserProfile {
    id: string;
    email: string;
    subscription_status: string;
    subscription_expiry_date: string | null;
    trial_end_date: string | null;
    first_name_english?: string;
    last_name_english?: string;
}

const Subscription = () => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const response = await apiClient.request<{ user: UserProfile }>('/api/auth/me');
            setProfile(response.user);
        } catch (error) {
            console.error("Erreur lors du chargement du profil :", error);
            toast.error("Impossible de charger les informations d'abonnement");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleSync = () => {
        const websiteUrl = "http://localhost:8082/dashboard"; // Should be configurable
        window.open(websiteUrl, "_blank");
        toast.info("Veuillez cliquer sur 'Synchroniser avec Desktop' sur le site web.");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Erreur lors du chargement des donnees.</p>
            </div>
        );
    }

    const isTrial = profile.subscription_status === 'trial';
    const isActive = profile.subscription_status === 'active';
    const isExpired = profile.subscription_status === 'expired';

    const expiryDate = profile.subscription_expiry_date || profile.trial_end_date;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">Mon Abonnement</h1>

                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Statut de la Licence</CardTitle>
                                    <CardDescription>Details de votre acces actuel a Virela</CardDescription>
                                </div>
                                {isActive ? (
                                    <Badge className="bg-green-500 text-white hover:bg-green-600">Active</Badge>
                                ) : isTrial ? (
                                    <Badge className="bg-amber-500 text-white hover:bg-amber-600">Version d'Essai</Badge>
                                ) : (
                                    <Badge variant="destructive">Expiree</Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    {isActive ? <ShieldCheck className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                                </div>
                                <div>
                                    <p className="font-semibold text-lg">
                                        {isActive ? "Licence Professionnelle" : "Periode d'Essai Gratuit"}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {expiryDate
                                            ? `Expire le : ${format(new Date(expiryDate), "dd MMMM yyyy")}`
                                            : "Pas de date d'expiration definie"}
                                    </p>
                                </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <Card className="bg-background border-dashed">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CreditCard className="h-4 w-4 text-primary" />
                                            <span className="font-medium">Type de Pack</span>
                                        </div>
                                        <p className="text-2xl font-bold capitalize">
                                            {isTrial ? "Essai 14 jours" : "Abonnement Annuel"}
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-background border-dashed">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <RefreshCw className="h-4 w-4 text-primary" />
                                            <span className="font-medium">Derniere Sync</span>
                                        </div>
                                        <p className="text-2xl font-bold">Aujourd'hui</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {(isTrial || isExpired) && (
                                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                                    <p className="text-sm font-medium text-primary mb-2">Passez a la version complete</p>
                                    <p className="text-xs text-muted-foreground mb-4">
                                        Profitez de toutes les fonctionnalites sans restriction : export de donnees, analyses avancees et support prioritaire.
                                    </p>
                                    <Button onClick={() => window.open("http://localhost:8082/pricing", "_blank")} className="w-full">
                                        Voir les Tarifs <ExternalLink className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            )}

                            <div className="flex flex-col gap-3 pt-4 border-t">
                                <Button variant="outline" onClick={handleSync} className="w-full">
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Synchroniser avec le Site Web
                                </Button>
                                <p className="text-[10px] text-center text-muted-foreground">
                                    ID Utilisateur : <span className="font-mono">{profile.id}</span>
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Subscription;

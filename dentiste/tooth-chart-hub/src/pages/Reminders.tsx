import { features } from "@/config/features";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Bell, MessageCircle, Clock, Lock } from "lucide-react";
import { useState } from "react";

const Reminders = () => {
  const [earlyAccessOpen, setEarlyAccessOpen] = useState(false);

  const locked = !features.reminders;

  if (locked) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                Rappels <span className="text-sm text-muted-foreground">(Service en ligne)</span>
              </h1>
              <p className="text-muted-foreground max-w-2xl">
                Automatisez les rappels WhatsApp et SMS et reduisez les absences.
              </p>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Verrouille
            </Badge>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="opacity-80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Rappels automatiques
                </CardTitle>
                <CardDescription>
                  Apercu des regles de rappel (lecture seule).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">1 jour avant le rendez-vous</p>
                    <p className="text-xs text-muted-foreground">
                      Envoi du rappel a 18:00 heure locale.
                    </p>
                  </div>
                  <Switch disabled checked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">3 heures avant</p>
                    <p className="text-xs text-muted-foreground">
                      Message court de confirmation.
                    </p>
                  </div>
                  <Switch disabled checked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Apres un rendez-vous manque</p>
                    <p className="text-xs text-muted-foreground">
                      Proposer une nouvelle date dans les 7 jours.
                    </p>
                  </div>
                  <Switch disabled />
                </div>
              </CardContent>
            </Card>

            <Card className="opacity-80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Canaux WhatsApp et SMS
                </CardTitle>
                <CardDescription>
                  Apercu des canaux de notification (lecture seule).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">WhatsApp</p>
                    <p className="text-xs text-muted-foreground">
                      Modeles personnalises avec l'identite de la clinique.
                    </p>
                  </div>
                  <Switch disabled checked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">SMS</p>
                    <p className="text-xs text-muted-foreground">
                      SMS courts et fiables pour tous les patients.
                    </p>
                  </div>
                  <Switch disabled checked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">E-mail</p>
                    <p className="text-xs text-muted-foreground">
                      Suivis e-mail optionnels pour plus de details.
                    </p>
                  </div>
                  <Switch disabled />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Apercu des rappels a venir
              </CardTitle>
              <CardDescription>
                Exemple de rendu une fois les services en ligne actives.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="font-medium text-foreground">
                    Demain · 09:00 — Rendez-vous avec&nbsp;
                    <span className="font-semibold">John Doe</span>
                  </p>
                  <p className="text-xs">
                    Rappel WhatsApp et SMS programme aujourd'hui a 18:00.
                  </p>
                </div>
                <Badge variant="secondary">Apercu</Badge>
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="font-medium text-foreground">
                    Aujourd'hui · 16:30 — Rendez-vous avec&nbsp;
                    <span className="font-semibold">Sara Ben Ali</span>
                  </p>
                  <p className="text-xs">
                    Message de confirmation envoye 2 heures avant.
                  </p>
                </div>
                <Badge variant="secondary">Apercu</Badge>
              </div>
            </CardContent>
          </Card>

          <div className="mt-10 flex justify-center">
            <Dialog open={earlyAccessOpen} onOpenChange={setEarlyAccessOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="px-10">
                  Activer les services en ligne
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
                    Pour activer les rappels et les autres services en ligne pour votre clinique,
                    contactez le support Virela. L'activation est manuelle pour le moment et ne
                    necessite aucun paiement dans l'application.
                  </p>
                  <p>
                    Une fois active, vous pourrez configurer pleinement les rappels WhatsApp et SMS directement
                    depuis cet ecran.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    );
  }

  // Future: unlocked reminders UI
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-3xl font-bold mb-2">Rappels</h1>
        <p className="text-muted-foreground">
          Les rappels en ligne sont actifs pour cette clinique. L'interface de configuration sera ajoutee ici.
        </p>
      </main>
    </div>
  );
};

export default Reminders;


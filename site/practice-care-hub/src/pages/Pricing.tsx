import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Download, ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Essai Gratuit",
    price: "Gratuit",
    period: "14 jours",
    description: "Essayez Virela avec des fonctionnalités limitées avant de vous engager.",
    features: [
      "Jusqu'à 20 dossiers patients",
      "Suivi de traitement basique",
      "Export Excel",
      "Rapports standards",
      "Support par email",
    ],
    cta: "Télécharger l'Essai Gratuit",
    ctaIcon: Download,
    installerPath: "/Virela Setup 1.0.0.exe",  // ✅ Direct public link
    highlight: false,
  },
  {
    name: "Licence Complète",
    price: "449 DT",
    period: "paiement unique",
    description: "Débloquez toutes les fonctionnalités avec une licence à vie. Sans abonnement.",
    features: [
      "Dossiers patients illimités",
      "Historique complet des traitements",
      "Import & export Excel",
      "Sauvegardes automatiques",
      "Factures & rapports",
      "Support email prioritaire",
      "Mises à jour gratuites pendant 1 an",
    ],
    cta: "Obtenir la Licence Complète",
    ctaIcon: ArrowRight,
    installerPath: null,  // Paid version - redirect to purchase
    highlight: true,
  },
];

const Pricing = () => (
  <div className="py-20 bg-background">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-14"
      >
        <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
          Tarification Simple et Transparente
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Pas d'abonnement, pas de frais cachés. Payez une fois et possédez Virela pour toujours.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
            className={`rounded-2xl p-8 border ${
              plan.highlight
                ? "border-primary shadow-elevated bg-card relative"
                : "border-border shadow-card bg-card"
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-hero-gradient text-primary-foreground text-xs font-bold px-4 py-1 rounded-full">
                MEILLEURE OFFRE
              </div>
            )}
            <h2 className="text-xl font-bold text-foreground mb-1">{plan.name}</h2>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-4xl font-bold text-foreground">{plan.price}</span>
              <span className="text-muted-foreground text-sm">/ {plan.period}</span>
            </div>
            <p className="text-muted-foreground text-sm mb-6">{plan.description}</p>

            <ul className="space-y-3 mb-8">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            {/* ✅ MODIFIED BUTTON - Direct download for Trial */}
            {plan.installerPath ? (
              <Button
                asChild
                size="lg"
                className="w-full"
                variant="outline"
              >
                <a
                  href={plan.installerPath}
                  download="Virela Setup 1.0.0.exe"
                  className="flex items-center w-full hover:no-underline"
                  onClick={() => {
                    console.log('Trial downloaded');
                  }}
                >
                  <plan.ctaIcon className="w-4 h-4 mr-2" />
                  {plan.cta}
                </a>
              </Button>
            ) : (
              <Button
                asChild
                size="lg"
                className="w-full bg-hero-gradient text-primary-foreground"
                variant="default"
              >
                <Link to="/purchase" className="flex items-center w-full hover:no-underline">
                  <plan.ctaIcon className="w-4 h-4 mr-2" />
                  {plan.cta}
                </Link>
              </Button>
            )}
          </motion.div>
        ))}
      </div>

      {/* Additional info - unchanged */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="max-w-3xl mx-auto mt-16 grid sm:grid-cols-3 gap-6"
      >
        {[
          { icon: ShieldCheck, title: "Paiement Sécurisé", text: "Tous les paiements sont traités de manière sécurisée. Vos données financières ne sont jamais stockées." },
          { icon: Download, title: "Téléchargement Instantané", text: "Après l'achat, téléchargez votre copie sous licence immédiatement et commencez à l'utiliser." },
          { icon: Check, title: "Remboursement 30 Jours", text: "Pas satisfait ? Obtenez un remboursement complet dans les 30 jours suivant l'achat — sans questions." },
        ].map((item) => (
          <div key={item.title} className="text-center p-4">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mx-auto mb-3">
              <item.icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground text-sm mb-1">{item.title}</h3>
            <p className="text-xs text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </motion.div>
    </div>
  </div>
);

export default Pricing;

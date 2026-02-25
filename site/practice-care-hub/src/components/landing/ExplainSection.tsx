import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

const points = [
  "Gestion complète des dossiers patients en un seul endroit",
  "Suivi de l'historique des traitements avec des chronologies détaillées",
  "Importation et exportation de données depuis Excel facilement",
  "Sauvegardes automatiques pour protéger vos données",
  "Fonctionne entièrement hors ligne — aucune connexion internet requise",
  "Génération de factures et rapports professionnels",
];

const ExplainSection = () => (
  <section className="py-20 bg-card">
    <div className="container mx-auto px-4">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Pourquoi les Dentistes Choisissent <span className="text-gradient">Virela</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Arrêtez de vous fier aux tableurs et aux dossiers papier. Virela est conçu spécialement pour les professionnels dentaires qui veulent un moyen simple, sécurisé et rapide de gérer leur cabinet.
          </p>
          <ul className="space-y-4">
            {points.map((point, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <span className="text-foreground">{point}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-muted rounded-2xl p-8 shadow-card"
        >
          <div className="space-y-6">
            <div className="bg-card rounded-xl p-6 shadow-soft">
              <h3 className="font-semibold text-foreground mb-2">À qui s'adresse-t-il ?</h3>
              <p className="text-muted-foreground text-sm">Dentistes indépendants, cabinets dentaires et petites cliniques dentaires à la recherche d'un système fiable de gestion des patients hors ligne.</p>
            </div>
            <div className="bg-card rounded-xl p-6 shadow-soft">
              <h3 className="font-semibold text-foreground mb-2">Pourquoi pas Excel ?</h3>
              <p className="text-muted-foreground text-sm">Excel n'a pas été conçu pour la santé. Virela offre des dossiers structurés, des sauvegardes automatiques, le suivi des traitements et la facturation — tout en une seule application.</p>
            </div>
            <div className="bg-card rounded-xl p-6 shadow-soft">
              <h3 className="font-semibold text-foreground mb-2">Mes données sont-elles en sécurité ?</h3>
              <p className="text-muted-foreground text-sm">100%. Vos données restent sur votre ordinateur avec des sauvegardes chiffrées. Pas de cloud, pas d'accès tiers. Vous êtes propriétaire de vos données.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

export default ExplainSection;

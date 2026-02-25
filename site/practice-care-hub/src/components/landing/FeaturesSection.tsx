import { motion } from "framer-motion";
import { Users, History, FileSpreadsheet, HardDrive, ShieldCheck, FileText } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Gestion des Patients",
    description: "Stockez et organisez tous les dossiers patients, contacts, antécédents médicaux et notes dans un seul endroit sécurisé.",
  },
  {
    icon: History,
    title: "Historique des Traitements",
    description: "Suivez chaque traitement avec les dates, procédures, coûts et notes détaillées pour des chronologies complètes.",
  },
  {
    icon: FileSpreadsheet,
    title: "Import/Export Excel",
    description: "Migrez facilement vos données existantes depuis Excel ou exportez vos dossiers à tout moment pour les rapports et le partage.",
  },
  {
    icon: HardDrive,
    title: "Sauvegardes Automatiques",
    description: "Ne perdez plus jamais de données. Les sauvegardes programmées garantissent que vos dossiers sont toujours en sécurité et récupérables.",
  },
  {
    icon: ShieldCheck,
    title: "Hors Ligne & Sécurisé",
    description: "Pas besoin d'internet. Vos données restent sur votre machine avec un chiffrement local — entièrement conforme.",
  },
  {
    icon: FileText,
    title: "Rapports & Factures",
    description: "Générez des factures professionnelles et des rapports de cabinet en un clic. Gagnez du temps sur les tâches administratives.",
  },
];

const FeaturesSection = () => (
  <section id="features" className="py-20 bg-background">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-14"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Tout ce dont Vous Avez Besoin pour Gérer Votre Cabinet
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Virela combine des fonctionnalités puissantes dans une interface simple et intuitive conçue spécialement pour les professionnels dentaires.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="bg-card rounded-xl p-6 shadow-card hover:shadow-elevated transition-shadow duration-300 border border-border/50"
          >
            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center mb-4">
              <feature.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground text-lg mb-2">{feature.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;

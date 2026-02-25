import { Button } from "@/components/ui/button";
import { Download, UserPlus, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => (
  <section className="relative overflow-hidden">
    {/* Background */}
    <div className="absolute inset-0">
      <img src={heroBg} alt="Logiciel de gestion de cabinet dentaire" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-foreground/70" />
    </div>

    <div className="relative container mx-auto px-4 py-24 md:py-36">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="max-w-2xl"
      >
        <div className="inline-flex items-center gap-2 bg-primary/20 text-primary-foreground text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-primary-foreground/20">
          <ShieldCheck className="w-4 h-4" />
          Approuvé par plus de 500 cabinets dentaires
        </div>

        <h1 className="text-4xl md:text-6xl font-bold text-primary-foreground leading-tight mb-6">
          Gérez Votre Cabinet Dentaire{" "}
          <span className="text-accent">Sans Effort</span>
        </h1>

        <p className="text-lg md:text-xl text-primary-foreground/80 mb-10 max-w-xl">
          Virela est une application de bureau sécurisée et hors ligne pour gérer les patients, les traitements, les factures et plus encore — sans configurations complexes ni dépendances cloud.
        </p>

        <div className="flex flex-wrap gap-4">
          <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-elevated" asChild>
            <Link to="/pricing">
              <Download className="w-5 h-5 mr-2" />
              Télécharger l'Essai Gratuit
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
            <Link to="/pricing">
              <UserPlus className="w-5 h-5 mr-2" />
              Obtenir la Licence Complète
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  </section>
);

export default HeroSection;

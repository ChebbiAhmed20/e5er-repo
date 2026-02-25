import { Button } from "@/components/ui/button";
import { Download, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const CTASection = () => (
  <section className="py-20 bg-hero-gradient">
    <div className="container mx-auto px-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
          Prêt à Simplifier Votre Cabinet ?
        </h2>
        <p className="text-primary-foreground/80 text-lg mb-10 max-w-xl mx-auto">
          Rejoignez des centaines de professionnels dentaires qui font confiance à Virela. Commencez votre essai gratuit aujourd'hui — aucune carte bancaire requise.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button size="lg" className="bg-card text-foreground hover:bg-card/90 shadow-elevated" asChild>
            <Link to="/pricing">
              <Download className="w-5 h-5 mr-2" />
              Télécharger l'Essai Gratuit
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
            <Link to="/pricing">
              Acheter la Licence Complète
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  </section>
);

export default CTASection;

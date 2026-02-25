import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Dr. Sarah Mitchell",
    clinic: "Cabinet Sourire Éclatant",
    feedback: "Virela a transformé la gestion de mon cabinet. Plus de tableurs désordonnés — tout est organisé et sauvegardé automatiquement.",
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&h=80&fit=crop&crop=face",
  },
  {
    name: "Dr. James Nguyen",
    clinic: "Cabinet Dentaire Familial",
    feedback: "L'importation Excel m'a fait gagner des semaines de saisie manuelle. J'étais opérationnel en quelques minutes. Fortement recommandé.",
    avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=80&h=80&fit=crop&crop=face",
  },
  {
    name: "Dr. Maria Rodriguez",
    clinic: "Centre de Santé Dentaire",
    feedback: "J'adore le fait que ça fonctionne entièrement hors ligne. Mes données patients sont en sécurité sur mon ordinateur, et la facturation me fait gagner des heures chaque semaine.",
    avatar: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=80&h=80&fit=crop&crop=face",
  },
  {
    name: "Dr. Ahmed Hassan",
    clinic: "Studio Dentaire Perle",
    feedback: "Simple, rapide et professionnel. Virela est exactement ce que je cherchais. Le système de sauvegarde me donne une tranquillité d'esprit.",
    avatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=80&h=80&fit=crop&crop=face",
  },
];

const TestimonialsSection = () => (
  <section className="py-20 bg-card">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-14"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Approuvé par les Professionnels Dentaires
        </h2>
        <p className="text-muted-foreground text-lg">
          Découvrez ce que les docteurs disent de Virela.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="bg-background rounded-xl p-6 shadow-card border border-border/50"
          >
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, j) => (
                <Star key={j} className="w-4 h-4 fill-accent text-accent" />
              ))}
            </div>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">"{t.feedback}"</p>
            <div className="flex items-center gap-3">
              <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" loading="lazy" />
              <div>
                <p className="font-semibold text-foreground text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.clinic}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;

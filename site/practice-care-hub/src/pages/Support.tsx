import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Mail, Phone, MessageCircle, BookOpen, HelpCircle } from "lucide-react";

const faqs = [
  { q: "Comment installer Virela ?", a: "Téléchargez l'installateur depuis notre site web, exécutez le fichier d'installation et suivez les instructions à l'écran. L'installation prend moins de 2 minutes." },
  { q: "Virela nécessite-t-il une connexion internet ?", a: "Non. Virela est une application de bureau entièrement hors ligne. Vos données sont stockées localement sur votre ordinateur." },
  { q: "Comment activer ma licence ?", a: "Après l'achat, vous recevrez une clé de licence par email. Ouvrez Virela, allez dans Paramètres → Licence, et entrez votre clé pour l'activer." },
  { q: "Puis-je transférer ma licence sur un autre ordinateur ?", a: "Oui. Vous pouvez désactiver votre licence sur la machine actuelle et l'activer sur une nouvelle depuis Paramètres → Licence → Transférer." },
  { q: "Comment fonctionne le système de sauvegarde ?", a: "Virela crée automatiquement des sauvegardes quotidiennes de votre base de données. Vous pouvez également déclencher des sauvegardes manuelles et choisir l'emplacement de sauvegarde." },
  { q: "Puis-je importer mes données patients existantes ?", a: "Oui. Virela prend en charge l'importation de données depuis des fichiers Excel (.xlsx). Allez dans Fichier → Importer et suivez l'assistant de mappage." },
  { q: "Que faire si je veux un remboursement ?", a: "Nous offrons une garantie de remboursement de 30 jours. Contactez support@virela.com avec les détails de votre achat." },
];

const contactMethods = [
  { icon: Mail, label: "Support Email", value: "support@virela.com", href: "mailto:support@virela.com" },
  { icon: Phone, label: "Téléphone", value: "+216 XX XXX XXX", href: "tel:+216XXXXXXXX" },
  { icon: MessageCircle, label: "WhatsApp", value: "+216 XX XXX XXX", href: "https://wa.me/216XXXXXXXX" },
  { icon: BookOpen, label: "Documentation", value: "docs.virela.com", href: "#" },
];

const Support = () => (
  <div className="py-20 bg-background">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-14"
      >
        <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
          Comment Pouvons-Nous Vous Aider ?
        </h1>
        <p className="text-muted-foreground text-lg">
          Trouvez des réponses aux questions fréquentes ou contactez notre équipe de support.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-12 max-w-5xl mx-auto">
        {/* FAQ */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <HelpCircle className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Questions Fréquemment Posées</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Contact methods */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-6">Contactez-Nous</h2>
          <div className="space-y-4">
            {contactMethods.map((method) => (
              <a
                key={method.label}
                href={method.href}
                className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:shadow-card transition-shadow"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  <method.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{method.label}</p>
                  <p className="text-xs text-muted-foreground">{method.value}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default Support;

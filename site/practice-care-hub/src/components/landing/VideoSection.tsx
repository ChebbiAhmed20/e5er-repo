import { motion } from "framer-motion";
import { Play } from "lucide-react";

const videos = [
  {
    title: "Comment Installer Virela",
    description: "Guide d'installation étape par étape pour Windows",
    thumbnail: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600&h=340&fit=crop",
  },
  {
    title: "Gérer les Dossiers Patients",
    description: "Ajoutez, modifiez et recherchez des patients en quelques secondes",
    thumbnail: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600&h=340&fit=crop",
  },
  {
    title: "Importer des Données depuis Excel",
    description: "Migrez facilement vos tableurs existants",
    thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=340&fit=crop",
  },
];

const VideoSection = () => (
  <section className="py-20 bg-muted">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-14"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Découvrez Virela en Action
        </h2>
        <p className="text-muted-foreground text-lg">
          Regardez de courts tutoriels pour démarrer rapidement.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {videos.map((video, i) => (
          <motion.div
            key={video.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="group cursor-pointer"
          >
            <div className="relative rounded-xl overflow-hidden shadow-card mb-4">
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-foreground/30 flex items-center justify-center group-hover:bg-foreground/40 transition-colors">
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-elevated">
                  <Play className="w-6 h-6 text-primary-foreground ml-0.5" />
                </div>
              </div>
            </div>
            <h3 className="font-semibold text-foreground">{video.title}</h3>
            <p className="text-sm text-muted-foreground">{video.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default VideoSection;

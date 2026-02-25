import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Accueil", to: "/" },
  { label: "Fonctionnalités", to: "/#features" },
  { label: "Tarifs", to: "/pricing" },
  { label: "Support", to: "/support" },
  { label: "Contact", to: "/contact" },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const scrollToFeatures = (e: React.MouseEvent, to: string) => {
    if (to === "/#features" && location.pathname === "/") {
      e.preventDefault();
      document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
      setMobileOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-hero-gradient flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">V</span>
          </div>
          <span className="font-bold text-xl text-foreground">Virela</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={(e) => scrollToFeatures(e, link.to)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link to="/signin">Se Connecter</Link>
          </Button>
          <Button size="sm" className="bg-hero-gradient text-primary-foreground" asChild>
            <Link to="/signup">
              <UserPlus className="w-4 h-4 mr-1" />
              S'inscrire
            </Link>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-border bg-card overflow-hidden"
          >
            <div className="p-4 flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={(e) => {
                    scrollToFeatures(e, link.to);
                    setMobileOpen(false);
                  }}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground py-2"
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/signin" onClick={() => setMobileOpen(false)}>Se Connecter</Link>
                </Button>
                <Button size="sm" className="bg-hero-gradient text-primary-foreground" asChild>
                  <Link to="/signup" onClick={() => setMobileOpen(false)}>
                    <UserPlus className="w-4 h-4 mr-1" /> S'inscrire
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;

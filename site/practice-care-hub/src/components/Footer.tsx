import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="bg-foreground text-primary-foreground">
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-hero-gradient flex items-center justify-center">
              <span className="font-bold text-lg">V</span>
            </div>
            <span className="font-bold text-lg">Virela</span>
          </div>
          <p className="text-sm opacity-70">
            Logiciel professionnel de gestion de cabinet dentaire. Sécurisé, hors ligne et facile à utiliser.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider opacity-80">Produit</h4>
          <ul className="space-y-2 text-sm opacity-70">
            <li><Link to="/" className="hover:opacity-100 transition-opacity">Accueil</Link></li>
            <li><Link to="/pricing" className="hover:opacity-100 transition-opacity">Tarifs</Link></li>
            <li><Link to="/pricing" className="hover:opacity-100 transition-opacity">Télécharger</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider opacity-80">Support</h4>
          <ul className="space-y-2 text-sm opacity-70">
            <li><Link to="/support" className="hover:opacity-100 transition-opacity">FAQ</Link></li>
            <li><Link to="/contact" className="hover:opacity-100 transition-opacity">Contactez-nous</Link></li>
            <li><Link to="/support" className="hover:opacity-100 transition-opacity">Documentation</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider opacity-80">Contact</h4>
          <ul className="space-y-2 text-sm opacity-70">
            <li>support@virela.com</li>
            <li>+216 XX XXX XXX</li>
            <li>WhatsApp: +216 XX XXX XXX</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-primary-foreground/20 mt-10 pt-6 text-center text-sm opacity-50">
        © {new Date().getFullYear()} Virela. Tous droits réservés.
      </div>
    </div>
  </footer>
);

export default Footer;

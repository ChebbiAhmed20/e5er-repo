import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("Erreur 404: l'utilisateur a tente d'acceder a une route inexistante:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-gray-600">Oups ! Page introuvable</p>
        <Link to="/" className="text-blue-500 underline hover:text-blue-700">
          Retour a l'accueil
        </Link>
      </div>
    </div>
  );
};

export default NotFound;

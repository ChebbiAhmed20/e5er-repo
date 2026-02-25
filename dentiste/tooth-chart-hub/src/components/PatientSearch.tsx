import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Search, User } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  cin: string | null;
  email: string | null;
}

const PatientSearch = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const searchPatients = async () => {
      if (searchTerm.trim().length < 2) {
        setResults([]);
        setShowResults(false);
        return;
      }

      try {
        const data = await apiClient.request<Patient[]>("/api/patients", {
          params: { search: searchTerm, limit: 5 },
        });
        setResults(data || []);
        setShowResults(true);
      } catch (error) {
        console.error("Erreur de recherche :", error);
      }
    };

    const debounce = setTimeout(searchPatients, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const handleSelectPatient = (patientId: string) => {
    navigate(`/patient/${patientId}`);
    setSearchTerm("");
    setShowResults(false);
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Rechercher par nom, CIN ou identifiant..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => searchTerm.length >= 2 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          className="pl-10"
        />
      </div>

      {showResults && results.length > 0 && (
        <Card className="absolute z-50 w-full mt-2 max-h-80 overflow-y-auto shadow-lg">
          <div className="p-2">
            {results.map((patient) => (
              <button
                key={patient.id}
                onClick={() => handleSelectPatient(patient.id)}
                className="w-full text-left p-3 hover:bg-accent rounded-md transition-colors flex items-center gap-3"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    {patient.first_name} {patient.last_name}
                  </p>
                  {patient.cin && (
                    <p className="text-xs text-muted-foreground">CIN: {patient.cin}</p>
                  )}
                  {patient.email && (
                    <p className="text-xs text-muted-foreground">{patient.email}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default PatientSearch;

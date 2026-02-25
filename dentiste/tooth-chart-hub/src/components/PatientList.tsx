import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  cin: string | null;
  email: string;
  phone: string;
  created_at: string;
}

interface PatientListProps {
  onRefresh?: () => void;
  searchTerm?: string;
  refreshTrigger?: number;
}

const PatientList = ({ onRefresh, searchTerm = "", refreshTrigger = 0 }: PatientListProps) => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchPatients();
    }, 300);
    
    return () => clearTimeout(debounce);
  }, [searchTerm, refreshTrigger]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await apiClient.request<Patient[]>('/api/patients');
      let patientData = Array.isArray(response) ? [...response] : [];

      // Filter by search term if provided
      if (searchTerm.trim().length > 0) {
        const search = searchTerm.toLowerCase();
        patientData = patientData.filter((patient: Patient) => {
          return (
            patient.first_name?.toLowerCase().includes(search) ||
            patient.last_name?.toLowerCase().includes(search) ||
            patient.cin?.toLowerCase().includes(search) ||
            patient.email?.toLowerCase().includes(search) ||
            patient.phone?.toLowerCase().includes(search)
          );
        });
      }

      // Sort by created_at descending
      patientData.sort((a: Patient, b: Patient) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setPatients(patientData);
    } catch (error) {
      console.error("Erreur lors du chargement des patients :", error);
      setPatients([]);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Chargement des patients...</div>;
  }

  if (patients.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg mb-2">
          {searchTerm ? "Aucun patient trouve" : "Aucun patient pour le moment"}
        </p>
        <p className="text-sm">
          {searchTerm 
            ? "Essayez d'ajuster votre recherche" 
            : "Ajoutez votre premier patient pour commencer"}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>CIN</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Telephone</TableHead>
            <TableHead>Ajoute</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient) => (
            <TableRow
              key={patient.id}
              className="cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              tabIndex={0}
              onClick={() => navigate(`/patient/${patient.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(`/patient/${patient.id}`);
                }
              }}
            >
              <TableCell className="font-medium">
                {patient.first_name} {patient.last_name}
              </TableCell>
              <TableCell className="text-muted-foreground">{patient.cin || "-"}</TableCell>
              <TableCell>{patient.email || "-"}</TableCell>
              <TableCell>{patient.phone || "-"}</TableCell>
              <TableCell>{format(new Date(patient.created_at), "dd MMM yyyy", { locale: fr })}</TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/patient/${patient.id}`);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Voir
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default PatientList;
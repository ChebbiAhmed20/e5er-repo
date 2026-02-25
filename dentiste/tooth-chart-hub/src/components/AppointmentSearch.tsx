import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface AppointmentSearchProps {
  onSearchChange: (searchTerm: string) => void;
}

const AppointmentSearch = ({ onSearchChange }: AppointmentSearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const debounce = setTimeout(() => {
      onSearchChange(searchTerm);
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchTerm, onSearchChange]);

  return (
    <div className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Rechercher des rendez-vous par nom de patient..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-10"
      />
    </div>
  );
};

export default AppointmentSearch;

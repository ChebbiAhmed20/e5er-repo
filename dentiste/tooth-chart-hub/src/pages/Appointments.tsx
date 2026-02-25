import { useState } from "react";
import { Calendar, List } from "lucide-react";
import AppointmentCalendar from "@/components/AppointmentCalendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppointmentSearch from "@/components/AppointmentSearch";

const Appointments = () => {
  const [appointmentSearch, setAppointmentSearch] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <AppointmentSearch onSearchChange={setAppointmentSearch} />
        </div>
        
        <Tabs defaultValue="calendar" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="calendar">
              <Calendar className="h-4 w-4 mr-2" />
              Vue calendrier
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="h-4 w-4 mr-2" />
              Vue liste
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="calendar">
            <AppointmentCalendar />
          </TabsContent>
          
          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle>Tous les rendez-vous</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Vue liste bientot disponible...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Appointments;

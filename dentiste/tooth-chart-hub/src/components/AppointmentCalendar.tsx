import { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { fr } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AppointmentDialog from "./AppointmentDialog";
import { toast } from "sonner";

const locales = {
  fr,
};

const calendarMessages = {
  next: "Suivant",
  previous: "Precedent",
  today: "Aujourd'hui",
  month: "Mois",
  week: "Semaine",
  day: "Jour",
  agenda: "Agenda",
  date: "Date",
  time: "Heure",
  event: "Rendez-vous",
  noEventsInRange: "Aucun rendez-vous dans cette periode",
  showMore: (total: number) => `+ ${total} de plus`,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface Appointment {
  id: string;
  patient_id: string;
  date_time: string;
  notes: string | null;
  status: string;
  patient?: {
    first_name: string;
    last_name: string;
  };
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Appointment;
}

const AppointmentCalendar = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const data = await apiClient.request<Appointment[]>('/api/appointments');
      const appointmentList = Array.isArray(data) ? data : [];
      
      setAppointments(appointmentList);
      
      const calendarEvents: CalendarEvent[] = appointmentList.map((apt) => {
        const startDate = new Date(apt.date_time);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour default
        
        return {
          id: apt.id,
          title: apt.patient 
            ? `${apt.patient.first_name} ${apt.patient.last_name}` 
            : "Patient inconnu",
          start: startDate,
          end: endDate,
          resource: apt,
        };
      });
      
      setEvents(calendarEvents);
    } catch (error) {
      console.error("Erreur lors du chargement des rendez-vous :", error);
      toast.error("Echec du chargement des rendez-vous");
      setAppointments([]);
      setEvents([]);
    }
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedAppointment(event.resource);
    setDialogOpen(true);
  };

  const handleSelectSlot = ({ start }: { start: Date }) => {
    setSelectedAppointment({
      id: "",
      patient_id: "",
      date_time: start.toISOString(),
      notes: null,
      status: "upcoming",
    });
    setDialogOpen(true);
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = "#3b82f6"; // primary blue
    
    if (event.resource.status === "done") {
      backgroundColor = "#10b981"; // success green
    } else if (event.resource.status === "canceled") {
      backgroundColor = "#ef4444"; // error red
    }
    
    return {
      style: {
        backgroundColor,
        borderRadius: "4px",
        opacity: 0.9,
        color: "white",
        border: "0px",
        display: "block",
      },
    };
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Calendrier des rendez-vous</h2>
        <Button onClick={() => {
          setSelectedAppointment(null);
          setDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau rendez-vous
        </Button>
      </div>

      <div className="bg-card p-4 rounded-lg border" style={{ height: "600px" }}>
        <Calendar
          localizer={localizer}
          events={events}
          culture="fr"
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          eventPropGetter={eventStyleGetter}
          messages={calendarMessages}
          style={{ height: "100%" }}
        />
      </div>

      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        appointment={selectedAppointment}
        onAppointmentSaved={fetchAppointments}
      />
    </div>
  );
};

export default AppointmentCalendar;
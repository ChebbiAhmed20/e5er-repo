import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { Printer, Download } from "lucide-react";
import html2pdf from "html2pdf.js";
import { platform } from "@/lib/platform";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
}

interface Prescription {
  id: string;
  medication_list: Medication[];
  instructions: string | null;
  duration: string | null;
  date_issued: string;
}

interface PrescriptionPrintProps {
  prescription: Prescription;
  patientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DentistProfile {
  first_name_english: string;
  last_name_english: string;
  first_name_arabic: string;
  last_name_arabic: string;
  phone: string;
  clinic_address: string;
  clinic_address_arabic: string;
  city: string;
  sex: string;
}

const PrescriptionPrint = ({
  prescription,
  patientName,
  open,
  onOpenChange,
}: PrescriptionPrintProps) => {
  const [dentistProfile, setDentistProfile] = useState<DentistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      fetchDentistProfile();
    }
  }, [open]);

  const fetchDentistProfile = async () => {
    try {
      const profile = await apiClient.request<DentistProfile>("/api/auth/me");
      setDentistProfile(profile);
    } catch (error) {
      console.error("Echec du chargement du profil du dentiste", error);
    } finally {
      setLoading(false);
    }
  };

  // Standard PDF download
  const generatePDF = async () => {
    if (!contentRef.current) return;
    const element = contentRef.current;
    const fileName = `ordonnance_${patientName}_${new Date().getTime()}.pdf`;

    const options = {
      margin: 10,
      filename: fileName,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
    };

    html2pdf().set(options).from(element).save();
  };

  // Print directly (no download): uses platform abstraction for cross-platform support
  const generateAndPrintPDF = async () => {
    if (!contentRef.current) return;
    const element = contentRef.current;
    const options = {
      margin: 10,
      filename: 'ordonnance.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
    };
    
    try {
      // Generate PDF blob
      const pdf = await html2pdf()
        .set(options)
        .from(element)
        .toPdf()
        .get('pdf');
      
      const blob = pdf.output('blob');
      
      // Use platform abstraction for printing (works in browser and Electron)
      await platform.printPdf(blob);
    } catch (error) {
      console.error("Echec de l'impression du PDF :", error);
      // Fallback to browser method if platform.printPdf fails
      html2pdf()
        .set(options)
        .from(element)
        .toPdf()
        .get('pdf')
        .then((pdf) => {
          const blob = pdf.output('blob');
          const url = URL.createObjectURL(blob);
          const win = window.open(url);
          if (win) {
            setTimeout(() => {
              win.print();
            }, 700);
          }
        });
    }
  };

  if (loading || !dentistProfile) {
    return null;
  }

  const profession = dentistProfile.sex === "male" ? "[translate:طبيب اسنان]" : "[translate:طبيبة اسنان]";
  const currentDate = new Date(prescription.date_issued).toLocaleDateString("fr-FR");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-10 bg-white">
        <div>
          <div className="mb-6 flex gap-2">
            <Button onClick={generatePDF} className="flex-1">
              <Download className="h-5 w-5 mr-2" />
              Telecharger en PDF
            </Button>
            <Button onClick={generateAndPrintPDF} className="flex-1" variant="outline">
              <Printer className="h-5 w-5 mr-2" />
              Imprimer le PDF
            </Button>
          </div>

          {/* Prescription Content for PDF */}
          <div
            ref={contentRef}
            style={{
              fontFamily: "Arial, sans-serif",
              padding: "40px",
              backgroundColor: "white",
              color: "#222"
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
              <div style={{ textAlign: "left" }}>
                <strong style={{ fontSize: "16px" }}>
                  {`Dr. ${dentistProfile.first_name_english} ${dentistProfile.last_name_english}`}
                </strong>
                <br />
                Dentiste<br />
                {`Tel : ${dentistProfile.phone}`}
              </div>
              <div style={{ textAlign: "right", direction: "rtl" }}>
                <strong style={{ fontSize: "16px" }}>
                  {`د. ${dentistProfile.first_name_arabic} ${dentistProfile.last_name_arabic}`}
                </strong>
                <br />
                {profession}<br />
                {`الهاتف : ${dentistProfile.phone}`}
              </div>
            </div>

            <hr style={{ borderTop: "2px solid #007bff", marginBottom: "30px" }} />

            <div style={{ marginBottom: "20px" }}>
              <strong>Date :</strong> {currentDate}
            </div>
            <div style={{ marginBottom: "20px" }}>
              <strong>Nom du patient :</strong> {patientName}
            </div>
            <div style={{ marginBottom: "20px" }}>
              <strong>Médicaments :</strong>
              <ul style={{ listStyleType: "disc", paddingLeft: "30px", marginTop: "10px" }}>
                {prescription.medication_list.map((med, idx) => (
                  <li key={idx} style={{ marginBottom: "8px" }}>
                    {med.name} {med.dosage} — {med.frequency}
                  </li>
                ))}
              </ul>
            </div>
            {prescription.duration && (
              <div style={{ marginBottom: "20px" }}>
                <strong>Durée :</strong> {prescription.duration}
              </div>
            )}
            {prescription.instructions && (
              <div style={{ marginBottom: "20px", backgroundColor: "#f9f9f9", padding: "15px", borderRadius: "6px" }}>
                <strong>Instructions :</strong>
                <p style={{ whiteSpace: "pre-wrap", marginTop: "10px" }}>{prescription.instructions}</p>
              </div>
            )}
            <div
              style={{
                marginTop: "50px",
                textAlign: "center",
                fontSize: "14px",
                borderTop: "2px solid #007bff",
                paddingTop: "15px",
              }}
            >
              <div dir="rtl" style={{ marginBottom: "4px" }}>
                {dentistProfile.clinic_address_arabic}
              </div>
              <div>{dentistProfile.clinic_address}</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrescriptionPrint;

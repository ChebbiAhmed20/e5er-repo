import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface BillingSummary {
  total_cost: number | null;
  total_paid: number | null;
  total_outstanding: number | null;
  paid_count: number | null;
  unpaid_count: number | null;
  partially_paid_count: number | null;
}

interface Treatment {
  id: string;
  treatment_type: string;
  treatment_date: string;
  tooth_number: number;
  treatment_cost: number;
  amount_paid: number;
  balance_remaining: number;
  payment_status: string;
}

interface PatientBillingProps {
  patientId: string;
}

const PatientBilling = ({ patientId }: PatientBillingProps) => {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const paymentStatusLabels: Record<string, string> = {
    paid: "paye",
    partially_paid: "partiellement paye",
    unpaid: "impaye",
  };

  useEffect(() => {
    fetchBillingData();
  }, [patientId]);

  const fetchBillingData = async () => {
    try {
      const summaryData = await apiClient.request<BillingSummary | null>(`/api/patients/${patientId}/billing`);
      const treatmentsData = await apiClient.request<Treatment[]>(`/api/treatments/patient/${patientId}`);

      const normalizedSummary: BillingSummary | null = summaryData
        ? {
            ...summaryData,
            total_cost: Number(summaryData.total_cost ?? 0),
            total_paid: Number(summaryData.total_paid ?? 0),
            total_outstanding: Number(summaryData.total_outstanding ?? 0),
            paid_count: summaryData.paid_count ?? 0,
            unpaid_count: summaryData.unpaid_count ?? 0,
            partially_paid_count: summaryData.partially_paid_count ?? 0,
          }
        : null;

      setSummary(normalizedSummary);
      const normalizedTreatments = (Array.isArray(treatmentsData) ? treatmentsData : []).map((treatment) => ({
        ...treatment,
        treatment_cost: Number(treatment.treatment_cost ?? 0),
        amount_paid: Number(treatment.amount_paid ?? 0),
        balance_remaining: Number((treatment as any).balance_remaining ?? (treatment.treatment_cost ?? 0) - (treatment.amount_paid ?? 0)),
      }));
      setTreatments(normalizedTreatments);
    } catch (error) {
      console.error("Erreur lors du chargement de la facturation :", error);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Paye
          </Badge>
        );
      case "partially_paid":
        return (
          <Badge className="bg-yellow-500">
            <Clock className="h-3 w-3 mr-1" />
            Partiellement paye
          </Badge>
        );
      case "unpaid":
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Impaye
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredTreatments = treatments.filter(treatment => {
    if (paymentFilter === "all") return true;
    return treatment.payment_status === paymentFilter;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cout total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(summary?.total_cost || 0).toFixed(2)} TND</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.paid_count || 0} payes, {summary?.unpaid_count || 0} impayes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total paye</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(summary?.total_paid || 0).toFixed(2)} TND
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.partially_paid_count || 0} partiellement payes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Solde restant</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {(summary?.total_outstanding || 0).toFixed(2)} TND
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Montant du
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Treatment List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Historique des paiements</CardTitle>
              <CardDescription>Tous les traitements avec details de paiement</CardDescription>
            </div>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="paid">Paye</SelectItem>
                <SelectItem value="partially_paid">Partiellement paye</SelectItem>
                <SelectItem value="unpaid">Impaye</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTreatments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {paymentFilter === "all" 
                ? "Aucun traitement enregistre" 
                : `Aucun traitement ${paymentStatusLabels[paymentFilter] ?? paymentFilter}`}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredTreatments.map((treatment) => (
                <div
                  key={treatment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{treatment.treatment_type}</h4>
                      {getPaymentStatusBadge(treatment.payment_status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Dent #{treatment.tooth_number}</span>
                      <span>{format(new Date(treatment.treatment_date), "dd MMM yyyy", { locale: fr })}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{treatment.treatment_cost.toFixed(2)} TND</div>
                    {treatment.payment_status === "partially_paid" && (
                      <div className="text-xs text-muted-foreground">
                        Paye : {treatment.amount_paid.toFixed(2)} TND
                        <br />
                        Solde : {treatment.balance_remaining.toFixed(2)} TND
                      </div>
                    )}
                    {treatment.payment_status === "paid" && (
                      <div className="text-xs text-green-600">Entierement paye</div>
                    )}
                    {treatment.payment_status === "unpaid" && (
                      <div className="text-xs text-destructive">Non paye</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientBilling;

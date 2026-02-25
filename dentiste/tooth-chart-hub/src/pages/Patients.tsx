import PatientList from "@/components/PatientList";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, FileDown, FileUp, FileWarning } from "lucide-react";
import { useState, useCallback } from "react";
import { ExcelImportDialog, type ImportResult } from "@/components/ExcelImportDialog";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";
import { isDesktop } from "@/lib/platform";

const Patients = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFailedLoading, setExportFailedLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastImportResult, setLastImportResult] = useState<ImportResult | null>(null);

  const getToken = useCallback(() => apiClient.getAccessToken(), []);

  const handleImportSuccess = useCallback((result: ImportResult) => {
    setLastImportResult(result);
    setRefreshTrigger((t) => t + 1);
  }, []);

  const handleExportPatients = useCallback(async () => {
    if (!isDesktop) {
      toast({
        title: "Non disponible",
        description: "L'export Excel est disponible uniquement dans l'application bureau.",
        variant: "destructive",
      });
      return;
    }
    setExporting(true);
    try {
      // Use apiClient to handle token refresh automatically
      const res = await apiClient.request<any>('/api/excel/export/patients', { method: 'POST' });

      if (res.success) {
        toast({
          title: "Export termine",
          description: `Saved to ${res.path}`,
        });
      } else if (res.canceled) {
        toast({
          title: "Annule",
          description: "La boite de dialogue d'enregistrement a ete annulee.",
        });
      } else {
        toast({
          title: "Echec de l'export",
          description: res.error || "Impossible d'enregistrer le fichier.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Echec de l'export",
        description: e?.message || "Impossible d'exporter.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }, []);

  const handleExportFailed = useCallback(async () => {
    if (!lastImportResult?.failedRows?.length || !isDesktop) return;
    setExportFailedLoading(true);
    try {
      const res = await apiClient.request<any>('/api/excel/export/failed', {
        method: 'POST',
        data: {
          failedRows: lastImportResult.failedRows,
          headers: Object.keys(lastImportResult.failedRows[0] || {}),
        }
      });

      if (res.success) {
        toast({
          title: "Telechargement termine",
          description: `Lignes en echec enregistrees dans ${res.path}`,
        });
      } else if (res.canceled) {
        toast({ title: "Annule", description: "La boite de dialogue d'enregistrement a ete annulee." });
      } else {
        toast({
          title: "Echec du telechargement",
          description: res.error || "Impossible d'enregistrer le fichier.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Echec du telechargement",
        description: e?.message || "Impossible d'exporter les lignes en echec.",
        variant: "destructive",
      });
    } finally {
      setExportFailedLoading(false);
    }
  }, [lastImportResult]);

  const hasFailedRows = lastImportResult && lastImportResult.failedRows && lastImportResult.failedRows.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Patients</CardTitle>
            <CardDescription>
              Recherchez, ouvrez et gérez rapidement les dossiers de vos patients.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Rechercher par nom, CIN, e-mail ou telephone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {isDesktop && (window as any).desktop?.excel && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setImportOpen(true)}
                    disabled={exporting || exportFailedLoading}
                  >
                    <FileUp className="h-4 w-4 mr-2" />
                    Importer l'ensemble des donnees
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportPatients}
                    disabled={exporting || exportFailedLoading}
                  >
                    {exporting ? (
                      <>Export en cours…</>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4 mr-2" />
                        Exporter patients + traitements
                      </>
                    )}
                  </Button>
                  {hasFailedRows && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleExportFailed}
                      disabled={exportFailedLoading}
                    >
                      {exportFailedLoading ? (
                        "Telechargement…"
                      ) : (
                        <>
                          <FileWarning className="h-4 w-4 mr-2" />
                          Telecharger les lignes en echec
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
            <PatientList searchTerm={searchTerm} refreshTrigger={refreshTrigger} />
          </CardContent>
        </Card>
      </main>
      <ExcelImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={handleImportSuccess}
        getToken={getToken}
      />
    </div>
  );
};

export default Patients;


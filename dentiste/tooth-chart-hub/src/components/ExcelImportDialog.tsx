import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Loader2, FileSpreadsheet } from "lucide-react";
import { isDesktop } from "@/lib/platform";
import { apiClient } from "@/lib/api-client";

const DB_FIELDS = [
  { value: "first_name", label: "Prenom" },
  { value: "last_name", label: "Nom" },
  { value: "cin", label: "CIN" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telephone" },
  { value: "date_of_birth", label: "Date de naissance" },
  { value: "address", label: "Adresse" },
  { value: "medical_notes", label: "Notes medicales" },
  { value: "_skip", label: "(Ne pas importer)" },
];

export type ImportPreview = {
  headers: string[];
  preview: Record<string, unknown>[];
  columnMappingSuggestions: Record<string, string>;
  filePath?: string;
};

export type ImportResult = {
  imported: number;
  failed: number;
  errors: Array<{ row?: number; field?: string; message: string }>;
  failedRows: Record<string, unknown>[];
};

interface ExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (result: ImportResult) => void;
  getToken: () => string | null;
}

export function ExcelImportDialog({
  open,
  onOpenChange,
  onSuccess,
  getToken,
}: ExcelImportDialogProps) {
  const [step, setStep] = useState<"select" | "mapping" | "importing" | "summary">("select");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [skipDuplicates, setSkipDuplicates] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleSelectFile = useCallback(async () => {
    if (!isDesktop) {
      toast({
        title: "Non disponible",
        description: "L'import Excel est disponible uniquement dans l'application bureau.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // apiClient handles token injection and refresh
      const data = await apiClient.request<ImportPreview | null>('/api/excel/import/select', { method: 'POST' });

      if (!data) {
        onOpenChange(false);
        return;
      }
      setPreview(data);
      setMapping(data.columnMappingSuggestions || {});
      setStep("mapping");
    } catch (e: any) {
      toast({
        title: "Apercu impossible",
        description: e?.message || "Impossible de lire le fichier Excel.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [onOpenChange]);

  const handleConfirmImport = useCallback(async () => {
    if (!preview?.filePath || !isDesktop) return;

    setStep("importing");
    setLoading(true);
    try {
      const res = await apiClient.request<ImportResult>('/api/excel/import/confirm', {
        method: 'POST',
        data: {
          filePath: preview.filePath,
          mapping,
          skipDuplicates,
        }
      });

      setResult(res);
      setStep("summary");
      onSuccess(res);
      toast({
        title: "Import termine",
        description: `${res.imported} importes, ${res.failed} en echec.`,
      });
    } catch (e: any) {
      toast({
        title: "Echec de l'import",
        description: e?.message || "L'import n'a pas pu etre termine.",
        variant: "destructive",
      });
      setStep("mapping");
    } finally {
      setLoading(false);
    }
  }, [preview, mapping, skipDuplicates, onSuccess]);

  const handleClose = useCallback(() => {
    setStep("select");
    setPreview(null);
    setMapping({});
    setResult(null);
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) {
      setStep("select");
      setPreview(null);
      setMapping({});
      setResult(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && (o ? setStep("select") : handleClose())}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6 gap-4 min-h-0">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importer des patients depuis Excel
          </DialogTitle>
          <DialogDescription>
            {step === "select" && "Selectionnez un fichier .xlsx pour l'aperçu et le mapping des colonnes."}
            {step === "mapping" && "Mappez les colonnes Excel aux champs patients, puis confirmez l'import."}
            {step === "importing" && "Import en cours…"}
            {step === "summary" && "Import termine. Vous pouvez telecharger les lignes en echec si besoin."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col gap-4">
          {step === "select" && (
            <div className="py-4 flex-shrink-0">
              <Button onClick={handleSelectFile} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ouverture du fichier…
                  </>
                ) : (
                  "Choisir un fichier Excel…"
                )}
              </Button>
            </div>
          )}

          {step === "mapping" && preview && !preview.error && Array.isArray(preview?.headers) && (
            <>
              <div className="space-y-2 py-2 flex-shrink-0">
                <Label>Mapping des colonnes</Label>
                <ScrollArea className="w-full max-h-[200px] rounded-md border p-2">
                  <div className="flex flex-col gap-2 min-w-[320px] pr-2">
                    {(preview.headers || []).map((header) => (
                      <div key={header} className="flex items-center gap-2">
                        <span className="text-muted-foreground w-40 truncate" title={header}>
                          {header}
                        </span>
                        <Select
                          value={mapping[header] || "_skip"}
                          onValueChange={(v) => setMapping((m) => ({ ...m, [header]: v }))}
                        >
                          <SelectTrigger className="w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DB_FIELDS.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <div className="flex items-center space-x-2 py-2 flex-shrink-0">
                <Checkbox
                  id="skip-dup"
                  checked={skipDuplicates}
                  onCheckedChange={(c) => setSkipDuplicates(!!c)}
                />
                <Label htmlFor="skip-dup" className="text-sm font-normal cursor-pointer">
                  Ignorer les doublons (par telephone ou CIN) au lieu de les signaler en echec
                </Label>
              </div>
              <div className="rounded border p-2 flex-shrink-0 min-h-0 flex flex-col">
                <Label className="text-muted-foreground">Apercu (premieres lignes)</Label>
                <ScrollArea className="h-48 w-full overflow-auto">
                  <div className="overflow-x-auto min-w-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {DB_FIELDS.filter((f) => f.value !== "_skip" && Object.values(mapping).includes(f.value)).slice(0, 6).map((f) => (
                            <TableHead key={f.value} className="whitespace-nowrap">
                              {f.label}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.preview.slice(0, 10).map((row, i) => (
                          <TableRow key={i}>
                            {DB_FIELDS.filter((f) => f.value !== "_skip" && Object.values(mapping).includes(f.value)).slice(0, 6).map((f) => (
                              <TableCell key={f.value} className="max-w-[120px] truncate">
                                {String((row[f.value] ?? "") ?? "")}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </div>
              <DialogFooter className="flex-shrink-0">
                <Button variant="outline" onClick={handleClose} disabled={loading}>
                  Annuler
                </Button>
                <Button onClick={handleConfirmImport} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Import en cours…
                    </>
                  ) : (
                    "Confirmer l'import"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}

          {step === "importing" && (
            <div className="py-8 flex flex-col items-center gap-4 flex-shrink-0">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Import par lots…</p>
              <Progress value={undefined} className="w-64" />
            </div>
          )}

          {step === "summary" && result && (
            <>
              <div className="rounded border p-4 space-y-2 flex-shrink-0 min-h-0 flex flex-col">
                <p>
                  <strong>Importes :</strong> {result.imported}
                </p>
                <p>
                  <strong>En echec :</strong> {result.failed}
                </p>
                {result.errors.length > 0 && (
                  <ScrollArea className="h-24 w-full rounded border p-2">
                    <ul className="text-sm text-muted-foreground">
                      {result.errors.slice(0, 20).map((err, i) => (
                        <li key={i}>
                          Ligne {err.row} : {err.message}
                        </li>
                      ))}
                      {result.errors.length > 20 && (
                        <li>… et {result.errors.length - 20} de plus</li>
                      )}
                    </ul>
                  </ScrollArea>
                )}
              </div>
              <DialogFooter className="flex-shrink-0">
                <Button onClick={handleClose}>Fermer</Button>
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

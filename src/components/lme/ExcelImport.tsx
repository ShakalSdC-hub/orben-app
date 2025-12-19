import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, Check, X, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { format, getWeek, getYear } from "date-fns";

interface LMERow {
  data: string;
  cobre_usd_t: number | null;
  aluminio_usd_t: number | null;
  zinco_usd_t: number | null;
  chumbo_usd_t: number | null;
  estanho_usd_t: number | null;
  niquel_usd_t: number | null;
  dolar_brl: number | null;
  cobre_brl_kg: number | null;
  aluminio_brl_kg: number | null;
  is_media_semanal: boolean;
  semana_numero: number | null;
}

const monthMap: Record<string, number> = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
  // English
  feb: 1, apr: 3, may: 4, aug: 7, sep: 8, oct: 9, dec: 11,
};

function parseFlexibleDate(value: any): { date: string | null; isMedia: boolean } {
  if (!value) return { date: null, isMedia: false };

  // Excel serial number
  if (typeof value === "number") {
    const excelDate = new Date((value - 25569) * 86400 * 1000);
    return { date: format(excelDate, "yyyy-MM-dd"), isMedia: false };
  }

  const str = String(value).trim().toLowerCase();
  
  // Detect "média" rows - return flag instead of skipping
  if (str.includes("média") || str.includes("media")) {
    return { date: null, isMedia: true };
  }

  // Format: "1-Dec", "01/dez", "1/12", etc.
  const match = str.match(/^(\d{1,2})[\-\/\.]?\s*([a-z]{3,})$/i);
  if (match) {
    const day = parseInt(match[1]);
    const monthStr = match[2].toLowerCase().substring(0, 3);
    const month = monthMap[monthStr];
    if (month !== undefined) {
      const year = new Date().getFullYear();
      return { date: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`, isMedia: false };
    }
  }

  // Format: "dd/mm/yyyy" or "dd-mm-yyyy"
  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const year = y.length === 2 ? `20${y}` : y;
    return { date: `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`, isMedia: false };
  }

  // Format: "dd/mm" (current year)
  if (parts.length === 2) {
    const [d, m] = parts;
    const year = new Date().getFullYear();
    return { date: `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`, isMedia: false };
  }

  return { date: null, isMedia: false };
}

function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  
  // Handle formatted numbers: "11,299.00" or "5.3338" or "11.299,00"
  let str = String(value).trim();
  
  // If has both comma and dot, determine format
  if (str.includes(",") && str.includes(".")) {
    // "11,299.00" format (US) or "11.299,00" format (BR)
    const lastComma = str.lastIndexOf(",");
    const lastDot = str.lastIndexOf(".");
    if (lastComma > lastDot) {
      // BR format: 11.299,00
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      // US format: 11,299.00
      str = str.replace(/,/g, "");
    }
  } else if (str.includes(",") && !str.includes(".")) {
    // Only comma - could be decimal or thousands
    const parts = str.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      // Decimal comma: "5,33"
      str = str.replace(",", ".");
    } else {
      // Thousands comma: "11,299"
      str = str.replace(/,/g, "");
    }
  }
  
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

export function ExcelImport() {
  const [isOpen, setIsOpen] = useState(false);
  const [parsedData, setParsedData] = useState<LMERow[]>([]);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const parseExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        // Find header row
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const row = jsonData[i];
          if (row && row.some((cell: any) => {
            const s = String(cell || "").toLowerCase();
            return s.includes("dia") || s.includes("data") || s.includes("cobre");
          })) {
            headerRowIndex = i;
            break;
          }
        }

        const headerRow = jsonData[headerRowIndex] || [];
        const dataRows = jsonData.slice(headerRowIndex + 1);

        // Map columns dynamically
        const colMap: Record<string, number> = {};
        headerRow.forEach((cell: any, idx: number) => {
          const cellStr = String(cell || "").toLowerCase().trim();
          if (cellStr.includes("dia") || cellStr.includes("data")) colMap.data = idx;
          if (cellStr.includes("cobre") && (cellStr.includes("u$") || cellStr.includes("usd"))) colMap.cobre_usd_t = idx;
          if ((cellStr.includes("alumin") || cellStr.includes("alumínio")) && (cellStr.includes("u$") || cellStr.includes("usd"))) colMap.aluminio_usd_t = idx;
          if (cellStr.includes("zinco")) colMap.zinco_usd_t = idx;
          if (cellStr.includes("chumbo")) colMap.chumbo_usd_t = idx;
          if (cellStr.includes("estanho")) colMap.estanho_usd_t = idx;
          if (cellStr.includes("niquel") || cellStr.includes("níquel")) colMap.niquel_usd_t = idx;
          if (cellStr.includes("dolar") || cellStr.includes("dólar") || cellStr.includes("r$/us")) colMap.dolar_brl = idx;
          if (cellStr.includes("cobre") && cellStr.includes("brl")) colMap.cobre_brl_kg = idx;
          if ((cellStr.includes("alumin") || cellStr.includes("alumínio")) && cellStr.includes("brl")) colMap.aluminio_brl_kg = idx;
        });

        console.log("Column mapping:", colMap);
        console.log("Header row:", headerRow);

        const rows: LMERow[] = [];
        let lastValidDate: string | null = null;
        let currentWeekNumber: number | null = null;
        
        dataRows.forEach((row: any[]) => {
          if (!row || row.length === 0) return;
          
          const dataValue = row[colMap.data];
          const { date: dataStr, isMedia } = parseFlexibleDate(dataValue);
          
          // If it's a média row, use the last valid date to determine the week
          if (isMedia) {
            const cobreBrl = parseNumber(row[colMap.cobre_brl_kg]);
            const aluminioBrl = parseNumber(row[colMap.aluminio_brl_kg]);
            
            // Only add if we have average values
            if (cobreBrl || aluminioBrl) {
              // Use the last valid date to create a week identifier
              const weekDate = lastValidDate ? new Date(lastValidDate) : new Date();
              const weekNumber = getWeek(weekDate, { weekStartsOn: 1 });
              const year = getYear(weekDate);
              
              // Create a synthetic date for the média (last Friday of that week)
              const mediaDate = lastValidDate || format(new Date(), "yyyy-MM-dd");
              
              rows.push({
                data: mediaDate,
                cobre_usd_t: parseNumber(row[colMap.cobre_usd_t]),
                aluminio_usd_t: parseNumber(row[colMap.aluminio_usd_t]),
                zinco_usd_t: parseNumber(row[colMap.zinco_usd_t]),
                chumbo_usd_t: parseNumber(row[colMap.chumbo_usd_t]),
                estanho_usd_t: parseNumber(row[colMap.estanho_usd_t]),
                niquel_usd_t: parseNumber(row[colMap.niquel_usd_t]),
                dolar_brl: parseNumber(row[colMap.dolar_brl]),
                cobre_brl_kg: cobreBrl,
                aluminio_brl_kg: aluminioBrl,
                is_media_semanal: true,
                semana_numero: weekNumber,
              });
            }
            return;
          }
          
          if (!dataStr) return; // Skip if no valid date

          // Track last valid date for média rows
          lastValidDate = dataStr;
          currentWeekNumber = getWeek(new Date(dataStr), { weekStartsOn: 1 });

          const cobreUsd = parseNumber(row[colMap.cobre_usd_t]);
          const aluminioUsd = parseNumber(row[colMap.aluminio_usd_t]);
          const dolar = parseNumber(row[colMap.dolar_brl]);

          // Calculate R$/kg if not present
          let cobreBrl = parseNumber(row[colMap.cobre_brl_kg]);
          let aluminioBrl = parseNumber(row[colMap.aluminio_brl_kg]);
          
          if (!cobreBrl && cobreUsd && dolar) {
            cobreBrl = (cobreUsd * dolar) / 1000;
          }
          if (!aluminioBrl && aluminioUsd && dolar) {
            aluminioBrl = (aluminioUsd * dolar) / 1000;
          }

          rows.push({
            data: dataStr,
            cobre_usd_t: cobreUsd,
            aluminio_usd_t: aluminioUsd,
            zinco_usd_t: parseNumber(row[colMap.zinco_usd_t]),
            chumbo_usd_t: parseNumber(row[colMap.chumbo_usd_t]),
            estanho_usd_t: parseNumber(row[colMap.estanho_usd_t]),
            niquel_usd_t: parseNumber(row[colMap.niquel_usd_t]),
            dolar_brl: dolar,
            cobre_brl_kg: cobreBrl,
            aluminio_brl_kg: aluminioBrl,
            is_media_semanal: false,
            semana_numero: currentWeekNumber,
          });
        });

        console.log("Parsed rows:", rows);
        setParsedData(rows);
        setFileName(file.name);
      } catch (error) {
        console.error("Erro ao parsear Excel:", error);
        toast({ title: "Erro ao ler arquivo", description: "Verifique o formato do Excel.", variant: "destructive" });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseExcel(file);
    }
  };

  const importMutation = useMutation({
    mutationFn: async (rows: LMERow[]) => {
      for (const row of rows) {
        // For média rows, check by semana_numero
        if (row.is_media_semanal) {
          const { data: existing } = await supabase
            .from("historico_lme")
            .select("id")
            .eq("semana_numero", row.semana_numero)
            .eq("is_media_semanal", true)
            .maybeSingle();

          if (existing) {
            // Update existing média record
            const { error } = await supabase
              .from("historico_lme")
              .update({
                cobre_usd_t: row.cobre_usd_t,
                aluminio_usd_t: row.aluminio_usd_t,
                zinco_usd_t: row.zinco_usd_t,
                chumbo_usd_t: row.chumbo_usd_t,
                estanho_usd_t: row.estanho_usd_t,
                niquel_usd_t: row.niquel_usd_t,
                dolar_brl: row.dolar_brl,
                cobre_brl_kg: row.cobre_brl_kg,
                aluminio_brl_kg: row.aluminio_brl_kg,
                fonte: "excel",
              })
              .eq("id", existing.id);
            if (error) throw error;
          } else {
            // Insert new média record
            const { error } = await supabase.from("historico_lme").insert({
              data: row.data,
              cobre_usd_t: row.cobre_usd_t,
              aluminio_usd_t: row.aluminio_usd_t,
              zinco_usd_t: row.zinco_usd_t,
              chumbo_usd_t: row.chumbo_usd_t,
              estanho_usd_t: row.estanho_usd_t,
              niquel_usd_t: row.niquel_usd_t,
              dolar_brl: row.dolar_brl,
              cobre_brl_kg: row.cobre_brl_kg,
              aluminio_brl_kg: row.aluminio_brl_kg,
              is_media_semanal: true,
              semana_numero: row.semana_numero,
              fonte: "excel",
            });
            if (error) throw error;
          }
        } else {
          // Regular daily records - check by date
          const { data: existing } = await supabase
            .from("historico_lme")
            .select("id")
            .eq("data", row.data)
            .eq("is_media_semanal", false)
            .maybeSingle();

          if (existing) {
            // Update existing record
            const { error } = await supabase
              .from("historico_lme")
              .update({
                cobre_usd_t: row.cobre_usd_t,
                aluminio_usd_t: row.aluminio_usd_t,
                zinco_usd_t: row.zinco_usd_t,
                chumbo_usd_t: row.chumbo_usd_t,
                estanho_usd_t: row.estanho_usd_t,
                niquel_usd_t: row.niquel_usd_t,
                dolar_brl: row.dolar_brl,
                cobre_brl_kg: row.cobre_brl_kg,
                aluminio_brl_kg: row.aluminio_brl_kg,
                semana_numero: row.semana_numero,
                fonte: "excel",
              })
              .eq("id", existing.id);
            if (error) throw error;
          } else {
            // Insert new record
            const { error } = await supabase.from("historico_lme").insert({
              data: row.data,
              cobre_usd_t: row.cobre_usd_t,
              aluminio_usd_t: row.aluminio_usd_t,
              zinco_usd_t: row.zinco_usd_t,
              chumbo_usd_t: row.chumbo_usd_t,
              estanho_usd_t: row.estanho_usd_t,
              niquel_usd_t: row.niquel_usd_t,
              dolar_brl: row.dolar_brl,
              cobre_brl_kg: row.cobre_brl_kg,
              aluminio_brl_kg: row.aluminio_brl_kg,
              is_media_semanal: false,
              semana_numero: row.semana_numero,
              fonte: "excel",
            });
            if (error) throw error;
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["historico_lme"] });
      queryClient.invalidateQueries({ queryKey: ["ultima-lme"] });
      queryClient.invalidateQueries({ queryKey: ["medias_semanais_lme"] });
      toast({ title: "Importação concluída!", description: `${parsedData.length} registros importados.` });
      setIsOpen(false);
      setParsedData([]);
      setFileName("");
    },
    onError: (error) => {
      toast({ title: "Erro na importação", description: error.message, variant: "destructive" });
    },
  });

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const mediasCount = parsedData.filter(r => r.is_media_semanal).length;
  const dailyCount = parsedData.filter(r => !r.is_media_semanal).length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Importar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Cotações LME do Excel</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button variant="default" className="bg-primary" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Selecionar Arquivo
            </Button>
            {fileName && (
              <span className="text-sm text-muted-foreground">
                {fileName} ({dailyCount} diários, {mediasCount} médias semanais)
              </span>
            )}
          </div>

          {parsedData.length > 0 && (
            <>
              <div className="flex-1 overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Cobre (US$/t)</TableHead>
                      <TableHead className="text-right">Alumínio (US$/t)</TableHead>
                      <TableHead className="text-right">Dólar</TableHead>
                      <TableHead className="text-right">Cobre (R$/kg)</TableHead>
                      <TableHead className="text-right">Alumínio (R$/kg)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 25).map((row, idx) => (
                      <TableRow key={idx} className={row.is_media_semanal ? "bg-primary/10 font-semibold" : ""}>
                        <TableCell>
                          {row.is_media_semanal ? `Sem. ${row.semana_numero}` : row.data}
                        </TableCell>
                        <TableCell>
                          {row.is_media_semanal ? (
                            <span className="text-primary">Média</span>
                          ) : (
                            <span className="text-muted-foreground">Diário</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{row.cobre_usd_t?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "-"}</TableCell>
                        <TableCell className="text-right">{row.aluminio_usd_t?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "-"}</TableCell>
                        <TableCell className="text-right">{row.dolar_brl?.toFixed(4) || "-"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.cobre_brl_kg)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.aluminio_brl_kg)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedData.length > 25 && (
                  <p className="text-center text-sm text-muted-foreground py-2">
                    ... e mais {parsedData.length - 25} linhas
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setParsedData([]); setFileName(""); }}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button 
                  onClick={() => importMutation.mutate(parsedData)}
                  disabled={importMutation.isPending}
                  className="bg-primary"
                >
                  {importMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Importar {parsedData.length} Registros
                </Button>
              </div>
            </>
          )}

          {parsedData.length === 0 && (
            <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-lg p-8">
              <div className="text-center text-muted-foreground">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecione um arquivo Excel com as cotações LME</p>
                <p className="text-sm mt-2">O arquivo deve conter colunas: Data, Cobre (US$/t), Dólar, etc.</p>
                <p className="text-sm mt-1">As linhas com "Média" serão importadas como médias semanais.</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
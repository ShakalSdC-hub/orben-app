import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, Check, X, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { format } from "date-fns";

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

        // Procurar linha de cabeçalho (contém "Data" ou "Cobre")
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const row = jsonData[i];
          if (row && row.some((cell: any) => 
            typeof cell === "string" && 
            (cell.toLowerCase().includes("data") || cell.toLowerCase().includes("cobre"))
          )) {
            headerRowIndex = i;
            break;
          }
        }

        const headerRow = jsonData[headerRowIndex] || [];
        const dataRows = jsonData.slice(headerRowIndex + 1);

        // Mapear colunas
        const colMap: Record<string, number> = {};
        headerRow.forEach((cell: any, idx: number) => {
          const cellStr = String(cell || "").toLowerCase().trim();
          if (cellStr.includes("data")) colMap.data = idx;
          if (cellStr.includes("cobre") && cellStr.includes("usd")) colMap.cobre_usd_t = idx;
          if (cellStr.includes("alumin") && cellStr.includes("usd")) colMap.aluminio_usd_t = idx;
          if (cellStr.includes("zinco")) colMap.zinco_usd_t = idx;
          if (cellStr.includes("chumbo")) colMap.chumbo_usd_t = idx;
          if (cellStr.includes("estanho")) colMap.estanho_usd_t = idx;
          if (cellStr.includes("niquel") || cellStr.includes("níquel")) colMap.niquel_usd_t = idx;
          if (cellStr.includes("dolar") || cellStr.includes("dólar") || cellStr.includes("usd/brl")) colMap.dolar_brl = idx;
          if (cellStr.includes("cobre") && cellStr.includes("brl")) colMap.cobre_brl_kg = idx;
          if (cellStr.includes("alumin") && cellStr.includes("brl")) colMap.aluminio_brl_kg = idx;
        });

        const rows: LMERow[] = [];
        dataRows.forEach((row: any[]) => {
          if (!row || row.length === 0) return;
          
          let dataValue = row[colMap.data];
          if (!dataValue) return;

          // Parse data
          let dataStr = "";
          if (typeof dataValue === "number") {
            // Excel serial date
            const excelDate = new Date((dataValue - 25569) * 86400 * 1000);
            dataStr = format(excelDate, "yyyy-MM-dd");
          } else if (typeof dataValue === "string") {
            // Try to parse date string
            const parts = dataValue.split(/[\/\-\.]/);
            if (parts.length === 3) {
              const [d, m, y] = parts;
              const year = y.length === 2 ? `20${y}` : y;
              dataStr = `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
            }
          }

          if (!dataStr) return;

          const parseNum = (idx: number | undefined) => {
            if (idx === undefined) return null;
            const val = row[idx];
            if (val === null || val === undefined || val === "") return null;
            const num = typeof val === "number" ? val : parseFloat(String(val).replace(",", "."));
            return isNaN(num) ? null : num;
          };

          const cobreUsd = parseNum(colMap.cobre_usd_t);
          const aluminioUsd = parseNum(colMap.aluminio_usd_t);
          const dolar = parseNum(colMap.dolar_brl);

          // Calcular R$/kg se não existir
          let cobreBrl = parseNum(colMap.cobre_brl_kg);
          let aluminioBrl = parseNum(colMap.aluminio_brl_kg);
          
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
            zinco_usd_t: parseNum(colMap.zinco_usd_t),
            chumbo_usd_t: parseNum(colMap.chumbo_usd_t),
            estanho_usd_t: parseNum(colMap.estanho_usd_t),
            niquel_usd_t: parseNum(colMap.niquel_usd_t),
            dolar_brl: dolar,
            cobre_brl_kg: cobreBrl,
            aluminio_brl_kg: aluminioBrl,
          });
        });

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
        const { error } = await supabase.from("historico_lme").upsert({
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
          fonte: "excel",
        }, { onConflict: "data" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["historico_lme"] });
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
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Selecionar Arquivo
            </Button>
            {fileName && (
              <span className="text-sm text-muted-foreground">
                {fileName} ({parsedData.length} linhas)
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
                      <TableHead className="text-right">Cobre (US$/t)</TableHead>
                      <TableHead className="text-right">Alumínio (US$/t)</TableHead>
                      <TableHead className="text-right">Dólar</TableHead>
                      <TableHead className="text-right">Cobre (R$/kg)</TableHead>
                      <TableHead className="text-right">Alumínio (R$/kg)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 20).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{row.data}</TableCell>
                        <TableCell className="text-right">{row.cobre_usd_t?.toFixed(2) || "-"}</TableCell>
                        <TableCell className="text-right">{row.aluminio_usd_t?.toFixed(2) || "-"}</TableCell>
                        <TableCell className="text-right">{row.dolar_brl?.toFixed(4) || "-"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.cobre_brl_kg)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.aluminio_brl_kg)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedData.length > 20 && (
                  <p className="text-center text-sm text-muted-foreground py-2">
                    ... e mais {parsedData.length - 20} linhas
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
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

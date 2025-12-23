import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, FileSpreadsheet, Check, X, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "@/hooks/use-toast";

interface ColumnDef {
  key: string;
  label: string;
  type: "string" | "number" | "date";
  required?: boolean;
  example?: string;
}

interface ExcelImportTemplateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ColumnDef[];
  templateName: string;
  onImport: (data: any[]) => Promise<void>;
}

export function ExcelImportTemplate({
  open,
  onOpenChange,
  columns,
  templateName,
  onImport,
}: ExcelImportTemplateProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const downloadTemplate = useCallback(() => {
    const headers = columns.map((c) => c.label);
    const exampleRow = columns.reduce((acc, c) => {
      acc[c.label] = c.example || (c.type === "number" ? "0" : c.type === "date" ? "2025-01-01" : "Exemplo");
      return acc;
    }, {} as Record<string, string>);

    const worksheet = XLSX.utils.json_to_sheet([exampleRow], { header: headers });
    
    // Add column widths
    worksheet["!cols"] = columns.map(() => ({ wch: 20 }));
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    
    XLSX.writeFile(workbook, `${templateName}_template.xlsx`);
    toast({ title: "Template baixado com sucesso!" });
  }, [columns, templateName]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Validate and map data
        const mappedData: any[] = [];
        const validationErrors: string[] = [];

        jsonData.forEach((row: any, index) => {
          const mappedRow: Record<string, any> = {};
          
          columns.forEach((col) => {
            const value = row[col.label];
            
            if (col.required && (value === undefined || value === null || value === "")) {
              validationErrors.push(`Linha ${index + 2}: ${col.label} é obrigatório`);
            }

            if (col.type === "number") {
              mappedRow[col.key] = parseFloat(value) || 0;
            } else if (col.type === "date") {
              // Handle Excel date serial numbers
              if (typeof value === "number") {
                const date = new Date((value - 25569) * 86400 * 1000);
                mappedRow[col.key] = date.toISOString().split("T")[0];
              } else {
                mappedRow[col.key] = value || null;
              }
            } else {
              mappedRow[col.key] = value || "";
            }
          });

          mappedData.push(mappedRow);
        });

        setErrors(validationErrors);
        setPreviewData(mappedData.slice(0, 5)); // Preview first 5 rows
      } catch (error) {
        toast({ title: "Erro ao ler arquivo", description: "Verifique se o formato está correto", variant: "destructive" });
      }
    };

    reader.readAsArrayBuffer(selectedFile);
  }, [columns]);

  const handleImport = async () => {
    if (!file || errors.length > 0) return;

    setIsLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const mappedData = jsonData.map((row: any) => {
          const mappedRow: Record<string, any> = {};
          columns.forEach((col) => {
            const value = row[col.label];
            if (col.type === "number") {
              mappedRow[col.key] = parseFloat(value) || 0;
            } else if (col.type === "date" && typeof value === "number") {
              const date = new Date((value - 25569) * 86400 * 1000);
              mappedRow[col.key] = date.toISOString().split("T")[0];
            } else {
              mappedRow[col.key] = value || null;
            }
          });
          return mappedRow;
        });

        await onImport(mappedData);
        onOpenChange(false);
        setFile(null);
        setPreviewData([]);
      };
      reader.readAsArrayBuffer(file);
    } catch (error: any) {
      toast({ title: "Erro na importação", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar {templateName}
          </DialogTitle>
          <DialogDescription>
            Baixe o template, preencha os dados e faça o upload do arquivo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Download Template */}
          <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex-1">
              <p className="font-medium">1. Baixar template</p>
              <p className="text-sm text-muted-foreground">Use o modelo correto para importação</p>
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Template
            </Button>
          </div>

          {/* Upload File */}
          <div className="space-y-2">
            <Label>2. Selecionar arquivo preenchido</Label>
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
          </div>

          {/* Preview */}
          {previewData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>3. Pré-visualização (primeiras 5 linhas)</Label>
                {errors.length === 0 ? (
                  <Badge variant="default" className="bg-success">
                    <Check className="h-3 w-3 mr-1" /> Válido
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <X className="h-3 w-3 mr-1" /> {errors.length} erro(s)
                  </Badge>
                )}
              </div>
              <div className="border rounded-lg overflow-auto max-h-60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map((col) => (
                        <TableHead key={col.key}>{col.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, i) => (
                      <TableRow key={i}>
                        {columns.map((col) => (
                          <TableCell key={col.key}>{row[col.key] ?? "-"}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {errors.length > 0 && (
                <div className="text-sm text-destructive">
                  {errors.slice(0, 5).map((e, i) => (
                    <p key={i}>{e}</p>
                  ))}
                  {errors.length > 5 && <p>...e mais {errors.length - 5} erro(s)</p>}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || errors.length > 0 || isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, Download, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "@/hooks/use-toast";

interface ColumnMapping {
  dbColumn: string;
  excelColumn: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'boolean';
  transform?: (value: any) => any;
}

interface ExcelImportProps {
  title: string;
  description: string;
  columns: ColumnMapping[];
  onImport: (data: any[]) => Promise<void>;
  templateFilename: string;
  sampleData?: Record<string, any>[];
}

export function ExcelImport({ title, description, columns, onImport, templateFilename, sampleData }: ExcelImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { raw: false });

        // Mapear colunas do Excel para o formato do banco
        const mappedData: any[] = [];
        const validationErrors: string[] = [];

        jsonData.forEach((row: any, index) => {
          const mappedRow: Record<string, any> = {};
          let rowValid = true;

          columns.forEach((col) => {
            const value = row[col.excelColumn];
            
            // Verificar campos obrigatórios
            if (col.required && (value === undefined || value === null || value === '')) {
              validationErrors.push(`Linha ${index + 2}: Campo "${col.label}" é obrigatório`);
              rowValid = false;
              return;
            }

            // Transformar valor conforme o tipo
            let transformedValue = value;
            if (value !== undefined && value !== null && value !== '') {
              if (col.type === 'number') {
                // Limpar formatação de número BR
                const cleanValue = String(value).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
                transformedValue = parseFloat(cleanValue);
                if (isNaN(transformedValue)) {
                  validationErrors.push(`Linha ${index + 2}: Campo "${col.label}" deve ser numérico`);
                  rowValid = false;
                }
              } else if (col.type === 'date') {
                // Tentar converter data
                const dateValue = new Date(value);
                if (isNaN(dateValue.getTime())) {
                  // Tentar formato BR
                  const parts = String(value).split('/');
                  if (parts.length === 3) {
                    transformedValue = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                  } else {
                    validationErrors.push(`Linha ${index + 2}: Campo "${col.label}" deve ser uma data válida`);
                    rowValid = false;
                  }
                } else {
                  transformedValue = dateValue.toISOString().split('T')[0];
                }
              } else if (col.type === 'boolean') {
                transformedValue = ['sim', 's', 'true', '1', 'yes'].includes(String(value).toLowerCase());
              }

              // Aplicar transformação customizada
              if (col.transform && rowValid) {
                transformedValue = col.transform(transformedValue);
              }
            }

            mappedRow[col.dbColumn] = transformedValue ?? null;
          });

          if (rowValid) {
            mappedData.push(mappedRow);
          }
        });

        setPreview(mappedData);
        setErrors(validationErrors.slice(0, 10)); // Mostrar até 10 erros

        if (mappedData.length === 0 && validationErrors.length > 0) {
          toast({ 
            title: "Erros de validação", 
            description: "Verifique os erros e tente novamente", 
            variant: "destructive" 
          });
        }
      } catch (error) {
        console.error("Erro ao processar arquivo:", error);
        toast({ 
          title: "Erro ao processar arquivo", 
          description: "Verifique se o arquivo está no formato correto", 
          variant: "destructive" 
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (preview.length === 0) {
      toast({ title: "Nenhum dado para importar", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      await onImport(preview);
      toast({ title: "Importação concluída!", description: `${preview.length} registros importados` });
      handleClose();
    } catch (error: any) {
      toast({ title: "Erro na importação", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setPreview([]);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    // Criar planilha com cabeçalhos e dados de exemplo
    const headers = columns.map(c => c.excelColumn);
    const templateData = sampleData || [
      columns.reduce((acc, col) => {
        acc[col.excelColumn] = col.type === 'number' ? '0' : 
          col.type === 'date' ? '01/01/2025' : 'Exemplo';
        return acc;
      }, {} as Record<string, string>)
    ];

    const ws = XLSX.utils.json_to_sheet(templateData, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dados");
    XLSX.writeFile(wb, `${templateFilename}.xlsx`);
    toast({ title: "Template baixado!" });
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        <Upload className="mr-2 h-4 w-4" />
        Importar XLSX
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              {title}
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-4">
            {/* Upload e Template */}
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-muted-foreground
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-primary-foreground
                    hover:file:opacity-90 cursor-pointer"
                />
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Baixar Template
              </Button>
            </div>

            {/* Colunas esperadas */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Colunas esperadas:</span>
              {columns.map(col => (
                <Badge 
                  key={col.dbColumn} 
                  variant={col.required ? "default" : "secondary"}
                  className="text-xs"
                >
                  {col.excelColumn}{col.required && '*'}
                </Badge>
              ))}
            </div>

            {/* Erros */}
            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside text-sm">
                    {errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                    {errors.length === 10 && <li>... e mais erros</li>}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Preview */}
            {preview.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 p-3 bg-muted/50 border-b">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="font-medium">{preview.length} registros prontos para importar</span>
                </div>
                <div className="overflow-x-auto max-h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.slice(0, 6).map(col => (
                          <TableHead key={col.dbColumn} className="whitespace-nowrap text-xs">
                            {col.label}
                          </TableHead>
                        ))}
                        {columns.length > 6 && <TableHead className="text-xs">...</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.slice(0, 10).map((row, i) => (
                        <TableRow key={i}>
                          {columns.slice(0, 6).map(col => (
                            <TableCell key={col.dbColumn} className="text-xs whitespace-nowrap">
                              {row[col.dbColumn] !== null && row[col.dbColumn] !== undefined 
                                ? String(row[col.dbColumn]).substring(0, 20) 
                                : '-'}
                            </TableCell>
                          ))}
                          {columns.length > 6 && <TableCell className="text-xs">...</TableCell>}
                        </TableRow>
                      ))}
                      {preview.length > 10 && (
                        <TableRow>
                          <TableCell colSpan={Math.min(columns.length, 7)} className="text-center text-muted-foreground text-xs">
                            ... e mais {preview.length - 10} registros
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={preview.length === 0 || isLoading}
              className="bg-gradient-copper"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar {preview.length} registros
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

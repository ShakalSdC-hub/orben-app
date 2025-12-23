import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet, Download, AlertTriangle, CheckCircle2, Loader2, Trash2, Pencil, X, Check, Database } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface ColumnMapping {
  dbColumn: string;
  excelColumn: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'boolean';
  transform?: (value: any) => any;
  isCodeColumn?: boolean; // Marca a coluna como código único para validação de duplicados
}

interface ExcelImportProps {
  title: string;
  description: string;
  columns: ColumnMapping[];
  onImport: (data: any[]) => Promise<void>;
  templateFilename: string;
  sampleData?: Record<string, any>[];
  tableName?: string; // Nome da tabela para validação de duplicados
  codeColumn?: string; // Nome da coluna de código no banco (ex: "codigo")
  existingDataQuery?: () => Promise<any[]>; // Função para buscar dados existentes para exportação
}

interface PreviewRow {
  data: Record<string, any>;
  errors: string[];
  isDuplicate: boolean;
  isEditing: boolean;
}

export function ExcelImport({ 
  title, 
  description, 
  columns, 
  onImport, 
  templateFilename, 
  sampleData,
  tableName,
  codeColumn = "codigo",
  existingDataQuery
}: ExcelImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [globalErrors, setGlobalErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [existingCodes, setExistingCodes] = useState<Set<string>>(new Set());
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Buscar códigos existentes no banco
  const fetchExistingCodes = useCallback(async () => {
    if (!tableName) return new Set<string>();
    
    try {
      const { data, error } = await supabase
        .from(tableName as any)
        .select(codeColumn);
      
      if (error) throw error;
      return new Set(data?.map((row: any) => String(row[codeColumn]).toLowerCase()) || []);
    } catch (error) {
      console.error("Erro ao buscar códigos existentes:", error);
      return new Set<string>();
    }
  }, [tableName, codeColumn]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsValidating(true);

    // Buscar códigos existentes
    const codes = await fetchExistingCodes();
    setExistingCodes(codes);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { raw: false });

        const rows: PreviewRow[] = [];
        const globalValidationErrors: string[] = [];
        const importedCodes = new Set<string>();

        jsonData.forEach((row: any, index) => {
          const mappedRow: Record<string, any> = {};
          const rowErrors: string[] = [];
          let isDuplicate = false;

          columns.forEach((col) => {
            const value = row[col.excelColumn];
            
            // Verificar campos obrigatórios
            if (col.required && (value === undefined || value === null || value === '')) {
              rowErrors.push(`"${col.label}" é obrigatório`);
              return;
            }

            // Transformar valor conforme o tipo
            let transformedValue = value;
            if (value !== undefined && value !== null && value !== '') {
              if (col.type === 'number') {
                const cleanValue = String(value).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
                transformedValue = parseFloat(cleanValue);
                if (isNaN(transformedValue)) {
                  rowErrors.push(`"${col.label}" deve ser numérico`);
                }
              } else if (col.type === 'date') {
                const dateValue = new Date(value);
                if (isNaN(dateValue.getTime())) {
                  const parts = String(value).split('/');
                  if (parts.length === 3) {
                    transformedValue = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                  } else {
                    rowErrors.push(`"${col.label}" deve ser uma data válida`);
                  }
                } else {
                  transformedValue = dateValue.toISOString().split('T')[0];
                }
              } else if (col.type === 'boolean') {
                transformedValue = ['sim', 's', 'true', '1', 'yes'].includes(String(value).toLowerCase());
              }

              if (col.transform) {
                transformedValue = col.transform(transformedValue);
              }
            }

            mappedRow[col.dbColumn] = transformedValue ?? null;

            // Verificar duplicados para a coluna de código
            if (col.isCodeColumn || col.dbColumn === codeColumn) {
              const codeValue = String(transformedValue || '').toLowerCase();
              if (codeValue) {
                // Duplicado no banco
                if (codes.has(codeValue)) {
                  rowErrors.push(`Código "${transformedValue}" já existe no sistema`);
                  isDuplicate = true;
                }
                // Duplicado no próprio arquivo
                if (importedCodes.has(codeValue)) {
                  rowErrors.push(`Código "${transformedValue}" duplicado na planilha`);
                  isDuplicate = true;
                }
                importedCodes.add(codeValue);
              }
            }
          });

          rows.push({
            data: mappedRow,
            errors: rowErrors,
            isDuplicate,
            isEditing: false,
          });
        });

        setPreviewRows(rows);
        setGlobalErrors(globalValidationErrors);

        const validRows = rows.filter(r => r.errors.length === 0 && !r.isDuplicate);
        const errorRows = rows.filter(r => r.errors.length > 0 || r.isDuplicate);
        
        if (rows.length > 0) {
          toast({ 
            title: `${validRows.length} registros válidos`, 
            description: errorRows.length > 0 ? `${errorRows.length} com erros (edite ou remova)` : undefined,
            variant: errorRows.length > 0 ? "default" : undefined
          });
        }
      } catch (error) {
        console.error("Erro ao processar arquivo:", error);
        toast({ 
          title: "Erro ao processar arquivo", 
          description: "Verifique se o arquivo está no formato correto", 
          variant: "destructive" 
        });
      } finally {
        setIsValidating(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    const validRows = previewRows.filter(r => r.errors.length === 0 && !r.isDuplicate);
    
    if (validRows.length === 0) {
      toast({ title: "Nenhum registro válido para importar", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      await onImport(validRows.map(r => r.data));
      toast({ title: "Importação concluída!", description: `${validRows.length} registros importados` });
      handleClose();
    } catch (error: any) {
      toast({ title: "Erro na importação", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setPreviewRows([]);
    setGlobalErrors([]);
    setEditingRowIndex(null);
    setEditValues({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeRow = (index: number) => {
    setPreviewRows(prev => prev.filter((_, i) => i !== index));
  };

  const startEditing = (index: number) => {
    setEditingRowIndex(index);
    setEditValues({ ...previewRows[index].data });
  };

  const cancelEditing = () => {
    setEditingRowIndex(null);
    setEditValues({});
  };

  const saveEditing = async () => {
    if (editingRowIndex === null) return;

    // Revalidar a linha editada
    const rowErrors: string[] = [];
    let isDuplicate = false;
    const codes = await fetchExistingCodes();

    columns.forEach((col) => {
      const value = editValues[col.dbColumn];
      
      if (col.required && (value === undefined || value === null || value === '')) {
        rowErrors.push(`"${col.label}" é obrigatório`);
      }

      // Verificar duplicados
      if ((col.isCodeColumn || col.dbColumn === codeColumn) && value) {
        const codeValue = String(value).toLowerCase();
        if (codes.has(codeValue)) {
          rowErrors.push(`Código "${value}" já existe no sistema`);
          isDuplicate = true;
        }
        // Verificar duplicados na planilha (exceto a própria linha)
        const duplicateInFile = previewRows.some((r, i) => 
          i !== editingRowIndex && 
          String(r.data[codeColumn] || '').toLowerCase() === codeValue
        );
        if (duplicateInFile) {
          rowErrors.push(`Código "${value}" duplicado na planilha`);
          isDuplicate = true;
        }
      }
    });

    setPreviewRows(prev => prev.map((row, i) => 
      i === editingRowIndex 
        ? { data: editValues, errors: rowErrors, isDuplicate, isEditing: false }
        : row
    ));
    
    setEditingRowIndex(null);
    setEditValues({});
  };

  const downloadTemplate = () => {
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

  const downloadExistingData = async () => {
    if (!existingDataQuery) {
      toast({ title: "Exportação não configurada", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const data = await existingDataQuery();
      
      if (!data || data.length === 0) {
        toast({ title: "Nenhum dado para exportar", variant: "destructive" });
        return;
      }

      // Mapear dados para o formato do Excel
      const excelData = data.map((row: any) => {
        const excelRow: Record<string, any> = {};
        columns.forEach(col => {
          let value = row[col.dbColumn];
          if (col.type === 'date' && value) {
            // Formatar data para DD/MM/YYYY
            const date = new Date(value);
            value = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
          } else if (col.type === 'number' && value !== null && value !== undefined) {
            value = Number(value);
          } else if (col.type === 'boolean') {
            value = value ? 'Sim' : 'Não';
          }
          excelRow[col.excelColumn] = value ?? '';
        });
        return excelRow;
      });

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Dados");
      XLSX.writeFile(wb, `${templateFilename}_dados.xlsx`);
      toast({ title: "Dados exportados!", description: `${data.length} registros` });
    } catch (error: any) {
      toast({ title: "Erro ao exportar", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const validRowsCount = previewRows.filter(r => r.errors.length === 0 && !r.isDuplicate).length;
  const errorRowsCount = previewRows.filter(r => r.errors.length > 0 || r.isDuplicate).length;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        <Upload className="mr-2 h-4 w-4" />
        Importar XLSX
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              {title}
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-4">
            {/* Upload e Templates */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex-1 min-w-[200px]">
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
                Template Vazio
              </Button>
              {existingDataQuery && (
                <Button variant="outline" size="sm" onClick={downloadExistingData} disabled={isLoading}>
                  <Database className="mr-2 h-4 w-4" />
                  Exportar Dados
                </Button>
              )}
            </div>

            {/* Colunas esperadas */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Colunas:</span>
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

            {/* Loading */}
            {isValidating && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Validando dados...</span>
              </div>
            )}

            {/* Preview com edição */}
            {previewRows.length > 0 && !isValidating && (
              <div className="border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
                  <div className="flex items-center gap-4">
                    {validRowsCount > 0 && (
                      <span className="flex items-center gap-1 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="font-medium">{validRowsCount} válidos</span>
                      </span>
                    )}
                    {errorRowsCount > 0 && (
                      <span className="flex items-center gap-1 text-sm text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">{errorRowsCount} com erros</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        {columns.slice(0, 6).map(col => (
                          <TableHead key={col.dbColumn} className="whitespace-nowrap text-xs">
                            {col.label}
                          </TableHead>
                        ))}
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="w-20">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row, i) => (
                        <TableRow 
                          key={i} 
                          className={row.errors.length > 0 || row.isDuplicate ? "bg-destructive/5" : ""}
                        >
                          <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                          {columns.slice(0, 6).map(col => (
                            <TableCell key={col.dbColumn} className="text-xs">
                              {editingRowIndex === i ? (
                                <Input
                                  value={editValues[col.dbColumn] ?? ''}
                                  onChange={(e) => setEditValues(prev => ({
                                    ...prev,
                                    [col.dbColumn]: e.target.value
                                  }))}
                                  className="h-7 text-xs min-w-[80px]"
                                />
                              ) : (
                                <span className={row.isDuplicate && (col.isCodeColumn || col.dbColumn === codeColumn) ? "text-destructive font-medium" : ""}>
                                  {row.data[col.dbColumn] !== null && row.data[col.dbColumn] !== undefined 
                                    ? String(row.data[col.dbColumn]).substring(0, 20) 
                                    : '-'}
                                </span>
                              )}
                            </TableCell>
                          ))}
                          <TableCell>
                            {row.errors.length > 0 || row.isDuplicate ? (
                              <Badge variant="destructive" className="text-xs whitespace-nowrap">
                                {row.errors[0]?.substring(0, 25) || 'Duplicado'}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-success border-success/30">
                                OK
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {editingRowIndex === i ? (
                                <>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={saveEditing}>
                                    <Check className="h-3 w-3 text-success" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEditing}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6" 
                                    onClick={() => startEditing(i)}
                                    disabled={editingRowIndex !== null}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-destructive" 
                                    onClick={() => removeRow(i)}
                                    disabled={editingRowIndex !== null}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
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
              disabled={validRowsCount === 0 || isLoading || editingRowIndex !== null}
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
                  Importar {validRowsCount} registros
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

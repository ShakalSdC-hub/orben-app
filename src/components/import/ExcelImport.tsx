import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet, Download, AlertTriangle, CheckCircle2, Loader2, Trash2, Pencil, X, Check, Database, Link } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface LookupConfig {
  table: string;                    // Nome da tabela para busca
  matchColumn: string;              // Coluna para fazer match (ex: "razao_social", "nome")
  returnColumn?: string;            // Coluna a retornar (default: "id")
  alternativeColumns?: string[];    // Colunas alternativas para match (ex: ["nome_fantasia", "codigo"])
  createIfNotExists?: boolean;      // Se deve criar registro se não existir (futuro)
}

export interface ColumnMapping {
  dbColumn: string;
  excelColumn: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'boolean' | 'lookup';
  transform?: (value: any) => any;
  isCodeColumn?: boolean;
  lookup?: LookupConfig;  // Configuração de lookup para tipo 'lookup'
}

interface ExcelImportProps {
  title: string;
  description: string;
  columns: ColumnMapping[];
  onImport: (data: any[]) => Promise<void>;
  templateFilename: string;
  sampleData?: Record<string, any>[];
  tableName?: string;
  codeColumn?: string;
  existingDataQuery?: () => Promise<any[]>;
}

interface PreviewRow {
  data: Record<string, any>;
  errors: string[];
  warnings: string[];
  lookupResolved: Record<string, { found: boolean; value: string; id: string | null }>;
  isDuplicate: boolean;
  isEditing: boolean;
}

// Cache para lookups
interface LookupCache {
  [key: string]: Map<string, string | null>;
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
  const [lookupCache, setLookupCache] = useState<LookupCache>({});
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

  // Buscar e cachear lookups
  const fetchLookupData = useCallback(async (lookup: LookupConfig): Promise<Map<string, string>> => {
    const cacheKey = `${lookup.table}_${lookup.matchColumn}`;
    
    if (lookupCache[cacheKey]) {
      return lookupCache[cacheKey] as Map<string, string>;
    }

    try {
      const selectColumns = [lookup.returnColumn || 'id', lookup.matchColumn, ...(lookup.alternativeColumns || [])].join(',');
      const { data, error } = await supabase
        .from(lookup.table as any)
        .select(selectColumns);
      
      if (error) throw error;

      const map = new Map<string, string>();
      data?.forEach((row: any) => {
        const id = row[lookup.returnColumn || 'id'];
        // Match pela coluna principal
        const mainValue = String(row[lookup.matchColumn] || '').toLowerCase().trim();
        if (mainValue) map.set(mainValue, id);
        
        // Match por colunas alternativas
        lookup.alternativeColumns?.forEach(col => {
          const altValue = String(row[col] || '').toLowerCase().trim();
          if (altValue && !map.has(altValue)) map.set(altValue, id);
        });
      });

      setLookupCache(prev => ({ ...prev, [cacheKey]: map }));
      return map;
    } catch (error) {
      console.error(`Erro ao buscar lookup ${lookup.table}:`, error);
      return new Map();
    }
  }, [lookupCache]);

  // Resolver lookup para um valor
  const resolveLookup = async (value: string, lookup: LookupConfig): Promise<{ found: boolean; id: string | null }> => {
    if (!value) return { found: false, id: null };
    
    const lookupMap = await fetchLookupData(lookup);
    const searchValue = String(value).toLowerCase().trim();
    const id = lookupMap.get(searchValue);
    
    return { found: !!id, id: id || null };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsValidating(true);
    setLookupCache({}); // Limpar cache

    // Buscar códigos existentes
    const codes = await fetchExistingCodes();
    setExistingCodes(codes);

    // Pré-carregar todos os lookups necessários
    const lookupColumns = columns.filter(c => c.type === 'lookup' && c.lookup);
    for (const col of lookupColumns) {
      if (col.lookup) await fetchLookupData(col.lookup);
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { raw: false });

        const rows: PreviewRow[] = [];
        const importedCodes = new Set<string>();

        for (let index = 0; index < jsonData.length; index++) {
          const row: any = jsonData[index];
          const mappedRow: Record<string, any> = {};
          const rowErrors: string[] = [];
          const rowWarnings: string[] = [];
          const lookupResolved: Record<string, { found: boolean; value: string; id: string | null }> = {};
          let isDuplicate = false;

          for (const col of columns) {
            const value = row[col.excelColumn];
            
            // Verificar campos obrigatórios
            if (col.required && (value === undefined || value === null || value === '')) {
              rowErrors.push(`"${col.label}" é obrigatório`);
              continue;
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
              } else if (col.type === 'lookup' && col.lookup) {
                // Resolver lookup
                const lookupResult = await resolveLookup(String(value), col.lookup);
                lookupResolved[col.dbColumn] = { 
                  found: lookupResult.found, 
                  value: String(value), 
                  id: lookupResult.id 
                };
                
                if (lookupResult.found) {
                  transformedValue = lookupResult.id;
                } else {
                  if (col.required) {
                    rowErrors.push(`"${col.label}": "${value}" não encontrado`);
                  } else {
                    rowWarnings.push(`"${col.label}": "${value}" não encontrado`);
                  }
                  transformedValue = null;
                }
              }

              if (col.transform && col.type !== 'lookup') {
                transformedValue = col.transform(transformedValue);
              }
            }

            mappedRow[col.dbColumn] = transformedValue ?? null;

            // Verificar duplicados para a coluna de código
            if (col.isCodeColumn || col.dbColumn === codeColumn) {
              const codeValue = String(transformedValue || '').toLowerCase();
              if (codeValue) {
                if (codes.has(codeValue)) {
                  rowErrors.push(`Código "${transformedValue}" já existe`);
                  isDuplicate = true;
                }
                if (importedCodes.has(codeValue)) {
                  rowErrors.push(`Código duplicado na planilha`);
                  isDuplicate = true;
                }
                importedCodes.add(codeValue);
              }
            }
          }

          rows.push({
            data: mappedRow,
            errors: rowErrors,
            warnings: rowWarnings,
            lookupResolved,
            isDuplicate,
            isEditing: false,
          });
        }

        setPreviewRows(rows);

        const validRows = rows.filter(r => r.errors.length === 0 && !r.isDuplicate);
        const errorRows = rows.filter(r => r.errors.length > 0 || r.isDuplicate);
        const warningRows = rows.filter(r => r.warnings.length > 0);
        
        if (rows.length > 0) {
          let description = '';
          if (errorRows.length > 0) description += `${errorRows.length} com erros`;
          if (warningRows.length > 0) description += `${description ? ', ' : ''}${warningRows.length} com avisos`;
          
          toast({ 
            title: `${validRows.length} de ${rows.length} registros válidos`,
            description: description || undefined,
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
    setLookupCache({});
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

    const rowErrors: string[] = [];
    const rowWarnings: string[] = [];
    const lookupResolved: Record<string, { found: boolean; value: string; id: string | null }> = {};
    let isDuplicate = false;
    const codes = await fetchExistingCodes();

    for (const col of columns) {
      const value = editValues[col.dbColumn];
      
      if (col.required && (value === undefined || value === null || value === '')) {
        rowErrors.push(`"${col.label}" é obrigatório`);
      }

      // Re-resolver lookups se necessário
      if (col.type === 'lookup' && col.lookup && value) {
        const lookupResult = await resolveLookup(String(value), col.lookup);
        if (!lookupResult.found) {
          if (col.required) {
            rowErrors.push(`"${col.label}": não encontrado`);
          }
        } else {
          editValues[col.dbColumn] = lookupResult.id;
        }
      }

      // Verificar duplicados
      if ((col.isCodeColumn || col.dbColumn === codeColumn) && value) {
        const codeValue = String(value).toLowerCase();
        if (codes.has(codeValue)) {
          rowErrors.push(`Código já existe no sistema`);
          isDuplicate = true;
        }
        const duplicateInFile = previewRows.some((r, i) => 
          i !== editingRowIndex && 
          String(r.data[codeColumn] || '').toLowerCase() === codeValue
        );
        if (duplicateInFile) {
          rowErrors.push(`Código duplicado na planilha`);
          isDuplicate = true;
        }
      }
    }

    setPreviewRows(prev => prev.map((row, i) => 
      i === editingRowIndex 
        ? { data: editValues, errors: rowErrors, warnings: rowWarnings, lookupResolved, isDuplicate, isEditing: false }
        : row
    ));
    
    setEditingRowIndex(null);
    setEditValues({});
  };

  const downloadTemplate = () => {
    const headers = columns.map(c => c.excelColumn);
    const templateData = sampleData || [
      columns.reduce((acc, col) => {
        if (col.type === 'lookup') {
          acc[col.excelColumn] = 'Nome do registro';
        } else {
          acc[col.excelColumn] = col.type === 'number' ? '0' : 
            col.type === 'date' ? '01/01/2025' : 'Exemplo';
        }
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

      const excelData = data.map((row: any) => {
        const excelRow: Record<string, any> = {};
        columns.forEach(col => {
          let value = row[col.dbColumn];
          if (col.type === 'date' && value) {
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
  const warningRowsCount = previewRows.filter(r => r.warnings.length > 0 && r.errors.length === 0).length;

  // Identificar colunas de lookup para mostrar ícones
  const lookupColumns = columns.filter(c => c.type === 'lookup');

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
                Template
              </Button>
              {existingDataQuery && (
                <Button variant="outline" size="sm" onClick={downloadExistingData} disabled={isLoading}>
                  <Database className="mr-2 h-4 w-4" />
                  Exportar
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
                  className="text-xs flex items-center gap-1"
                >
                  {col.type === 'lookup' && <Link className="h-3 w-3" />}
                  {col.excelColumn}{col.required && '*'}
                </Badge>
              ))}
            </div>

            {/* Legenda de lookups */}
            {lookupColumns.length > 0 && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Link className="h-3 w-3" />
                <span>= Campo buscado automaticamente pelo nome</span>
              </div>
            )}

            {/* Loading */}
            {isValidating && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Validando dados e resolvendo relacionamentos...</span>
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
                    {warningRowsCount > 0 && (
                      <span className="flex items-center gap-1 text-sm text-warning">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">{warningRowsCount} com avisos</span>
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
                            {col.type === 'lookup' && <Link className="h-3 w-3 inline mr-1" />}
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
                          className={
                            row.errors.length > 0 || row.isDuplicate 
                              ? "bg-destructive/5" 
                              : row.warnings.length > 0 
                                ? "bg-warning/5" 
                                : ""
                          }
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
                                <span className={
                                  (row.isDuplicate && (col.isCodeColumn || col.dbColumn === codeColumn)) 
                                    ? "text-destructive font-medium" 
                                    : row.lookupResolved[col.dbColumn]?.found === false 
                                      ? "text-warning" 
                                      : ""
                                }>
                                  {col.type === 'lookup' && row.lookupResolved[col.dbColumn] ? (
                                    <>
                                      {row.lookupResolved[col.dbColumn].value}
                                      {row.lookupResolved[col.dbColumn].found ? (
                                        <CheckCircle2 className="h-3 w-3 inline ml-1 text-success" />
                                      ) : (
                                        <AlertTriangle className="h-3 w-3 inline ml-1 text-warning" />
                                      )}
                                    </>
                                  ) : (
                                    row.data[col.dbColumn] !== null && row.data[col.dbColumn] !== undefined 
                                      ? String(row.data[col.dbColumn]).substring(0, 20) 
                                      : '-'
                                  )}
                                </span>
                              )}
                            </TableCell>
                          ))}
                          <TableCell>
                            {row.errors.length > 0 || row.isDuplicate ? (
                              <Badge variant="destructive" className="text-xs whitespace-nowrap">
                                {row.errors[0]?.substring(0, 20) || 'Duplicado'}
                              </Badge>
                            ) : row.warnings.length > 0 ? (
                              <Badge variant="outline" className="text-xs text-warning border-warning/30">
                                Aviso
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

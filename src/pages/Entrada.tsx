import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  Download,
  Upload,
  MoreHorizontal,
  Eye,
  Edit,
  Printer,
  Loader2,
  ChevronDown,
  ChevronRight,
  Trash2,
  FileSpreadsheet,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { EntradaForm } from "@/components/entrada/EntradaForm";
import { EntradaEditForm } from "@/components/entrada/EntradaEditForm";
import { EntradaRomaneioPrint } from "@/components/romaneio/EntradaRomaneioPrint";
import { GlobalFilters } from "@/components/filters/GlobalFilters";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useExportReport } from "@/hooks/useExportReport";
import { ExcelImport } from "@/components/import/ExcelImport";

const statusConfig: Record<string, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-warning/10 text-warning border-warning/20" },
  conferido: { label: "Conferido", className: "bg-primary/10 text-primary border-primary/20" },
  processando: { label: "Processando", className: "bg-copper/10 text-copper border-copper/20" },
  finalizado: { label: "Finalizado", className: "bg-success/10 text-success border-success/20" },
};

export default function Entrada() {
  const queryClient = useQueryClient();
  const { role, user } = useAuth();
  const isAdmin = role === "admin";
  const canEdit = role === "admin" || role === "operacao";
  
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [romaneioEntrada, setRomaneioEntrada] = useState<any | null>(null);
  const [selectedParceiro, setSelectedParceiro] = useState<string | null>(null);
  const [selectedDono, setSelectedDono] = useState<string | null>(null);
  const [deleteEntrada, setDeleteEntrada] = useState<any | null>(null);
  const [editEntrada, setEditEntrada] = useState<any | null>(null);
  
  const { exportToExcel, formatEntradaReport, printReport } = useExportReport();

  // Fetch entradas with sublotes
  const { data: entradas, isLoading } = useQuery({
    queryKey: ["entradas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entradas")
        .select(`
          *,
          parceiro:parceiros!entradas_parceiro_id_fkey(razao_social, nome_fantasia),
          dono:donos_material(nome),
          tipo_entrada:tipos_entrada(nome),
          tipo_produto:tipos_produto(nome),
          transportadora:parceiros!entradas_transportadora_id_fkey(razao_social)
        `)
        .order("data_entrada", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch sublotes
  const { data: sublotes } = useQuery({
    queryKey: ["sublotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sublotes")
        .select("*")
        .order("numero_volume");
      if (error) throw error;
      return data;
    },
  });

  // Fetch beneficiamento_itens_entrada para verificar sublotes processados
  const { data: beneficiamentoItens } = useQuery({
    queryKey: ["beneficiamento_itens_entrada"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamento_itens_entrada")
        .select("sublote_id");
      if (error) throw error;
      return data;
    },
  });

  // Fetch saida_itens para verificar sublotes vendidos
  const { data: saidaItens } = useQuery({
    queryKey: ["saida_itens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saida_itens")
        .select("sublote_id");
      if (error) throw error;
      return data;
    },
  });

  // Verifica se uma entrada foi processada (sublotes usados em beneficiamento ou saída)
  const isEntradaProcessada = (entradaId: string): boolean => {
    const sublotesEntrada = sublotes?.filter(s => s.entrada_id === entradaId) || [];
    const subloteIds = new Set(sublotesEntrada.map(s => s.id));
    
    const usadoEmBeneficiamento = beneficiamentoItens?.some(bi => subloteIds.has(bi.sublote_id)) || false;
    const usadoEmSaida = saidaItens?.some(si => subloteIds.has(si.sublote_id)) || false;
    
    return usadoEmBeneficiamento || usadoEmSaida;
  };

  const formatWeight = (kg: number) => {
    if (kg >= 1000) return `${(kg / 1000).toFixed(2)}t`;
    return `${kg.toLocaleString("pt-BR")}kg`;
  };

  const filteredEntradas = entradas?.filter(
    (e) => {
      const matchesSearch = 
        e.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.parceiro?.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.parceiro?.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.dono?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.nota_fiscal?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesParceiro = !selectedParceiro || e.parceiro_id === selectedParceiro;
      const matchesDono = !selectedDono || 
        (selectedDono === "ibrac" ? !e.dono_id : e.dono_id === selectedDono);
      
      return matchesSearch && matchesParceiro && matchesDono;
    }
  );

  const toggleRow = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedRows(newSet);
  };

  const getSublotesForEntrada = (entradaId: string) => {
    return sublotes?.filter((s) => s.entrada_id === entradaId && s.numero_volume > 0) || [];
  };

  // Mutation para deletar entrada
  const deleteMutation = useMutation({
    mutationFn: async (entradaId: string) => {
      // Primeiro deletar sublotes relacionados
      const { error: sublotesError } = await supabase
        .from("sublotes")
        .delete()
        .eq("entrada_id", entradaId);
      if (sublotesError) throw sublotesError;

      // Depois deletar a entrada
      const { error } = await supabase
        .from("entradas")
        .delete()
        .eq("id", entradaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entradas"] });
      queryClient.invalidateQueries({ queryKey: ["sublotes"] });
      toast({ title: "Entrada excluída com sucesso!" });
      setDeleteEntrada(null);
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Entrada de Material</h1>
            <p className="text-muted-foreground">Gerenciamento de recebimento de material com tickets/lotes</p>
          </div>
          <div className="flex gap-2">
            <ExcelImport
              title="Importar Entradas"
              description="Importe entradas de material via planilha Excel. Códigos duplicados serão bloqueados."
              templateFilename="template_entradas"
              tableName="entradas"
              codeColumn="codigo"
              columns={[
                { dbColumn: "codigo", excelColumn: "Código", label: "Código", required: true, type: "string", isCodeColumn: true },
                { dbColumn: "data_entrada", excelColumn: "Data Entrada", label: "Data", required: true, type: "date" },
                { dbColumn: "tipo_material", excelColumn: "Tipo Material", label: "Tipo Material", required: true, type: "string" },
                { dbColumn: "peso_bruto_kg", excelColumn: "Peso Bruto (kg)", label: "Peso Bruto", required: true, type: "number" },
                { dbColumn: "peso_liquido_kg", excelColumn: "Peso Líquido (kg)", label: "Peso Líquido", required: true, type: "number" },
                { dbColumn: "peso_nf_kg", excelColumn: "Peso NF (kg)", label: "Peso NF", required: false, type: "number" },
                { dbColumn: "nota_fiscal", excelColumn: "Nota Fiscal", label: "Nota Fiscal", required: false, type: "string" },
                { dbColumn: "teor_cobre", excelColumn: "Teor Cobre (%)", label: "Teor Cobre", required: false, type: "number" },
                { dbColumn: "valor_unitario", excelColumn: "Valor Unitário (R$)", label: "Valor Unitário", required: false, type: "number" },
                { dbColumn: "valor_total", excelColumn: "Valor Total (R$)", label: "Valor Total", required: false, type: "number" },
                { dbColumn: "taxa_financeira_pct", excelColumn: "Taxa Financeira (%)", label: "Taxa Financeira", required: false, type: "number" },
                { dbColumn: "motorista", excelColumn: "Motorista", label: "Motorista", required: false, type: "string" },
                { dbColumn: "placa_veiculo", excelColumn: "Placa Veículo", label: "Placa", required: false, type: "string" },
                { dbColumn: "observacoes", excelColumn: "Observações", label: "Observações", required: false, type: "string" },
              ]}
              sampleData={[
                { "Código": "ENT-001", "Data Entrada": "01/01/2025", "Tipo Material": "Cobre", "Peso Bruto (kg)": "1050", "Peso Líquido (kg)": "1000", "Peso NF (kg)": "1000", "Nota Fiscal": "12345", "Teor Cobre (%)": "98.5", "Valor Unitário (R$)": "45.00", "Valor Total (R$)": "45000", "Taxa Financeira (%)": "1.8", "Motorista": "João", "Placa Veículo": "ABC-1234", "Observações": "" },
              ]}
              existingDataQuery={async () => {
                const { data } = await supabase.from("entradas").select("*").order("data_entrada", { ascending: false });
                return data || [];
              }}
              onImport={async (data) => {
                for (const row of data) {
                  const { error } = await supabase.from("entradas").insert({
                    ...row,
                    status: "pendente",
                    created_by: user?.id,
                  });
                  if (error) throw error;
                }
                queryClient.invalidateQueries({ queryKey: ["entradas"] });
              }}
            />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-copper hover:opacity-90 shadow-copper">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Entrada
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nova Entrada de Material</DialogTitle>
                  <DialogDescription>Registre a entrada com tickets/volumes</DialogDescription>
                </DialogHeader>
                <EntradaForm onClose={() => setDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, fornecedor, NF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <GlobalFilters
            selectedParceiro={selectedParceiro}
            selectedDono={selectedDono}
            onParceiroChange={setSelectedParceiro}
            onDonoChange={setSelectedDono}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => {
                if (filteredEntradas) {
                  exportToExcel(formatEntradaReport(filteredEntradas), { filename: "entradas", sheetName: "Entradas" });
                }
              }}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (filteredEntradas) {
                  const data = formatEntradaReport(filteredEntradas);
                  printReport("Relatório de Entradas", data, Object.keys(data[0] || {}));
                }
              }}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir/PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card shadow-elevated overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="font-semibold">Código (Lote)</TableHead>
                  <TableHead className="font-semibold">Parceiro</TableHead>
                  <TableHead className="font-semibold">Data</TableHead>
                  <TableHead className="font-semibold">NF</TableHead>
                  <TableHead className="font-semibold text-right">Peso Físico</TableHead>
                  <TableHead className="font-semibold text-right">Peso NF</TableHead>
                  <TableHead className="font-semibold text-right">Diferença</TableHead>
                  <TableHead className="font-semibold">Volumes</TableHead>
                  <TableHead className="font-semibold">Dono</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntradas?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                      Nenhuma entrada encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntradas?.map((entrada) => {
                    const volumesEntrada = getSublotesForEntrada(entrada.id);
                    const isExpanded = expandedRows.has(entrada.id);
                    const status = statusConfig[entrada.status || "pendente"] || statusConfig.pendente;
                    
                    // Calcular diferença entre peso NF e peso físico
                    const pesoNf = entrada.peso_nf_kg || 0;
                    const pesoFisico = entrada.peso_liquido_kg || 0;
                    const diferenca = pesoNf > 0 ? pesoNf - pesoFisico : 0;
                    const diferencaPct = pesoNf > 0 ? ((diferenca / pesoNf) * 100) : 0;

                    return (
                      <Collapsible key={entrada.id} open={isExpanded} onOpenChange={() => toggleRow(entrada.id)} asChild>
                        <>
                          <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell>
                              {volumesEntrada.length > 0 && (
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                              )}
                            </TableCell>
                            <TableCell className="font-mono font-medium text-primary">
                              {entrada.codigo}
                            </TableCell>
                            <TableCell>
                              {entrada.parceiro?.razao_social || entrada.parceiro?.nome_fantasia || "-"}
                            </TableCell>
                            <TableCell>
                              {format(new Date(entrada.data_entrada), "dd/MM/yyyy")}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {entrada.nota_fiscal || "-"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatWeight(pesoFisico)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {pesoNf > 0 ? formatWeight(pesoNf) : "-"}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${diferenca > 0 ? 'text-warning' : diferenca < 0 ? 'text-destructive' : 'text-success'}`}>
                              {pesoNf > 0 ? (
                                <span title={`${diferencaPct.toFixed(2)}%`}>
                                  {diferenca > 0 ? '+' : ''}{diferenca.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}kg
                                </span>
                              ) : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {volumesEntrada.length} vol.
                              </Badge>
                            </TableCell>
                            <TableCell>{entrada.dono?.nome || "-"}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge className={cn("border", status.className)}>
                                  {status.label}
                                </Badge>
                                {isEntradaProcessada(entrada.id) && (
                                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                                    Processado
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setEditEntrada({ ...entrada, readOnly: true })}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Visualizar
                                  </DropdownMenuItem>
                                  {canEdit && !isEntradaProcessada(entrada.id) && (
                                    <DropdownMenuItem onClick={() => setEditEntrada(entrada)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Editar
                                    </DropdownMenuItem>
                                  )}
                                  {canEdit && isEntradaProcessada(entrada.id) && (
                                    <DropdownMenuItem disabled className="text-muted-foreground">
                                      <Edit className="mr-2 h-4 w-4" />
                                      Editar (Processado)
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => setRomaneioEntrada({
                                    ...entrada,
                                    parceiros: entrada.parceiro ? { razao_social: entrada.parceiro.razao_social || entrada.parceiro.nome_fantasia } : null,
                                    donos_material: entrada.dono,
                                    tipos_produto: entrada.tipo_produto,
                                    sublotes: volumesEntrada,
                                  })}>
                                    <Printer className="mr-2 h-4 w-4" />
                                    Imprimir Romaneio
                                  </DropdownMenuItem>
                                  {isAdmin && !isEntradaProcessada(entrada.id) && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={() => setDeleteEntrada(entrada)}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Excluir
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {isAdmin && isEntradaProcessada(entrada.id) && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem disabled className="text-muted-foreground">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Excluir (Processado)
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                          {volumesEntrada.length > 0 && (
                            <CollapsibleContent asChild>
                              <TableRow className="bg-muted/20 hover:bg-muted/30">
                                <TableCell colSpan={12} className="p-0">
                                  <div className="px-12 py-3">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="border-none">
                                          <TableHead className="text-xs font-medium text-muted-foreground">Volume/Ticket</TableHead>
                                          <TableHead className="text-xs font-medium text-muted-foreground text-right">Peso Recebido</TableHead>
                                          <TableHead className="text-xs font-medium text-muted-foreground text-right">Saldo Atual</TableHead>
                                          <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {volumesEntrada.map((sublote) => {
                                          // Peso recebido original é o peso_liquido_kg da entrada dividido pelos volumes
                                          // ou podemos usar o peso_kg se foi mantido
                                          const pesoRecebido = sublote.peso_kg; // Usaremos o peso registrado
                                          const saldoAtual = sublote.peso_kg;
                                          const isConsumido = sublote.status === 'processado' || sublote.status === 'vendido';
                                          
                                          return (
                                            <TableRow key={sublote.id} className="border-none">
                                              <TableCell className="font-mono text-sm text-primary py-1">
                                                {sublote.codigo}
                                              </TableCell>
                                              <TableCell className="text-right font-medium py-1">
                                                {formatWeight(pesoRecebido)}
                                              </TableCell>
                                              <TableCell className="text-right py-1">
                                                {isConsumido ? (
                                                  <span className="text-muted-foreground">
                                                    0 kg <span className="text-xs text-success">(consumido)</span>
                                                  </span>
                                                ) : (
                                                  <span className="font-medium">{formatWeight(saldoAtual)}</span>
                                                )}
                                              </TableCell>
                                              <TableCell className="py-1">
                                                <Badge variant="outline" className="text-xs">
                                                  {sublote.status}
                                                </Badge>
                                              </TableCell>
                                            </TableRow>
                                          );
                                        })}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </TableCell>
                              </TableRow>
                            </CollapsibleContent>
                          )}
                        </>
                      </Collapsible>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Romaneio Print Dialog */}
        {romaneioEntrada && (
          <EntradaRomaneioPrint
            entrada={romaneioEntrada}
            isOpen={!!romaneioEntrada}
            onClose={() => setRomaneioEntrada(null)}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteEntrada} onOpenChange={() => setDeleteEntrada(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a entrada <strong>{deleteEntrada?.codigo}</strong>?
                <br />
                Esta ação não pode ser desfeita e irá excluir todos os sublotes associados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(deleteEntrada?.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog para edição/visualização */}
        {editEntrada && (
          <Dialog open={!!editEntrada} onOpenChange={() => setEditEntrada(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editEntrada.readOnly ? "Visualizar" : "Editar"} Entrada {editEntrada.codigo}
                </DialogTitle>
                <DialogDescription>
                  {editEntrada.readOnly ? "Detalhes da entrada" : "Alterar dados da entrada"}
                </DialogDescription>
              </DialogHeader>
              <EntradaEditForm 
                entrada={editEntrada} 
                onClose={() => setEditEntrada(null)} 
                readOnly={editEntrada.readOnly || isEntradaProcessada(editEntrada.id)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </MainLayout>
  );
}

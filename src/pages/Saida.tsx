import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, FileOutput, Search, Truck, DollarSign, Loader2, Trash2, Printer, MoreHorizontal, Eye, Edit, FileSpreadsheet, FileText } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RomaneioPrint } from "@/components/romaneio/RomaneioPrint";
import { GlobalFilters } from "@/components/filters/GlobalFilters";
import { SaidaEditForm } from "@/components/saida/SaidaEditForm";
import { useExportReport } from "@/hooks/useExportReport";
import { CenarioPreview } from "@/components/cenarios/CenarioPreview";
import { ExcelImport } from "@/components/import/ExcelImport";
import { 
  CenarioOperacao,
  detectarCenario, 
  calcularSaida, 
  CENARIOS_CONFIG,
  formatCenarioLabel,
  getCenarioBadgeVariant
} from "@/lib/cenarios-orben";

import { formatWeight, formatCurrency } from "@/lib/kpis";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendente: { label: "Pendente", variant: "outline" },
  processando: { label: "Processando", variant: "default" },
  finalizada: { label: "Finalizada", variant: "secondary" },
  cancelada: { label: "Cancelada", variant: "destructive" },
};

interface SubloteSelecionado {
  id: string;
  codigo: string;
  peso_kg: number;
  custo_unitario_total: number;
  dono_id?: string | null;
  tipo_produto?: { nome: string } | null;
  dono?: { nome: string; is_ibrac?: boolean; taxa_operacao_pct?: number } | null;
  entrada?: { 
    codigo: string; 
    valor_unitario: number | null;
    tipo_entrada: { id: string; nome: string; gera_custo: boolean } | null 
  } | null;
}

export default function Saida() {
  const queryClient = useQueryClient();
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const canEdit = role === "admin" || role === "operacao";
  
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchLotes, setSearchLotes] = useState("");
  const [filtroGeraCusto, setFiltroGeraCusto] = useState<"todos" | "sim" | "nao">("todos");
  const [activeTab, setActiveTab] = useState("lotes");
  const [selectedLotes, setSelectedLotes] = useState<SubloteSelecionado[]>([]);
  const [romaneioSaida, setRomaneioSaida] = useState<any | null>(null);
  const [selectedDono, setSelectedDono] = useState<string | null>(null);
  const [deleteSaida, setDeleteSaida] = useState<any | null>(null);
  const [editSaida, setEditSaida] = useState<any | null>(null);
  const { exportToExcel, formatSaidaReport, printReport } = useExportReport();

  const [formData, setFormData] = useState({
    tipo_saida_id: "",
    cliente_id: "",
    valor_unitario: 0,
    nota_fiscal: "",
    observacoes: "",
    // Custos a cobrar
    perda_cobrada_pct: 0,
    custos_adicionais: 0,
    // Transporte
    transportadora_id: "",
    motorista: "",
    placa_veiculo: "",
  });

  // Queries
  const { data: saidas = [], isLoading } = useQuery({
    queryKey: ["saidas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saidas")
        .select(`
          *,
          tipos_saida!fk_saidas_tipo_saida(nome, cobra_custos),
          cliente:clientes!fk_saidas_cliente(razao_social, nome_fantasia)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: sublotesDisponiveis = [] } = useQuery({
    queryKey: ["sublotes_disponiveis_saida"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sublotes")
        .select(`
          *,
          tipo_produto:tipos_produto!fk_sublotes_tipo_produto(nome),
          dono:donos_material!fk_sublotes_dono(id, nome, is_ibrac, taxa_operacao_pct),
          entrada:entradas!fk_sublotes_entrada(codigo, valor_unitario, tipo_entrada:tipos_entrada!fk_entradas_tipo_entrada(id, nome, gera_custo))
        `)
        .eq("status", "disponivel")
        .gt("peso_kg", 0)
        .order("codigo");
      if (error) throw error;
      return data;
    },
  });

  const { data: tiposSaida = [] } = useQuery({
    queryKey: ["tipos_saida"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tipos_saida").select("*").eq("ativo", true).order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: parceiros = [] } = useQuery({
    queryKey: ["parceiros"],
    queryFn: async () => {
      const { data, error } = await supabase.from("parceiros").select("*").eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  const clientes = parceiros.filter((p) => p.is_cliente);
  const transportadoras = parceiros.filter((p) => p.is_transportadora);

  // ============================================================
  // DETECÇÃO AUTOMÁTICA DE CENÁRIO
  // ============================================================
  
  const cenarioDetectado = useMemo<CenarioOperacao | null>(() => {
    if (selectedLotes.length === 0) return null;
    
    const primeiroLote = selectedLotes[0];
    const geraCusto = primeiroLote.entrada?.tipo_entrada?.gera_custo ?? true;
    const isIbrac = primeiroLote.dono?.is_ibrac ?? false;
    const donoId = primeiroLote.dono_id;
    
    return detectarCenario({ geraCusto, donoId, isIbrac });
  }, [selectedLotes]);

  // Taxa de operação do dono (para cenário 3)
  const taxaOperacaoDono = useMemo(() => {
    if (selectedLotes.length === 0) return 0;
    return selectedLotes[0]?.dono?.taxa_operacao_pct ?? 0;
  }, [selectedLotes]);

  // Nome do dono do material
  const donoNome = useMemo(() => {
    if (selectedLotes.length === 0) return null;
    return selectedLotes[0]?.dono?.nome || 'IBRAC';
  }, [selectedLotes]);

  // Cálculos base
  const pesoTotal = selectedLotes.reduce((acc, l) => acc + l.peso_kg, 0);
  
  // Calcular custos de beneficiamento: 
  // - Para entradas que NÃO geram custo (Remessa Industrialização): cobrar apenas a diferença de custo (beneficiamento adicionado)
  // - Para entradas que geram custo (Compra, Consignação): usar custo total
  const custoMOBeneficiamento = selectedLotes.reduce((acc, l) => {
    const geraCusto = l.entrada?.tipo_entrada?.gera_custo ?? true;
    const custoUnitarioAtual = l.custo_unitario_total || 0;
    
    if (!geraCusto) {
      // Para Remessa Industrialização: cobrar apenas o custo de beneficiamento (custo atual - custo original da entrada)
      // O custo original seria 0 pois não gera custo
      return acc + custoUnitarioAtual * l.peso_kg;
    } else {
      // Para Compra/Consignação: usar custo total acumulado
      return acc + custoUnitarioAtual * l.peso_kg;
    }
  }, 0);
  
  const valorBruto = pesoTotal * formData.valor_unitario;
  const perdaPeso = pesoTotal * (formData.perda_cobrada_pct / 100);
  const custoPerda = perdaPeso * formData.valor_unitario;

  const tipoSelecionado = tiposSaida.find((t: any) => t.id === formData.tipo_saida_id);
  
  // Para tipos que cobram custos (Retorno Industrialização, etc): usar custo de MO/Beneficiamento
  const custosAutomaticos = tipoSelecionado?.cobra_custos ? custoMOBeneficiamento : 0;
  const custosTotaisCobrados = custoPerda + formData.custos_adicionais + custosAutomaticos;

  // ============================================================
  // CÁLCULOS POR CENÁRIO USANDO A BIBLIOTECA
  // ============================================================
  
  const calculosSaida = useMemo(() => {
    if (!cenarioDetectado) return null;
    
    return calcularSaida({
      cenario: cenarioDetectado,
      pesoTotal,
      valorUnitario: formData.valor_unitario,
      custoMOBeneficiamento,
      custoPerda,
      custosAdicionais: formData.custos_adicionais,
      taxaOperacaoPct: taxaOperacaoDono,
    });
  }, [cenarioDetectado, pesoTotal, formData.valor_unitario, custoMOBeneficiamento, custoPerda, formData.custos_adicionais, taxaOperacaoDono]);

  // Valores calculados baseados no cenário
  const valorFinal = calculosSaida?.valorRepasseDono ?? (valorBruto - custosTotaisCobrados);
  const comissaoIbrac = calculosSaida?.comissaoIbrac ?? 0;
  const resultadoLiquidoDono = calculosSaida?.resultadoLiquidoDono ?? 0;
  const lucroIbrac = calculosSaida?.lucroIbrac ?? 0;

  // Custo médio por kg dos lotes selecionados
  const custoMedioKg = useMemo(() => {
    if (pesoTotal === 0) return 0;
    return custoMOBeneficiamento / pesoTotal;
  }, [custoMOBeneficiamento, pesoTotal]);

  // Mapeamento de tipo de entrada para tipo de saída sugerido
  const tipoEntradaToSaidaMap: Record<string, string> = {
    'Remessa Industrialização': 'Retorno Industrialização',
    'Compra': 'Venda',
    'Consignação': 'Retirada pelo Dono',
    'Transferência': 'Venda',
  };

  // Detectar tipo de entrada predominante dos lotes selecionados
  const tipoEntradaPredominante = selectedLotes.length > 0
    ? selectedLotes[0]?.entrada?.tipo_entrada?.nome || null
    : null;

  // Sugerir tipo de saída baseado no tipo de entrada
  const sugerirTipoSaida = () => {
    if (!tipoEntradaPredominante) return;
    const nomeSaidaSugerida = tipoEntradaToSaidaMap[tipoEntradaPredominante];
    if (nomeSaidaSugerida) {
      const tipoSaidaSugerido = tiposSaida.find((t: any) => t.nome === nomeSaidaSugerida);
      if (tipoSaidaSugerido && formData.tipo_saida_id !== tipoSaidaSugerido.id) {
        setFormData(prev => ({ ...prev, tipo_saida_id: tipoSaidaSugerido.id }));
      }
    }
  };

  // Filtro de sublotes
  const sublotesFiltrados = sublotesDisponiveis.filter((s) => {
    // Filtro de texto
    const matchTexto = s.codigo.toLowerCase().includes(searchLotes.toLowerCase()) ||
      s.tipo_produto?.nome?.toLowerCase().includes(searchLotes.toLowerCase()) ||
      s.dono?.nome?.toLowerCase().includes(searchLotes.toLowerCase());
    
    // Filtro de gera custo
    const geraCusto = s.entrada?.tipo_entrada?.gera_custo ?? true;
    const matchGeraCusto = filtroGeraCusto === "todos" || 
      (filtroGeraCusto === "sim" && geraCusto) || 
      (filtroGeraCusto === "nao" && !geraCusto);
    
    return matchTexto && matchGeraCusto;
  });

  const toggleLote = (sublote: SubloteSelecionado) => {
    const isSelected = selectedLotes.some((l) => l.id === sublote.id);
    if (isSelected) {
      setSelectedLotes(selectedLotes.filter((l) => l.id !== sublote.id));
    } else {
      setSelectedLotes([...selectedLotes, sublote]);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (selectedLotes.length === 0) throw new Error("Selecione ao menos um lote");

      const codigo = `SAI-${format(new Date(), "yyyyMMdd")}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;

      // Obter dono_id do primeiro lote para acertos financeiros
      const primeiroLote = selectedLotes[0];
      const donoId = primeiroLote.dono_id || null;

      // Criar saída com novos campos de cenário
      const { data: saida, error: saidaError } = await supabase
        .from("saidas")
        .insert({
          codigo,
          tipo_saida: tipoSelecionado?.nome || "Venda",
          tipo_saida_id: formData.tipo_saida_id || null,
          cliente_id: formData.cliente_id || null,
          peso_total_kg: pesoTotal,
          valor_unitario: formData.valor_unitario,
          valor_total: valorBruto,
          valor_repasse_dono: valorFinal,
          custos_cobrados: custosTotaisCobrados,
          nota_fiscal: formData.nota_fiscal || null,
          observacoes: formData.observacoes || null,
          transportadora_id: formData.transportadora_id || null,
          motorista: formData.motorista || null,
          placa_veiculo: formData.placa_veiculo || null,
          created_by: user?.id,
          // Novos campos de cenário
          cenario_operacao: cenarioDetectado,
          comissao_ibrac: comissaoIbrac,
          resultado_liquido_dono: resultadoLiquidoDono,
        })
        .select()
        .single();

      if (saidaError) throw saidaError;

      // Inserir itens de saída
      for (const lote of selectedLotes) {
        const { error: itemError } = await supabase.from("saida_itens").insert({
          saida_id: saida.id,
          sublote_id: lote.id,
          peso_kg: lote.peso_kg,
        });
        if (itemError) throw itemError;

        // Atualizar status do sublote
        const { error: updateError } = await supabase
          .from("sublotes")
          .update({ status: "vendido" })
          .eq("id", lote.id);
        if (updateError) throw updateError;
      }

      // ============================================================
      // CRIAR ACERTOS FINANCEIROS BASEADOS NO CENÁRIO
      // ============================================================
      
      if (cenarioDetectado === 'operacao_terceiro' && donoId) {
        // Cenário 3: Criar acerto para comissão IBRAC e repasse ao dono
        
        // Acerto: Receita IBRAC (comissão)
        if (comissaoIbrac > 0) {
          await supabase.from("acertos_financeiros").insert({
            tipo: 'receita',
            valor: comissaoIbrac,
            dono_id: null, // Receita da IBRAC, não de um dono específico
            referencia_tipo: 'saida',
            referencia_id: saida.id,
            data_acerto: new Date().toISOString().split('T')[0],
            observacoes: `Comissão IBRAC (${taxaOperacaoDono}%) - ${codigo}`,
            status: 'confirmado',
            created_by: user?.id,
          });
        }

        // Acerto: Repasse pendente ao dono
        if (resultadoLiquidoDono > 0) {
          await supabase.from("acertos_financeiros").insert({
            tipo: 'divida', // IBRAC deve ao dono
            valor: resultadoLiquidoDono,
            dono_id: donoId,
            referencia_tipo: 'saida',
            referencia_id: saida.id,
            data_acerto: new Date().toISOString().split('T')[0],
            observacoes: `Repasse resultado operação - ${codigo}`,
            status: 'pendente',
            created_by: user?.id,
          });
        }
      } else if (cenarioDetectado === 'industrializacao') {
        // Cenário 2: Receita IBRAC = custos cobrados do cliente
        if (custosTotaisCobrados > 0) {
          await supabase.from("acertos_financeiros").insert({
            tipo: 'receita',
            valor: custosTotaisCobrados,
            dono_id: null,
            referencia_tipo: 'saida',
            referencia_id: saida.id,
            data_acerto: new Date().toISOString().split('T')[0],
            observacoes: `Receita industrialização (MO + custos) - ${codigo}`,
            status: 'confirmado',
            created_by: user?.id,
          });
        }
      }
      // Cenário 1 (proprio): Não gera acerto financeiro automático, 
      // pois é consumo interno sem transação com terceiros

      return saida;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saidas"] });
      queryClient.invalidateQueries({ queryKey: ["sublotes_disponiveis_saida"] });
      queryClient.invalidateQueries({ queryKey: ["acertos_financeiros"] });
      handleClose();
      toast({ 
        title: "Saída registrada!", 
        description: `${selectedLotes.length} lote(s) - Cenário: ${cenarioDetectado ? formatCenarioLabel(cenarioDetectado) : 'N/A'}` 
      });
    },
    onError: (error) => toast({ title: "Erro ao registrar saída", description: error.message, variant: "destructive" }),
  });

  const handleClose = () => {
    setIsOpen(false);
    setSelectedLotes([]);
    setActiveTab("lotes");
    setFormData({
      tipo_saida_id: "",
      cliente_id: "",
      valor_unitario: 0,
      nota_fiscal: "",
      observacoes: "",
      perda_cobrada_pct: 0,
      custos_adicionais: 0,
      transportadora_id: "",
      motorista: "",
      placa_veiculo: "",
    });
  };

  // Mutation para deletar saída
  const deleteMutation = useMutation({
    mutationFn: async (saidaId: string) => {
      // Buscar itens de saída para restaurar status dos sublotes
      const { data: itensSaida } = await supabase
        .from("saida_itens")
        .select("sublote_id")
        .eq("saida_id", saidaId);

      // Restaurar status dos sublotes
      if (itensSaida) {
        for (const item of itensSaida) {
          if (item.sublote_id) {
            await supabase
              .from("sublotes")
              .update({ status: "disponivel" })
              .eq("id", item.sublote_id);
          }
        }
      }

      // Deletar itens de saída
      await supabase
        .from("saida_itens")
        .delete()
        .eq("saida_id", saidaId);

      // Deletar saída
      const { error } = await supabase
        .from("saidas")
        .delete()
        .eq("id", saidaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saidas"] });
      queryClient.invalidateQueries({ queryKey: ["sublotes_disponiveis_saida"] });
      toast({ title: "Saída excluída com sucesso!" });
      setDeleteSaida(null);
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  const filteredSaidas = saidas.filter((s: any) =>
    s.codigo?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Saída</h1>
            <p className="text-muted-foreground">Registre as saídas de material do estoque</p>
          </div>
          <div className="flex gap-2">
            <ExcelImport
              title="Importar Saídas"
              description="Importe saídas de material via planilha Excel. Códigos duplicados serão bloqueados. Cliente é buscado pelo nome."
              templateFilename="template_saidas"
              tableName="saidas"
              codeColumn="codigo"
              columns={[
                { dbColumn: "codigo", excelColumn: "Código", label: "Código", required: true, type: "string", isCodeColumn: true },
                { dbColumn: "data_saida", excelColumn: "Data Saída", label: "Data", required: true, type: "date" },
                { dbColumn: "tipo_saida", excelColumn: "Tipo Saída", label: "Tipo", required: true, type: "string" },
                { dbColumn: "peso_total_kg", excelColumn: "Peso Total (kg)", label: "Peso Total", required: true, type: "number" },
                { dbColumn: "cliente_id", excelColumn: "Cliente", label: "Cliente", required: false, type: "lookup", lookup: { table: "clientes", matchColumn: "razao_social", alternativeColumns: ["nome_fantasia"], canCreate: true, createData: (value) => ({ razao_social: value, ativo: true }) } },
                { dbColumn: "valor_unitario", excelColumn: "Valor Unitário (R$)", label: "Valor Unitário", required: false, type: "number" },
                { dbColumn: "valor_total", excelColumn: "Valor Total (R$)", label: "Valor Total", required: false, type: "number" },
                { dbColumn: "custos_cobrados", excelColumn: "Custos Cobrados (R$)", label: "Custos Cobrados", required: false, type: "number" },
                { dbColumn: "valor_repasse_dono", excelColumn: "Repasse Dono (R$)", label: "Repasse Dono", required: false, type: "number" },
                { dbColumn: "comissao_ibrac", excelColumn: "Comissão IBRAC (R$)", label: "Comissão IBRAC", required: false, type: "number" },
                { dbColumn: "resultado_liquido_dono", excelColumn: "Resultado Líquido (R$)", label: "Resultado Líquido", required: false, type: "number" },
                { dbColumn: "nota_fiscal", excelColumn: "Nota Fiscal", label: "Nota Fiscal", required: false, type: "string" },
                { dbColumn: "cenario_operacao", excelColumn: "Cenário", label: "Cenário", required: false, type: "string" },
                { dbColumn: "motorista", excelColumn: "Motorista", label: "Motorista", required: false, type: "string" },
                { dbColumn: "placa_veiculo", excelColumn: "Placa Veículo", label: "Placa", required: false, type: "string" },
                { dbColumn: "observacoes", excelColumn: "Observações", label: "Observações", required: false, type: "string" },
              ]}
              sampleData={[
                { "Código": "SAI-001", "Data Saída": "01/01/2025", "Tipo Saída": "Venda", "Peso Total (kg)": "1000", "Cliente": "Nome do Cliente", "Valor Unitário (R$)": "50", "Valor Total (R$)": "50000", "Custos Cobrados (R$)": "1000", "Repasse Dono (R$)": "49000", "Comissão IBRAC (R$)": "0", "Resultado Líquido (R$)": "49000", "Nota Fiscal": "12345", "Cenário": "proprio", "Motorista": "João", "Placa Veículo": "ABC-1234", "Observações": "" },
              ]}
              existingDataQuery={async () => {
                const { data } = await supabase.from("saidas").select("*").order("data_saida", { ascending: false });
                return data || [];
              }}
              onImport={async (data) => {
                for (const row of data) {
                  const { error } = await supabase.from("saidas").insert({
                    ...row,
                    status: "pendente",
                    created_by: user?.id,
                  });
                  if (error) throw error;
                }
                queryClient.invalidateQueries({ queryKey: ["saidas"] });
              }}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline"><FileText className="h-4 w-4 mr-2" />Exportar</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportToExcel(formatSaidaReport(saidas), { filename: "relatorio_saidas", sheetName: "Saídas" })}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => printReport("Relatório de Saídas", formatSaidaReport(saidas), ["Código", "Data", "Tipo", "Cliente", "Nota Fiscal", "Peso Total (kg)", "Valor Unitário", "Valor Total", "Custos Cobrados", "Repasse Dono", "Status"])}>
                  <Printer className="mr-2 h-4 w-4" />Imprimir PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Dialog open={isOpen} onOpenChange={(v) => v ? setIsOpen(true) : handleClose()}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-copper"><Plus className="h-4 w-4 mr-2" />Nova Saída</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Saída</DialogTitle>
              </DialogHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="lotes">1. Lotes</TabsTrigger>
                  <TabsTrigger value="cliente">2. Cliente</TabsTrigger>
                  <TabsTrigger value="custos">3. Valores</TabsTrigger>
                  <TabsTrigger value="transporte">4. Transporte</TabsTrigger>
                </TabsList>

                {/* Tab 1: Seleção de Lotes */}
                <TabsContent value="lotes" className="space-y-4 pt-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar lotes por código, produto ou dono..."
                        value={searchLotes}
                        onChange={(e) => setSearchLotes(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={filtroGeraCusto} onValueChange={(v) => setFiltroGeraCusto(v as "todos" | "sim" | "nao")}>
                      <SelectTrigger className="w-full sm:w-44">
                        <SelectValue placeholder="Tipo custo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os lotes</SelectItem>
                        <SelectItem value="sim">Geram custo (Compra)</SelectItem>
                        <SelectItem value="nao">Não geram (Industrial.)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-lg border max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-10"></TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Tipo Entrada</TableHead>
                          <TableHead>Gera Custo</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead>Dono</TableHead>
                          <TableHead className="text-right">Peso</TableHead>
                          <TableHead className="text-right">Custo/kg</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sublotesFiltrados.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                              Nenhum lote disponível
                            </TableCell>
                          </TableRow>
                        ) : (
                          sublotesFiltrados.map((sublote) => {
                            const isSelected = selectedLotes.some((l) => l.id === sublote.id);
                            return (
                              <TableRow
                                key={sublote.id}
                                className={`cursor-pointer ${isSelected ? "bg-primary/10" : "hover:bg-muted/30"}`}
                                onClick={() => toggleLote(sublote)}
                              >
                                <TableCell>
                                  <Checkbox checked={isSelected} />
                                </TableCell>
                                <TableCell className="font-mono text-primary">{sublote.codigo}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {sublote.entrada?.tipo_entrada?.nome || "N/A"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {sublote.entrada?.tipo_entrada?.gera_custo === false ? (
                                    <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">Não</Badge>
                                  ) : (
                                    <Badge variant="default" className="text-xs">Sim</Badge>
                                  )}
                                </TableCell>
                                <TableCell>{sublote.tipo_produto?.nome || "-"}</TableCell>
                                <TableCell>{sublote.dono?.nome || "-"}</TableCell>
                                <TableCell className="text-right font-medium">{formatWeight(sublote.peso_kg)}</TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {formatCurrency(sublote.custo_unitario_total || 0)}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {selectedLotes.length > 0 && (
                    <div className="space-y-4">
                      {/* Card resumo dos lotes */}
                      <Card className="bg-muted/30">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{selectedLotes.length} lote(s) selecionado(s)</p>
                                {cenarioDetectado && (
                                  <Badge variant={getCenarioBadgeVariant(cenarioDetectado)}>
                                    {formatCenarioLabel(cenarioDetectado)}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-2xl font-bold text-primary">{formatWeight(pesoTotal)}</p>
                              <p className="text-sm text-muted-foreground">
                                Dono: {donoNome} | Custo MO/Benef: {formatCurrency(custoMOBeneficiamento)}
                              </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setSelectedLotes([])}>
                              <Trash2 className="h-4 w-4 mr-2" />Limpar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Preview do cenário */}
                      {cenarioDetectado && (
                        <CenarioPreview 
                          cenario={cenarioDetectado} 
                          donoNome={donoNome || undefined}
                          pesoTotal={pesoTotal}
                          custoMedio={custoMedioKg}
                        />
                      )}
                    </div>
                  )}

                  <Button className="w-full" onClick={() => { sugerirTipoSaida(); setActiveTab("cliente"); }} disabled={selectedLotes.length === 0}>
                    Próximo: Cliente
                  </Button>
                </TabsContent>

                {/* Tab 2: Cliente */}
                <TabsContent value="cliente" className="space-y-4 pt-4">
                  {tipoEntradaPredominante && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        <strong>Tipo de entrada detectado:</strong> {tipoEntradaPredominante}
                        {tipoEntradaToSaidaMap[tipoEntradaPredominante] && (
                          <span> → Sugestão: <strong>{tipoEntradaToSaidaMap[tipoEntradaPredominante]}</strong></span>
                        )}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Tipo de Saída</Label>
                    <Select value={formData.tipo_saida_id} onValueChange={(v) => setFormData({ ...formData, tipo_saida_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {tiposSaida.map((t: any) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.nome} {t.cobra_custos && "(Cobra Custos)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Cliente / Destinatário</Label>
                    <Select value={formData.cliente_id} onValueChange={(v) => setFormData({ ...formData, cliente_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {clientes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Nota Fiscal</Label>
                    <Input value={formData.nota_fiscal} onChange={(e) => setFormData({ ...formData, nota_fiscal: e.target.value })} placeholder="Número da NF" />
                  </div>

                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} placeholder="Observações adicionais..." />
                  </div>

                  <Button className="w-full" onClick={() => setActiveTab("custos")}>
                    Próximo: Valores
                  </Button>
                </TabsContent>

                {/* Tab 3: Valores/Custos */}
                <TabsContent value="custos" className="space-y-4 pt-4">
                  {/* Banner do cenário detectado */}
                  {cenarioDetectado && (
                    <div className={`p-3 rounded-lg border ${
                      cenarioDetectado === 'proprio' ? 'bg-primary/5 border-primary/30' :
                      cenarioDetectado === 'industrializacao' ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' :
                      'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                    }`}>
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Badge variant={getCenarioBadgeVariant(cenarioDetectado)}>
                          {formatCenarioLabel(cenarioDetectado)}
                        </Badge>
                        <span className="text-muted-foreground">
                          {CENARIOS_CONFIG[cenarioDetectado].descricao}
                        </span>
                      </p>
                    </div>
                  )}

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" />Valores</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Valor Unitário (R$/kg)</Label>
                        <Input type="number" step="0.01" value={formData.valor_unitario} onChange={(e) => setFormData({ ...formData, valor_unitario: parseFloat(e.target.value) || 0 })} />
                      </div>

                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Valor Bruto: <span className="text-primary">{formatCurrency(valorBruto)}</span></p>
                      </div>

                      {tipoSelecionado?.cobra_custos && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Perda Cobrada (%)</Label>
                              <Input type="number" step="0.01" value={formData.perda_cobrada_pct} onChange={(e) => setFormData({ ...formData, perda_cobrada_pct: parseFloat(e.target.value) || 0 })} />
                            </div>
                            <div className="space-y-2">
                              <Label>Custos Adicionais (R$)</Label>
                              <Input type="number" step="0.01" value={formData.custos_adicionais} onChange={(e) => setFormData({ ...formData, custos_adicionais: parseFloat(e.target.value) || 0 })} />
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Resumo de cálculo por cenário */}
                  <Card className="border-primary">
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex justify-between">
                        <span>Receita Bruta:</span>
                        <span className="font-medium">{formatCurrency(valorBruto)}</span>
                      </div>
                      
                      {tipoSelecionado?.cobra_custos && (
                        <>
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>(−) Perda ({formData.perda_cobrada_pct}%):</span>
                            <span>{formatCurrency(custoPerda)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>(−) Custos Adicionais:</span>
                            <span>{formatCurrency(formData.custos_adicionais)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-medium text-amber-600">
                            <span>(−) Custo MO/Beneficiamento:</span>
                            <span>{formatCurrency(custosAutomaticos)}</span>
                          </div>
                          <div className="flex justify-between text-sm border-t pt-1 mt-1">
                            <span className="font-medium">Total Custos:</span>
                            <span className="font-medium">{formatCurrency(custosTotaisCobrados)}</span>
                          </div>
                        </>
                      )}

                      {/* Comissão IBRAC para cenário 3 */}
                      {cenarioDetectado === 'operacao_terceiro' && comissaoIbrac > 0 && (
                        <div className="flex justify-between text-sm font-medium text-amber-600 border-t pt-1 mt-1">
                          <span>(−) Comissão IBRAC ({taxaOperacaoDono}%):</span>
                          <span>{formatCurrency(comissaoIbrac)}</span>
                        </div>
                      )}

                      <div className="h-px bg-border my-2" />

                      {/* Resultado final baseado no cenário */}
                      {cenarioDetectado === 'proprio' && (
                        <div className="flex justify-between font-bold text-lg">
                          <span>Custo Final IBRAC:</span>
                          <span className="text-primary">{formatCurrency(custoMOBeneficiamento)}</span>
                        </div>
                      )}

                      {cenarioDetectado === 'industrializacao' && (
                        <>
                          <div className="flex justify-between font-bold text-lg">
                            <span>Receita IBRAC (Serviço):</span>
                            <span className="text-success">{formatCurrency(custosTotaisCobrados)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Material retorna ao cliente. IBRAC reconhece receita pelo serviço.</p>
                        </>
                      )}

                      {cenarioDetectado === 'operacao_terceiro' && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span>Lucro IBRAC (Comissão):</span>
                            <span className="text-success font-medium">{formatCurrency(comissaoIbrac)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-lg">
                            <span>Repasse ao Dono ({donoNome}):</span>
                            <span className="text-primary">{formatCurrency(resultadoLiquidoDono)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Acerto financeiro será criado automaticamente.</p>
                        </>
                      )}

                      {!cenarioDetectado && (
                        <div className="flex justify-between font-bold text-lg">
                          <span>Valor Repasse Dono:</span>
                          <span className="text-primary">{formatCurrency(valorFinal)}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Button className="w-full" onClick={() => setActiveTab("transporte")}>
                    Próximo: Transporte
                  </Button>
                </TabsContent>

                {/* Tab 4: Transporte */}
                <TabsContent value="transporte" className="space-y-4 pt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" />Transporte</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Transportadora</Label>
                        <Select value={formData.transportadora_id} onValueChange={(v) => setFormData({ ...formData, transportadora_id: v })}>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {transportadoras.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.razao_social}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Motorista</Label>
                          <Input value={formData.motorista} onChange={(e) => setFormData({ ...formData, motorista: e.target.value })} placeholder="Nome do motorista" />
                        </div>
                        <div className="space-y-2">
                          <Label>Placa do Veículo</Label>
                          <Input value={formData.placa_veiculo} onChange={(e) => setFormData({ ...formData, placa_veiculo: e.target.value.toUpperCase() })} placeholder="ABC-1234" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Resumo */}
                  <Card className="bg-muted/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        Resumo da Saída
                        {cenarioDetectado && (
                          <Badge variant={getCenarioBadgeVariant(cenarioDetectado)} className="ml-auto">
                            {formatCenarioLabel(cenarioDetectado)}
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Lotes:</span>
                        <span className="font-bold">{selectedLotes.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Dono:</span>
                        <span className="font-bold">{donoNome}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Peso Total:</span>
                        <span className="font-bold">{formatWeight(pesoTotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Valor Bruto:</span>
                        <span className="font-bold">{formatCurrency(valorBruto)}</span>
                      </div>
                      {cenarioDetectado === 'operacao_terceiro' && (
                        <>
                          <div className="flex justify-between text-amber-600">
                            <span>Comissão IBRAC:</span>
                            <span className="font-medium">{formatCurrency(comissaoIbrac)}</span>
                          </div>
                          <div className="flex justify-between text-success">
                            <span>Repasse ao Dono:</span>
                            <span className="font-bold">{formatCurrency(resultadoLiquidoDono)}</span>
                          </div>
                        </>
                      )}
                      {cenarioDetectado === 'industrializacao' && (
                        <div className="flex justify-between text-success">
                          <span>Receita IBRAC:</span>
                          <span className="font-bold">{formatCurrency(custosTotaisCobrados)}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || selectedLotes.length === 0}
                  className="bg-gradient-copper hover:opacity-90"
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Registrar Saída
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por código..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <GlobalFilters
            showParceiro={false}
            selectedParceiro={null}
            selectedDono={selectedDono}
            onParceiroChange={() => {}}
            onDonoChange={setSelectedDono}
          />
        </div>

        {/* Lista de Saídas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileOutput className="h-5 w-5" />Saídas</CardTitle>
            <CardDescription>Lista de todas as saídas registradas</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cliente/Parceiro</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Peso</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Custos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center">Carregando...</TableCell></TableRow>
                ) : filteredSaidas.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Nenhuma saída encontrada</TableCell></TableRow>
                ) : (
                  filteredSaidas.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono font-medium">{s.codigo}</TableCell>
                      <TableCell>
                        <Badge variant={s.tipos_saida?.cobra_custos ? "default" : "secondary"}>
                          {s.tipos_saida?.nome || s.tipo_saida}
                        </Badge>
                      </TableCell>
                      <TableCell>{s.cliente?.razao_social || s.cliente?.nome_fantasia || "-"}</TableCell>
                      <TableCell>{format(new Date(s.data_saida), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                      <TableCell className="text-right">{formatWeight(s.peso_total_kg)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(s.valor_total || 0)}</TableCell>
                      <TableCell className="text-right">
                        {s.custos_cobrados > 0 ? (
                          <span className="text-warning">{formatCurrency(s.custos_cobrados)}</span>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[s.status]?.variant || "secondary"}>
                          {statusConfig[s.status]?.label || s.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditSaida(s)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizar
                            </DropdownMenuItem>
                            {canEdit && (
                              <DropdownMenuItem onClick={() => setEditSaida(s)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setRomaneioSaida(s)}>
                              <Printer className="mr-2 h-4 w-4" />
                              Imprimir Romaneio
                            </DropdownMenuItem>
                            {isAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => setDeleteSaida(s)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editSaida} onOpenChange={() => setEditSaida(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Saída - {editSaida?.codigo}</DialogTitle>
            </DialogHeader>
            {editSaida && <SaidaEditForm saida={editSaida} onClose={() => setEditSaida(null)} />}
          </DialogContent>
        </Dialog>

        {/* Romaneio Print Dialog */}
        {romaneioSaida && (
          <RomaneioPrint
            saida={romaneioSaida}
            isOpen={!!romaneioSaida}
            onClose={() => setRomaneioSaida(null)}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteSaida} onOpenChange={() => setDeleteSaida(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a saída <strong>{deleteSaida?.codigo}</strong>?
                <br />
                Esta ação não pode ser desfeita. Os sublotes serão restaurados para disponíveis.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(deleteSaida?.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}

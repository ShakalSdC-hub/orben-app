import { useState } from "react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { Plus, Cog, DollarSign, Scale, AlertTriangle, Truck, Package, Loader2, Search, Trash2, Printer, ChevronRight, ChevronDown, Info, MoreHorizontal, Eye, Edit, CheckCircle2, FileSpreadsheet, FileText } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BeneficiamentoRomaneioPrint } from "@/components/romaneio/BeneficiamentoRomaneioPrint";
import { GlobalFilters } from "@/components/filters/GlobalFilters";
import { BeneficiamentoEditForm } from "@/components/beneficiamento/BeneficiamentoEditForm";
import { useExportReport } from "@/hooks/useExportReport";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  em_andamento: { label: "Em Andamento", variant: "default" },
  finalizado: { label: "Finalizado", variant: "secondary" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

function formatWeight(kg: number) {
  return kg >= 1000 ? `${(kg / 1000).toFixed(2)} t` : `${kg.toFixed(2)} kg`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

interface SublotesSelecionados {
  id: string;
  codigo: string;
  peso_kg: number;
  tipo_produto?: { nome: string } | null;
  dono?: { nome: string } | null;
}

export default function Beneficiamento() {
  const queryClient = useQueryClient();
  const { user, profile, role } = useAuth();
  const isAdmin = role === "admin";
  const canEdit = role === "admin" || role === "operacao";
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("lotes");
  const [searchLotes, setSearchLotes] = useState("");
  const [selectedLotes, setSelectedLotes] = useState<SublotesSelecionados[]>([]);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [romaneioBeneficiamento, setRomaneioBeneficiamento] = useState<any | null>(null);
  const [searchBeneficiamento, setSearchBeneficiamento] = useState("");
  const [selectedDono, setSelectedDono] = useState<string | null>(null);
  const [deleteBeneficiamento, setDeleteBeneficiamento] = useState<any | null>(null);
  const [finalizeBeneficiamento, setFinalizeBeneficiamento] = useState<any | null>(null);
  const [editBeneficiamento, setEditBeneficiamento] = useState<any | null>(null);
  const [finalizeData, setFinalizeData] = useState({ peso_saida_real: 0, local_destino_id: "", tipo_produto_saida_id: "" });
  const { exportToExcel, formatBeneficiamentoReport, printReport } = useExportReport();

  const [formData, setFormData] = useState({
    processo_id: "",
    tipo_beneficiamento: "interno",
    fornecedor_terceiro_id: "",
    tipo_produto_saida_id: "",
    // Custos em R$/kg
    custo_frete_ida_kg: 0,
    custo_frete_volta_kg: 0,
    custo_mo_terceiro_kg: 0,
    custo_mo_ibrac_kg: 0,
    // Taxa financeira em %
    taxa_financeira_pct: 1.8,
    // Perdas
    perda_real_pct: 3,
    perda_cobrada_pct: 5,
    // Transporte
    transportadora_id: "",
    motorista: "",
    placa_veiculo: "",
  });

  // Queries
  const { data: beneficiamentos = [], isLoading } = useQuery({
    queryKey: ["beneficiamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamentos")
        .select(`
          *,
          processos(nome)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: sublotesDisponiveis = [] } = useQuery({
    queryKey: ["sublotes_disponiveis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sublotes")
        .select(`
          *,
          tipo_produto:tipos_produto(nome),
          dono:donos_material(nome)
        `)
        .eq("status", "disponivel")
        .gt("peso_kg", 0)
        .order("codigo");
      if (error) throw error;
      return data;
    },
  });

  // Função para verificar se um sublote é relacionado (pai/filho) a algum já selecionado
  // Permite múltiplos filhos do mesmo pai, mas não permite pai+filho ao mesmo tempo
  const isRelatedToSelected = (sublote: any): { isRelated: boolean; relatedCode: string | null } => {
    for (const selected of selectedLotes) {
      // Verifica se o sublote selecionado é pai do atual (não permite selecionar filho se pai está selecionado)
      if (sublote.lote_pai_id === selected.id) {
        return { isRelated: true, relatedCode: selected.codigo };
      }
      // Verifica se o sublote atual é pai do selecionado (não permite selecionar pai se filho está selecionado)
      const selectedFull = sublotesDisponiveis.find((s: any) => s.id === selected.id);
      if (selectedFull?.lote_pai_id === sublote.id) {
        return { isRelated: true, relatedCode: selected.codigo };
      }
    }
    // Permite múltiplos filhos do mesmo pai (irmãos)
    return { isRelated: false, relatedCode: null };
  };

  const { data: processos = [] } = useQuery({
    queryKey: ["processos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("processos").select("*").eq("ativo", true).order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: tiposProduto = [] } = useQuery({
    queryKey: ["tipos_produto"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tipos_produto").select("*").eq("ativo", true).order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: locaisEstoque = [] } = useQuery({
    queryKey: ["locais_estoque"],
    queryFn: async () => {
      const { data, error } = await supabase.from("locais_estoque").select("*").eq("ativo", true).order("nome");
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

  const fornecedores = parceiros.filter((p) => p.is_fornecedor);
  const transportadoras = parceiros.filter((p) => p.is_transportadora);

  // Cálculos
  const pesoTotalEntrada = selectedLotes.reduce((acc, l) => acc + l.peso_kg, 0);
  const custoTotalKg = formData.custo_frete_ida_kg + formData.custo_frete_volta_kg + formData.custo_mo_terceiro_kg + formData.custo_mo_ibrac_kg;
  const custoTotal = custoTotalKg * pesoTotalEntrada;
  const custoFinanceiro = custoTotal * (formData.taxa_financeira_pct / 100);
  const pesoSaidaEstimado = pesoTotalEntrada * (1 - formData.perda_real_pct / 100);
  const lucroPerda = formData.perda_cobrada_pct - formData.perda_real_pct;

  // Identificar sublotes pais (que têm filhos)
  const parentIds = new Set(
    sublotesDisponiveis.filter((s: any) => s.lote_pai_id).map((s: any) => s.lote_pai_id)
  );

  // Agrupar sublotes: mostrar apenas filhos (ou pais sem filhos), com opção de expandir
  const sublotesAgrupados = sublotesDisponiveis.filter((s: any) => {
    const matchSearch = 
      s.codigo.toLowerCase().includes(searchLotes.toLowerCase()) ||
      s.tipo_produto?.nome?.toLowerCase().includes(searchLotes.toLowerCase()) ||
      s.dono?.nome?.toLowerCase().includes(searchLotes.toLowerCase());
    
    if (!matchSearch) return false;

    // Se é um pai e está selecionado, ocultar seus filhos
    const parentSelected = selectedLotes.some(sel => sel.id === s.lote_pai_id);
    if (parentSelected) return false;

    // Se é um pai com filhos, só mostrar se expandido
    if (parentIds.has(s.id)) {
      return expandedParents.has(s.id);
    }

    return true;
  });

  // Sublotes pais para exibir como grupos colapsáveis
  const sublotesPais = sublotesDisponiveis.filter((s: any) => {
    const matchSearch = 
      s.codigo.toLowerCase().includes(searchLotes.toLowerCase()) ||
      s.tipo_produto?.nome?.toLowerCase().includes(searchLotes.toLowerCase()) ||
      s.dono?.nome?.toLowerCase().includes(searchLotes.toLowerCase());
    return matchSearch && parentIds.has(s.id);
  });

  // Filhos de um pai específico
  const getChildrenOf = (parentId: string) => 
    sublotesDisponiveis.filter((s: any) => s.lote_pai_id === parentId);

  const toggleExpand = (parentId: string) => {
    const newExpanded = new Set(expandedParents);
    if (newExpanded.has(parentId)) {
      newExpanded.delete(parentId);
    } else {
      newExpanded.add(parentId);
    }
    setExpandedParents(newExpanded);
  };

  const toggleLote = (sublote: any) => {
    const isSelected = selectedLotes.some((l) => l.id === sublote.id);
    if (isSelected) {
      setSelectedLotes(selectedLotes.filter((l) => l.id !== sublote.id));
    } else {
      // Verifica se já existe um sublote relacionado (pai/filho) selecionado
      const { isRelated, relatedCode } = isRelatedToSelected(sublote);
      if (isRelated) {
        toast({
          title: "Sublote relacionado já selecionado",
          description: `O lote "${sublote.codigo}" é parte do mesmo material que "${relatedCode}". Não é possível selecionar ambos.`,
          variant: "destructive",
        });
        return;
      }
      setSelectedLotes([...selectedLotes, sublote]);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (selectedLotes.length === 0) throw new Error("Selecione ao menos um lote");

      const codigo = `BEN-${format(new Date(), "yyyyMMdd")}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;

      // Criar beneficiamento
      const { data: beneficiamento, error: benError } = await supabase
        .from("beneficiamentos")
        .insert({
          codigo,
          processo_id: formData.processo_id || null,
          tipo_beneficiamento: formData.tipo_beneficiamento,
          fornecedor_terceiro_id: formData.fornecedor_terceiro_id || null,
          custo_frete_ida: formData.custo_frete_ida_kg * pesoTotalEntrada,
          custo_frete_volta: formData.custo_frete_volta_kg * pesoTotalEntrada,
          custo_mo_terceiro: formData.custo_mo_terceiro_kg * pesoTotalEntrada,
          custo_mo_ibrac: formData.custo_mo_ibrac_kg * pesoTotalEntrada,
          taxa_financeira_pct: formData.taxa_financeira_pct,
          perda_real_pct: formData.perda_real_pct,
          perda_cobrada_pct: formData.perda_cobrada_pct,
          peso_entrada_kg: pesoTotalEntrada,
          peso_saida_kg: pesoSaidaEstimado,
          transportadora_id: formData.transportadora_id || null,
          motorista: formData.motorista || null,
          placa_veiculo: formData.placa_veiculo || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (benError) throw benError;

      // Inserir itens de entrada
      for (const lote of selectedLotes) {
        const { error: itemError } = await supabase.from("beneficiamento_itens_entrada").insert({
          beneficiamento_id: beneficiamento.id,
          sublote_id: lote.id,
          peso_kg: lote.peso_kg,
          custo_unitario: custoTotalKg,
        });
        if (itemError) throw itemError;

        // Atualizar status do sublote
        const { error: updateError } = await supabase
          .from("sublotes")
          .update({ status: "em_beneficiamento" })
          .eq("id", lote.id);
        if (updateError) throw updateError;
      }

      return beneficiamento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiamentos"] });
      queryClient.invalidateQueries({ queryKey: ["sublotes_disponiveis"] });
      setIsOpen(false);
      setSelectedLotes([]);
      setFormData({
        processo_id: "",
        tipo_beneficiamento: "interno",
        fornecedor_terceiro_id: "",
        tipo_produto_saida_id: "",
        custo_frete_ida_kg: 0,
        custo_frete_volta_kg: 0,
        custo_mo_terceiro_kg: 0,
        custo_mo_ibrac_kg: 0,
        taxa_financeira_pct: 1.8,
        perda_real_pct: 3,
        perda_cobrada_pct: 5,
        transportadora_id: "",
        motorista: "",
        placa_veiculo: "",
      });
      setActiveTab("lotes");
      toast({ title: "Beneficiamento criado!", description: `${selectedLotes.length} lote(s) enviado(s) para beneficiamento` });
    },
    onError: (error) => toast({ title: "Erro ao criar beneficiamento", description: error.message, variant: "destructive" }),
  });

  const handleClose = () => {
    setIsOpen(false);
    setSelectedLotes([]);
    setActiveTab("lotes");
  };

  // Mutation para deletar beneficiamento
  const deleteMutation = useMutation({
    mutationFn: async (beneficiamentoId: string) => {
      // Buscar itens de entrada para restaurar status dos sublotes
      const { data: itensEntrada } = await supabase
        .from("beneficiamento_itens_entrada")
        .select("sublote_id")
        .eq("beneficiamento_id", beneficiamentoId);

      // Restaurar status dos sublotes
      if (itensEntrada) {
        for (const item of itensEntrada) {
          if (item.sublote_id) {
            await supabase
              .from("sublotes")
              .update({ status: "disponivel" })
              .eq("id", item.sublote_id);
          }
        }
      }

      // Deletar itens de entrada
      await supabase
        .from("beneficiamento_itens_entrada")
        .delete()
        .eq("beneficiamento_id", beneficiamentoId);

      // Deletar itens de saída
      await supabase
        .from("beneficiamento_itens_saida")
        .delete()
        .eq("beneficiamento_id", beneficiamentoId);

      // Deletar beneficiamento
      const { error } = await supabase
        .from("beneficiamentos")
        .delete()
        .eq("id", beneficiamentoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiamentos"] });
      queryClient.invalidateQueries({ queryKey: ["sublotes_disponiveis"] });
      toast({ title: "Beneficiamento excluído com sucesso!" });
      setDeleteBeneficiamento(null);
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  // Mutation para finalizar beneficiamento
  const finalizeMutation = useMutation({
    mutationFn: async ({ beneficiamentoId, pesoSaida, localDestinoId, tipoProdutoSaidaId }: { 
      beneficiamentoId: string; 
      pesoSaida: number;
      localDestinoId: string;
      tipoProdutoSaidaId: string;
    }) => {
      // Buscar itens de entrada para obter os sublotes e criar saída
      const { data: itensEntrada } = await supabase
        .from("beneficiamento_itens_entrada")
        .select("sublote_id, peso_kg, sublote:sublotes(dono_id, custo_unitario_total)")
        .eq("beneficiamento_id", beneficiamentoId);

      if (!itensEntrada || itensEntrada.length === 0) {
        throw new Error("Nenhum item de entrada encontrado");
      }

      // Calcular custos do beneficiamento
      const { data: beneficiamento } = await supabase
        .from("beneficiamentos")
        .select("*")
        .eq("id", beneficiamentoId)
        .single();

      if (!beneficiamento) throw new Error("Beneficiamento não encontrado");

      const pesoEntrada = beneficiamento.peso_entrada_kg || 0;
      const custoTotal = (beneficiamento.custo_frete_ida || 0) + 
                         (beneficiamento.custo_frete_volta || 0) + 
                         (beneficiamento.custo_mo_ibrac || 0) + 
                         (beneficiamento.custo_mo_terceiro || 0);
      const custoAdicionalPorKg = pesoSaida > 0 ? custoTotal / pesoSaida : 0;

      // Criar sublote de saída para cada sublote de entrada (proporcional ao peso)
      for (const item of itensEntrada) {
        if (!item.sublote_id) continue;

        const proporcao = (item.peso_kg || 0) / pesoEntrada;
        const pesoSaidaItem = pesoSaida * proporcao;
        const custoOriginal = (item.sublote as any)?.custo_unitario_total || 0;
        const novoCustoUnitario = custoOriginal + custoAdicionalPorKg;
        const donoId = (item.sublote as any)?.dono_id;

        // Gerar código para novo sublote
        const codigoSaida = `TKT-${format(new Date(), "yyMMdd")}-${String(Math.floor(Math.random() * 999)).padStart(3, "0")}`;

        // Criar sublote de saída (produto transformado)
        const { data: novoSublote, error: subloteError } = await supabase
          .from("sublotes")
          .insert({
            codigo: codigoSaida,
            peso_kg: pesoSaidaItem,
            tipo_produto_id: tipoProdutoSaidaId,
            dono_id: donoId,
            local_estoque_id: localDestinoId,
            lote_pai_id: item.sublote_id,
            custo_unitario_total: novoCustoUnitario,
            status: "disponivel",
          })
          .select()
          .single();

        if (subloteError) throw subloteError;

        // Registrar item de saída do beneficiamento
        await supabase.from("beneficiamento_itens_saida").insert({
          beneficiamento_id: beneficiamentoId,
          sublote_gerado_id: novoSublote.id,
          tipo_produto_id: tipoProdutoSaidaId,
          local_estoque_id: localDestinoId,
          peso_kg: pesoSaidaItem,
          custo_unitario_calculado: novoCustoUnitario,
        });

        // Marcar sublote de entrada como consumido
        await supabase
          .from("sublotes")
          .update({ status: "consumido", peso_kg: 0 })
          .eq("id", item.sublote_id);
      }

      // Atualizar beneficiamento para finalizado
      const { error: updateError } = await supabase
        .from("beneficiamentos")
        .update({ 
          status: "finalizado", 
          data_fim: new Date().toISOString().split("T")[0],
          peso_saida_kg: pesoSaida
        })
        .eq("id", beneficiamentoId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiamentos"] });
      queryClient.invalidateQueries({ queryKey: ["sublotes_disponiveis"] });
      queryClient.invalidateQueries({ queryKey: ["sublotes"] });
      toast({ title: "Beneficiamento finalizado com sucesso!", description: "Material retornado ao estoque." });
      setFinalizeBeneficiamento(null);
      setFinalizeData({ peso_saida_real: 0, local_destino_id: "", tipo_produto_saida_id: "" });
    },
    onError: (error) => {
      toast({ title: "Erro ao finalizar", description: error.message, variant: "destructive" });
    },
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Beneficiamento</h1>
            <p className="text-muted-foreground">Gerencie os processos de beneficiamento de materiais</p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline"><FileText className="h-4 w-4 mr-2" />Exportar</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportToExcel(formatBeneficiamentoReport(beneficiamentos), { filename: "relatorio_beneficiamentos", sheetName: "Beneficiamentos" })}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => printReport("Relatório de Beneficiamentos", formatBeneficiamentoReport(beneficiamentos), ["Código", "Data Início", "Processo", "Tipo", "Peso Entrada (kg)", "Peso Saída (kg)", "Perda Real (%)", "Perda Cobrada (%)", "Custo Frete Ida", "Custo Frete Volta", "Custo MO Terceiro", "Custo MO IBRAC", "Status"])}>
                  <Printer className="mr-2 h-4 w-4" />Imprimir PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={isOpen} onOpenChange={(v) => v ? setIsOpen(true) : handleClose()}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-copper"><Plus className="h-4 w-4 mr-2" />Novo Beneficiamento</Button>
              </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Beneficiamento</DialogTitle>
              </DialogHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="lotes">1. Lotes</TabsTrigger>
                  <TabsTrigger value="config">2. Configuração</TabsTrigger>
                  <TabsTrigger value="custos">3. Custos</TabsTrigger>
                  <TabsTrigger value="transporte">4. Transporte</TabsTrigger>
                </TabsList>

                {/* Tab 1: Seleção de Lotes */}
                <TabsContent value="lotes" className="space-y-4 pt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar lotes por código, produto ou dono..."
                      value={searchLotes}
                      onChange={(e) => setSearchLotes(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="rounded-lg border max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-10"></TableHead>
                          <TableHead className="w-8"></TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead>Dono</TableHead>
                          <TableHead className="text-right">Peso</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sublotesPais.length === 0 && sublotesAgrupados.filter((s: any) => !s.lote_pai_id).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              Nenhum lote disponível
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {/* Sublotes pais com filhos (grupos expansíveis) */}
                            {sublotesPais.map((parent: any) => {
                              const isExpanded = expandedParents.has(parent.id);
                              const isParentSelected = selectedLotes.some((l) => l.id === parent.id);
                              const children = getChildrenOf(parent.id);
                              const childrenCount = children.length;

                              return (
                                <>
                                  {/* Linha do pai */}
                                  <TableRow
                                    key={parent.id}
                                    className={`cursor-pointer ${isParentSelected ? "bg-primary/10" : "hover:bg-muted/30"}`}
                                  >
                                    <TableCell onClick={() => toggleLote(parent)}>
                                      <Checkbox checked={isParentSelected} />
                                    </TableCell>
                                    <TableCell 
                                      className="cursor-pointer" 
                                      onClick={() => toggleExpand(parent.id)}
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                      )}
                                    </TableCell>
                                    <TableCell 
                                      className="font-mono text-primary cursor-pointer"
                                      onClick={() => toggleExpand(parent.id)}
                                    >
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className="inline-flex items-center gap-2">
                                              {parent.codigo}
                                              <Badge variant="secondary" className="text-xs">
                                                {childrenCount} sublote{childrenCount > 1 ? 's' : ''}
                                              </Badge>
                                              <Info className="h-3 w-3 text-muted-foreground" />
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="max-w-xs">
                                            <p className="text-sm">
                                              <strong>Lote mãe com {childrenCount} sublote{childrenCount > 1 ? 's' : ''}.</strong><br />
                                              Clique na seta para expandir e selecionar sublotes individualmente, 
                                              ou selecione o lote mãe para incluir todo o material.
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </TableCell>
                                    <TableCell>{parent.tipo_produto?.nome || "-"}</TableCell>
                                    <TableCell>{parent.dono?.nome || "-"}</TableCell>
                                    <TableCell className="text-right font-medium">{formatWeight(parent.peso_kg)}</TableCell>
                                  </TableRow>
                                  {/* Filhos expandidos com botão de seleção em massa */}
                                  {isExpanded && (
                                    <>
                                      {/* Barra de ações para sublotes */}
                                      <TableRow className="bg-muted/20">
                                        <TableCell colSpan={6}>
                                          <div className="flex items-center justify-between py-1">
                                            <div className="flex items-center gap-4">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={isParentSelected}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const unselectedChildren = children.filter(
                                                    (c: any) => !selectedLotes.some((l) => l.id === c.id)
                                                  );
                                                  setSelectedLotes([...selectedLotes, ...unselectedChildren]);
                                                }}
                                              >
                                                <Plus className="h-3 w-3 mr-1" />
                                                Selecionar todos ({children.length})
                                              </Button>
                                              {children.some((c: any) => selectedLotes.some((l) => l.id === c.id)) && (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    const childIds = new Set(children.map((c: any) => c.id));
                                                    setSelectedLotes(selectedLotes.filter((l) => !childIds.has(l.id)));
                                                  }}
                                                >
                                                  <Trash2 className="h-3 w-3 mr-1" />
                                                  Limpar seleção
                                                </Button>
                                              )}
                                            </div>
                                            {/* Resumo de peso selecionado */}
                                            {(() => {
                                              const selectedChildrenWeight = children
                                                .filter((c: any) => selectedLotes.some((l) => l.id === c.id))
                                                .reduce((acc: number, c: any) => acc + c.peso_kg, 0);
                                              const selectedCount = children.filter((c: any) => 
                                                selectedLotes.some((l) => l.id === c.id)
                                              ).length;
                                              return selectedCount > 0 ? (
                                                <span className="text-sm text-muted-foreground">
                                                  <strong className="text-foreground">{selectedCount}</strong> de {children.length} selecionado{selectedCount > 1 ? 's' : ''} = 
                                                  <strong className="text-primary ml-1">{formatWeight(selectedChildrenWeight)}</strong>
                                                </span>
                                              ) : null;
                                            })()}
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                      {children.map((child: any) => {
                                        const isChildSelected = selectedLotes.some((l) => l.id === child.id);
                                        const isDisabled = isParentSelected;
                                        return (
                                          <TableRow
                                            key={child.id}
                                            className={`${isChildSelected ? "bg-primary/10" : isDisabled ? "opacity-50" : "hover:bg-muted/30"} ${!isDisabled && "cursor-pointer"}`}
                                            onClick={() => !isDisabled && toggleLote(child)}
                                          >
                                            <TableCell>
                                              <Checkbox checked={isChildSelected} disabled={isDisabled} />
                                            </TableCell>
                                            <TableCell></TableCell>
                                            <TableCell className="font-mono text-primary pl-6">
                                              └ {child.codigo}
                                            </TableCell>
                                            <TableCell>{child.tipo_produto?.nome || "-"}</TableCell>
                                            <TableCell>{child.dono?.nome || "-"}</TableCell>
                                            <TableCell className="text-right font-medium">{formatWeight(child.peso_kg)}</TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </>
                                  )}
                                </>
                              );
                            })}
                            {/* Sublotes sem pai (não são filhos de ninguém e não têm filhos) */}
                            {sublotesAgrupados.filter((s: any) => !s.lote_pai_id && !parentIds.has(s.id)).map((sublote: any) => {
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
                                  <TableCell></TableCell>
                                  <TableCell className="font-mono text-primary">{sublote.codigo}</TableCell>
                                  <TableCell>{sublote.tipo_produto?.nome || "-"}</TableCell>
                                  <TableCell>{sublote.dono?.nome || "-"}</TableCell>
                                  <TableCell className="text-right font-medium">{formatWeight(sublote.peso_kg)}</TableCell>
                                </TableRow>
                              );
                            })}
                          </>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {selectedLotes.length > 0 && (
                    <Card className="bg-muted/30">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{selectedLotes.length} lote(s) selecionado(s)</p>
                            <p className="text-2xl font-bold text-primary">{formatWeight(pesoTotalEntrada)}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setSelectedLotes([])}>
                            <Trash2 className="h-4 w-4 mr-2" />Limpar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Button className="w-full" onClick={() => setActiveTab("config")} disabled={selectedLotes.length === 0}>
                    Próximo: Configuração
                  </Button>
                </TabsContent>

                {/* Tab 2: Configuração */}
                <TabsContent value="config" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de Beneficiamento</Label>
                      <Select value={formData.tipo_beneficiamento} onValueChange={(v) => setFormData({ ...formData, tipo_beneficiamento: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="interno">Interno (IBRAC)</SelectItem>
                          <SelectItem value="externo">Externo (Terceiro)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Processo</Label>
                      <Select value={formData.processo_id} onValueChange={(v) => setFormData({ ...formData, processo_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {processos.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.tipo_beneficiamento === "externo" && (
                    <div className="space-y-2">
                      <Label>Fornecedor Terceiro</Label>
                      <Select value={formData.fornecedor_terceiro_id} onValueChange={(v) => setFormData({ ...formData, fornecedor_terceiro_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {fornecedores.map((f) => (
                            <SelectItem key={f.id} value={f.id}>{f.razao_social}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Produto de Saída (Transformação)</Label>
                    <Select value={formData.tipo_produto_saida_id} onValueChange={(v) => setFormData({ ...formData, tipo_produto_saida_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione o produto resultante..." /></SelectTrigger>
                      <SelectContent>
                        {tiposProduto.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">O material de entrada será transformado neste produto</p>
                  </div>

                  {/* Perdas */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Perdas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Perda Real (%)</Label>
                          <Input type="number" step="0.01" value={formData.perda_real_pct} onChange={(e) => setFormData({ ...formData, perda_real_pct: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Perda Cobrada do Cliente (%)</Label>
                          <Input type="number" step="0.01" value={formData.perda_cobrada_pct} onChange={(e) => setFormData({ ...formData, perda_cobrada_pct: parseFloat(e.target.value) || 0 })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">Peso Saída Estimado</p>
                          <p className="font-bold">{formatWeight(pesoSaidaEstimado)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Lucro IBRAC na Perda</p>
                          <p className={`font-bold ${lucroPerda > 0 ? "text-success" : "text-destructive"}`}>{lucroPerda.toFixed(2)}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Button className="w-full" onClick={() => setActiveTab("custos")}>
                    Próximo: Custos
                  </Button>
                </TabsContent>

                {/* Tab 3: Custos */}
                <TabsContent value="custos" className="space-y-4 pt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" />Custos (R$/kg)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Frete Ida (R$/kg)</Label>
                          <Input type="number" step="0.01" value={formData.custo_frete_ida_kg} onChange={(e) => setFormData({ ...formData, custo_frete_ida_kg: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Frete Volta (R$/kg)</Label>
                          <Input type="number" step="0.01" value={formData.custo_frete_volta_kg} onChange={(e) => setFormData({ ...formData, custo_frete_volta_kg: parseFloat(e.target.value) || 0 })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>MO Terceiro (R$/kg)</Label>
                          <Input type="number" step="0.01" value={formData.custo_mo_terceiro_kg} onChange={(e) => setFormData({ ...formData, custo_mo_terceiro_kg: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div className="space-y-2">
                          <Label>MO IBRAC (R$/kg)</Label>
                          <Input type="number" step="0.01" value={formData.custo_mo_ibrac_kg} onChange={(e) => setFormData({ ...formData, custo_mo_ibrac_kg: parseFloat(e.target.value) || 0 })} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Taxa Financeira (%)</Label>
                        <Input type="number" step="0.01" value={formData.taxa_financeira_pct} onChange={(e) => setFormData({ ...formData, taxa_financeira_pct: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/30">
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex justify-between">
                        <span>Custo por kg:</span>
                        <span className="font-bold">{formatCurrency(custoTotalKg)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Custo Total ({formatWeight(pesoTotalEntrada)}):</span>
                        <span className="font-bold text-primary">{formatCurrency(custoTotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>+ Taxa Financeira:</span>
                        <span>{formatCurrency(custoFinanceiro)}</span>
                      </div>
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
                  <Card className="border-primary">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Resumo do Beneficiamento</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Lotes Selecionados:</span>
                        <span className="font-bold">{selectedLotes.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Peso Entrada:</span>
                        <span className="font-bold">{formatWeight(pesoTotalEntrada)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Peso Saída Estimado:</span>
                        <span className="font-bold">{formatWeight(pesoSaidaEstimado)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Custo Total:</span>
                        <span className="font-bold text-primary">{formatCurrency(custoTotal + custoFinanceiro)}</span>
                      </div>
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
                  Criar Beneficiamento
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por código..." 
              value={searchBeneficiamento} 
              onChange={(e) => setSearchBeneficiamento(e.target.value)} 
              className="pl-10" 
            />
          </div>
          <GlobalFilters
            showParceiro={false}
            selectedParceiro={null}
            selectedDono={selectedDono}
            onParceiroChange={() => {}}
            onDonoChange={setSelectedDono}
          />
        </div>

        {/* Lista de Beneficiamentos */}
        <Card>
          <CardHeader>
            <CardTitle>Beneficiamentos</CardTitle>
            <CardDescription>Lista de todos os beneficiamentos cadastrados</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Processo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data Início</TableHead>
                  <TableHead className="text-right">Peso Entrada</TableHead>
                  <TableHead className="text-right">Peso Saída</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center">Carregando...</TableCell></TableRow>
                ) : beneficiamentos.filter((b: any) => 
                  b.codigo?.toLowerCase().includes(searchBeneficiamento.toLowerCase())
                ).length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhum beneficiamento cadastrado</TableCell></TableRow>
                ) : (
                  beneficiamentos.filter((b: any) => 
                    b.codigo?.toLowerCase().includes(searchBeneficiamento.toLowerCase())
                  ).map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono font-medium">{b.codigo}</TableCell>
                      <TableCell>{b.processos?.nome || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={b.tipo_beneficiamento === "interno" ? "default" : "outline"}>
                          {b.tipo_beneficiamento === "interno" ? "Interno" : "Externo"}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(b.data_inicio), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                      <TableCell className="text-right">{formatWeight(b.peso_entrada_kg || 0)}</TableCell>
                      <TableCell className="text-right">{formatWeight(b.peso_saida_kg || 0)}</TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[b.status]?.variant || "secondary"}>
                          {statusConfig[b.status]?.label || b.status}
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
                            <DropdownMenuItem onClick={() => setEditBeneficiamento(b)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizar
                            </DropdownMenuItem>
                            {canEdit && b.status === "em_andamento" && (
                              <>
                                <DropdownMenuItem onClick={() => setEditBeneficiamento(b)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setFinalizeBeneficiamento(b);
                                    setFinalizeData({ 
                                      peso_saida_real: b.peso_saida_kg || b.peso_entrada_kg * 0.97,
                                      local_destino_id: "",
                                      tipo_produto_saida_id: ""
                                    });
                                  }}
                                  className="text-success focus:text-success"
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Finalizar
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem onClick={() => setRomaneioBeneficiamento(b)}>
                              <Printer className="mr-2 h-4 w-4" />
                              Imprimir Romaneio
                            </DropdownMenuItem>
                            {isAdmin && b.status !== "finalizado" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => setDeleteBeneficiamento(b)}
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
        <Dialog open={!!editBeneficiamento} onOpenChange={() => setEditBeneficiamento(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Beneficiamento - {editBeneficiamento?.codigo}</DialogTitle>
            </DialogHeader>
            {editBeneficiamento && <BeneficiamentoEditForm beneficiamento={editBeneficiamento} onClose={() => setEditBeneficiamento(null)} />}
          </DialogContent>
        </Dialog>

        {/* Romaneio Print Dialog */}
        {romaneioBeneficiamento && (
          <BeneficiamentoRomaneioPrint
            beneficiamento={romaneioBeneficiamento}
            isOpen={!!romaneioBeneficiamento}
            onClose={() => setRomaneioBeneficiamento(null)}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteBeneficiamento} onOpenChange={() => setDeleteBeneficiamento(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o beneficiamento <strong>{deleteBeneficiamento?.codigo}</strong>?
                <br />
                Esta ação não pode ser desfeita. Os sublotes serão restaurados para disponíveis.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(deleteBeneficiamento?.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Finalize Dialog */}
        <Dialog open={!!finalizeBeneficiamento} onOpenChange={() => setFinalizeBeneficiamento(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                Finalizar Beneficiamento
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Código:</span>
                  <span className="font-mono font-medium">{finalizeBeneficiamento?.codigo}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Peso Entrada:</span>
                  <span className="font-medium">{formatWeight(finalizeBeneficiamento?.peso_entrada_kg || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Peso Saída Estimado:</span>
                  <span className="font-medium">{formatWeight(finalizeBeneficiamento?.peso_saida_kg || 0)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Peso Real de Saída (kg)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={finalizeData.peso_saida_real}
                  onChange={(e) => setFinalizeData({ ...finalizeData, peso_saida_real: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  Perda Real: {finalizeBeneficiamento?.peso_entrada_kg && finalizeData.peso_saida_real > 0
                    ? ((1 - finalizeData.peso_saida_real / finalizeBeneficiamento.peso_entrada_kg) * 100).toFixed(2)
                    : 0}%
                </p>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Produto de Saída</Label>
                <Select 
                  value={finalizeData.tipo_produto_saida_id} 
                  onValueChange={(v) => setFinalizeData({ ...finalizeData, tipo_produto_saida_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto resultante..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposProduto.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Local de Destino</Label>
                <Select 
                  value={finalizeData.local_destino_id} 
                  onValueChange={(v) => setFinalizeData({ ...finalizeData, local_destino_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o local..." />
                  </SelectTrigger>
                  <SelectContent>
                    {locaisEstoque.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setFinalizeBeneficiamento(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() => finalizeMutation.mutate({
                  beneficiamentoId: finalizeBeneficiamento?.id,
                  pesoSaida: finalizeData.peso_saida_real,
                  localDestinoId: finalizeData.local_destino_id,
                  tipoProdutoSaidaId: finalizeData.tipo_produto_saida_id,
                })}
                disabled={finalizeMutation.isPending || !finalizeData.local_destino_id || !finalizeData.tipo_produto_saida_id || finalizeData.peso_saida_real <= 0}
                className="bg-success hover:bg-success/90 text-success-foreground"
              >
                {finalizeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Finalizar e Retornar ao Estoque
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

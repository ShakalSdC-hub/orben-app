import { useState, useMemo } from "react";
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
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
import { Plus, Cog, DollarSign, Scale, AlertTriangle, Truck, Package, Loader2, Search, Trash2, Printer, ChevronRight, ChevronDown, Info, MoreHorizontal, Eye, Edit, CheckCircle2, FileSpreadsheet, FileText, Layers } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BeneficiamentoRomaneioPrint } from "@/components/romaneio/BeneficiamentoRomaneioPrint";
import { GlobalFilters } from "@/components/filters/GlobalFilters";
import { BeneficiamentoEditForm } from "@/components/beneficiamento/BeneficiamentoEditForm";
import { CustoCalculoPreview } from "@/components/beneficiamento/CustoCalculoPreview";
import { LucroPerdaPreview } from "@/components/cenarios/LucroPerdaPreview";
import { useExportReport } from "@/hooks/useExportReport";
import { ExcelImport } from "@/components/import/ExcelImport";

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
  tipo_produto?: { id?: string; nome: string; perda_beneficiamento_pct?: number } | null;
  dono?: { nome: string } | null;
  entrada_id?: string | null;
}

// Tipos para consolidação
interface ProdutoConsolidado {
  tipo_produto_id: string;
  codigo: string; // Chave de consolidação
  nome: string;
  peso_kg: number;
  perda_padrao_pct: number;
  perda_cobrada_pct: number;
  peso_saida_estimado: number;
  sublotes: string[];
}

interface DocumentoEntrada {
  entrada_id: string;
  codigo_entrada: string;
  valor_total: number;
  taxa_financeira_pct: number;
  taxa_financeira_valor: number;
  sublotes_count: number;
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
  const [viewBeneficiamento, setViewBeneficiamento] = useState<any | null>(null);
  const [finalizeData, setFinalizeData] = useState({ peso_saida_real: 0, local_destino_id: "", tipo_produto_saida_id: "", lme_referencia_kg: 0 });
  const { exportToExcel, formatBeneficiamentoReport, printReport } = useExportReport();

  // Estado para perdas por produto - chave é o CÓDIGO do produto
  const [perdasPorProduto, setPerdasPorProduto] = useState<Record<string, { padrao: number; cobrada: number }>>({});
  // Estado para taxa financeira global
  const [taxaFinanceiraGlobal, setTaxaFinanceiraGlobal] = useState(1.8);

  const [formData, setFormData] = useState({
    processo_id: "",
    tipo_beneficiamento: "interno",
    fornecedor_terceiro_id: "",
    // Custos em R$/kg - frete ida usa peso entrada, frete volta usa peso após perda
    custo_frete_ida_kg: 0,
    custo_frete_volta_kg: 0,
    custo_mo_terceiro_kg: 0,
    custo_mo_ibrac_kg: 0,
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
          processos(nome),
          fornecedor_terceiro:parceiros!beneficiamentos_fornecedor_terceiro_id_fkey(razao_social, nome_fantasia)
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
          tipo_produto:tipos_produto(id, codigo, nome, perda_beneficiamento_pct),
          dono:donos_material(nome),
          entrada:entradas(id, codigo, valor_total, parceiro:parceiros!entradas_parceiro_id_fkey(razao_social, nome_fantasia))
        `)
        .eq("status", "disponivel")
        .gt("peso_kg", 0)
        .order("codigo");
      if (error) throw error;
      return data;
    },
  });

  // Consolidação automática por CÓDIGO do produto (expandindo lotes mãe para filhos)
  const produtosConsolidados = useMemo<ProdutoConsolidado[]>(() => {
    const map = new Map<string, ProdutoConsolidado>();
    
    for (const lote of selectedLotes) {
      const subloteFull = sublotesDisponiveis.find((s: any) => s.id === lote.id);
      
      // Verificar se o lote tem filhos (é um lote mãe)
      const filhos = sublotesDisponiveis.filter((s: any) => s.lote_pai_id === lote.id);
      
      // Se tem filhos, usar os filhos para consolidação; senão, usar o próprio lote
      const itensParaConsolidar = filhos.length > 0 ? filhos : [subloteFull];
      
      for (const item of itensParaConsolidar) {
        if (!item) continue;
        
        const codigoProduto = item.tipo_produto?.codigo || "SEM_CODIGO";
        const tipoProdutoId = item.tipo_produto?.id || "sem_produto";
        const nome = item.tipo_produto?.nome || "Sem Produto";
        
        if (!map.has(codigoProduto)) {
          // Buscar valores editáveis ou iniciar zerados
          const perdasEditadas = perdasPorProduto[codigoProduto];
          
          map.set(codigoProduto, {
            tipo_produto_id: tipoProdutoId,
            codigo: codigoProduto,
            nome,
            peso_kg: 0,
            perda_padrao_pct: perdasEditadas?.padrao ?? 0, // Usuário preenche
            perda_cobrada_pct: perdasEditadas?.cobrada ?? 0, // Usuário preenche
            peso_saida_estimado: 0,
            sublotes: [],
          });
        }
        
        const consolidated = map.get(codigoProduto)!;
        // Se é filho, usar peso do filho; se é o próprio lote, usar peso do lote selecionado
        const pesoItem = filhos.length > 0 ? item.peso_kg : lote.peso_kg;
        consolidated.peso_kg += pesoItem;
        consolidated.sublotes.push(item.id);
      }
    }
    
    // Calcular peso de saída estimado para cada produto
    for (const item of map.values()) {
      const perdasEditadas = perdasPorProduto[item.codigo];
      item.perda_padrao_pct = perdasEditadas?.padrao ?? item.perda_padrao_pct;
      item.perda_cobrada_pct = perdasEditadas?.cobrada ?? item.perda_cobrada_pct;
      item.peso_saida_estimado = item.peso_kg * (1 - item.perda_cobrada_pct / 100);
    }
    
    return Array.from(map.values());
  }, [selectedLotes, sublotesDisponiveis, perdasPorProduto]);

  // Consolidação automática por documento de entrada
  const documentosEntrada = useMemo<DocumentoEntrada[]>(() => {
    const map = new Map<string, DocumentoEntrada>();
    
    for (const lote of selectedLotes) {
      const subloteFull = sublotesDisponiveis.find((s: any) => s.id === lote.id);
      const entradaId = subloteFull?.entrada?.id;
      
      if (!entradaId) continue;
      
      if (!map.has(entradaId)) {
        map.set(entradaId, {
          entrada_id: entradaId,
          codigo_entrada: subloteFull.entrada?.codigo || "N/A",
          valor_total: subloteFull.entrada?.valor_total || 0,
          taxa_financeira_pct: taxaFinanceiraGlobal,
          taxa_financeira_valor: (subloteFull.entrada?.valor_total || 0) * (taxaFinanceiraGlobal / 100),
          sublotes_count: 0,
        });
      }
      
      const item = map.get(entradaId)!;
      item.sublotes_count += 1;
      // Atualizar taxa financeira com valor global
      item.taxa_financeira_pct = taxaFinanceiraGlobal;
      item.taxa_financeira_valor = item.valor_total * (taxaFinanceiraGlobal / 100);
    }
    
    return Array.from(map.values());
  }, [selectedLotes, sublotesDisponiveis, taxaFinanceiraGlobal]);

  // Obter parceiros únicos dos lotes selecionados
  const parceirosDosMateriais = [...new Set(selectedLotes.map(l => {
    const subloteFull = sublotesDisponiveis.find((s: any) => s.id === l.id);
    return subloteFull?.entrada?.parceiro?.razao_social || subloteFull?.entrada?.parceiro?.nome_fantasia;
  }).filter(Boolean))].join(", ");

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
      const { data, error } = await supabase.from("tipos_produto").select("*, perda_beneficiamento_pct").eq("ativo", true).order("nome");
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

  // Query para buscar sublotes gerados por beneficiamentos (para validar exclusão)
  const { data: sublotesGerados = [] } = useQuery({
    queryKey: ["sublotes_gerados_beneficiamento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamento_itens_saida")
        .select("beneficiamento_id, sublote_gerado_id");
      if (error) throw error;
      return data;
    },
  });

  // Query para buscar itens de saída (para verificar se sublotes gerados foram vendidos)
  const { data: saidaItens = [] } = useQuery({
    queryKey: ["saida_itens_validacao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saida_itens")
        .select("sublote_id");
      if (error) throw error;
      return data;
    },
  });

  // Query para buscar histórico LME para seleção
  const { data: historicoLme = [] } = useQuery({
    queryKey: ["historico_lme_beneficiamento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_lme")
        .select("*")
        .order("data", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  // Função para verificar se um beneficiamento pode ser excluído
  // Retorna true se há sublotes gerados que já foram usados em saídas
  const isBeneficiamentoVinculado = (beneficiamentoId: string): boolean => {
    const sublotesDesteBeneficiamento = sublotesGerados
      .filter(sg => sg.beneficiamento_id === beneficiamentoId)
      .map(sg => sg.sublote_gerado_id);
    
    const subloteIdsVendidos = new Set(saidaItens.map(si => si.sublote_id));
    
    return sublotesDesteBeneficiamento.some(subloteId => 
      subloteId && subloteIdsVendidos.has(subloteId)
    );
  };

  const fornecedores = parceiros.filter((p) => p.is_fornecedor);
  const transportadoras = parceiros.filter((p) => p.is_transportadora);

  // Cálculos baseados nos produtos consolidados
  const pesoTotalEntrada = selectedLotes.reduce((acc, l) => acc + l.peso_kg, 0);
  
  // Peso de saída estimado = soma dos pesos de saída por produto
  const pesoSaidaEstimado = produtosConsolidados.reduce((acc, p) => acc + p.peso_saida_estimado, 0);
  
  // Perda média ponderada (para compatibilidade com campos antigos)
  const perdaMediaReal = pesoTotalEntrada > 0 
    ? produtosConsolidados.reduce((acc, p) => acc + (p.perda_padrao_pct * p.peso_kg), 0) / pesoTotalEntrada 
    : 0;
  const perdaMediaCobrada = pesoTotalEntrada > 0 
    ? produtosConsolidados.reduce((acc, p) => acc + (p.perda_cobrada_pct * p.peso_kg), 0) / pesoTotalEntrada 
    : 0;
  
  // Frete ida = peso entrada × R$/kg
  const custoFreteIda = formData.custo_frete_ida_kg * pesoTotalEntrada;
  // Frete volta = peso após perda × R$/kg
  const custoFreteVolta = formData.custo_frete_volta_kg * pesoSaidaEstimado;
  // MO = peso entrada × R$/kg
  const custoMoTerceiro = formData.custo_mo_terceiro_kg * pesoTotalEntrada;
  const custoMoIbrac = formData.custo_mo_ibrac_kg * pesoTotalEntrada;
  
  // Custo total de processamento
  const custoTotal = custoFreteIda + custoFreteVolta + custoMoTerceiro + custoMoIbrac;
  const custoTotalKg = pesoTotalEntrada > 0 ? custoTotal / pesoTotalEntrada : 0;
  
  // Valor total de entrada POR DOCUMENTO (sem duplicação)
  const valorTotalDocumentos = documentosEntrada.reduce((acc, d) => acc + d.valor_total, 0);
  
  // Taxa financeira sobre documentos (cada documento cobra uma vez)
  const custoFinanceiro = documentosEntrada.reduce((acc, d) => acc + d.taxa_financeira_valor, 0);
  
  // Lucro na perda (diferença entre perda cobrada e perda real média)
  const lucroPerda = perdaMediaCobrada - perdaMediaReal;

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

  // Validação dos campos obrigatórios de configuração
  const isConfigValid = formData.processo_id && produtosConsolidados.length > 0;

  const createMutation = useMutation({
    mutationFn: async () => {
      if (selectedLotes.length === 0) throw new Error("Selecione ao menos um lote");
      if (!formData.processo_id) throw new Error("Selecione o processo de beneficiamento");
      if (produtosConsolidados.length === 0) throw new Error("Nenhum produto consolidado");
      
      const codigo = `BEN-${format(new Date(), "yyyyMMdd")}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;

      // Criar beneficiamento com dados consolidados
      const { data: beneficiamento, error: benError } = await supabase
        .from("beneficiamentos")
        .insert({
          codigo,
          processo_id: formData.processo_id || null,
          tipo_beneficiamento: formData.tipo_beneficiamento,
          fornecedor_terceiro_id: formData.tipo_beneficiamento === "externo" && formData.fornecedor_terceiro_id 
            ? formData.fornecedor_terceiro_id 
            : null,
          custo_frete_ida: custoFreteIda,
          custo_frete_volta: custoFreteVolta,
          custo_mo_terceiro: custoMoTerceiro,
          custo_mo_ibrac: custoMoIbrac,
          taxa_financeira_pct: taxaFinanceiraGlobal,
          perda_real_pct: perdaMediaReal,
          perda_cobrada_pct: perdaMediaCobrada,
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

      // Inserir produtos consolidados
      for (const produto of produtosConsolidados) {
        if (produto.tipo_produto_id !== "sem_produto") {
          const { error: prodError } = await supabase.from("beneficiamento_produtos").insert({
            beneficiamento_id: beneficiamento.id,
            tipo_produto_id: produto.tipo_produto_id,
            peso_entrada_kg: produto.peso_kg,
            perda_padrao_pct: produto.perda_padrao_pct,
            perda_cobrada_pct: produto.perda_cobrada_pct,
            peso_saida_estimado_kg: produto.peso_saida_estimado,
          });
          if (prodError) throw prodError;
        }
      }

      // Inserir documentos de entrada (para custo financeiro)
      // Se documentosEntrada veio vazio do useMemo, buscar diretamente do banco
      let docsParaInserir = documentosEntrada;
      
      if (docsParaInserir.length === 0 && selectedLotes.length > 0) {
        // Buscar entradas diretamente dos sublotes selecionados
        const subloteIds = selectedLotes.map(l => l.id);
        const { data: sublotesComEntrada } = await supabase
          .from("sublotes")
          .select("id, entrada_id, entrada:entradas(id, codigo, valor_total)")
          .in("id", subloteIds);
        
        // Consolidar por entrada única
        const entradasMap = new Map<string, DocumentoEntrada>();
        for (const s of sublotesComEntrada || []) {
          const entradaData = s.entrada as any;
          if (!s.entrada_id || !entradaData) continue;
          
          if (!entradasMap.has(s.entrada_id)) {
            entradasMap.set(s.entrada_id, {
              entrada_id: s.entrada_id,
              codigo_entrada: entradaData.codigo || "N/A",
              valor_total: entradaData.valor_total || 0,
              taxa_financeira_pct: taxaFinanceiraGlobal,
              taxa_financeira_valor: (entradaData.valor_total || 0) * (taxaFinanceiraGlobal / 100),
              sublotes_count: 1,
            });
          } else {
            entradasMap.get(s.entrada_id)!.sublotes_count += 1;
          }
        }
        docsParaInserir = Array.from(entradasMap.values());
      }
      
      for (const doc of docsParaInserir) {
        const { error: docError } = await supabase.from("beneficiamento_entradas").insert({
          beneficiamento_id: beneficiamento.id,
          entrada_id: doc.entrada_id,
          valor_documento: doc.valor_total,
          taxa_financeira_pct: doc.taxa_financeira_pct,
          taxa_financeira_valor: doc.taxa_financeira_valor,
        });
        if (docError) throw docError;
      }

      // Inserir itens de entrada
      for (const lote of selectedLotes) {
        const subloteFull = sublotesDisponiveis.find((s: any) => s.id === lote.id);
        const tipoProdutoId = subloteFull?.tipo_produto?.id || null;
        
        const { error: itemError } = await supabase.from("beneficiamento_itens_entrada").insert({
          beneficiamento_id: beneficiamento.id,
          sublote_id: lote.id,
          peso_kg: lote.peso_kg,
          custo_unitario: custoTotalKg,
          tipo_produto_id: tipoProdutoId,
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
      setPerdasPorProduto({});
      setTaxaFinanceiraGlobal(1.8);
      setFormData({
        processo_id: "",
        tipo_beneficiamento: "interno",
        fornecedor_terceiro_id: "",
        custo_frete_ida_kg: 0,
        custo_frete_volta_kg: 0,
        custo_mo_terceiro_kg: 0,
        custo_mo_ibrac_kg: 0,
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
      // Buscar itens de entrada para restaurar status e peso dos sublotes
      const { data: itensEntrada } = await supabase
        .from("beneficiamento_itens_entrada")
        .select("sublote_id, peso_kg")
        .eq("beneficiamento_id", beneficiamentoId);

      // Buscar itens de saída para identificar sublotes gerados (precisam ser excluídos)
      const { data: itensSaida } = await supabase
        .from("beneficiamento_itens_saida")
        .select("sublote_gerado_id")
        .eq("beneficiamento_id", beneficiamentoId);

      // Restaurar status e peso dos sublotes de entrada
      if (itensEntrada) {
        for (const item of itensEntrada) {
          if (item.sublote_id) {
            // Restaurar status para disponível e peso original do beneficiamento
            await supabase
              .from("sublotes")
              .update({ 
                status: "disponivel",
                peso_kg: item.peso_kg || 0
              })
              .eq("id", item.sublote_id);
          }
        }
      }

      // Remover sublotes gerados na saída do beneficiamento
      if (itensSaida) {
        for (const item of itensSaida) {
          if (item.sublote_gerado_id) {
            // Primeiro verificar se há sublotes filhos apontando para este
            const { data: filhos } = await supabase
              .from("sublotes")
              .select("id")
              .eq("lote_pai_id", item.sublote_gerado_id);

            if (filhos && filhos.length > 0) {
              // Atualizar filhos para apontar ao pai do sublote gerado
              const { data: subloteGerado } = await supabase
                .from("sublotes")
                .select("lote_pai_id")
                .eq("id", item.sublote_gerado_id)
                .single();

              if (subloteGerado) {
                await supabase
                  .from("sublotes")
                  .update({ lote_pai_id: subloteGerado.lote_pai_id })
                  .eq("lote_pai_id", item.sublote_gerado_id);
              }
            }

            // Agora deletar o sublote gerado
            await supabase
              .from("sublotes")
              .delete()
              .eq("id", item.sublote_gerado_id);
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
      queryClient.invalidateQueries({ queryKey: ["sublotes"] });
      toast({ title: "Beneficiamento excluído com sucesso!" });
      setDeleteBeneficiamento(null);
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  // Mutation para finalizar beneficiamento
  const finalizeMutation = useMutation({
    mutationFn: async ({ beneficiamentoId, pesoSaida, localDestinoId, tipoProdutoSaidaId, lmeReferenciaKg }: { 
      beneficiamentoId: string; 
      pesoSaida: number;
      localDestinoId: string;
      tipoProdutoSaidaId: string;
      lmeReferenciaKg: number;
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
      
      // Buscar custo financeiro dos documentos de entrada
      const { data: benefEntradas } = await supabase
        .from("beneficiamento_entradas")
        .select("taxa_financeira_valor")
        .eq("beneficiamento_id", beneficiamentoId);

      const custoFinanceiro = benefEntradas?.reduce(
        (acc, doc) => acc + (doc.taxa_financeira_valor || 0), 0
      ) || 0;

      // Custo total inclui: frete ida/volta + MO IBRAC/terceiro + custo financeiro
      const custoTotal = (beneficiamento.custo_frete_ida || 0) + 
                         (beneficiamento.custo_frete_volta || 0) + 
                         (beneficiamento.custo_mo_ibrac || 0) + 
                         (beneficiamento.custo_mo_terceiro || 0) +
                         custoFinanceiro;
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

        // Criar sublote de saída (produto transformado - vinculado ao sublote de origem)
        const { data: novoSublote, error: subloteError } = await supabase
          .from("sublotes")
          .insert({
            codigo: codigoSaida,
            peso_kg: pesoSaidaItem,
            tipo_produto_id: tipoProdutoSaidaId,
            dono_id: donoId,
            local_estoque_id: localDestinoId,
            lote_pai_id: item.sublote_id, // Vincular ao sublote de origem para rastreabilidade
            custo_unitario_total: novoCustoUnitario,
            status: "disponivel",
            observacoes: `Transformado via beneficiamento`,
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

        // Marcar sublotes filhos ANTERIORES como consumidos (não incluir o novo sublote gerado)
        // Filtra para não consumir o sublote recém-criado
        await supabase
          .from("sublotes")
          .update({ status: "consumido", peso_kg: 0 })
          .eq("lote_pai_id", item.sublote_id)
          .neq("id", novoSublote.id);
      }

      // Atualizar beneficiamento para finalizado
      const { error: updateError } = await supabase
        .from("beneficiamentos")
        .update({ 
          status: "finalizado", 
          data_fim: new Date().toISOString().split("T")[0],
          peso_saida_kg: pesoSaida,
          lme_referencia_kg: lmeReferenciaKg > 0 ? lmeReferenciaKg : null
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
      setFinalizeData({ peso_saida_real: 0, local_destino_id: "", tipo_produto_saida_id: "", lme_referencia_kg: 0 });
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
            <ExcelImport
              title="Importar Beneficiamentos"
              description="Importe beneficiamentos via planilha Excel. Códigos duplicados serão bloqueados. Processo/Fornecedor são buscados pelo nome."
              templateFilename="template_beneficiamentos"
              tableName="beneficiamentos"
              codeColumn="codigo"
              columns={[
                { dbColumn: "codigo", excelColumn: "Código", label: "Código", required: true, type: "string", isCodeColumn: true },
                { dbColumn: "data_inicio", excelColumn: "Data Início", label: "Data Início", required: true, type: "date" },
                { dbColumn: "data_fim", excelColumn: "Data Fim", label: "Data Fim", required: false, type: "date" },
                { dbColumn: "tipo_beneficiamento", excelColumn: "Tipo", label: "Tipo", required: false, type: "string" },
                { dbColumn: "processo_id", excelColumn: "Processo", label: "Processo", required: false, type: "lookup", lookup: { table: "processos", matchColumn: "nome" } },
                { dbColumn: "fornecedor_terceiro_id", excelColumn: "Fornecedor Terceiro", label: "Fornecedor", required: false, type: "lookup", lookup: { table: "parceiros", matchColumn: "razao_social", alternativeColumns: ["nome_fantasia"] } },
                { dbColumn: "transportadora_id", excelColumn: "Transportadora", label: "Transportadora", required: false, type: "lookup", lookup: { table: "parceiros", matchColumn: "razao_social", alternativeColumns: ["nome_fantasia"] } },
                { dbColumn: "peso_entrada_kg", excelColumn: "Peso Entrada (kg)", label: "Peso Entrada", required: true, type: "number" },
                { dbColumn: "peso_saida_kg", excelColumn: "Peso Saída (kg)", label: "Peso Saída", required: false, type: "number" },
                { dbColumn: "perda_real_pct", excelColumn: "Perda Real (%)", label: "Perda Real", required: false, type: "number" },
                { dbColumn: "perda_cobrada_pct", excelColumn: "Perda Cobrada (%)", label: "Perda Cobrada", required: false, type: "number" },
                { dbColumn: "custo_frete_ida", excelColumn: "Custo Frete Ida (R$)", label: "Frete Ida", required: false, type: "number" },
                { dbColumn: "custo_frete_volta", excelColumn: "Custo Frete Volta (R$)", label: "Frete Volta", required: false, type: "number" },
                { dbColumn: "custo_mo_terceiro", excelColumn: "Custo MO Terceiro (R$)", label: "MO Terceiro", required: false, type: "number" },
                { dbColumn: "custo_mo_ibrac", excelColumn: "Custo MO IBRAC (R$)", label: "MO IBRAC", required: false, type: "number" },
                { dbColumn: "taxa_financeira_pct", excelColumn: "Taxa Financeira (%)", label: "Taxa Financeira", required: false, type: "number" },
                { dbColumn: "lme_referencia_kg", excelColumn: "LME Referência (R$/kg)", label: "LME Ref", required: false, type: "number" },
                { dbColumn: "motorista", excelColumn: "Motorista", label: "Motorista", required: false, type: "string" },
                { dbColumn: "placa_veiculo", excelColumn: "Placa Veículo", label: "Placa", required: false, type: "string" },
                { dbColumn: "observacoes", excelColumn: "Observações", label: "Observações", required: false, type: "string" },
              ]}
              sampleData={[
                { "Código": "BEN-001", "Data Início": "01/01/2025", "Data Fim": "05/01/2025", "Tipo": "interno", "Processo": "Granulação", "Fornecedor Terceiro": "", "Transportadora": "", "Peso Entrada (kg)": "1000", "Peso Saída (kg)": "950", "Perda Real (%)": "5", "Perda Cobrada (%)": "3", "Custo Frete Ida (R$)": "500", "Custo Frete Volta (R$)": "500", "Custo MO Terceiro (R$)": "0", "Custo MO IBRAC (R$)": "1000", "Taxa Financeira (%)": "1.8", "LME Referência (R$/kg)": "45", "Motorista": "João", "Placa Veículo": "ABC-1234", "Observações": "" },
              ]}
              existingDataQuery={async () => {
                const { data } = await supabase.from("beneficiamentos").select("*").order("data_inicio", { ascending: false });
                return data || [];
              }}
              onImport={async (data) => {
                for (const row of data) {
                  let perdaReal = row.perda_real_pct;
                  if (!perdaReal && row.peso_entrada_kg > 0 && row.peso_saida_kg > 0) {
                    perdaReal = ((row.peso_entrada_kg - row.peso_saida_kg) / row.peso_entrada_kg * 100);
                  }
                  
                  const { error } = await supabase.from("beneficiamentos").insert({
                    ...row,
                    perda_real_pct: perdaReal || 0,
                    status: row.data_fim ? "finalizado" : "em_andamento",
                    created_by: user?.id,
                  });
                  if (error) throw error;
                }
                queryClient.invalidateQueries({ queryKey: ["beneficiamentos"] });
              }}
            />
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

                  {/* Resumo por Produto - Consolidação automática */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        Consolidação por Produto
                      </CardTitle>
                      <CardDescription>Perda configurável por tipo de produto</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {produtosConsolidados.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Selecione lotes na aba anterior para ver a consolidação
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Código</TableHead>
                              <TableHead>Produto</TableHead>
                              <TableHead className="text-right">Peso (kg)</TableHead>
                              <TableHead className="text-right">Perda Padrão (%)</TableHead>
                              <TableHead className="text-right">Perda Cobrada (%)</TableHead>
                              <TableHead className="text-right">Peso Saída Est.</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {produtosConsolidados.map((p) => (
                              <TableRow key={p.codigo}>
                                <TableCell className="font-mono text-xs">{p.codigo}</TableCell>
                                <TableCell className="font-medium">{p.nome}</TableCell>
                                <TableCell className="text-right">{formatWeight(p.peso_kg)}</TableCell>
                                <TableCell className="text-right">
                                  <Input
                                    type="number"
                                    step="0.1"
                                    className="w-20 h-8 text-right"
                                    placeholder="0"
                                    value={p.perda_padrao_pct || ""}
                                    onChange={(e) => {
                                      setPerdasPorProduto({
                                        ...perdasPorProduto,
                                        [p.codigo]: {
                                          padrao: parseFloat(e.target.value) || 0,
                                          cobrada: perdasPorProduto[p.codigo]?.cobrada ?? 0,
                                        },
                                      });
                                    }}
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <Input
                                    type="number"
                                    step="0.1"
                                    className="w-20 h-8 text-right"
                                    placeholder="0"
                                    value={p.perda_cobrada_pct || ""}
                                    onChange={(e) => {
                                      setPerdasPorProduto({
                                        ...perdasPorProduto,
                                        [p.codigo]: {
                                          padrao: perdasPorProduto[p.codigo]?.padrao ?? 0,
                                          cobrada: parseFloat(e.target.value) || 0,
                                        },
                                      });
                                    }}
                                  />
                                </TableCell>
                                <TableCell className="text-right font-medium">{formatWeight(p.peso_saida_estimado)}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-muted/50 font-bold">
                              <TableCell colSpan={2}>TOTAL</TableCell>
                              <TableCell className="text-right">{formatWeight(pesoTotalEntrada)}</TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right">{formatWeight(pesoSaidaEstimado)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>

                  {/* Resumo por Documento de Entrada */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Documentos de Entrada (Base Taxa Financeira)
                      </CardTitle>
                      <CardDescription>Taxa financeira calculada por documento, não por TKT</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {documentosEntrada.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Selecione lotes na aba anterior para ver os documentos
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Documento</TableHead>
                              <TableHead className="text-right">Qtd TKTs</TableHead>
                              <TableHead className="text-right">Valor Total</TableHead>
                              <TableHead className="text-right">Taxa ({taxaFinanceiraGlobal}%)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {documentosEntrada.map((d) => (
                              <TableRow key={d.entrada_id}>
                                <TableCell className="font-mono font-medium">{d.codigo_entrada}</TableCell>
                                <TableCell className="text-right">{d.sublotes_count}</TableCell>
                                <TableCell className="text-right">{formatCurrency(d.valor_total)}</TableCell>
                                <TableCell className="text-right text-amber-600 font-medium">{formatCurrency(d.taxa_financeira_valor)}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-muted/50 font-bold">
                              <TableCell>TOTAL</TableCell>
                              <TableCell className="text-right">{selectedLotes.length}</TableCell>
                              <TableCell className="text-right">{formatCurrency(valorTotalDocumentos)}</TableCell>
                              <TableCell className="text-right text-amber-600">{formatCurrency(custoFinanceiro)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>

                  {/* Lucro na Perda */}
                  <Card className="bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Peso Saída Estimado</p>
                          <p className="font-bold text-lg">{formatWeight(pesoSaidaEstimado)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Lucro Médio na Perda</p>
                          <p className={`font-bold text-lg ${lucroPerda > 0 ? "text-success" : "text-destructive"}`}>
                            {lucroPerda.toFixed(2)}%
                          </p>
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
                  {/* Alerta quando não há documentos fiscais */}
                  {documentosEntrada.length === 0 && selectedLotes.length > 0 && (
                    <Alert className="border-warning bg-warning/10">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <AlertTitle className="text-warning">Atenção: Sem documentos fiscais</AlertTitle>
                      <AlertDescription className="text-muted-foreground">
                        Os lotes selecionados não possuem notas fiscais de entrada vinculadas. 
                        O custo de aquisição pode não ser contabilizado corretamente. 
                        Verifique se as entradas originais possuem valor total informado.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" />Custos de Frete (R$/kg)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Frete Ida (R$/kg)</Label>
                          <Input type="number" step="0.01" value={formData.custo_frete_ida_kg} onChange={(e) => setFormData({ ...formData, custo_frete_ida_kg: parseFloat(e.target.value) || 0 })} />
                          <p className="text-xs text-muted-foreground">Base: {formatWeight(pesoTotalEntrada)} = {formatCurrency(custoFreteIda)}</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Frete Volta (R$/kg)</Label>
                          <Input type="number" step="0.01" value={formData.custo_frete_volta_kg} onChange={(e) => setFormData({ ...formData, custo_frete_volta_kg: parseFloat(e.target.value) || 0 })} />
                          <p className="text-xs text-muted-foreground">Base: {formatWeight(pesoSaidaEstimado)} (após perda) = {formatCurrency(custoFreteVolta)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2"><Cog className="h-4 w-4" />Mão de Obra (R$/kg)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>MO Terceiro (R$/kg)</Label>
                          <Input type="number" step="0.01" value={formData.custo_mo_terceiro_kg} onChange={(e) => setFormData({ ...formData, custo_mo_terceiro_kg: parseFloat(e.target.value) || 0 })} />
                          <p className="text-xs text-muted-foreground">= {formatCurrency(custoMoTerceiro)}</p>
                        </div>
                        <div className="space-y-2">
                          <Label>MO IBRAC (R$/kg)</Label>
                          <Input type="number" step="0.01" value={formData.custo_mo_ibrac_kg} onChange={(e) => setFormData({ ...formData, custo_mo_ibrac_kg: parseFloat(e.target.value) || 0 })} />
                          <p className="text-xs text-muted-foreground">= {formatCurrency(custoMoIbrac)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" />Taxa Financeira Global</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="space-y-2">
                        <Label>Taxa Financeira (%)</Label>
                        <Input type="number" step="0.01" value={taxaFinanceiraGlobal} onChange={(e) => setTaxaFinanceiraGlobal(parseFloat(e.target.value) || 0)} />
                        <p className="text-xs text-muted-foreground">Aplicada sobre cada documento de entrada ({formatCurrency(valorTotalDocumentos)}) = {formatCurrency(custoFinanceiro)}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/30 border-primary">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Frete Ida ({formatWeight(pesoTotalEntrada)}):</span>
                        <span className="font-medium">{formatCurrency(custoFreteIda)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Frete Volta ({formatWeight(pesoSaidaEstimado)}):</span>
                        <span className="font-medium">{formatCurrency(custoFreteVolta)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>MO Total:</span>
                        <span className="font-medium">{formatCurrency(custoMoTerceiro + custoMoIbrac)}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between">
                        <span>Custo Operacional:</span>
                        <span className="font-bold">{formatCurrency(custoTotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>R$/kg (sobre peso entrada):</span>
                        <span>{formatCurrency(custoTotalKg)}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between text-sm">
                        <span>+ Taxa Financeira ({taxaFinanceiraGlobal}% sobre documentos):</span>
                        <span>{formatCurrency(custoFinanceiro)}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between text-lg">
                        <span className="font-semibold">Custo Total:</span>
                        <span className="font-bold text-primary">{formatCurrency(custoTotal + custoFinanceiro)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Preview de Lucro/Perda - mostrado quando há diferença entre perda cobrada e real */}
                  {pesoTotalEntrada > 0 && Math.abs(perdaMediaCobrada - perdaMediaReal) >= 0.01 && (
                    <LucroPerdaPreview
                      pesoEntrada={pesoTotalEntrada}
                      perdaCobradaPct={perdaMediaCobrada}
                      perdaRealPct={perdaMediaReal}
                      lmeReferenciaKg={historicoLme[0]?.cobre_brl_kg || 0}
                    />
                  )}

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
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          onClick={() => createMutation.mutate()}
                          disabled={createMutation.isPending || selectedLotes.length === 0 || !isConfigValid}
                          className="bg-gradient-copper hover:opacity-90"
                        >
                          {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Criar Beneficiamento
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!isConfigValid && (
                      <TooltipContent>
                        <p>Preencha o Processo e Produto de Saída na aba Configuração</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
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
          <CardContent className="p-0 md:p-6">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Processo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Parceiro</TableHead>
                  <TableHead>Data Início</TableHead>
                  <TableHead className="text-right">Peso Entrada</TableHead>
                  <TableHead className="text-right">Peso Saída</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center">Carregando...</TableCell></TableRow>
                ) : beneficiamentos.filter((b: any) => 
                  b.codigo?.toLowerCase().includes(searchBeneficiamento.toLowerCase())
                ).length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Nenhum beneficiamento cadastrado</TableCell></TableRow>
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
                      <TableCell className="text-sm">
                        {b.fornecedor_terceiro?.razao_social || b.fornecedor_terceiro?.nome_fantasia || "-"}
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
                            <DropdownMenuItem onClick={() => setViewBeneficiamento(b)}>
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
                                  onClick={async () => {
                                    // Buscar tipo de produto do primeiro item de entrada
                                    const { data: itensEntrada } = await supabase
                                      .from("beneficiamento_itens_entrada")
                                      .select("sublote:sublotes(tipo_produto_id)")
                                      .eq("beneficiamento_id", b.id)
                                      .limit(1);
                                    
                                    const tipoProdutoId = itensEntrada?.[0]?.sublote?.tipo_produto_id || "";
                                    
                                    // Buscar local padrão (primeiro que contenha "IBRAC" ou o primeiro disponível)
                                    const localIbrac = locaisEstoque.find((l: any) => 
                                      l.nome.toLowerCase().includes("ibrac") || 
                                      l.nome.toLowerCase().includes("estoque")
                                    ) || locaisEstoque[0];
                                    
                                    setFinalizeBeneficiamento(b);
                                    setFinalizeData({ 
                                      peso_saida_real: b.peso_saida_kg || b.peso_entrada_kg * 0.97,
                                      local_destino_id: localIbrac?.id || "",
                                      tipo_produto_saida_id: tipoProdutoId,
                                      lme_referencia_kg: 0
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
                            {isAdmin && b.status !== "finalizado" && !isBeneficiamentoVinculado(b.id) && (
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
                            {isAdmin && b.status === "finalizado" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem disabled className="text-muted-foreground">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir (Finalizado)
                                </DropdownMenuItem>
                              </>
                            )}
                            {isAdmin && b.status !== "finalizado" && isBeneficiamentoVinculado(b.id) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem disabled className="text-muted-foreground">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir (Tem Saída)
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
            </div>
          </CardContent>
        </Card>

        {/* View Dialog (Read-only) */}
        <Dialog open={!!viewBeneficiamento} onOpenChange={() => setViewBeneficiamento(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Visualizar Beneficiamento - {viewBeneficiamento?.codigo}</DialogTitle>
            </DialogHeader>
            {viewBeneficiamento && <BeneficiamentoEditForm beneficiamento={viewBeneficiamento} onClose={() => setViewBeneficiamento(null)} readOnly />}
          </DialogContent>
        </Dialog>

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

              <div className="space-y-2">
                <Label>LME de Referência (R$/kg)</Label>
                <Select 
                  value={finalizeData.lme_referencia_kg > 0 ? String(finalizeData.lme_referencia_kg) : ""} 
                  onValueChange={(v) => setFinalizeData({ ...finalizeData, lme_referencia_kg: parseFloat(v) || 0 })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a LME de referência..." />
                  </SelectTrigger>
                  <SelectContent>
                    {historicoLme.map((lme) => (
                      <SelectItem key={lme.id} value={String(lme.cobre_brl_kg || 0)}>
                        {format(new Date(lme.data + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })} - {formatCurrency(lme.cobre_brl_kg || 0)}/kg
                        {lme.is_media_semanal && " (Média Semanal)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {finalizeData.lme_referencia_kg > 0 && (
                  <p className="text-xs text-muted-foreground">
                    LME selecionada: {formatCurrency(finalizeData.lme_referencia_kg)}/kg
                  </p>
                )}
              </div>

              {/* Prévia do Cálculo de Custo */}
              {finalizeBeneficiamento?.id && finalizeData.peso_saida_real > 0 && (
                <CustoCalculoPreview 
                  beneficiamentoId={finalizeBeneficiamento.id} 
                  pesoSaidaReal={finalizeData.peso_saida_real} 
                />
              )}
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
                  lmeReferenciaKg: finalizeData.lme_referencia_kg,
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

import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  FileText, Printer, Calendar, TrendingUp, Package, 
  DollarSign, Scale, Loader2, FileSpreadsheet, ChevronDown, ChevronRight, 
  ArrowRight, Factory, Users, Filter
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatWeight, formatCurrency } from "@/lib/kpis";
import { useExportReport } from "@/hooks/useExportReport";
import * as XLSX from "xlsx";

type CenarioType = "todos" | "c1" | "intermediacao" | "terceiros";

export default function Relatorios() {
  const { printReport } = useExportReport();
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [activeTab, setActiveTab] = useState("resumo");
  const [expandedC1, setExpandedC1] = useState<string | null>(null);
  const [expandedInterm, setExpandedInterm] = useState<string | null>(null);
  const [expandedTerc, setExpandedTerc] = useState<string | null>(null);
  
  // New filters
  const [selectedCenario, setSelectedCenario] = useState<CenarioType>("todos");
  const [selectedOperacao, setSelectedOperacao] = useState<string>("todas");

  // Queries para todas as operações
  const { data: operacoesC1 = [], isLoading: loadingC1 } = useQuery({
    queryKey: ["operacoes_c1_report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operacoes")
        .select("*, beneficiador:parceiros!operacoes_beneficiador_id_fkey(razao_social, nome_fantasia)")
        .eq("is_deleted", false);
      if (error) throw error;
      return data;
    },
  });

  const { data: entradasC1 = [] } = useQuery({
    queryKey: ["entradas_c1_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entradas_c1")
        .select("*, operacao:operacoes(id, nome, beneficiador:parceiros!operacoes_beneficiador_id_fkey(razao_social, nome_fantasia))")
        .eq("is_deleted", false);
      if (error) throw error;
      return data;
    },
  });

  const { data: benefC1 = [] } = useQuery({
    queryKey: ["beneficiamentos_c1_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamentos_c1")
        .select("*, operacao:operacoes(id, nome, beneficiador:parceiros!operacoes_beneficiador_id_fkey(razao_social, nome_fantasia))")
        .eq("is_deleted", false);
      if (error) throw error;
      return data;
    },
  });

  const { data: saidasC1 = [] } = useQuery({
    queryKey: ["saidas_c1_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saidas_c1")
        .select("*, operacao:operacoes(id, nome, beneficiador:parceiros!operacoes_beneficiador_id_fkey(razao_social, nome_fantasia)), parceiro:parceiros!saidas_c1_parceiro_destino_id_fkey(razao_social, nome_fantasia)")
        .eq("is_deleted", false);
      if (error) throw error;
      return data;
    },
  });

  const { data: operacoesInterm = [] } = useQuery({
    queryKey: ["operacoes_intermediacao_report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operacoes_intermediacao")
        .select(`
          *, 
          dono:parceiros!operacoes_intermediacao_dono_economico_id_fkey(razao_social, nome_fantasia),
          beneficiador:parceiros!operacoes_intermediacao_beneficiador_id_fkey(razao_social, nome_fantasia),
          comprador:parceiros!operacoes_intermediacao_comprador_operacional_id_fkey(razao_social, nome_fantasia)
        `)
        .eq("is_deleted", false);
      if (error) throw error;
      return data;
    },
  });

  const { data: comprasInterm = [] } = useQuery({
    queryKey: ["compras_intermediacao_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compras_intermediacao")
        .select(`
          *, 
          operacao:operacoes_intermediacao(
            id, nome, 
            dono:parceiros!operacoes_intermediacao_dono_economico_id_fkey(razao_social, nome_fantasia),
            beneficiador:parceiros!operacoes_intermediacao_beneficiador_id_fkey(razao_social, nome_fantasia)
          ), 
          fornecedor:parceiros!compras_intermediacao_fornecedor_compra_id_fkey(razao_social, nome_fantasia)
        `)
        .eq("is_deleted", false);
      if (error) throw error;
      return data;
    },
  });

  const { data: benefInterm = [] } = useQuery({
    queryKey: ["beneficiamentos_interm_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamentos_intermediacao")
        .select(`
          *, 
          operacao:operacoes_intermediacao(
            id, nome,
            beneficiador:parceiros!operacoes_intermediacao_beneficiador_id_fkey(razao_social, nome_fantasia)
          )
        `)
        .eq("is_deleted", false);
      if (error) throw error;
      return data;
    },
  });

  const { data: vendasInterm = [] } = useQuery({
    queryKey: ["vendas_intermediacao_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas_intermediacao")
        .select(`
          *, 
          operacao:operacoes_intermediacao(
            id, nome, 
            dono:parceiros!operacoes_intermediacao_dono_economico_id_fkey(razao_social, nome_fantasia)
          ), 
          cliente:parceiros!vendas_intermediacao_cliente_id_fkey(razao_social, nome_fantasia)
        `)
        .eq("is_deleted", false);
      if (error) throw error;
      return data;
    },
  });

  const { data: operacoesTerceiros = [] } = useQuery({
    queryKey: ["operacoes_terceiros_report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operacoes_terceiros")
        .select(`
          *, 
          cliente:parceiros!operacoes_terceiros_cliente_id_fkey(razao_social, nome_fantasia),
          beneficiador:parceiros!operacoes_terceiros_beneficiador_id_fkey(razao_social, nome_fantasia)
        `)
        .eq("is_deleted", false);
      if (error) throw error;
      return data;
    },
  });

  const { data: entradasTerceiros = [] } = useQuery({
    queryKey: ["entradas_terceiros_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entradas_terceiros")
        .select(`
          *, 
          operacao:operacoes_terceiros(
            id, nome,
            cliente:parceiros!operacoes_terceiros_cliente_id_fkey(razao_social, nome_fantasia),
            beneficiador:parceiros!operacoes_terceiros_beneficiador_id_fkey(razao_social, nome_fantasia)
          )
        `)
        .eq("is_deleted", false);
      if (error) throw error;
      return data;
    },
  });

  const { data: benefTerceiros = [] } = useQuery({
    queryKey: ["beneficiamentos_terceiros_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamentos_terceiros")
        .select(`
          *, 
          operacao:operacoes_terceiros(
            id, nome,
            beneficiador:parceiros!operacoes_terceiros_beneficiador_id_fkey(razao_social, nome_fantasia)
          )
        `)
        .eq("is_deleted", false);
      if (error) throw error;
      return data;
    },
  });

  const { data: saidasTerceiros = [] } = useQuery({
    queryKey: ["saidas_terceiros_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saidas_terceiros")
        .select(`
          *, 
          operacao:operacoes_terceiros(
            id, nome,
            cliente:parceiros!operacoes_terceiros_cliente_id_fkey(razao_social, nome_fantasia)
          )
        `)
        .eq("is_deleted", false);
      if (error) throw error;
      return data;
    },
  });

  const { data: cobrancasTerceiros = [] } = useQuery({
    queryKey: ["cobrancas_terceiros_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cobrancas_servico_terceiros")
        .select(`
          *, 
          operacao:operacoes_terceiros(id, nome, cliente:parceiros!operacoes_terceiros_cliente_id_fkey(razao_social, nome_fantasia))
        `)
        .eq("is_deleted", false);
      if (error) throw error;
      return data;
    },
  });

  // Filtrar dados pelo período
  const filterByPeriod = <T extends { dt?: string; dt_recebimento?: string; created_at?: string; operacao_id?: string; operacao?: { id?: string } }>(data: T[]) => {
    return data.filter((item) => {
      const date = item.dt || item.dt_recebimento || item.created_at;
      if (!date) return false;
      try {
        const itemDate = parseISO(date);
        const inPeriod = isWithinInterval(itemDate, { start: parseISO(dataInicio), end: parseISO(dataFim) });
        
        // Filter by operation if selected
        if (selectedOperacao !== "todas" && inPeriod) {
          const opId = item.operacao_id || item.operacao?.id;
          return opId === selectedOperacao;
        }
        
        return inPeriod;
      } catch {
        return false;
      }
    });
  };

  // Build list of available operations based on selected scenario
  const operacoesDisponiveis = useMemo(() => {
    switch (selectedCenario) {
      case "c1":
        return operacoesC1.map(o => ({ id: o.id, nome: o.nome }));
      case "intermediacao":
        return operacoesInterm.map(o => ({ id: o.id, nome: o.nome }));
      case "terceiros":
        return operacoesTerceiros.map(o => ({ id: o.id, nome: o.nome }));
      default:
        return [
          ...operacoesC1.map(o => ({ id: o.id, nome: `[C1] ${o.nome}` })),
          ...operacoesInterm.map(o => ({ id: o.id, nome: `[Int] ${o.nome}` })),
          ...operacoesTerceiros.map(o => ({ id: o.id, nome: `[Terc] ${o.nome}` })),
        ];
    }
  }, [selectedCenario, operacoesC1, operacoesInterm, operacoesTerceiros]);

  // Calcular totais
  const totais = useMemo(() => {
    // Apply period and operation filters
    let entradasPeriodo = filterByPeriod(entradasC1);
    let benefPeriodo = filterByPeriod(benefC1);
    let saidasPeriodo = filterByPeriod(saidasC1);
    let comprasPeriodo = filterByPeriod(comprasInterm);
    let vendasPeriodo = filterByPeriod(vendasInterm);
    let entTercPeriodo = filterByPeriod(entradasTerceiros);
    let benefTercPeriodo = filterByPeriod(benefTerceiros);
    let saidaTercPeriodo = filterByPeriod(saidasTerceiros);
    let cobrancasTercPeriodo = filterByPeriod(cobrancasTerceiros);

    // Apply scenario filter
    if (selectedCenario === "c1") {
      comprasPeriodo = [];
      vendasPeriodo = [];
      entTercPeriodo = [];
      benefTercPeriodo = [];
      saidaTercPeriodo = [];
      cobrancasTercPeriodo = [];
    } else if (selectedCenario === "intermediacao") {
      entradasPeriodo = [];
      benefPeriodo = [];
      saidasPeriodo = [];
      entTercPeriodo = [];
      benefTercPeriodo = [];
      saidaTercPeriodo = [];
      cobrancasTercPeriodo = [];
    } else if (selectedCenario === "terceiros") {
      entradasPeriodo = [];
      benefPeriodo = [];
      saidasPeriodo = [];
      comprasPeriodo = [];
      vendasPeriodo = [];
    }

    return {
      c1: {
        kgComprado: entradasPeriodo.reduce((acc, e) => acc + (e.kg_ticket || 0), 0),
        kgLiquido: entradasPeriodo.reduce((acc, e) => acc + (e.kg_liquido_total || 0), 0),
        custoTotal: entradasPeriodo.reduce((acc, e) => acc + (e.custos_pre_total_rs || 0), 0),
        kgBeneficiado: benefPeriodo.reduce((acc, b) => acc + (b.kg_retornado || 0), 0),
        kgVendido: saidasPeriodo.reduce((acc, s) => acc + (s.kg_saida || 0), 0),
        receita: saidasPeriodo.reduce((acc, s) => acc + (s.receita_simulada_rs || 0), 0),
        resultado: saidasPeriodo.reduce((acc, s) => acc + (s.resultado_simulado_rs || 0), 0),
      },
      intermediacao: {
        kgComprado: comprasPeriodo.reduce((acc, c) => acc + (c.kg_comprado || 0), 0),
        valorCompras: comprasPeriodo.reduce((acc, c) => acc + (c.valor_compra_rs || 0), 0),
        kgVendido: vendasPeriodo.reduce((acc, v) => acc + (v.kg_vendido || 0), 0),
        valorVendas: vendasPeriodo.reduce((acc, v) => acc + (v.valor_venda_rs || 0), 0),
        comissao: vendasPeriodo.reduce((acc, v) => acc + (v.comissao_ibrac_rs || 0), 0),
      },
      terceiros: {
        kgRecebido: entTercPeriodo.reduce((acc, e) => acc + (e.kg_recebido || 0), 0),
        kgBeneficiado: benefTercPeriodo.reduce((acc, b) => acc + (b.kg_retornado || 0), 0),
        kgDevolvido: saidaTercPeriodo.reduce((acc, s) => acc + (s.kg_devolvido || 0), 0),
        custoServico: benefTercPeriodo.reduce((acc, b) => acc + (b.custos_servico_total_rs || 0), 0),
        receitaServico: cobrancasTercPeriodo.reduce((acc, c) => acc + (c.val || 0), 0),
      },
      operacoesAtivas: {
        c1: operacoesC1.filter(o => o.status === "ABERTA").length,
        intermediacao: operacoesInterm.filter(o => o.status === "ABERTA").length,
        terceiros: operacoesTerceiros.filter(o => o.status === "ABERTA").length,
      },
    };
  }, [entradasC1, benefC1, saidasC1, comprasInterm, vendasInterm, entradasTerceiros, benefTerceiros, saidasTerceiros, cobrancasTerceiros, operacoesC1, operacoesInterm, operacoesTerceiros, dataInicio, dataFim, selectedCenario, selectedOperacao]);

  // Get filter description for exports
  const getFilterDescription = () => {
    const parts: string[] = [];
    
    if (selectedCenario !== "todos") {
      const cenarioNames: Record<CenarioType, string> = {
        todos: "Todos",
        c1: "C1 - Material Próprio",
        intermediacao: "Intermediação",
        terceiros: "Terceiros (Serviço)"
      };
      parts.push(cenarioNames[selectedCenario]);
    }
    
    if (selectedOperacao !== "todas") {
      const op = operacoesDisponiveis.find(o => o.id === selectedOperacao);
      if (op) parts.push(`Op: ${op.nome}`);
    }
    
    return parts.length > 0 ? ` - ${parts.join(' | ')}` : '';
  };

  const handleExportPDF = () => {
    const filterDesc = getFilterDescription();
    const titulo = `Relatório Consolidado${filterDesc} - ${format(parseISO(dataInicio), "dd/MM/yyyy")} a ${format(parseISO(dataFim), "dd/MM/yyyy")}`;
    
    const data: any[] = [];
    
    if (selectedCenario === "todos" || selectedCenario === "c1") {
      data.push({ 
        "Cenário": "C1 - Material Próprio", 
        "Kg Entrada": formatWeight(totais.c1.kgComprado), 
        "Kg Saída": formatWeight(totais.c1.kgVendido), 
        "Receita": formatCurrency(totais.c1.receita), 
        "Resultado": formatCurrency(totais.c1.resultado) 
      });
    }
    
    if (selectedCenario === "todos" || selectedCenario === "intermediacao") {
      data.push({ 
        "Cenário": "Intermediação", 
        "Kg Entrada": formatWeight(totais.intermediacao.kgComprado), 
        "Kg Saída": formatWeight(totais.intermediacao.kgVendido), 
        "Receita": formatCurrency(totais.intermediacao.valorVendas), 
        "Resultado": formatCurrency(totais.intermediacao.comissao) 
      });
    }
    
    if (selectedCenario === "todos" || selectedCenario === "terceiros") {
      data.push({ 
        "Cenário": "Terceiros (Serviço)", 
        "Kg Entrada": formatWeight(totais.terceiros.kgRecebido), 
        "Kg Saída": formatWeight(totais.terceiros.kgDevolvido), 
        "Receita": formatCurrency(totais.terceiros.receitaServico), 
        "Resultado": formatCurrency(totais.terceiros.receitaServico - totais.terceiros.custoServico) 
      });
    }
    
    printReport(titulo, data, ["Cenário", "Kg Entrada", "Kg Saída", "Receita", "Resultado"]);
  };

  const handleExportExcel = () => {
    const filterDesc = getFilterDescription();
    
    const resumo: any[] = [];
    
    if (selectedCenario === "todos" || selectedCenario === "c1") {
      resumo.push({ 
        Cenario: "C1 - Material Próprio", 
        Kg_Entrada: totais.c1.kgComprado, 
        Kg_Saida: totais.c1.kgVendido, 
        Receita: totais.c1.receita, 
        Resultado: totais.c1.resultado 
      });
    }
    
    if (selectedCenario === "todos" || selectedCenario === "intermediacao") {
      resumo.push({ 
        Cenario: "Intermediação", 
        Kg_Entrada: totais.intermediacao.kgComprado, 
        Kg_Saida: totais.intermediacao.kgVendido, 
        Receita: totais.intermediacao.valorVendas, 
        Resultado: totais.intermediacao.comissao 
      });
    }
    
    if (selectedCenario === "todos" || selectedCenario === "terceiros") {
      resumo.push({ 
        Cenario: "Terceiros", 
        Kg_Entrada: totais.terceiros.kgRecebido, 
        Kg_Saida: totais.terceiros.kgDevolvido, 
        Custo_Servico: totais.terceiros.custoServico, 
        Receita_Servico: totais.terceiros.receitaServico 
      });
    }

    const workbook = XLSX.utils.book_new();
    const wsResumo = XLSX.utils.json_to_sheet(resumo);
    XLSX.utils.book_append_sheet(workbook, wsResumo, "Resumo");

    // C1 - Entradas
    if (selectedCenario === "todos" || selectedCenario === "c1") {
      const entradasC1Formatted = filterByPeriod(entradasC1).map(e => ({
        Operacao: e.operacao?.nome || "-",
        Data: e.dt_recebimento,
        Ticket: e.ticket_num || "-",
        Kg_Ticket: e.kg_ticket,
        Kg_Liquido: e.kg_liquido_total,
        Custo_Total: e.custos_pre_total_rs,
        Beneficiador: e.operacao?.beneficiador?.nome_fantasia || e.operacao?.beneficiador?.razao_social || "-",
      }));
      if (entradasC1Formatted.length > 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(entradasC1Formatted), "Entradas C1");
      }

      // C1 - Saídas
      const saidasC1Formatted = filterByPeriod(saidasC1).map(s => ({
        Operacao: s.operacao?.nome || "-",
        Data: s.dt,
        Tipo: s.tipo_saida,
        Cliente: s.parceiro?.nome_fantasia || s.parceiro?.razao_social || "-",
        Kg: s.kg_saida,
        Receita: s.receita_simulada_rs,
        Resultado: s.resultado_simulado_rs,
      }));
      if (saidasC1Formatted.length > 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(saidasC1Formatted), "Saídas C1");
      }
    }

    // Intermediação - Compras
    if (selectedCenario === "todos" || selectedCenario === "intermediacao") {
      const comprasFormatted = filterByPeriod(comprasInterm).map(c => ({
        Operacao: c.operacao?.nome || "-",
        Data: c.dt,
        Fornecedor: c.fornecedor?.nome_fantasia || c.fornecedor?.razao_social || "-",
        Dono: c.operacao?.dono?.nome_fantasia || c.operacao?.dono?.razao_social || "-",
        Tipo_Material: c.tipo_material,
        Kg: c.kg_comprado,
        Valor: c.valor_compra_rs,
      }));
      if (comprasFormatted.length > 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(comprasFormatted), "Compras Interm");
      }

      // Intermediação - Vendas
      const vendasFormatted = filterByPeriod(vendasInterm).map(v => ({
        Operacao: v.operacao?.nome || "-",
        Data: v.dt,
        Cliente: v.cliente?.nome_fantasia || v.cliente?.razao_social || "-",
        Dono: v.operacao?.dono?.nome_fantasia || v.operacao?.dono?.razao_social || "-",
        Kg: v.kg_vendido,
        Valor_Venda: v.valor_venda_rs,
        Comissao: v.comissao_ibrac_rs,
      }));
      if (vendasFormatted.length > 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(vendasFormatted), "Vendas Interm");
      }
    }

    // Terceiros - Entradas
    if (selectedCenario === "todos" || selectedCenario === "terceiros") {
      const entTercFormatted = filterByPeriod(entradasTerceiros).map(e => ({
        Operacao: e.operacao?.nome || "-",
        Data: e.dt,
        Cliente: e.operacao?.cliente?.nome_fantasia || e.operacao?.cliente?.razao_social || "-",
        Kg_Recebido: e.kg_recebido,
        Documento: e.documento || "-",
      }));
      if (entTercFormatted.length > 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(entTercFormatted), "Entradas Terceiros");
      }

      // Terceiros - Saídas
      const saidaTercFormatted = filterByPeriod(saidasTerceiros).map(s => ({
        Operacao: s.operacao?.nome || "-",
        Data: s.dt,
        Cliente: s.operacao?.cliente?.nome_fantasia || s.operacao?.cliente?.razao_social || "-",
        Kg_Devolvido: s.kg_devolvido,
        Documento: s.documento || "-",
      }));
      if (saidaTercFormatted.length > 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(saidaTercFormatted), "Saídas Terceiros");
      }
    }

    const filename = `Relatorio_Consolidado${filterDesc.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), "yyyyMMdd")}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  const isLoading = loadingC1;

  // Helper para nome de parceiro
  const getParceiroNome = (parceiro: any) => parceiro?.nome_fantasia || parceiro?.razao_social || "-";

  // Reset operacao when cenario changes
  const handleCenarioChange = (value: CenarioType) => {
    setSelectedCenario(value);
    setSelectedOperacao("todas");
  };

  // Clear all filters
  const handleClearFilters = () => {
    setDataInicio(format(startOfMonth(new Date()), "yyyy-MM-dd"));
    setDataFim(format(endOfMonth(new Date()), "yyyy-MM-dd"));
    setSelectedCenario("todos");
    setSelectedOperacao("todas");
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Relatórios Consolidados</h1>
            <p className="text-muted-foreground">
              Visão geral de todas as operações por período
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" onClick={handleExportPDF}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>

        {/* Filtros de Período e Operação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-40"
                />
              </div>
              
              {/* Filtro por Cenário */}
              <div className="space-y-2">
                <Label>Cenário</Label>
                <Select value={selectedCenario} onValueChange={handleCenarioChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Cenários</SelectItem>
                    <SelectItem value="c1">C1 - Material Próprio</SelectItem>
                    <SelectItem value="intermediacao">Intermediação</SelectItem>
                    <SelectItem value="terceiros">Terceiros (Serviço)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Filtro por Operação */}
              <div className="space-y-2">
                <Label>Operação</Label>
                <Select value={selectedOperacao} onValueChange={setSelectedOperacao}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Todas as Operações" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as Operações</SelectItem>
                    {operacoesDisponiveis.map(op => (
                      <SelectItem key={op.id} value={op.id}>{op.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                variant="outline"
                onClick={handleClearFilters}
              >
                Limpar Filtros
              </Button>
            </div>
            
            {/* Show active filters */}
            {(selectedCenario !== "todos" || selectedOperacao !== "todas") && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedCenario !== "todos" && (
                  <Badge variant="secondary">
                    Cenário: {selectedCenario === "c1" ? "C1" : selectedCenario === "intermediacao" ? "Intermediação" : "Terceiros"}
                  </Badge>
                )}
                {selectedOperacao !== "todas" && (
                  <Badge variant="secondary">
                    Operação: {operacoesDisponiveis.find(o => o.id === selectedOperacao)?.nome}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            {/* KPIs Gerais */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Package className="h-4 w-4" /> Operações Ativas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {totais.operacoesAtivas.c1 + totais.operacoesAtivas.intermediacao + totais.operacoesAtivas.terceiros}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    C1: {totais.operacoesAtivas.c1} | Interm: {totais.operacoesAtivas.intermediacao} | Terc: {totais.operacoesAtivas.terceiros}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Scale className="h-4 w-4" /> Total Kg Movimentado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatWeight(totais.c1.kgComprado + totais.intermediacao.kgComprado + totais.terceiros.kgRecebido)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Entrada no período</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> Receita Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(totais.c1.receita + totais.intermediacao.valorVendas + totais.terceiros.receitaServico)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Vendas + Serviços</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Resultado C1
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${totais.c1.resultado >= 0 ? "text-success" : "text-destructive"}`}>
                    {formatCurrency(totais.c1.resultado)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Comissão Interm: {formatCurrency(totais.intermediacao.comissao)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Detalhes por Cenário */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="resumo">Resumo</TabsTrigger>
                <TabsTrigger value="c1" disabled={selectedCenario !== "todos" && selectedCenario !== "c1"}>
                  C1 - Material Próprio
                </TabsTrigger>
                <TabsTrigger value="intermediacao" disabled={selectedCenario !== "todos" && selectedCenario !== "intermediacao"}>
                  Intermediação
                </TabsTrigger>
                <TabsTrigger value="terceiros" disabled={selectedCenario !== "todos" && selectedCenario !== "terceiros"}>
                  Terceiros (Serviço)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="resumo" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Resumo por Cenário</CardTitle>
                    <CardDescription>
                      Período: {format(parseISO(dataInicio), "dd/MM/yyyy", { locale: ptBR })} até {format(parseISO(dataFim), "dd/MM/yyyy", { locale: ptBR })}
                      {getFilterDescription() && <span className="ml-2 text-primary">{getFilterDescription()}</span>}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cenário</TableHead>
                          <TableHead className="text-right">Kg Entrada</TableHead>
                          <TableHead className="text-right">Kg Saída</TableHead>
                          <TableHead className="text-right">Valor Entrada</TableHead>
                          <TableHead className="text-right">Valor Saída</TableHead>
                          <TableHead className="text-right">Resultado/Comissão</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(selectedCenario === "todos" || selectedCenario === "c1") && (
                          <TableRow>
                            <TableCell className="font-medium">
                              <Badge>C1</Badge> Material Próprio
                            </TableCell>
                            <TableCell className="text-right">{formatWeight(totais.c1.kgComprado)}</TableCell>
                            <TableCell className="text-right">{formatWeight(totais.c1.kgVendido)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(totais.c1.custoTotal)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(totais.c1.receita)}</TableCell>
                            <TableCell className={`text-right font-bold ${totais.c1.resultado >= 0 ? "text-success" : "text-destructive"}`}>
                              {formatCurrency(totais.c1.resultado)}
                            </TableCell>
                          </TableRow>
                        )}
                        {(selectedCenario === "todos" || selectedCenario === "intermediacao") && (
                          <TableRow>
                            <TableCell className="font-medium">
                              <Badge variant="secondary">C2</Badge> Intermediação
                            </TableCell>
                            <TableCell className="text-right">{formatWeight(totais.intermediacao.kgComprado)}</TableCell>
                            <TableCell className="text-right">{formatWeight(totais.intermediacao.kgVendido)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(totais.intermediacao.valorCompras)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(totais.intermediacao.valorVendas)}</TableCell>
                            <TableCell className="text-right font-bold text-success">
                              {formatCurrency(totais.intermediacao.comissao)}
                            </TableCell>
                          </TableRow>
                        )}
                        {(selectedCenario === "todos" || selectedCenario === "terceiros") && (
                          <TableRow>
                            <TableCell className="font-medium">
                              <Badge variant="outline">C3</Badge> Terceiros (Serviço)
                            </TableCell>
                            <TableCell className="text-right">{formatWeight(totais.terceiros.kgRecebido)}</TableCell>
                            <TableCell className="text-right">{formatWeight(totais.terceiros.kgDevolvido)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(totais.terceiros.custoServico)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(totais.terceiros.receitaServico)}</TableCell>
                            <TableCell className={`text-right font-bold ${(totais.terceiros.receitaServico - totais.terceiros.custoServico) >= 0 ? "text-success" : "text-destructive"}`}>
                              {formatCurrency(totais.terceiros.receitaServico - totais.terceiros.custoServico)}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab C1 - Material Próprio */}
              <TabsContent value="c1" className="mt-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Fluxo C1 - Material Próprio
                    </CardTitle>
                    <CardDescription>
                      Compra → Beneficiamento → Venda
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Entradas C1 */}
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Entradas (Compras)
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8"></TableHead>
                            <TableHead>Operação</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Ticket/NF</TableHead>
                            <TableHead className="text-right">Kg Ticket</TableHead>
                            <TableHead className="text-right">Kg Líquido</TableHead>
                            <TableHead className="text-right">Custo</TableHead>
                            <TableHead>Beneficiador</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filterByPeriod(entradasC1).length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center text-muted-foreground py-4">
                                Nenhuma entrada no período
                              </TableCell>
                            </TableRow>
                          ) : (
                            filterByPeriod(entradasC1).map((e) => (
                              <Collapsible key={e.id} open={expandedC1 === e.id} onOpenChange={() => setExpandedC1(expandedC1 === e.id ? null : e.id)}>
                                <TableRow className="cursor-pointer hover:bg-muted/50">
                                  <TableCell>
                                    <CollapsibleTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                        {expandedC1 === e.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                      </Button>
                                    </CollapsibleTrigger>
                                  </TableCell>
                                  <TableCell className="font-medium">{e.operacao?.nome || "-"}</TableCell>
                                  <TableCell>{format(parseISO(e.dt_recebimento || e.created_at), "dd/MM/yy")}</TableCell>
                                  <TableCell>{e.ticket_num || e.nf_num || "-"}</TableCell>
                                  <TableCell className="text-right">{formatWeight(e.kg_ticket || 0)}</TableCell>
                                  <TableCell className="text-right">{formatWeight(e.kg_liquido_total || 0)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(e.custos_pre_total_rs || 0)}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                      <Factory className="h-3 w-3" />
                                      {getParceiroNome(e.operacao?.beneficiador)}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                                <CollapsibleContent asChild>
                                  <TableRow className="bg-muted/30">
                                    <TableCell colSpan={8} className="py-3">
                                      <div className="flex items-center gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground">Procedência:</span>
                                          <span>{e.procedencia || "Não informada"}</span>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                        <div className="flex items-center gap-2">
                                          <Factory className="h-4 w-4 text-primary" />
                                          <span className="text-muted-foreground">Beneficiador:</span>
                                          <span className="font-medium">{getParceiroNome(e.operacao?.beneficiador)}</span>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground">Perda Mel:</span>
                                          <span>{(e.perda_mel_pct * 100).toFixed(1)}%</span>
                                          <span className="text-muted-foreground">| Mista:</span>
                                          <span>{(e.perda_mista_pct * 100).toFixed(1)}%</span>
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                </CollapsibleContent>
                              </Collapsible>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Saídas C1 */}
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <ArrowRight className="h-4 w-4" /> Saídas (Vendas/Consumo)
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Operação</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead className="text-right">Kg</TableHead>
                            <TableHead className="text-right">Receita</TableHead>
                            <TableHead className="text-right">Resultado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filterByPeriod(saidasC1).length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                                Nenhuma saída no período
                              </TableCell>
                            </TableRow>
                          ) : (
                            filterByPeriod(saidasC1).map((s) => (
                              <TableRow key={s.id}>
                                <TableCell className="font-medium">{s.operacao?.nome || "-"}</TableCell>
                                <TableCell>{format(parseISO(s.dt), "dd/MM/yy")}</TableCell>
                                <TableCell>
                                  <Badge variant={s.tipo_saida === "VENDA" ? "default" : "secondary"}>
                                    {s.tipo_saida}
                                  </Badge>
                                </TableCell>
                                <TableCell>{getParceiroNome(s.parceiro)}</TableCell>
                                <TableCell className="text-right">{formatWeight(s.kg_saida || 0)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(s.receita_simulada_rs || 0)}</TableCell>
                                <TableCell className={`text-right font-bold ${(s.resultado_simulado_rs || 0) >= 0 ? "text-success" : "text-destructive"}`}>
                                  {formatCurrency(s.resultado_simulado_rs || 0)}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab Intermediação */}
              <TabsContent value="intermediacao" className="mt-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Fluxo Intermediação
                    </CardTitle>
                    <CardDescription>
                      IBRAC opera em nome do Dono: Compra → Beneficia → Vende
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Compras Intermediação */}
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Compras
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8"></TableHead>
                            <TableHead>Operação</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Fornecedor</TableHead>
                            <TableHead>Dono</TableHead>
                            <TableHead className="text-right">Kg</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filterByPeriod(comprasInterm).length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                                Nenhuma compra no período
                              </TableCell>
                            </TableRow>
                          ) : (
                            filterByPeriod(comprasInterm).map((c) => (
                              <Collapsible key={c.id} open={expandedInterm === c.id} onOpenChange={() => setExpandedInterm(expandedInterm === c.id ? null : c.id)}>
                                <TableRow className="cursor-pointer hover:bg-muted/50">
                                  <TableCell>
                                    <CollapsibleTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                        {expandedInterm === c.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                      </Button>
                                    </CollapsibleTrigger>
                                  </TableCell>
                                  <TableCell className="font-medium">{c.operacao?.nome || "-"}</TableCell>
                                  <TableCell>{format(parseISO(c.dt), "dd/MM/yy")}</TableCell>
                                  <TableCell>{getParceiroNome(c.fornecedor)}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                      <Users className="h-3 w-3" />
                                      {getParceiroNome(c.operacao?.dono)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">{formatWeight(c.kg_comprado || 0)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(c.valor_compra_rs || 0)}</TableCell>
                                </TableRow>
                                <CollapsibleContent asChild>
                                  <TableRow className="bg-muted/30">
                                    <TableCell colSpan={7} className="py-3">
                                      <div className="flex items-center gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground">Tipo Material:</span>
                                          <span>{c.tipo_material || "Não informado"}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground">NF:</span>
                                          <span>{c.nf_compra || "-"}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground">Preço/kg:</span>
                                          <span>{formatCurrency(c.preco_compra_rkg || 0)}</span>
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                </CollapsibleContent>
                              </Collapsible>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Vendas Intermediação */}
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <ArrowRight className="h-4 w-4" /> Vendas
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Operação</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Dono</TableHead>
                            <TableHead className="text-right">Kg</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead className="text-right">Comissão</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filterByPeriod(vendasInterm).length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                                Nenhuma venda no período
                              </TableCell>
                            </TableRow>
                          ) : (
                            filterByPeriod(vendasInterm).map((v) => (
                              <TableRow key={v.id}>
                                <TableCell className="font-medium">{v.operacao?.nome || "-"}</TableCell>
                                <TableCell>{format(parseISO(v.dt), "dd/MM/yy")}</TableCell>
                                <TableCell>{getParceiroNome(v.cliente)}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                    <Users className="h-3 w-3" />
                                    {getParceiroNome(v.operacao?.dono)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">{formatWeight(v.kg_vendido || 0)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(v.valor_venda_rs || 0)}</TableCell>
                                <TableCell className="text-right font-bold text-success">
                                  {formatCurrency(v.comissao_ibrac_rs || 0)}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab Terceiros */}
              <TabsContent value="terceiros" className="mt-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Factory className="h-5 w-5" />
                      Fluxo Terceiros (Serviço)
                    </CardTitle>
                    <CardDescription>
                      Cliente envia material → IBRAC processa → Devolve para cliente
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Entradas Terceiros */}
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Entradas (Recebimentos)
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8"></TableHead>
                            <TableHead>Operação</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead className="text-right">Kg Recebido</TableHead>
                            <TableHead>Documento</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filterByPeriod(entradasTerceiros).length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                                Nenhuma entrada no período
                              </TableCell>
                            </TableRow>
                          ) : (
                            filterByPeriod(entradasTerceiros).map((e) => (
                              <Collapsible key={e.id} open={expandedTerc === e.id} onOpenChange={() => setExpandedTerc(expandedTerc === e.id ? null : e.id)}>
                                <TableRow className="cursor-pointer hover:bg-muted/50">
                                  <TableCell>
                                    <CollapsibleTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                        {expandedTerc === e.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                      </Button>
                                    </CollapsibleTrigger>
                                  </TableCell>
                                  <TableCell className="font-medium">{e.operacao?.nome || "-"}</TableCell>
                                  <TableCell>{format(parseISO(e.dt), "dd/MM/yy")}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                      <Users className="h-3 w-3" />
                                      {getParceiroNome(e.operacao?.cliente)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">{formatWeight(e.kg_recebido || 0)}</TableCell>
                                  <TableCell>{e.documento || "-"}</TableCell>
                                </TableRow>
                                <CollapsibleContent asChild>
                                  <TableRow className="bg-muted/30">
                                    <TableCell colSpan={6} className="py-3">
                                      <div className="flex items-center gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                          <Factory className="h-4 w-4 text-primary" />
                                          <span className="text-muted-foreground">Beneficiador:</span>
                                          <span className="font-medium">{getParceiroNome(e.operacao?.beneficiador)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground">Valor Ref:</span>
                                          <span>{formatCurrency(e.valor_ref_rkg || 0)}/kg</span>
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                </CollapsibleContent>
                              </Collapsible>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Saídas Terceiros */}
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <ArrowRight className="h-4 w-4" /> Saídas (Devoluções)
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Operação</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead className="text-right">Kg Devolvido</TableHead>
                            <TableHead>Documento</TableHead>
                            <TableHead className="text-right">Custo Serviço</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filterByPeriod(saidasTerceiros).length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                                Nenhuma saída no período
                              </TableCell>
                            </TableRow>
                          ) : (
                            filterByPeriod(saidasTerceiros).map((s) => (
                              <TableRow key={s.id}>
                                <TableCell className="font-medium">{s.operacao?.nome || "-"}</TableCell>
                                <TableCell>{format(parseISO(s.dt), "dd/MM/yy")}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                    <Users className="h-3 w-3" />
                                    {getParceiroNome(s.operacao?.cliente)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">{formatWeight(s.kg_devolvido || 0)}</TableCell>
                                <TableCell>{s.documento || "-"}</TableCell>
                                <TableCell className="text-right">{formatCurrency(s.custo_servico_saida_rs || 0)}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </MainLayout>
  );
}

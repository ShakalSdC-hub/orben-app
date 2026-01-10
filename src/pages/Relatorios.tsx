import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  FileText, Download, Printer, Calendar, TrendingUp, Package, 
  DollarSign, Scale, Loader2, FileSpreadsheet, ChevronDown, ChevronRight, 
  ArrowRight, Factory, Users
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatWeight, formatCurrency } from "@/lib/kpis";
import { useExportReport } from "@/hooks/useExportReport";
import * as XLSX from "xlsx";

export default function Relatorios() {
  const { exportToExcel, printReport } = useExportReport();
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [activeTab, setActiveTab] = useState("resumo");
  const [expandedC1, setExpandedC1] = useState<string | null>(null);
  const [expandedInterm, setExpandedInterm] = useState<string | null>(null);
  const [expandedTerc, setExpandedTerc] = useState<string | null>(null);

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
        .select("*, operacao:operacoes(nome, beneficiador:parceiros!operacoes_beneficiador_id_fkey(razao_social, nome_fantasia))")
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
        .select("*, operacao:operacoes(nome, beneficiador:parceiros!operacoes_beneficiador_id_fkey(razao_social, nome_fantasia))")
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
        .select("*, operacao:operacoes(nome, beneficiador:parceiros!operacoes_beneficiador_id_fkey(razao_social, nome_fantasia)), parceiro:parceiros!saidas_c1_parceiro_destino_id_fkey(razao_social, nome_fantasia)")
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
            nome, 
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
            nome,
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
            nome, 
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
            nome,
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
            nome,
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
            nome,
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
          operacao:operacoes_terceiros(nome, cliente:parceiros!operacoes_terceiros_cliente_id_fkey(razao_social, nome_fantasia))
        `)
        .eq("is_deleted", false);
      if (error) throw error;
      return data;
    },
  });

  // Filtrar dados pelo período
  const filterByPeriod = <T extends { dt?: string; dt_recebimento?: string; created_at?: string }>(data: T[]) => {
    return data.filter((item) => {
      const date = item.dt || item.dt_recebimento || item.created_at;
      if (!date) return false;
      try {
        const itemDate = parseISO(date);
        return isWithinInterval(itemDate, { start: parseISO(dataInicio), end: parseISO(dataFim) });
      } catch {
        return false;
      }
    });
  };

  // Calcular totais
  const totais = useMemo(() => {
    const entradasPeriodo = filterByPeriod(entradasC1);
    const benefPeriodo = filterByPeriod(benefC1);
    const saidasPeriodo = filterByPeriod(saidasC1);
    const comprasPeriodo = filterByPeriod(comprasInterm);
    const vendasPeriodo = filterByPeriod(vendasInterm);
    const entTercPeriodo = filterByPeriod(entradasTerceiros);
    const benefTercPeriodo = filterByPeriod(benefTerceiros);
    const saidaTercPeriodo = filterByPeriod(saidasTerceiros);
    const cobrancasTercPeriodo = filterByPeriod(cobrancasTerceiros);

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
  }, [entradasC1, benefC1, saidasC1, comprasInterm, vendasInterm, entradasTerceiros, benefTerceiros, saidasTerceiros, cobrancasTerceiros, operacoesC1, operacoesInterm, operacoesTerceiros, dataInicio, dataFim]);

  const handleExportPDF = () => {
    const data = [
      { "Cenário": "C1 - Material Próprio", "Kg Entrada": formatWeight(totais.c1.kgComprado), "Kg Saída": formatWeight(totais.c1.kgVendido), "Receita": formatCurrency(totais.c1.receita), "Resultado": formatCurrency(totais.c1.resultado) },
      { "Cenário": "Intermediação", "Kg Entrada": formatWeight(totais.intermediacao.kgComprado), "Kg Saída": formatWeight(totais.intermediacao.kgVendido), "Receita": formatCurrency(totais.intermediacao.valorVendas), "Resultado": formatCurrency(totais.intermediacao.comissao) },
      { "Cenário": "Terceiros (Serviço)", "Kg Entrada": formatWeight(totais.terceiros.kgRecebido), "Kg Saída": formatWeight(totais.terceiros.kgDevolvido), "Receita": formatCurrency(totais.terceiros.receitaServico), "Resultado": formatCurrency(totais.terceiros.receitaServico - totais.terceiros.custoServico) },
    ];
    printReport(`Relatório Consolidado ${format(parseISO(dataInicio), "dd/MM/yyyy")} - ${format(parseISO(dataFim), "dd/MM/yyyy")}`, data, ["Cenário", "Kg Entrada", "Kg Saída", "Receita", "Resultado"]);
  };

  const handleExportExcel = () => {
    const resumo = [
      { Cenario: "C1 - Material Próprio", Kg_Entrada: totais.c1.kgComprado, Kg_Saida: totais.c1.kgVendido, Receita: totais.c1.receita, Resultado: totais.c1.resultado },
      { Cenario: "Intermediação", Kg_Entrada: totais.intermediacao.kgComprado, Kg_Saida: totais.intermediacao.kgVendido, Receita: totais.intermediacao.valorVendas, Resultado: totais.intermediacao.comissao },
      { Cenario: "Terceiros", Kg_Entrada: totais.terceiros.kgRecebido, Kg_Saida: totais.terceiros.kgDevolvido, Custo_Servico: totais.terceiros.custoServico, Receita_Servico: totais.terceiros.receitaServico },
    ];

    const workbook = XLSX.utils.book_new();
    const wsResumo = XLSX.utils.json_to_sheet(resumo);
    XLSX.utils.book_append_sheet(workbook, wsResumo, "Resumo");

    // C1 - Entradas
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

    // Intermediação - Compras
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

    // Terceiros - Entradas
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

    XLSX.writeFile(workbook, `Relatorio_Consolidado_${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const isLoading = loadingC1;

  // Helper para nome de parceiro
  const getParceiroNome = (parceiro: any) => parceiro?.nome_fantasia || parceiro?.razao_social || "-";

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

        {/* Filtros de Período */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              Período
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
              <Button
                variant="outline"
                onClick={() => {
                  setDataInicio(format(startOfMonth(new Date()), "yyyy-MM-dd"));
                  setDataFim(format(endOfMonth(new Date()), "yyyy-MM-dd"));
                }}
              >
                Mês Atual
              </Button>
            </div>
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
                <TabsTrigger value="c1">C1 - Material Próprio</TabsTrigger>
                <TabsTrigger value="intermediacao">Intermediação</TabsTrigger>
                <TabsTrigger value="terceiros">Terceiros (Serviço)</TabsTrigger>
              </TabsList>

              <TabsContent value="resumo" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Resumo por Cenário</CardTitle>
                    <CardDescription>
                      Período: {format(parseISO(dataInicio), "dd/MM/yyyy", { locale: ptBR })} até {format(parseISO(dataFim), "dd/MM/yyyy", { locale: ptBR })}
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
                        <TrendingUp className="h-4 w-4" /> Saídas (Vendas/Consumo)
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Operação</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Destino</TableHead>
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
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {getParceiroNome(s.parceiro) || "Consumo interno"}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">{formatWeight(s.kg_saida)}</TableCell>
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
                      Compra (Dono) → Beneficiamento → Venda → Comissão IBRAC
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Compras */}
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
                            <TableHead>Dono Material</TableHead>
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
                                    <Badge variant="secondary">{getParceiroNome(c.operacao?.dono)}</Badge>
                                  </TableCell>
                                  <TableCell className="text-right">{formatWeight(c.kg_comprado)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(c.valor_compra_rs || 0)}</TableCell>
                                </TableRow>
                                <CollapsibleContent asChild>
                                  <TableRow className="bg-muted/30">
                                    <TableCell colSpan={7} className="py-3">
                                      <div className="flex items-center gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                          <Users className="h-4 w-4" />
                                          <span className="text-muted-foreground">Fornecedor:</span>
                                          <span>{getParceiroNome(c.fornecedor)}</span>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                        <div className="flex items-center gap-2">
                                          <Factory className="h-4 w-4 text-primary" />
                                          <span className="text-muted-foreground">Beneficiador:</span>
                                          <span className="font-medium">{getParceiroNome(c.operacao?.beneficiador)}</span>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground">Tipo:</span>
                                          <Badge variant="outline">{c.tipo_material || "Não especificado"}</Badge>
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

                    {/* Vendas */}
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" /> Vendas
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Operação</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Dono Material</TableHead>
                            <TableHead className="text-right">Kg</TableHead>
                            <TableHead className="text-right">Valor Venda</TableHead>
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
                                  <Badge variant="secondary">{getParceiroNome(v.operacao?.dono)}</Badge>
                                </TableCell>
                                <TableCell className="text-right">{formatWeight(v.kg_vendido)}</TableCell>
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

              {/* Tab Terceiros (Serviço) */}
              <TabsContent value="terceiros" className="mt-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Factory className="h-5 w-5" />
                      Fluxo Terceiros (Serviço)
                    </CardTitle>
                    <CardDescription>
                      Recebimento (Cliente) → Beneficiamento → Devolução → Cobrança
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* KPIs Terceiros */}
                    <div className="grid gap-4 md:grid-cols-4 mb-4">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Kg Recebido</p>
                        <p className="text-xl font-bold">{formatWeight(totais.terceiros.kgRecebido)}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Kg Beneficiado</p>
                        <p className="text-xl font-bold">{formatWeight(totais.terceiros.kgBeneficiado)}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Kg Devolvido</p>
                        <p className="text-xl font-bold">{formatWeight(totais.terceiros.kgDevolvido)}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Resultado Serviço</p>
                        <p className={`text-xl font-bold ${(totais.terceiros.receitaServico - totais.terceiros.custoServico) >= 0 ? "text-success" : "text-destructive"}`}>
                          {formatCurrency(totais.terceiros.receitaServico - totais.terceiros.custoServico)}
                        </p>
                      </div>
                    </div>

                    {/* Recebimentos */}
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Recebimentos do Cliente
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8"></TableHead>
                            <TableHead>Operação</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Documento</TableHead>
                            <TableHead className="text-right">Kg Recebido</TableHead>
                            <TableHead>Beneficiador</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filterByPeriod(entradasTerceiros).length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                                Nenhum recebimento no período
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
                                    <Badge variant="outline">{getParceiroNome(e.operacao?.cliente)}</Badge>
                                  </TableCell>
                                  <TableCell>{e.documento || "-"}</TableCell>
                                  <TableCell className="text-right">{formatWeight(e.kg_recebido)}</TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                                      <Factory className="h-3 w-3" />
                                      {getParceiroNome(e.operacao?.beneficiador)}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                                <CollapsibleContent asChild>
                                  <TableRow className="bg-muted/30">
                                    <TableCell colSpan={7} className="py-3">
                                      <div className="flex items-center gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                          <Users className="h-4 w-4" />
                                          <span className="text-muted-foreground">Cliente (Dono):</span>
                                          <span className="font-medium">{getParceiroNome(e.operacao?.cliente)}</span>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                        <div className="flex items-center gap-2">
                                          <Factory className="h-4 w-4 text-primary" />
                                          <span className="text-muted-foreground">Beneficiador:</span>
                                          <span className="font-medium">{getParceiroNome(e.operacao?.beneficiador)}</span>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
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

                    {/* Beneficiamentos Terceiros */}
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Factory className="h-4 w-4" /> Beneficiamentos
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Operação</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Beneficiador</TableHead>
                            <TableHead className="text-right">Kg Retornado</TableHead>
                            <TableHead className="text-right">Kg Disp. Cliente</TableHead>
                            <TableHead className="text-right">Custo Serviço</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filterByPeriod(benefTerceiros).length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                                Nenhum beneficiamento no período
                              </TableCell>
                            </TableRow>
                          ) : (
                            filterByPeriod(benefTerceiros).map((b) => (
                              <TableRow key={b.id}>
                                <TableCell className="font-medium">{b.operacao?.nome || "-"}</TableCell>
                                <TableCell>{format(parseISO(b.dt), "dd/MM/yy")}</TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                                    <Factory className="h-3 w-3" />
                                    {getParceiroNome(b.operacao?.beneficiador)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">{formatWeight(b.kg_retornado)}</TableCell>
                                <TableCell className="text-right">{formatWeight(b.kg_disponivel_cliente || 0)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(b.custos_servico_total_rs || 0)}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Devoluções */}
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" /> Devoluções ao Cliente
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Operação</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Documento</TableHead>
                            <TableHead className="text-right">Kg Devolvido</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filterByPeriod(saidasTerceiros).length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                                Nenhuma devolução no período
                              </TableCell>
                            </TableRow>
                          ) : (
                            filterByPeriod(saidasTerceiros).map((s) => (
                              <TableRow key={s.id}>
                                <TableCell className="font-medium">{s.operacao?.nome || "-"}</TableCell>
                                <TableCell>{format(parseISO(s.dt), "dd/MM/yy")}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{getParceiroNome(s.operacao?.cliente)}</Badge>
                                </TableCell>
                                <TableCell>{s.documento || "-"}</TableCell>
                                <TableCell className="text-right">{formatWeight(s.kg_devolvido)}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Cobranças */}
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" /> Cobranças de Serviço
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Operação</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Documento</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filterByPeriod(cobrancasTerceiros).length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                                Nenhuma cobrança no período
                              </TableCell>
                            </TableRow>
                          ) : (
                            filterByPeriod(cobrancasTerceiros).map((c) => (
                              <TableRow key={c.id}>
                                <TableCell className="font-medium">{c.operacao?.nome || "-"}</TableCell>
                                <TableCell>{format(parseISO(c.dt), "dd/MM/yy")}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{getParceiroNome(c.operacao?.cliente)}</Badge>
                                </TableCell>
                                <TableCell>{c.tipo || "-"}</TableCell>
                                <TableCell>{c.documento || "-"}</TableCell>
                                <TableCell className="text-right font-bold text-success">
                                  {formatCurrency(c.val || 0)}
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
            </Tabs>
          </>
        )}
      </div>
    </MainLayout>
  );
}

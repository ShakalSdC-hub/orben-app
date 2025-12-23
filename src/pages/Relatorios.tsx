import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, Download, Printer, Calendar, TrendingUp, Package, 
  DollarSign, Scale, Loader2, FileSpreadsheet 
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

  // Queries para todas as operações
  const { data: operacoesC1 = [], isLoading: loadingC1 } = useQuery({
    queryKey: ["operacoes_c1_report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operacoes")
        .select("*, beneficiador:parceiros!operacoes_beneficiador_id_fkey(razao_social)")
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
        .select("*, operacao:operacoes(nome)")
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
        .select("*, operacao:operacoes(nome)")
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
        .select("*, operacao:operacoes(nome), parceiro:parceiros!saidas_c1_parceiro_destino_id_fkey(razao_social)")
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
        .select("*, dono:parceiros!operacoes_intermediacao_dono_economico_id_fkey(razao_social)")
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
        .select("*, operacao:operacoes_intermediacao(nome), fornecedor:parceiros!compras_intermediacao_fornecedor_compra_id_fkey(razao_social)")
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
        .select("*, operacao:operacoes_intermediacao(nome), cliente:parceiros!vendas_intermediacao_cliente_id_fkey(razao_social)")
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
        .select("*, cliente:parceiros!operacoes_terceiros_cliente_id_fkey(razao_social)")
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
        .select("*, operacao:operacoes_terceiros(nome)")
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
        .select("*, operacao:operacoes_terceiros(nome)")
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
    const saidaTercPeriodo = filterByPeriod(saidasTerceiros);

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
        kgDevolvido: saidaTercPeriodo.reduce((acc, s) => acc + (s.kg_devolvido || 0), 0),
        custoServico: saidaTercPeriodo.reduce((acc, s) => acc + (s.custo_servico_saida_rs || 0), 0),
      },
      operacoesAtivas: {
        c1: operacoesC1.filter(o => o.status === "ABERTA").length,
        intermediacao: operacoesInterm.filter(o => o.status === "ABERTA").length,
        terceiros: operacoesTerceiros.filter(o => o.status === "ABERTA").length,
      },
    };
  }, [entradasC1, benefC1, saidasC1, comprasInterm, vendasInterm, entradasTerceiros, saidasTerceiros, operacoesC1, operacoesInterm, operacoesTerceiros, dataInicio, dataFim]);

  const handleExportPDF = () => {
    const data = [
      { "Cenário": "C1 - Material Próprio", "Kg Comprado": formatWeight(totais.c1.kgComprado), "Kg Vendido": formatWeight(totais.c1.kgVendido), "Receita": formatCurrency(totais.c1.receita), "Resultado": formatCurrency(totais.c1.resultado) },
      { "Cenário": "Intermediação", "Kg Comprado": formatWeight(totais.intermediacao.kgComprado), "Kg Vendido": formatWeight(totais.intermediacao.kgVendido), "Receita": formatCurrency(totais.intermediacao.valorVendas), "Resultado": formatCurrency(totais.intermediacao.comissao) },
      { "Cenário": "Terceiros (Serviço)", "Kg Comprado": formatWeight(totais.terceiros.kgRecebido), "Kg Vendido": formatWeight(totais.terceiros.kgDevolvido), "Receita": formatCurrency(totais.terceiros.custoServico), "Resultado": "-" },
    ];
    printReport(`Relatório Consolidado ${format(parseISO(dataInicio), "dd/MM/yyyy")} - ${format(parseISO(dataFim), "dd/MM/yyyy")}`, data, ["Cenário", "Kg Comprado", "Kg Vendido", "Receita", "Resultado"]);
  };

  const handleExportExcel = () => {
    const resumo = [
      { Cenario: "C1 - Material Próprio", Kg_Comprado: totais.c1.kgComprado, Kg_Vendido: totais.c1.kgVendido, Receita: totais.c1.receita, Resultado: totais.c1.resultado },
      { Cenario: "Intermediação", Kg_Comprado: totais.intermediacao.kgComprado, Kg_Vendido: totais.intermediacao.kgVendido, Receita: totais.intermediacao.valorVendas, Resultado: totais.intermediacao.comissao },
      { Cenario: "Terceiros", Kg_Recebido: totais.terceiros.kgRecebido, Kg_Devolvido: totais.terceiros.kgDevolvido, Custo_Servico: totais.terceiros.custoServico },
    ];

    const workbook = XLSX.utils.book_new();
    const wsResumo = XLSX.utils.json_to_sheet(resumo);
    XLSX.utils.book_append_sheet(workbook, wsResumo, "Resumo");

    // Add detail sheets
    const entradasFormatted = filterByPeriod(entradasC1).map(e => ({
      Operacao: e.operacao?.nome || "-",
      Data: e.dt_recebimento,
      Ticket: e.ticket_num || "-",
      Kg_Ticket: e.kg_ticket,
      Kg_Liquido: e.kg_liquido_total,
      Custo_Total: e.custos_pre_total_rs,
    }));
    if (entradasFormatted.length > 0) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(entradasFormatted), "Entradas C1");
    }

    const saidasFormatted = filterByPeriod(saidasC1).map(s => ({
      Operacao: s.operacao?.nome || "-",
      Data: s.dt,
      Tipo: s.tipo_saida,
      Cliente: s.parceiro?.razao_social || "-",
      Kg: s.kg_saida,
      Receita: s.receita_simulada_rs,
      Resultado: s.resultado_simulado_rs,
    }));
    if (saidasFormatted.length > 0) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(saidasFormatted), "Saídas C1");
    }

    XLSX.writeFile(workbook, `Relatorio_Consolidado_${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const isLoading = loadingC1;

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
                    {formatCurrency(totais.c1.receita + totais.intermediacao.valorVendas + totais.terceiros.custoServico)}
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="resumo">Resumo</TabsTrigger>
                <TabsTrigger value="c1">C1 - Material Próprio</TabsTrigger>
                <TabsTrigger value="intermediacao">Intermediação</TabsTrigger>
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
                            <Badge variant="outline">C3</Badge> Terceiros
                          </TableCell>
                          <TableCell className="text-right">{formatWeight(totais.terceiros.kgRecebido)}</TableCell>
                          <TableCell className="text-right">{formatWeight(totais.terceiros.kgDevolvido)}</TableCell>
                          <TableCell className="text-right">-</TableCell>
                          <TableCell className="text-right">{formatCurrency(totais.terceiros.custoServico)}</TableCell>
                          <TableCell className="text-right">-</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="c1" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Detalhes C1 - Material Próprio</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-medium mb-2">Entradas no Período</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Operação</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Ticket</TableHead>
                            <TableHead className="text-right">Kg Ticket</TableHead>
                            <TableHead className="text-right">Kg Líquido</TableHead>
                            <TableHead className="text-right">Custo Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filterByPeriod(entradasC1).slice(0, 10).map((e) => (
                            <TableRow key={e.id}>
                              <TableCell>{e.operacao?.nome || "-"}</TableCell>
                              <TableCell>{format(parseISO(e.dt_recebimento || e.created_at), "dd/MM/yy")}</TableCell>
                              <TableCell>{e.ticket_num || e.nf_num || "-"}</TableCell>
                              <TableCell className="text-right">{formatWeight(e.kg_ticket || 0)}</TableCell>
                              <TableCell className="text-right">{formatWeight(e.kg_liquido_total || 0)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(e.custos_pre_total_rs || 0)}</TableCell>
                            </TableRow>
                          ))}
                          {filterByPeriod(entradasC1).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground">
                                Nenhuma entrada no período
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="intermediacao" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Detalhes Intermediação</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-medium mb-2">Vendas no Período</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Operação</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead className="text-right">Kg</TableHead>
                            <TableHead className="text-right">Valor Venda</TableHead>
                            <TableHead className="text-right">Comissão</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filterByPeriod(vendasInterm).slice(0, 10).map((v) => (
                            <TableRow key={v.id}>
                              <TableCell>{v.operacao?.nome || "-"}</TableCell>
                              <TableCell>{format(parseISO(v.dt), "dd/MM/yy")}</TableCell>
                              <TableCell>{v.cliente?.razao_social || "-"}</TableCell>
                              <TableCell className="text-right">{formatWeight(v.kg_vendido)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(v.valor_venda_rs || 0)}</TableCell>
                              <TableCell className="text-right text-success">{formatCurrency(v.comissao_ibrac_rs || 0)}</TableCell>
                            </TableRow>
                          ))}
                          {filterByPeriod(vendasInterm).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground">
                                Nenhuma venda no período
                              </TableCell>
                            </TableRow>
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

import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DollarSign, TrendingUp, TrendingDown, Users, AlertTriangle, CheckCircle, 
  Clock, Calculator, ArrowUpRight, ArrowDownRight, Wallet, PiggyBank,
  BarChart3, Loader2, Check
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend, LineChart, Line, ComposedChart
} from "recharts";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatWeight(kg: number) {
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)}t`;
  return `${kg.toFixed(0)}kg`;
}

const CHART_COLORS = {
  primary: "hsl(28, 70%, 45%)",
  success: "hsl(142, 60%, 40%)",
  warning: "hsl(45, 80%, 50%)",
  danger: "hsl(0, 70%, 50%)",
  info: "hsl(220, 70%, 50%)",
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  pendente: { label: "Pendente", variant: "outline", icon: Clock },
  pago: { label: "Pago", variant: "default", icon: CheckCircle },
  cancelado: { label: "Cancelado", variant: "destructive", icon: AlertTriangle },
};

export default function Financeiro() {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const canConciliar = role === "admin" || role === "financeiro";
  const [periodoFluxo, setPeriodoFluxo] = useState("30");
  const [selectedEntradas, setSelectedEntradas] = useState<string[]>([]);
  const [selectedSaidas, setSelectedSaidas] = useState<string[]>([]);
  const [selectedAcertos, setSelectedAcertos] = useState<string[]>([]);
  
  // Acertos financeiros
  const { data: acertos = [], isLoading: loadingAcertos } = useQuery({
    queryKey: ["acertos_financeiros"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acertos_financeiros")
        .select(`*, donos_material(nome)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Config fiscal
  const { data: configFiscal = [], isLoading: loadingConfig } = useQuery({
    queryKey: ["config_fiscal"],
    queryFn: async () => {
      const { data, error } = await supabase.from("config_fiscal").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Beneficiamentos finalizados
  const { data: beneficiamentos = [], isLoading: loadingBeneficiamentos } = useQuery({
    queryKey: ["beneficiamentos_financeiro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamentos")
        .select(`*, processo:processos(nome)`)
        .eq("status", "finalizado")
        .order("data_fim", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Saídas (vendas)
  const { data: saidas = [], isLoading: loadingSaidas } = useQuery({
    queryKey: ["saidas_financeiro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saidas")
        .select(`*, cliente:clientes(razao_social)`)
        .order("data_saida", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Entradas (compras)
  const { data: entradas = [], isLoading: loadingEntradas } = useQuery({
    queryKey: ["entradas_financeiro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entradas")
        .select(`*, parceiro:parceiros!entradas_parceiro_id_fkey(razao_social, nome_fantasia), dono:donos_material(nome)`)
        .order("data_entrada", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Estado de carregamento combinado
  const isLoading = loadingAcertos || loadingConfig || loadingBeneficiamentos || loadingSaidas || loadingEntradas;

  // Calcular totais

  // Calcular totais
  const creditoAcumulado = configFiscal.find((c: any) => c.nome === "credito_acumulado_ibrac")?.valor || 0;
  const fatorImposto = configFiscal.find((c: any) => c.nome === "fator_imposto")?.valor || 0.7986;

  const totalPendente = acertos.filter((a: any) => a.status === "pendente").reduce((acc: number, a: any) => acc + (a.valor || 0), 0);
  const totalPago = acertos.filter((a: any) => a.status === "pago").reduce((acc: number, a: any) => acc + (a.valor || 0), 0);

  // Contas a receber (saídas pendentes)
  const contasReceber = saidas
    .filter((s: any) => s.status === "pendente" || s.status === "em_transito")
    .reduce((acc: number, s: any) => acc + (s.valor_total || 0), 0);

  // Contas a pagar (entradas sem pagamento)
  const contasPagar = entradas
    .filter((e: any) => e.status === "pendente")
    .reduce((acc: number, e: any) => acc + (e.valor_total || 0), 0);

  // Margem por operação
  const margensPorOperacao = beneficiamentos.map((b: any) => {
    const custoTotal = (b.custo_frete_ida || 0) + (b.custo_frete_volta || 0) + 
                       (b.custo_mo_terceiro || 0) + (b.custo_mo_ibrac || 0);
    const perdaReal = ((b.perda_real_pct || 0) / 100) * (b.peso_entrada_kg || 0);
    const perdaCobrada = ((b.perda_cobrada_pct || 0) / 100) * (b.peso_entrada_kg || 0);
    const lucroPerda = (perdaCobrada - perdaReal) * 35; // Estimativa R$35/kg
    const margemPct = b.peso_entrada_kg > 0 ? ((lucroPerda - custoTotal) / (b.peso_entrada_kg * 35)) * 100 : 0;
    
    return {
      codigo: b.codigo,
      processo: b.processo?.nome || "Interno",
      pesoEntrada: b.peso_entrada_kg || 0,
      custoTotal,
      lucroPerda,
      margemReal: lucroPerda - custoTotal,
      margemPct,
      perdaReal: b.perda_real_pct || 0,
      perdaCobrada: b.perda_cobrada_pct || 0,
    };
  });

  // Fluxo de caixa por período
  const diasFluxo = parseInt(periodoFluxo);
  const dataInicio = subDays(new Date(), diasFluxo);
  const dataFim = new Date();

  const fluxoCaixa = eachDayOfInterval({ start: dataInicio, end: dataFim }).map(dia => {
    const diaStr = format(dia, "yyyy-MM-dd");
    
    const entradasDia = saidas
      .filter((s: any) => s.data_saida?.startsWith(diaStr) && s.status === "finalizado")
      .reduce((acc: number, s: any) => acc + (s.valor_total || 0), 0);
    
    const saidasDia = entradas
      .filter((e: any) => e.data_entrada?.startsWith(diaStr) && e.valor_total)
      .reduce((acc: number, e: any) => acc + (e.valor_total || 0), 0);
    
    return {
      data: format(dia, "dd/MM", { locale: ptBR }),
      dataCompleta: diaStr,
      entradas: entradasDia,
      saidas: saidasDia,
      saldo: entradasDia - saidasDia,
    };
  });

  // Calcular saldo acumulado
  let saldoAcumulado = 0;
  const fluxoComAcumulado = fluxoCaixa.map(item => {
    saldoAcumulado += item.saldo;
    return { ...item, acumulado: saldoAcumulado };
  });

  // Totais do período
  const totalEntradas = fluxoCaixa.reduce((acc, f) => acc + f.entradas, 0);
  const totalSaidas = fluxoCaixa.reduce((acc, f) => acc + f.saidas, 0);
  const saldoPeriodo = totalEntradas - totalSaidas;

  // Dados para gráfico de pizza - composição de custos
  const custosBeneficiamento = beneficiamentos.reduce((acc: any, b: any) => {
    return {
      freteIda: acc.freteIda + (b.custo_frete_ida || 0),
      freteVolta: acc.freteVolta + (b.custo_frete_volta || 0),
      moTerceiro: acc.moTerceiro + (b.custo_mo_terceiro || 0),
      moIbrac: acc.moIbrac + (b.custo_mo_ibrac || 0),
    };
  }, { freteIda: 0, freteVolta: 0, moTerceiro: 0, moIbrac: 0 });

  const pieDataCustos = [
    { name: "Frete Ida", value: custosBeneficiamento.freteIda },
    { name: "Frete Volta", value: custosBeneficiamento.freteVolta },
    { name: "MO Terceiro", value: custosBeneficiamento.moTerceiro },
    { name: "MO IBRAC", value: custosBeneficiamento.moIbrac },
  ].filter(d => d.value > 0);

  // Lucro total perdas
  const lucroPerdas = margensPorOperacao.reduce((acc, m) => acc + m.lucroPerda, 0);
  const margemMedia = margensPorOperacao.length > 0 
    ? margensPorOperacao.reduce((acc, m) => acc + m.margemPct, 0) / margensPorOperacao.length 
    : 0;

  // Mutations para conciliação
  const conciliarEntradasMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        const { error } = await supabase
          .from("entradas")
          .update({ status: "finalizado" })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entradas_financeiro"] });
      toast({ title: "Entradas conciliadas com sucesso!" });
      setSelectedEntradas([]);
    },
    onError: (error) => toast({ title: "Erro ao conciliar", description: error.message, variant: "destructive" }),
  });

  const conciliarSaidasMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        const { error } = await supabase
          .from("saidas")
          .update({ status: "finalizada" })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saidas_financeiro"] });
      toast({ title: "Saídas conciliadas com sucesso!" });
      setSelectedSaidas([]);
    },
    onError: (error) => toast({ title: "Erro ao conciliar", description: error.message, variant: "destructive" }),
  });

  const conciliarAcertosMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        const { error } = await supabase
          .from("acertos_financeiros")
          .update({ status: "pago", data_pagamento: new Date().toISOString().split("T")[0] })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acertos_financeiros"] });
      toast({ title: "Acertos conciliados com sucesso!" });
      setSelectedAcertos([]);
    },
    onError: (error) => toast({ title: "Erro ao conciliar", description: error.message, variant: "destructive" }),
  });

  const toggleEntrada = (id: string) => {
    setSelectedEntradas(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSaida = (id: string) => {
    setSelectedSaidas(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleAcerto = (id: string) => {
    setSelectedAcertos(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
            <p className="text-muted-foreground">Dashboard financeiro completo com fluxo de caixa e margens</p>
          </div>
        </div>

        {/* KPIs Principais */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-success">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-success" />
                A Receber
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">{formatCurrency(contasReceber)}</p>
              <p className="text-xs text-muted-foreground">
                {saidas.filter((s: any) => s.status === "pendente" || s.status === "em_transito").length} saídas pendentes
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-destructive">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4 text-destructive" />
                A Pagar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(contasPagar)}</p>
              <p className="text-xs text-muted-foreground">
                {entradas.filter((e: any) => e.status === "pendente").length} entradas pendentes
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-warning">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" />
                Acertos Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-warning">{formatCurrency(totalPendente)}</p>
              <p className="text-xs text-muted-foreground">
                {acertos.filter((a: any) => a.status === "pendente").length} acertos com donos
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Lucro Perdas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{formatCurrency(lucroPerdas)}</p>
              <p className="text-xs text-muted-foreground">
                Margem média: {margemMedia.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="fluxo" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-none lg:flex">
            <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
            <TabsTrigger value="contas">Contas</TabsTrigger>
            <TabsTrigger value="margens">Margens</TabsTrigger>
            <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
          </TabsList>

          {/* Fluxo de Caixa */}
          <TabsContent value="fluxo" className="mt-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Fluxo de Caixa</h3>
              <Select value={periodoFluxo} onValueChange={setPeriodoFluxo}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="15">Últimos 15 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="60">Últimos 60 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cards do período */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-success/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                      <ArrowUpRight className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Entradas</p>
                      <p className="text-2xl font-bold text-success">{formatCurrency(totalEntradas)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-destructive/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                      <ArrowDownRight className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Saídas</p>
                      <p className="text-2xl font-bold text-destructive">{formatCurrency(totalSaidas)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={saldoPeriodo >= 0 ? "bg-primary/5" : "bg-warning/5"}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full ${saldoPeriodo >= 0 ? "bg-primary/10" : "bg-warning/10"}`}>
                      <Wallet className={`h-6 w-6 ${saldoPeriodo >= 0 ? "text-primary" : "text-warning"}`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Saldo Período</p>
                      <p className={`text-2xl font-bold ${saldoPeriodo >= 0 ? "text-primary" : "text-warning"}`}>
                        {formatCurrency(saldoPeriodo)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de Fluxo */}
            <Card>
              <CardHeader>
                <CardTitle>Evolução do Fluxo de Caixa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : fluxoComAcumulado.length > 0 ? (
                    <ResponsiveContainer key={`fluxo-${fluxoComAcumulado.length}`} width="100%" height="100%">
                      <ComposedChart data={fluxoComAcumulado}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="data" className="text-xs" />
                        <YAxis yAxisId="left" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} className="text-xs" />
                        <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} className="text-xs" />
                        <Tooltip 
                          formatter={(value: number, name: string) => [formatCurrency(value), 
                            name === "entradas" ? "Entradas" : 
                            name === "saidas" ? "Saídas" : "Saldo Acumulado"
                          ]}
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="entradas" fill={CHART_COLORS.success} name="Entradas" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="left" dataKey="saidas" fill={CHART_COLORS.danger} name="Saídas" radius={[4, 4, 0, 0]} />
                        <Line yAxisId="right" type="monotone" dataKey="acumulado" stroke={CHART_COLORS.primary} strokeWidth={2} name="Saldo Acumulado" dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-muted-foreground">Sem dados para exibir</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contas a Pagar/Receber */}
          <TabsContent value="contas" className="mt-6 space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* A Receber */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-success">
                      <ArrowUpRight className="h-5 w-5" />
                      Contas a Receber
                    </CardTitle>
                    <CardDescription>Saídas pendentes de recebimento</CardDescription>
                  </div>
                  {canConciliar && selectedSaidas.length > 0 && (
                    <Button 
                      size="sm" 
                      onClick={() => conciliarSaidasMutation.mutate(selectedSaidas)}
                      disabled={conciliarSaidasMutation.isPending}
                    >
                      {conciliarSaidasMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                      Conciliar ({selectedSaidas.length})
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {canConciliar && <TableHead className="w-10"></TableHead>}
                        <TableHead>Código</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {saidas.filter((s: any) => s.status === "pendente" || s.status === "em_transito").length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={canConciliar ? 5 : 4} className="text-center text-muted-foreground">
                            Nenhuma conta a receber
                          </TableCell>
                        </TableRow>
                      ) : (
                        saidas
                          .filter((s: any) => s.status === "pendente" || s.status === "em_transito")
                          .slice(0, 15)
                          .map((s: any) => (
                            <TableRow key={s.id} className={selectedSaidas.includes(s.id) ? "bg-success/10" : ""}>
                              {canConciliar && (
                                <TableCell>
                                  <Checkbox 
                                    checked={selectedSaidas.includes(s.id)} 
                                    onCheckedChange={() => toggleSaida(s.id)} 
                                  />
                                </TableCell>
                              )}
                              <TableCell className="font-mono">{s.codigo}</TableCell>
                              <TableCell>{s.cliente?.razao_social || "-"}</TableCell>
                              <TableCell>{format(new Date(s.data_saida), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                              <TableCell className="text-right font-bold text-success">
                                {formatCurrency(s.valor_total || 0)}
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* A Pagar */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <ArrowDownRight className="h-5 w-5" />
                      Contas a Pagar
                    </CardTitle>
                    <CardDescription>Entradas pendentes de pagamento</CardDescription>
                  </div>
                  {canConciliar && selectedEntradas.length > 0 && (
                    <Button 
                      size="sm" 
                      onClick={() => conciliarEntradasMutation.mutate(selectedEntradas)}
                      disabled={conciliarEntradasMutation.isPending}
                    >
                      {conciliarEntradasMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                      Conciliar ({selectedEntradas.length})
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {canConciliar && <TableHead className="w-10"></TableHead>}
                        <TableHead>Código</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entradas.filter((e: any) => e.status === "pendente" && e.valor_total).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={canConciliar ? 5 : 4} className="text-center text-muted-foreground">
                            Nenhuma conta a pagar
                          </TableCell>
                        </TableRow>
                      ) : (
                        entradas
                          .filter((e: any) => e.status === "pendente" && e.valor_total)
                          .slice(0, 15)
                          .map((e: any) => (
                            <TableRow key={e.id} className={selectedEntradas.includes(e.id) ? "bg-destructive/10" : ""}>
                              {canConciliar && (
                                <TableCell>
                                  <Checkbox 
                                    checked={selectedEntradas.includes(e.id)} 
                                    onCheckedChange={() => toggleEntrada(e.id)} 
                                  />
                                </TableCell>
                              )}
                              <TableCell className="font-mono">{e.codigo}</TableCell>
                              <TableCell>{e.fornecedor?.razao_social || e.dono?.nome || "-"}</TableCell>
                              <TableCell>{format(new Date(e.data_entrada), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                              <TableCell className="text-right font-bold text-destructive">
                                {formatCurrency(e.valor_total || 0)}
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Acertos Financeiros */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Acertos por Dono do Material
                  </CardTitle>
                  <CardDescription>Controle de cobranças e repasses por proprietário</CardDescription>
                </div>
                {canConciliar && selectedAcertos.length > 0 && (
                  <Button 
                    size="sm" 
                    onClick={() => conciliarAcertosMutation.mutate(selectedAcertos)}
                    disabled={conciliarAcertosMutation.isPending}
                  >
                    {conciliarAcertosMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                    Conciliar ({selectedAcertos.length})
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {canConciliar && <TableHead className="w-10"></TableHead>}
                      <TableHead>Dono</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data Acerto</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {acertos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canConciliar ? 6 : 5} className="text-center text-muted-foreground">
                          Nenhum acerto financeiro registrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      acertos.slice(0, 15).map((a: any) => (
                        <TableRow key={a.id} className={selectedAcertos.includes(a.id) ? "bg-primary/10" : ""}>
                          {canConciliar && a.status === "pendente" && (
                            <TableCell>
                              <Checkbox 
                                checked={selectedAcertos.includes(a.id)} 
                                onCheckedChange={() => toggleAcerto(a.id)} 
                              />
                            </TableCell>
                          )}
                          {canConciliar && a.status !== "pendente" && <TableCell></TableCell>}
                          <TableCell className="font-medium">{a.donos_material?.nome || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{a.tipo}</Badge>
                          </TableCell>
                          <TableCell>{format(new Date(a.data_acerto), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                          <TableCell className="text-right font-mono font-bold">{formatCurrency(a.valor)}</TableCell>
                          <TableCell>
                            <Badge variant={statusConfig[a.status]?.variant || "secondary"}>
                              {statusConfig[a.status]?.label || a.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Margens por Operação */}
          <TabsContent value="margens" className="mt-6 space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Gráfico de Margens */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Margem por Beneficiamento</CardTitle>
                  <CardDescription>Comparativo de margem real vs custo por operação</CardDescription>
                </CardHeader>
                <CardContent>
                  {margensPorOperacao.length > 0 ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={margensPorOperacao.slice(0, 10)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} className="text-xs" />
                          <YAxis dataKey="codigo" type="category" width={80} className="text-xs" />
                          <Tooltip 
                            formatter={(value: number, name: string) => [formatCurrency(value), name === "margemReal" ? "Margem Real" : "Custo Total"]}
                            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                          />
                          <Legend />
                          <Bar dataKey="margemReal" fill={CHART_COLORS.success} name="Margem Real" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="custoTotal" fill={CHART_COLORS.warning} name="Custo Total" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-muted-foreground">
                      Nenhum beneficiamento finalizado
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Composição de Custos */}
              <Card>
                <CardHeader>
                  <CardTitle>Composição de Custos</CardTitle>
                  <CardDescription>Distribuição dos custos operacionais</CardDescription>
                </CardHeader>
                <CardContent>
                  {pieDataCustos.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieDataCustos}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                          >
                            {pieDataCustos.map((_, index) => (
                              <Cell key={index} fill={Object.values(CHART_COLORS)[index % 5]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      Sem dados de custos
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tabela Detalhada de Margens */}
            <Card>
              <CardHeader>
                <CardTitle>Análise Detalhada por Operação</CardTitle>
                <CardDescription>Breakdown completo de custos e margens por beneficiamento</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Processo</TableHead>
                      <TableHead className="text-right">Peso</TableHead>
                      <TableHead className="text-right">Perda Real</TableHead>
                      <TableHead className="text-right">Perda Cobrada</TableHead>
                      <TableHead className="text-right">Custo Total</TableHead>
                      <TableHead className="text-right">Lucro Perda</TableHead>
                      <TableHead className="text-right">Margem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {margensPorOperacao.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          Nenhum beneficiamento finalizado
                        </TableCell>
                      </TableRow>
                    ) : (
                      margensPorOperacao.map((m, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono">{m.codigo}</TableCell>
                          <TableCell>{m.processo}</TableCell>
                          <TableCell className="text-right">{formatWeight(m.pesoEntrada)}</TableCell>
                          <TableCell className="text-right">{m.perdaReal.toFixed(2)}%</TableCell>
                          <TableCell className="text-right">{m.perdaCobrada.toFixed(2)}%</TableCell>
                          <TableCell className="text-right text-destructive">{formatCurrency(m.custoTotal)}</TableCell>
                          <TableCell className="text-right text-success">{formatCurrency(m.lucroPerda)}</TableCell>
                          <TableCell className={`text-right font-bold ${m.margemReal >= 0 ? "text-success" : "text-destructive"}`}>
                            {formatCurrency(m.margemReal)}
                            <span className="text-xs text-muted-foreground ml-1">({m.margemPct.toFixed(1)}%)</span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fiscal */}
          <TabsContent value="fiscal" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Comparativo Fiscal
                  </CardTitle>
                  <CardDescription>Análise de viabilidade tributária</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm">Crédito Acumulado IBRAC</span>
                      <span className="font-mono font-bold text-success">{formatCurrency(creditoAcumulado)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm">Fator Imposto</span>
                      <span className="font-mono font-bold">{fatorImposto}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm">Total Pago (Acertos)</span>
                      <span className="font-mono font-bold">{formatCurrency(totalPago)}</span>
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg border-2 ${creditoAcumulado > 0 ? "border-success bg-success/10" : "border-warning bg-warning/10"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {creditoAcumulado > 0 ? (
                        <TrendingUp className="h-5 w-5 text-success" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-warning" />
                      )}
                      <span className="font-semibold">
                        {creditoAcumulado > 0 ? "Crédito Disponível" : "Sem Crédito"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {creditoAcumulado > 0 
                        ? "Há crédito fiscal disponível para compensação."
                        : "Não há crédito fiscal acumulado no momento."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resumo por Operação</CardTitle>
                  <CardDescription>Lucro IBRAC por beneficiamento</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Operação</TableHead>
                        <TableHead className="text-right">Perda Real</TableHead>
                        <TableHead className="text-right">Perda Cobrada</TableHead>
                        <TableHead className="text-right">Lucro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {beneficiamentos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Nenhum beneficiamento finalizado
                          </TableCell>
                        </TableRow>
                      ) : (
                        beneficiamentos.slice(0, 5).map((b: any) => {
                          const lucro = (b.perda_cobrada_pct || 0) - (b.perda_real_pct || 0);
                          return (
                            <TableRow key={b.id}>
                              <TableCell className="font-mono">{b.codigo}</TableCell>
                              <TableCell className="text-right">{(b.perda_real_pct || 0).toFixed(2)}%</TableCell>
                              <TableCell className="text-right">{(b.perda_cobrada_pct || 0).toFixed(2)}%</TableCell>
                              <TableCell className={`text-right font-medium ${lucro > 0 ? "text-success" : "text-destructive"}`}>
                                {lucro.toFixed(2)}%
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

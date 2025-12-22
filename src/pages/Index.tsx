import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  FileInput,
  TrendingUp,
  TrendingDown,
  Factory,
  Calendar,
  DollarSign,
  Users,
  Scale,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GlobalFilters } from "@/components/filters/GlobalFilters";
import { LMECharts } from "@/components/dashboard/LMECharts";

export default function Index() {
  const [selectedDono, setSelectedDono] = useState<string | null>(null);

  // Fetch sublotes para estoque total
  const { data: sublotes, isLoading: loadingSublotes } = useQuery({
    queryKey: ["dashboard-sublotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sublotes")
        .select("id, peso_kg, dono_id, status, custo_unitario_total, lote_pai_id");
      if (error) throw error;
      return data;
    },
  });

  // Fetch última cotação LME
  const { data: ultimaLme, isLoading: loadingLme } = useQuery({
    queryKey: ["dashboard-lme"],
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

  // Fetch entradas recentes
  const { data: entradasRecentes } = useQuery({
    queryKey: ["dashboard-entradas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entradas")
        .select(`
          *,
          parceiro:parceiros!entradas_parceiro_id_fkey(razao_social, nome_fantasia),
          dono:donos_material(nome)
        `)
        .order("data_entrada", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  // Fetch donos para estatísticas
  const { data: donos } = useQuery({
    queryKey: ["dashboard-donos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("donos_material").select("*").eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  // Filtrar sublotes que são pais (têm filhos) para evitar duplicação
  // Um sublote é pai se outro sublote tem lote_pai_id apontando para ele
  const parentIds = new Set(sublotes?.filter(s => s.lote_pai_id).map(s => s.lote_pai_id) || []);
  const sublotesSemDuplicacao = sublotes?.filter(s => !parentIds.has(s.id)) || [];

  // Filtrar por dono selecionado
  const sublotesFiltrados = sublotesSemDuplicacao.filter(s => {
    if (!selectedDono) return true;
    if (selectedDono === "ibrac") return !s.dono_id;
    return s.dono_id === selectedDono;
  });

  // Cálculos usando sublotes filtrados
  const estoqueTotal = sublotesFiltrados.reduce((acc, s) => acc + (s.peso_kg || 0), 0);
  const estoqueDisponiveis = sublotesFiltrados.filter((s) => s.status === "disponivel");
  const estoqueDisponivel = estoqueDisponiveis.reduce((acc, s) => acc + (s.peso_kg || 0), 0);

  const custoMedio = sublotesFiltrados.length
    ? sublotesFiltrados.reduce((acc, s) => acc + (s.custo_unitario_total || 0), 0) / sublotesFiltrados.length
    : 0;

  const lmeAtual = ultimaLme?.[0];
  const lmeAnterior = ultimaLme?.[1];
  const variacaoLme = lmeAtual && lmeAnterior && lmeAnterior.cobre_brl_kg
    ? ((lmeAtual.cobre_brl_kg! - lmeAnterior.cobre_brl_kg!) / lmeAnterior.cobre_brl_kg!) * 100
    : 0;

  // Dados para gráfico
  const chartData = ultimaLme?.slice().reverse().map((lme) => ({
    data: format(new Date(lme.data), "dd/MM"),
    cobre: lme.cobre_brl_kg || 0,
  })) || [];

  const formatWeight = (kg: number) => {
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
    return `${kg}kg`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Estoque por dono (usando sublotes sem duplicação)
  const estoquePorDono = donos?.map((dono) => {
    const sublotesDono = sublotesSemDuplicacao.filter((s) => s.dono_id === dono.id);
    return {
      ...dono,
      peso: sublotesDono.reduce((acc, s) => acc + (s.peso_kg || 0), 0),
    };
  }).filter((d) => d.peso > 0) || [];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Painel de Controle</h1>
            <p className="text-muted-foreground">Visão geral das operações da IBRAC</p>
          </div>
          <GlobalFilters
            showParceiro={false}
            selectedParceiro={null}
            selectedDono={selectedDono}
            onParceiroChange={() => {}}
            onDonoChange={setSelectedDono}
          />
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estoque Total</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingSublotes ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{formatWeight(estoqueTotal)}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatWeight(estoqueDisponivel)} disponível
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cobre LME (R$/kg)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {lmeAtual?.cobre_brl_kg ? formatCurrency(lmeAtual.cobre_brl_kg) : "—"}
              </div>
              <div className="flex items-center text-xs">
                {variacaoLme !== 0 && (
                  <>
                    {variacaoLme > 0 ? (
                      <TrendingUp className="h-3 w-3 text-success mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-destructive mr-1" />
                    )}
                    <span className={variacaoLme > 0 ? "text-success" : "text-destructive"}>
                      {variacaoLme > 0 ? "+" : ""}{variacaoLme.toFixed(2)}%
                    </span>
                    <span className="text-muted-foreground ml-1">vs ontem</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custo Médio</CardTitle>
              <Scale className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(custoMedio)}/kg</div>
              <p className="text-xs text-muted-foreground">Média ponderada do estoque</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Donos Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estoquePorDono.length}</div>
              <p className="text-xs text-muted-foreground">Com material em estoque</p>
            </CardContent>
          </Card>
        </div>

        {/* Comparativo LME vs Custo */}
        {lmeAtual?.cobre_brl_kg && custoMedio > 0 && (
          <Card className={cn(
            "border-2",
            lmeAtual.cobre_brl_kg > custoMedio ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
          )}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm text-muted-foreground mb-1">Vergalhão LME à Vista</p>
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(lmeAtual.cobre_brl_kg)}/kg
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  <div className={cn(
                    "px-4 py-2 rounded-lg font-semibold",
                    lmeAtual.cobre_brl_kg > custoMedio
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  )}>
                    {lmeAtual.cobre_brl_kg > custoMedio ? "SUCATA VALE A PENA" : "VERGALHÃO MAIS BARATO"}
                  </div>
                </div>
                <div className="flex-1 min-w-[200px] text-right">
                  <p className="text-sm text-muted-foreground mb-1">Custo Médio Industrializado</p>
                  <p className="text-3xl font-bold text-copper">
                    {formatCurrency(custoMedio)}/kg
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gráficos LME */}
        <LMECharts lmeData={ultimaLme || []} isLoading={loadingLme} />

        {/* Estoque por Dono */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estoque por Dono</CardTitle>
            <CardDescription>Distribuição do material em estoque</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {estoquePorDono.length > 0 ? (
                estoquePorDono.map((dono) => (
                  <div key={dono.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-copper" />
                      <span className="text-sm font-medium">{dono.nome}</span>
                    </div>
                    <span className="font-semibold">{formatWeight(dono.peso)}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhum material de terceiros em estoque
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Entradas Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Entradas Recentes</CardTitle>
            <CardDescription>Últimas 5 entradas de material</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {entradasRecentes?.map((entrada) => (
                <div
                  key={entrada.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                      <FileInput className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium">{entrada.codigo}</p>
                      <p className="text-sm text-muted-foreground">
                        {entrada.parceiro?.razao_social || entrada.parceiro?.nome_fantasia || "Sem fornecedor"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatWeight(entrada.peso_liquido_kg)}</p>
                    <Badge variant="outline" className="text-xs">
                      {entrada.dono?.nome || "IBRAC"}
                    </Badge>
                  </div>
                </div>
              ))}
              {(!entradasRecentes || entradasRecentes.length === 0) && (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhuma entrada registrada
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

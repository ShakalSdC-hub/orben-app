import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Minus, Calendar, Printer, DollarSign, RefreshCw, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, getISOWeek, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO, getISOWeekYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/kpis";

function VariationCard({ title, current, previous, unit = "R$/kg" }: { title: string; current: number; previous: number; unit?: string }) {
  const variation = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const isUp = variation > 0;
  const isNeutral = Math.abs(variation) < 0.01;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold">{formatCurrency(current)}</p>
            <p className="text-xs text-muted-foreground">{unit}</p>
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
            isNeutral ? "bg-muted text-muted-foreground" : 
            isUp ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
          }`}>
            {isNeutral ? <Minus className="h-4 w-4" /> : isUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {Math.abs(variation).toFixed(2)}%
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Indicadores() {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  
  // Estado para o card de Cotação LME
  const [lmeTipoFiltro, setLmeTipoFiltro] = useState<"dia" | "semana" | "mes">("semana");
  const [lmeSemana, setLmeSemana] = useState<string>("");
  const [lmeData, setLmeData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [lmeMes, setLmeMes] = useState<string>(format(subMonths(new Date(), 1), "yyyy-MM"));
  
  // Filtro do mês para tabela de histórico
  const [historicoMesFiltro, setHistoricoMesFiltro] = useState<string>(format(new Date(), "yyyy-MM"));

  // Verificar se usuário pode forçar atualização (admin ou dono)
  const canForceUpdate = role === "admin" || role === "dono";

  // Fetch histórico diário (não média) - buscar mais dados para histórico anual
  const { data: historico = [], isLoading: isLoadingHistorico } = useQuery({
    queryKey: ["historico_lme"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_lme")
        .select("*")
        .eq("is_media_semanal", false)
        .order("data", { ascending: false })
        .limit(400);
      if (error) throw error;
      return data;
    },
  });

  // Fetch médias semanais OFICIAIS do banco de dados (is_media_semanal = true)
  const { data: mediasSemanaisOficiais = [], isLoading: isLoadingMedias } = useQuery({
    queryKey: ["historico_lme_medias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_lme")
        .select("*")
        .eq("is_media_semanal", true)
        .order("data", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Estado de carregamento combinado
  const isLoading = isLoadingHistorico || isLoadingMedias;

  // Transformar médias oficiais para o formato esperado pelo componente
  const mediasSemanais = mediasSemanaisOficiais.map((m: any) => {
    const dataRegistro = parseISO(m.data);
    const semana = m.semana_numero || getISOWeek(dataRegistro);
    const ano = getISOWeekYear(dataRegistro);
    const key = ano * 100 + semana;
    
    return {
      semana_numero: semana,
      ano,
      key,
      cobre_brl_kg: m.cobre_brl_kg,
      aluminio_brl_kg: m.aluminio_brl_kg,
      dolar_brl: m.dolar_brl,
      cobre_usd_t: m.cobre_usd_t,
      registros_count: 5, // Médias oficiais são baseadas em 5 dias úteis
      data_original: m.data,
      fonte: m.fonte
    };
  }).sort((a: any, b: any) => b.key - a.key);

  // Mutation para forçar atualização via API
  const updateLmeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-lme-prices");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["historico_lme"] });
      queryClient.invalidateQueries({ queryKey: ["ultima-lme"] });
      toast({ 
        title: "Cotações atualizadas!", 
        description: data?.message || "Dados LME atualizados com sucesso." 
      });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao atualizar cotações", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  // Gerar opções de semanas disponíveis (usando médias oficiais)
  const semanasDisponiveis = mediasSemanais.map((m: any) => ({
    value: String(m.key),
    label: `M.S ${m.semana_numero} (${m.ano})`,
    data: m
  }));

  // Auto-selecionar a primeira semana disponível para o card de cotação
  useEffect(() => {
    if (mediasSemanais.length > 0 && !lmeSemana) {
      setLmeSemana(String(mediasSemanais[0]?.key || ""));
    }
  }, [mediasSemanais, lmeSemana]);

  // Calcular média
  const calcularMedia = (registros: any[], campo: string) => {
    const validos = registros.filter((h: any) => h[campo] != null && h[campo] > 0);
    if (validos.length === 0) return 0;
    return validos.reduce((acc: number, h: any) => acc + h[campo], 0) / validos.length;
  };

  // Função para obter cotação LME baseado no filtro selecionado
  const getLmeCotacao = () => {
    if (lmeTipoFiltro === "dia") {
      const registro = historico.find((h: any) => h.data === lmeData);
      return registro ? {
        cobre_usd_t: registro.cobre_usd_t,
        dolar_brl: registro.dolar_brl,
        cobre_brl_kg: registro.cobre_brl_kg,
        aluminio_brl_kg: registro.aluminio_brl_kg,
        label: format(parseISO(lmeData), "dd/MM/yyyy", { locale: ptBR })
      } : null;
    } else if (lmeTipoFiltro === "semana") {
      // Usar médias semanais OFICIAIS importadas do banco
      const media = mediasSemanais.find((m: any) => String(m.key) === lmeSemana);
      if (media) {
        return {
          cobre_usd_t: media.cobre_usd_t,
          dolar_brl: media.dolar_brl,
          cobre_brl_kg: media.cobre_brl_kg,
          aluminio_brl_kg: media.aluminio_brl_kg,
          label: `M.S ${media.semana_numero} (${media.ano})`
        };
      }
      return null;
    } else if (lmeTipoFiltro === "mes") {
      const [ano, mes] = lmeMes.split("-").map(Number);
      const inicioMes = new Date(ano, mes - 1, 1);
      const fimMes = new Date(ano, mes, 0);
      const registrosMes = historico.filter((h: any) => {
        const dataRegistro = parseISO(h.data);
        return isWithinInterval(dataRegistro, { start: inicioMes, end: fimMes });
      });
      if (registrosMes.length === 0) return null;
      
      const cobreMedia = calcularMedia(registrosMes, 'cobre_usd_t');
      const dolarMedia = calcularMedia(registrosMes, 'dolar_brl');
      const cobreBrlKg = calcularMedia(registrosMes, 'cobre_brl_kg');
      const aluminioBrlKg = calcularMedia(registrosMes, 'aluminio_brl_kg');
      return {
        cobre_usd_t: cobreMedia,
        dolar_brl: dolarMedia,
        cobre_brl_kg: cobreBrlKg,
        aluminio_brl_kg: aluminioBrlKg,
        label: format(inicioMes, "MMMM yyyy", { locale: ptBR })
      };
    }
    return null;
  };

  const lmeCotacao = getLmeCotacao();

  // Calcular variações usando médias OFICIAIS importadas
  const hoje = historico[0];
  const ontem = historico[1];
  
  // Usar as duas últimas médias semanais oficiais (S-1 e S-2)
  // mediasSemanais já está ordenado por key decrescente (mais recente primeiro)
  const mediaSemanaS1 = mediasSemanais[0]; // Média mais recente
  const mediaSemanaS2 = mediasSemanais[1]; // Segunda média mais recente
  
  const cobreMediaSemana = mediaSemanaS1?.cobre_brl_kg || 0;
  const aluminioMediaSemana = mediaSemanaS1?.aluminio_brl_kg || 0;
  const cobreMediaSemanaAnterior = mediaSemanaS2?.cobre_brl_kg || cobreMediaSemana;
  const aluminioMediaSemanaAnterior = mediaSemanaS2?.aluminio_brl_kg || aluminioMediaSemana;

  const agora = new Date();
  const inicioMesAnterior = startOfMonth(subMonths(agora, 1));
  const fimMesAnterior = endOfMonth(subMonths(agora, 1));
  const inicioMesAnteAnterior = startOfMonth(subMonths(agora, 2));
  const fimMesAnteAnterior = endOfMonth(subMonths(agora, 2));

  const registrosMesAnterior = historico.filter((h: any) => {
    const dataRegistro = parseISO(h.data);
    return isWithinInterval(dataRegistro, { start: inicioMesAnterior, end: fimMesAnterior });
  });

  const registrosMesAnteAnterior = historico.filter((h: any) => {
    const dataRegistro = parseISO(h.data);
    return isWithinInterval(dataRegistro, { start: inicioMesAnteAnterior, end: fimMesAnteAnterior });
  });

  const cobreMediaMes = calcularMedia(registrosMesAnterior, 'cobre_brl_kg');
  const aluminioMediaMes = calcularMedia(registrosMesAnterior, 'aluminio_brl_kg');
  const cobreMediaMesAnterior = calcularMedia(registrosMesAnteAnterior, 'cobre_brl_kg') || cobreMediaMes;
  const aluminioMediaMesAnterior = calcularMedia(registrosMesAnteAnterior, 'aluminio_brl_kg') || aluminioMediaMes;

  const cobreHoje = hoje?.cobre_brl_kg || 0;
  const cobreOntem = ontem?.cobre_brl_kg || cobreHoje;

  const aluminioHoje = hoje?.aluminio_brl_kg || 0;
  const aluminioOntem = ontem?.aluminio_brl_kg || aluminioHoje;

  // Dados para o gráfico
  const chartData = [...historico].reverse().slice(-30).map((h: any) => ({
    data: format(new Date(h.data), "dd/MM", { locale: ptBR }),
    cobre: h.cobre_brl_kg || 0,
    aluminio: h.aluminio_brl_kg || 0,
  }));

  // Filtrar histórico por mês selecionado
  const [anoFiltro, mesFiltro] = historicoMesFiltro.split("-").map(Number);
  const inicioMesFiltro = new Date(anoFiltro, mesFiltro - 1, 1);
  const fimMesFiltro = new Date(anoFiltro, mesFiltro, 0);
  
  const historicoFiltrado = historico.filter((h: any) => {
    const dataRegistro = parseISO(h.data);
    return isWithinInterval(dataRegistro, { start: inicioMesFiltro, end: fimMesFiltro });
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Indicadores LME</h1>
            <p className="text-muted-foreground">Acompanhe as cotações de Cobre e Alumínio em tempo real</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Botão de forçar atualização - apenas admin/dono */}
            {canForceUpdate && (
              <Button 
                variant="default" 
                onClick={() => updateLmeMutation.mutate()}
                disabled={updateLmeMutation.isPending}
                className="bg-primary"
              >
                {updateLmeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Atualizar LME
              </Button>
            )}
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>

        {/* Card de Cotação LME - Parâmetros do Mercado */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-primary" />
              Cotação LME
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Parâmetros do mercado {lmeCotacao?.label ? `(${lmeCotacao.label})` : ""}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Label className="text-sm w-20">Filtrar por:</Label>
              <Select value={lmeTipoFiltro} onValueChange={(v: "dia" | "semana" | "mes") => setLmeTipoFiltro(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dia">Dia</SelectItem>
                  <SelectItem value="semana">Média Semanal</SelectItem>
                  <SelectItem value="mes">Média Mensal</SelectItem>
                </SelectContent>
              </Select>
              
              {lmeTipoFiltro === "dia" && (
                <Input 
                  type="date" 
                  value={lmeData} 
                  onChange={(e) => setLmeData(e.target.value)}
                  className="w-40"
                />
              )}
              
              {lmeTipoFiltro === "semana" && (
                <Select value={lmeSemana} onValueChange={setLmeSemana}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {semanasDisponiveis.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {lmeTipoFiltro === "mes" && (
                <Input 
                  type="month" 
                  value={lmeMes} 
                  onChange={(e) => setLmeMes(e.target.value)}
                  className="w-40"
                />
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Cobre (US$/t)</Label>
                <Input 
                  type="text"
                  value={lmeCotacao?.cobre_usd_t ? Math.round(lmeCotacao.cobre_usd_t).toLocaleString("pt-BR") : "-"}
                  disabled
                  className="bg-muted font-mono text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Dólar (R$/US$)</Label>
                <Input 
                  type="text"
                  value={lmeCotacao?.dolar_brl ? Number(lmeCotacao.dolar_brl).toFixed(4).replace(".", ",") : "-"}
                  disabled
                  className="bg-muted font-mono text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Cobre (R$/kg)</Label>
                <Input 
                  type="text"
                  value={lmeCotacao?.cobre_brl_kg ? formatCurrency(lmeCotacao.cobre_brl_kg) : "-"}
                  disabled
                  className="bg-muted font-mono text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Alumínio (R$/kg)</Label>
                <Input 
                  type="text"
                  value={lmeCotacao?.aluminio_brl_kg ? formatCurrency(lmeCotacao.aluminio_brl_kg) : "-"}
                  disabled
                  className="bg-muted font-mono text-lg"
                />
              </div>
            </div>
            
            {!lmeCotacao && (
              <p className="text-sm text-muted-foreground text-center py-2">
                Nenhuma cotação encontrada para o período selecionado.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Cards de Variação - Cobre e Alumínio */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <VariationCard title="Cobre - Hoje" current={cobreHoje} previous={cobreOntem} />
          <VariationCard title="Cobre - Média S-1" current={cobreMediaSemana} previous={cobreMediaSemanaAnterior} />
          <VariationCard title="Cobre - Média Mês" current={cobreMediaMes} previous={cobreMediaMesAnterior} />
          <VariationCard title="Alumínio - Hoje" current={aluminioHoje} previous={aluminioOntem} />
          <VariationCard title="Alumínio - Média S-1" current={aluminioMediaSemana} previous={aluminioMediaSemanaAnterior} />
          <VariationCard title="Alumínio - Média Mês" current={aluminioMediaMes} previous={aluminioMediaMesAnterior} />
        </div>

        {/* Gráfico de Evolução */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Evolução Diária (R$/kg)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer key={`chart-${chartData.length}`} width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="data" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `R$ ${v.toFixed(2)}`} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => `Data: ${label}`}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="cobre" name="Cobre" stroke="hsl(28, 70%, 45%)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="aluminio" name="Alumínio" stroke="hsl(220, 70%, 50%)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground">Sem dados para exibir</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Médias Semanais Anuais - usando dados oficiais */}
        {mediasSemanais.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Médias Semanais Oficiais {new Date().getFullYear()}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Histórico de médias semanais oficiais (fonte: Shock Metais)
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead>Semana</TableHead>
                      <TableHead className="text-right">Cobre (US$/t)</TableHead>
                      <TableHead className="text-right">Cobre (R$/kg)</TableHead>
                      <TableHead className="text-right">Alumínio (R$/kg)</TableHead>
                      <TableHead className="text-right">Dólar (R$/US$)</TableHead>
                      <TableHead className="text-center">Fonte</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mediasSemanais
                      .filter((m: any) => m.ano === new Date().getFullYear())
                      .sort((a: any, b: any) => b.semana_numero - a.semana_numero)
                      .map((m: any) => (
                        <TableRow key={m.key} className="bg-primary/5">
                          <TableCell className="font-medium">
                            M.S {m.semana_numero} ({m.ano})
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-primary">
                            {m.cobre_usd_t ? `$ ${Number(m.cobre_usd_t).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {m.cobre_brl_kg ? formatCurrency(m.cobre_brl_kg) : "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {m.aluminio_brl_kg ? formatCurrency(m.aluminio_brl_kg) : "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {m.dolar_brl ? `R$ ${Number(m.dolar_brl).toFixed(4)}` : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              m.fonte === "manual" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                            }`}>
                              {m.fonte === "manual" ? "Oficial" : m.fonte || "Oficial"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabela de Dados Diários com Cobre em USD/t */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Histórico de Cotações Diárias
              </CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Mês:</Label>
                <Input 
                  type="month" 
                  value={historicoMesFiltro} 
                  onChange={(e) => setHistoricoMesFiltro(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Cobre (US$/t)</TableHead>
                    <TableHead className="text-right">Cobre (R$/kg)</TableHead>
                    <TableHead className="text-right">Alumínio (R$/kg)</TableHead>
                    <TableHead className="text-right">Dólar (R$/US$)</TableHead>
                    <TableHead className="text-center">Fonte</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historicoFiltrado.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nenhuma cotação encontrada para o mês selecionado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    historicoFiltrado.map((h: any) => (
                      <TableRow key={h.id}>
                        <TableCell className="font-medium">
                          {format(new Date(h.data), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-primary">
                          {h.cobre_usd_t ? `$ ${Number(h.cobre_usd_t).toLocaleString("pt-BR")}` : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {h.cobre_brl_kg ? formatCurrency(h.cobre_brl_kg) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {h.aluminio_brl_kg ? formatCurrency(h.aluminio_brl_kg) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {h.dolar_brl ? `R$ ${Number(h.dolar_brl).toFixed(4)}` : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            h.fonte === "api" ? "bg-success/10 text-success" : 
                            h.fonte === "excel" ? "bg-primary/10 text-primary" : 
                            "bg-muted text-muted-foreground"
                          }`}>
                            {h.fonte === "api" ? "API" : h.fonte === "excel" ? "Excel" : "Manual"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

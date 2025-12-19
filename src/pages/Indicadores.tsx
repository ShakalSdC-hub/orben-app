import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Minus, Upload, Calendar, Printer, Save } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, getWeek, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from "date-fns";
import { ExcelImport } from "@/components/lme/ExcelImport";
import { ptBR } from "date-fns/locale";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

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
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCotacaoOpen, setIsCotacaoOpen] = useState(false);
  const [cotacaoNome, setCotacaoNome] = useState("");
  const [cotacaoTipo, setCotacaoTipo] = useState<"dia" | "semana" | "mes">("dia");
  const [cotacaoData, setCotacaoData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [cotacaoSemana, setCotacaoSemana] = useState<string>("");
  const [cotacaoMes, setCotacaoMes] = useState<string>(format(new Date(), "yyyy-MM"));
  const [uploadData, setUploadData] = useState({ data: "", cobre_usd_t: "", aluminio_usd_t: "", dolar_brl: "", zinco_usd_t: "", chumbo_usd_t: "", estanho_usd_t: "", niquel_usd_t: "" });

  // Fetch histórico diário (não média)
  const { data: historico = [] } = useQuery({
    queryKey: ["historico_lme"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_lme")
        .select("*")
        .eq("is_media_semanal", false)
        .order("data", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data;
    },
  });

  // Fetch médias semanais importadas
  const { data: mediasSemanais = [] } = useQuery({
    queryKey: ["medias_semanais_lme"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_lme")
        .select("*")
        .eq("is_media_semanal", true)
        .order("semana_numero", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Gerar opções de semanas disponíveis
  const semanasDisponiveis = mediasSemanais.map((m: any) => ({
    value: String(m.semana_numero),
    label: `Semana ${m.semana_numero}`,
    data: m
  }));

  const uploadMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("historico_lme").upsert({
        data: data.data,
        cobre_usd_t: parseFloat(data.cobre_usd_t) || null,
        aluminio_usd_t: parseFloat(data.aluminio_usd_t) || null,
        zinco_usd_t: parseFloat(data.zinco_usd_t) || null,
        chumbo_usd_t: parseFloat(data.chumbo_usd_t) || null,
        estanho_usd_t: parseFloat(data.estanho_usd_t) || null,
        niquel_usd_t: parseFloat(data.niquel_usd_t) || null,
        dolar_brl: parseFloat(data.dolar_brl) || null,
        is_media_semanal: false,
        fonte: "manual",
      }, { onConflict: "data" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["historico_lme"] });
      setIsUploadOpen(false);
      setUploadData({ data: "", cobre_usd_t: "", aluminio_usd_t: "", dolar_brl: "", zinco_usd_t: "", chumbo_usd_t: "", estanho_usd_t: "", niquel_usd_t: "" });
      toast({ title: "Cotação cadastrada com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao cadastrar cotação", variant: "destructive" }),
  });

  // Calcular variações usando médias importadas
  const hoje = historico[0];
  const ontem = historico[1];
  
  // Usar médias semanais importadas (S-1 e S-2)
  const semanaAtual = getWeek(new Date(), { weekStartsOn: 1 });
  const mediaSemanaS1 = mediasSemanais.find((m: any) => m.semana_numero === semanaAtual - 1);
  const mediaSemanaS2 = mediasSemanais.find((m: any) => m.semana_numero === semanaAtual - 2);
  
  const cobreMediaSemana = mediaSemanaS1?.cobre_brl_kg || 0;
  const aluminioMediaSemana = mediaSemanaS1?.aluminio_brl_kg || 0;
  const cobreMediaSemanaAnterior = mediaSemanaS2?.cobre_brl_kg || cobreMediaSemana;
  const aluminioMediaSemanaAnterior = mediaSemanaS2?.aluminio_brl_kg || aluminioMediaSemana;

  // Calcular média mensal do mês anterior
  const calcularMedia = (registros: any[], campo: string) => {
    const validos = registros.filter((h: any) => h[campo] != null && h[campo] > 0);
    if (validos.length === 0) return 0;
    return validos.reduce((acc: number, h: any) => acc + h[campo], 0) / validos.length;
  };

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
  const chartData = [...historico].reverse().map((h: any) => ({
    data: format(new Date(h.data), "dd/MM", { locale: ptBR }),
    cobre: h.cobre_brl_kg || 0,
    aluminio: h.aluminio_brl_kg || 0,
  }));

  // Função para obter cotação baseado no tipo selecionado
  const getCotacaoSelecionada = () => {
    if (cotacaoTipo === "dia") {
      return historico.find((h: any) => h.data === cotacaoData);
    } else if (cotacaoTipo === "semana") {
      return mediasSemanais.find((m: any) => String(m.semana_numero) === cotacaoSemana);
    } else if (cotacaoTipo === "mes") {
      const [ano, mes] = cotacaoMes.split("-").map(Number);
      const inicioMes = new Date(ano, mes - 1, 1);
      const fimMes = new Date(ano, mes, 0);
      const registrosMes = historico.filter((h: any) => {
        const dataRegistro = parseISO(h.data);
        return isWithinInterval(dataRegistro, { start: inicioMes, end: fimMes });
      });
      if (registrosMes.length === 0) return null;
      return {
        cobre_brl_kg: calcularMedia(registrosMes, 'cobre_brl_kg'),
        aluminio_brl_kg: calcularMedia(registrosMes, 'aluminio_brl_kg'),
        dolar_brl: calcularMedia(registrosMes, 'dolar_brl'),
      };
    }
    return null;
  };

  const cotacaoSelecionada = getCotacaoSelecionada();

  const salvarCotacao = () => {
    if (!cotacaoSelecionada) {
      toast({ title: "Nenhuma cotação encontrada", variant: "destructive" });
      return;
    }
    const nome = cotacaoNome || `Cotação ${cotacaoTipo === "dia" ? cotacaoData : cotacaoTipo === "semana" ? `Semana ${cotacaoSemana}` : cotacaoMes}`;
    
    // Aqui você pode salvar a cotação com nome - por enquanto apenas mostra toast
    toast({ 
      title: "Cotação salva!", 
      description: `${nome}: Cobre ${formatCurrency(cotacaoSelecionada.cobre_brl_kg || 0)}/kg, Alumínio ${formatCurrency(cotacaoSelecionada.aluminio_brl_kg || 0)}/kg` 
    });
    setIsCotacaoOpen(false);
    setCotacaoNome("");
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Indicadores LME</h1>
            <p className="text-muted-foreground">Acompanhe as cotações de Cobre e Alumínio em tempo real</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <ExcelImport />
            
            {/* Cadastrar Cotação Dialog */}
            <Dialog open={isCotacaoOpen} onOpenChange={setIsCotacaoOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><Calendar className="h-4 w-4 mr-2" />Cadastrar Cotação</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Cadastrar Cotação LME</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Tipo de Cotação</Label>
                    <Select value={cotacaoTipo} onValueChange={(v: "dia" | "semana" | "mes") => setCotacaoTipo(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dia">Dia Específico</SelectItem>
                        <SelectItem value="semana">Média Semanal</SelectItem>
                        <SelectItem value="mes">Média Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {cotacaoTipo === "dia" && (
                    <div className="space-y-2">
                      <Label>Data</Label>
                      <Input 
                        type="date" 
                        value={cotacaoData} 
                        onChange={(e) => setCotacaoData(e.target.value)} 
                      />
                    </div>
                  )}

                  {cotacaoTipo === "semana" && (
                    <div className="space-y-2">
                      <Label>Semana</Label>
                      <Select value={cotacaoSemana} onValueChange={setCotacaoSemana}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a semana" />
                        </SelectTrigger>
                        <SelectContent>
                          {semanasDisponiveis.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {cotacaoTipo === "mes" && (
                    <div className="space-y-2">
                      <Label>Mês</Label>
                      <Input 
                        type="month" 
                        value={cotacaoMes} 
                        onChange={(e) => setCotacaoMes(e.target.value)} 
                      />
                    </div>
                  )}

                  {/* Preview da cotação */}
                  {cotacaoSelecionada && (
                    <Card className="bg-muted/50">
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Cobre (R$/kg)</p>
                            <p className="text-lg font-semibold">{formatCurrency(cotacaoSelecionada.cobre_brl_kg || 0)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Alumínio (R$/kg)</p>
                            <p className="text-lg font-semibold">{formatCurrency(cotacaoSelecionada.aluminio_brl_kg || 0)}</p>
                          </div>
                          {cotacaoSelecionada.dolar_brl && (
                            <div className="col-span-2">
                              <p className="text-muted-foreground">Dólar (R$/US$)</p>
                              <p className="text-lg font-semibold">R$ {Number(cotacaoSelecionada.dolar_brl).toFixed(4)}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {!cotacaoSelecionada && (cotacaoTipo !== "semana" || cotacaoSemana) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma cotação encontrada para o período selecionado.
                    </p>
                  )}

                  <div className="space-y-2">
                    <Label>Nome da Cotação (opcional)</Label>
                    <Input 
                      placeholder={`Ex: Cotação ${cotacaoTipo === "dia" ? cotacaoData : cotacaoTipo === "semana" ? `Semana ${cotacaoSemana}` : cotacaoMes}`}
                      value={cotacaoNome} 
                      onChange={(e) => setCotacaoNome(e.target.value)} 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCotacaoOpen(false)}>Cancelar</Button>
                  <Button onClick={salvarCotacao} disabled={!cotacaoSelecionada}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Cotação
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><Upload className="h-4 w-4 mr-2" />Manual</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Cadastrar Cotação Manual</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input type="date" value={uploadData.data} onChange={(e) => setUploadData({ ...uploadData, data: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cobre (US$/t)</Label>
                      <Input type="number" step="0.01" value={uploadData.cobre_usd_t} onChange={(e) => setUploadData({ ...uploadData, cobre_usd_t: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Alumínio (US$/t)</Label>
                      <Input type="number" step="0.01" value={uploadData.aluminio_usd_t} onChange={(e) => setUploadData({ ...uploadData, aluminio_usd_t: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Zinco (US$/t)</Label>
                      <Input type="number" step="0.01" value={uploadData.zinco_usd_t} onChange={(e) => setUploadData({ ...uploadData, zinco_usd_t: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Chumbo (US$/t)</Label>
                      <Input type="number" step="0.01" value={uploadData.chumbo_usd_t} onChange={(e) => setUploadData({ ...uploadData, chumbo_usd_t: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Estanho (US$/t)</Label>
                      <Input type="number" step="0.01" value={uploadData.estanho_usd_t} onChange={(e) => setUploadData({ ...uploadData, estanho_usd_t: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Níquel (US$/t)</Label>
                      <Input type="number" step="0.01" value={uploadData.niquel_usd_t} onChange={(e) => setUploadData({ ...uploadData, niquel_usd_t: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Dólar (R$/US$)</Label>
                    <Input type="number" step="0.0001" value={uploadData.dolar_brl} onChange={(e) => setUploadData({ ...uploadData, dolar_brl: e.target.value })} />
                  </div>
                  <Button className="w-full" onClick={() => uploadMutation.mutate(uploadData)} disabled={uploadMutation.isPending}>
                    {uploadMutation.isPending ? "Salvando..." : "Salvar Cotação"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Imprimir</Button>
          </div>
        </div>

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
              <ResponsiveContainer width="100%" height="100%">
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
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Médias Semanais */}
        {mediasSemanais.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Médias Semanais Importadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Semana</TableHead>
                      <TableHead className="text-right">Cobre (R$/kg)</TableHead>
                      <TableHead className="text-right">Alumínio (R$/kg)</TableHead>
                      <TableHead className="text-right">Dólar (R$/US$)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mediasSemanais.map((m: any) => (
                      <TableRow key={m.id} className="bg-primary/5">
                        <TableCell className="font-medium">
                          Semana {m.semana_numero}
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabela de Dados Diários */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Histórico de Cotações Diárias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Cobre (R$/kg)</TableHead>
                    <TableHead className="text-right">Alumínio (R$/kg)</TableHead>
                    <TableHead className="text-right">Dólar (R$/US$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historico.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Nenhuma cotação cadastrada. Clique em "Importar Excel" para adicionar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    historico.slice(0, 20).map((h: any) => (
                      <TableRow key={h.id}>
                        <TableCell className="font-medium">
                          {format(new Date(h.data), "dd/MM/yyyy", { locale: ptBR })}
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
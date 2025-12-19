import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  Zap,
  DollarSign,
  Truck,
  Factory,
  Scale,
  RefreshCw,
  Save,
  Printer,
  Upload,
  History,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

export default function Simulador() {
  // LME Inputs
  const [cobreUsdT, setCobreUsdT] = useState(9300);
  const [dolarBrl, setDolarBrl] = useState(6.10);
  const [fatorImposto, setFatorImposto] = useState(0.7986);
  const [pctLmeNegociada, setPctLmeNegociada] = useState(8);
  const [taxaFinanceiraPct, setTaxaFinanceiraPct] = useState(1.80);
  const [prazoDias, setPrazoDias] = useState(40);

  // Custos Sucata
  const [custoSucataKg, setCustoSucataKg] = useState(35);
  const [custoFreteColeta, setCustoFreteColeta] = useState(0.80);
  const [custoFreteLaminacao, setCustoFreteLaminacao] = useState(1.20);
  const [custoMO, setCustoMO] = useState(2.50);
  const [perdaProcesso, setPerdaProcesso] = useState(12);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Buscar última cotação LME
  const { data: ultimaLme } = useQuery({
    queryKey: ["ultima-lme"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_lme")
        .select("*")
        .order("data", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Buscar histórico de simulações
  const { data: historicoSimulacoes } = useQuery({
    queryKey: ["simulacoes-lme"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simulacoes_lme")
        .select("*")
        .order("data_simulacao", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Preencher com última cotação
  useEffect(() => {
    if (ultimaLme) {
      if (ultimaLme.cobre_usd_t) setCobreUsdT(ultimaLme.cobre_usd_t);
      if (ultimaLme.dolar_brl) setDolarBrl(ultimaLme.dolar_brl);
    }
  }, [ultimaLme]);

  // === CÁLCULOS LME (Vergalhão Nacional) ===
  const lmeSemanaBrlKg = (cobreUsdT * dolarBrl) / 1000;
  const precoComImposto = lmeSemanaBrlKg / fatorImposto;
  const precoAVista = precoComImposto * (1 - pctLmeNegociada / 100);
  const precoAPrazo = precoAVista * (1 + (taxaFinanceiraPct / 100) * (prazoDias / 30));

  // === CÁLCULOS SUCATA + CUSTOS ===
  const custoTotalSucata = custoSucataKg + custoFreteColeta + custoFreteLaminacao + custoMO;
  const perdaMultiplicador = 1 / (1 - perdaProcesso / 100);
  const custoFinalIndustrializado = custoTotalSucata * perdaMultiplicador;

  // === COMPARATIVO ===
  const diferenca = precoAVista - custoFinalIndustrializado;
  const economiaPct = ((diferenca / precoAVista) * 100);
  const valeAPena = diferenca > 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Salvar simulação
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("simulacoes_lme").insert({
        cobre_usd_t: cobreUsdT,
        dolar_brl: dolarBrl,
        fator_imposto: fatorImposto,
        pct_lme_negociada: pctLmeNegociada,
        taxa_financeira_pct: taxaFinanceiraPct,
        prazo_dias: prazoDias,
        lme_semana_brl_kg: lmeSemanaBrlKg,
        preco_com_imposto: precoComImposto,
        preco_a_vista: precoAVista,
        preco_a_prazo: precoAPrazo,
        custo_sucata_kg: custoFinalIndustrializado,
        economia_pct: economiaPct,
        resultado: valeAPena ? "COMPRAR SUCATA" : "COMPRAR VERGALHÃO",
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simulacoes-lme"] });
      toast({ title: "Simulação salva", description: "Registro salvo no histórico." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Simulador LME</h1>
            <p className="text-muted-foreground">
              Compare: Vergalhão LME à Vista vs Sucata + Custos
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Resetar
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-gradient-copper hover:opacity-90 shadow-copper"
            >
              {saveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar
            </Button>
          </div>
        </div>

        <Tabs defaultValue="simulador" className="space-y-6">
          <TabsList>
            <TabsTrigger value="simulador">Simulador</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="simulador">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Inputs */}
              <div className="lg:col-span-2 space-y-6">
                {/* Cotação LME */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      Cotação LME
                    </CardTitle>
                    <CardDescription>
                      Defina os parâmetros do mercado
                      {ultimaLme && (
                        <span className="text-xs ml-2 text-muted-foreground">
                          (última cotação: {format(new Date(ultimaLme.data), "dd/MM/yyyy")})
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Cobre (US$/t)</Label>
                        <Input
                          type="number"
                          value={cobreUsdT}
                          onChange={(e) => setCobreUsdT(Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Dólar (R$/US$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={dolarBrl}
                          onChange={(e) => setDolarBrl(Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="grid gap-6 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Fator Imposto</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={fatorImposto}
                          onChange={(e) => setFatorImposto(Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>% LME Negociada</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[pctLmeNegociada]}
                            onValueChange={([value]) => setPctLmeNegociada(value)}
                            min={0}
                            max={15}
                            step={0.5}
                            className="flex-1"
                          />
                          <span className="w-12 text-right font-medium">{pctLmeNegociada}%</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Prazo (dias)</Label>
                        <Input
                          type="number"
                          value={prazoDias}
                          onChange={(e) => setPrazoDias(Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Taxa Financeira (%/mês)</Label>
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[taxaFinanceiraPct]}
                          onValueChange={([value]) => setTaxaFinanceiraPct(value)}
                          min={0}
                          max={5}
                          step={0.1}
                          className="flex-1"
                        />
                        <span className="w-16 text-right font-medium">{taxaFinanceiraPct}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Custos Sucata */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Scale className="h-5 w-5 text-copper" />
                      Custos Sucata + Industrialização
                    </CardTitle>
                    <CardDescription>
                      Defina os custos para comprar sucata e processar
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Custo Sucata (R$/kg)</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[custoSucataKg]}
                            onValueChange={([value]) => setCustoSucataKg(value)}
                            min={20}
                            max={50}
                            step={0.5}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={custoSucataKg}
                            onChange={(e) => setCustoSucataKg(Number(e.target.value))}
                            className="w-24"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Perda no Processo (%)</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[perdaProcesso]}
                            onValueChange={([value]) => setPerdaProcesso(value)}
                            min={5}
                            max={25}
                            step={0.5}
                            className="flex-1"
                          />
                          <span className="w-16 text-right font-medium">{perdaProcesso}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-6 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Frete Coleta (R$/kg)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={custoFreteColeta}
                          onChange={(e) => setCustoFreteColeta(Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Frete Laminação (R$/kg)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={custoFreteLaminacao}
                          onChange={(e) => setCustoFreteLaminacao(Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Mão de Obra (R$/kg)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={custoMO}
                          onChange={(e) => setCustoMO(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Results */}
              <div className="space-y-6">
                {/* Main Result */}
                <Card className={cn(valeAPena ? "border-success/50" : "border-destructive/50")}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Zap className="h-5 w-5" />
                      Resultado
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div
                      className={cn(
                        "rounded-lg p-4 text-center",
                        valeAPena ? "bg-success/10" : "bg-destructive/10"
                      )}
                    >
                      <div
                        className={cn(
                          "inline-flex h-12 w-12 items-center justify-center rounded-full mb-2",
                          valeAPena ? "bg-success/20" : "bg-destructive/20"
                        )}
                      >
                        {valeAPena ? (
                          <TrendingDown className="h-6 w-6 text-success" />
                        ) : (
                          <TrendingUp className="h-6 w-6 text-destructive" />
                        )}
                      </div>
                      <p
                        className={cn(
                          "text-xl font-bold",
                          valeAPena ? "text-success" : "text-destructive"
                        )}
                      >
                        {valeAPena ? "COMPRAR SUCATA" : "COMPRAR VERGALHÃO"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {valeAPena
                          ? `Economia de ${economiaPct.toFixed(1)}%`
                          : `Prejuízo de ${Math.abs(economiaPct).toFixed(1)}%`}
                      </p>
                    </div>

                    <Separator />

                    {/* Comparativo */}
                    <div className="space-y-3">
                      <div className="rounded-lg bg-primary/5 p-3">
                        <p className="text-xs text-muted-foreground mb-1">Vergalhão LME à Vista</p>
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(precoAVista)}/kg
                        </p>
                      </div>
                      <div className="text-center text-2xl font-bold text-muted-foreground">vs</div>
                      <div className="rounded-lg bg-copper/5 p-3">
                        <p className="text-xs text-muted-foreground mb-1">Custo Sucata Industrializado</p>
                        <p className="text-2xl font-bold text-copper">
                          {formatCurrency(custoFinalIndustrializado)}/kg
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Breakdown LME */}
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-muted-foreground">Cálculo LME:</p>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">LME Semana (R$/kg)</span>
                        <span className="font-medium">{formatCurrency(lmeSemanaBrlKg)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">÷ Fator Imposto</span>
                        <span className="font-medium">{formatCurrency(precoComImposto)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">- {pctLmeNegociada}% Desconto</span>
                        <span className="font-bold text-primary">{formatCurrency(precoAVista)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-muted-foreground">A Prazo ({prazoDias}d)</span>
                        <span className="font-medium">{formatCurrency(precoAPrazo)}</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Diferença */}
                    <div
                      className={cn(
                        "rounded-lg p-3 text-center",
                        valeAPena ? "bg-success/5" : "bg-destructive/5"
                      )}
                    >
                      <p className="text-sm text-muted-foreground">Diferença por kg</p>
                      <p
                        className={cn(
                          "text-2xl font-bold",
                          valeAPena ? "text-success" : "text-destructive"
                        )}
                      >
                        {valeAPena ? "-" : "+"}
                        {formatCurrency(Math.abs(diferenca))}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="historico">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Histórico de Simulações
                </CardTitle>
                <CardDescription>
                  Últimas 10 simulações salvas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cobre (US$/t)</TableHead>
                      <TableHead>Dólar</TableHead>
                      <TableHead>LME à Vista</TableHead>
                      <TableHead>Custo Sucata</TableHead>
                      <TableHead>Economia</TableHead>
                      <TableHead>Resultado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historicoSimulacoes?.map((sim) => (
                      <TableRow key={sim.id}>
                        <TableCell className="text-sm">
                          {format(new Date(sim.data_simulacao), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {sim.cobre_usd_t?.toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell>R$ {sim.dolar_brl?.toFixed(2)}</TableCell>
                        <TableCell className="text-primary font-medium">
                          R$ {sim.preco_a_vista?.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-copper font-medium">
                          R$ {sim.custo_sucata_kg?.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "font-medium",
                            (sim.economia_pct || 0) > 0 ? "text-success" : "text-destructive"
                          )}>
                            {sim.economia_pct?.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "text-xs font-medium px-2 py-1 rounded",
                            sim.resultado === "COMPRAR SUCATA"
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive"
                          )}>
                            {sim.resultado}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!historicoSimulacoes || historicoSimulacoes.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhuma simulação salva ainda
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

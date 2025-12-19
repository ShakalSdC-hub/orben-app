import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Simulador() {
  const [precoSucataKg, setPrecoSucataKg] = useState(35);
  const [pesoSucataKg, setPesoSucataKg] = useState(5000);
  const [perdaProcesso, setPerdaProcesso] = useState(12);
  const [custoFreteColeta, setCustoFreteColeta] = useState(800);
  const [custoFreteLaminacao, setCustoFreteLaminacao] = useState(1200);
  const [custoMO, setCustoMO] = useState(2.5);
  const [precoLME, setPrecoLME] = useState(48.2);

  // Cálculos
  const pesoVergalhao = pesoSucataKg * (1 - perdaProcesso / 100);
  const custoSucataTotal = precoSucataKg * pesoSucataKg;
  const custoFreteTotal = custoFreteColeta + custoFreteLaminacao;
  const custoMOTotal = custoMO * pesoVergalhao;
  const custoTotal = custoSucataTotal + custoFreteTotal + custoMOTotal;
  const custoPorKg = custoTotal / pesoVergalhao;
  const diferenca = precoLME - custoPorKg;
  const percentualEconomia = ((diferenca / precoLME) * 100).toFixed(1);
  const valeAPena = diferenca > 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Simulador de Custos</h1>
            <p className="text-muted-foreground">
              Calcule se compensa comprar sucata ou vergalhão pronto
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Resetar Valores
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Inputs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sucata */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" />
                  Compra de Sucata
                </CardTitle>
                <CardDescription>
                  Defina os parâmetros da compra de sucata
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Preço da Sucata (R$/kg)</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[precoSucataKg]}
                        onValueChange={([value]) => setPrecoSucataKg(value)}
                        min={20}
                        max={50}
                        step={0.5}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={precoSucataKg}
                        onChange={(e) => setPrecoSucataKg(Number(e.target.value))}
                        className="w-24"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Peso Total (kg)</Label>
                    <Input
                      type="number"
                      value={pesoSucataKg}
                      onChange={(e) => setPesoSucataKg(Number(e.target.value))}
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
                      max={20}
                      step={0.5}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={perdaProcesso}
                      onChange={(e) => setPerdaProcesso(Number(e.target.value))}
                      className="w-24"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Vergalhão produzido: {pesoVergalhao.toFixed(0)}kg
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Custos Operacionais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-copper" />
                  Custos Operacionais
                </CardTitle>
                <CardDescription>
                  Fretes e mão de obra
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Frete Coleta (R$)</Label>
                    <Input
                      type="number"
                      value={custoFreteColeta}
                      onChange={(e) => setCustoFreteColeta(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Frete Laminação (R$)</Label>
                    <Input
                      type="number"
                      value={custoFreteLaminacao}
                      onChange={(e) => setCustoFreteLaminacao(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Custo Mão de Obra (R$/kg vergalhão)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[custoMO]}
                      onValueChange={([value]) => setCustoMO(value)}
                      min={1}
                      max={5}
                      step={0.1}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={custoMO}
                      onChange={(e) => setCustoMO(Number(e.target.value))}
                      className="w-24"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Benchmark */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Factory className="h-5 w-5 text-success" />
                  Benchmark LME
                </CardTitle>
                <CardDescription>
                  Preço de referência do vergalhão no mercado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Preço LME Vergalhão (R$/kg)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[precoLME]}
                      onValueChange={([value]) => setPrecoLME(value)}
                      min={35}
                      max={60}
                      step={0.1}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={precoLME}
                      onChange={(e) => setPrecoLME(Number(e.target.value))}
                      className="w-24"
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
                  Resultado da Simulação
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
                      "text-2xl font-bold",
                      valeAPena ? "text-success" : "text-destructive"
                    )}
                  >
                    {valeAPena ? "COMPRAR SUCATA" : "COMPRAR VERGALHÃO"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {valeAPena
                      ? `Economia de ${percentualEconomia}% vs LME`
                      : `Prejuízo de ${Math.abs(Number(percentualEconomia))}% vs LME`}
                  </p>
                </div>

                <Separator />

                {/* Breakdown */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Custo Sucata</span>
                    <span className="font-medium">{formatCurrency(custoSucataTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fretes</span>
                    <span className="font-medium">{formatCurrency(custoFreteTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Mão de Obra</span>
                    <span className="font-medium">{formatCurrency(custoMOTotal)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-medium">Custo Total</span>
                    <span className="font-bold text-lg">{formatCurrency(custoTotal)}</span>
                  </div>
                </div>

                <Separator />

                {/* Per KG comparison */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Seu Custo/kg</p>
                    <p className="text-xl font-bold">R$ {custoPorKg.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">LME/kg</p>
                    <p className="text-xl font-bold">R$ {precoLME.toFixed(2)}</p>
                  </div>
                </div>

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
                    {valeAPena ? "-" : "+"}R$ {Math.abs(diferenca).toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Dicas de Otimização</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>• Negocie melhores fretes para volumes maiores</p>
                <p>• Reduza perdas melhorando o processo de triagem</p>
                <p>• Compare preços de diferentes fornecedores</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

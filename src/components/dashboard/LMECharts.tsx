import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LMEChartsProps {
  lmeData: any[];
  isLoading?: boolean;
}

export function LMECharts({ lmeData, isLoading = false }: LMEChartsProps) {
  const chartData = lmeData?.slice().reverse().map((lme) => ({
    data: format(new Date(lme.data), "dd/MM"),
    dataFull: format(new Date(lme.data), "dd/MM/yyyy"),
    cobre_brl: lme.cobre_brl_kg || 0,
    aluminio_brl: lme.aluminio_brl_kg || 0,
    cobre_usd: lme.cobre_usd_t || 0,
    aluminio_usd: lme.aluminio_usd_t || 0,
    dolar: lme.dolar_brl || 0,
  })) || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calcular variações
  const lmeAtual = lmeData?.[0];
  const lmeAnterior = lmeData?.[1];
  
  const variacaoCobre = lmeAtual && lmeAnterior && lmeAnterior.cobre_brl_kg
    ? ((lmeAtual.cobre_brl_kg - lmeAnterior.cobre_brl_kg) / lmeAnterior.cobre_brl_kg) * 100
    : 0;
  
  const variacaoAluminio = lmeAtual && lmeAnterior && lmeAnterior.aluminio_brl_kg
    ? ((lmeAtual.aluminio_brl_kg - lmeAnterior.aluminio_brl_kg) / lmeAnterior.aluminio_brl_kg) * 100
    : 0;

  const variacaoDolar = lmeAtual && lmeAnterior && lmeAnterior.dolar_brl
    ? ((lmeAtual.dolar_brl - lmeAnterior.dolar_brl) / lmeAnterior.dolar_brl) * 100
    : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cotações LME</CardTitle>
          <CardDescription>Carregando dados...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!lmeData || lmeData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cotações LME</CardTitle>
          <CardDescription>Sem dados disponíveis</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          Importe dados de cotação LME para visualizar os gráficos
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cobre (R$/kg)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-copper">
                {lmeAtual?.cobre_brl_kg ? formatCurrency(lmeAtual.cobre_brl_kg) : "—"}
              </span>
              {variacaoCobre !== 0 && (
                <Badge variant={variacaoCobre > 0 ? "default" : "destructive"} className="flex items-center gap-1">
                  {variacaoCobre > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {variacaoCobre > 0 ? "+" : ""}{variacaoCobre.toFixed(2)}%
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alumínio (R$/kg)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-primary">
                {lmeAtual?.aluminio_brl_kg ? formatCurrency(lmeAtual.aluminio_brl_kg) : "—"}
              </span>
              {variacaoAluminio !== 0 && (
                <Badge variant={variacaoAluminio > 0 ? "default" : "destructive"} className="flex items-center gap-1">
                  {variacaoAluminio > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {variacaoAluminio > 0 ? "+" : ""}{variacaoAluminio.toFixed(2)}%
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dólar (R$)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-success">
                {lmeAtual?.dolar_brl ? `R$ ${lmeAtual.dolar_brl.toFixed(4)}` : "—"}
              </span>
              {variacaoDolar !== 0 && (
                <Badge variant={variacaoDolar > 0 ? "default" : "destructive"} className="flex items-center gap-1">
                  {variacaoDolar > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {variacaoDolar > 0 ? "+" : ""}{variacaoDolar.toFixed(2)}%
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Cobre e Alumínio (R$/kg) */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução Cobre e Alumínio (R$/kg)</CardTitle>
          <CardDescription>Últimos {chartData.length} registros</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="data" 
                axisLine={false} 
                tickLine={false} 
                className="text-xs"
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(value) => `R$${value.toFixed(2)}`}
                className="text-xs"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === "cobre_brl" ? "Cobre" : "Alumínio"
                ]}
                labelFormatter={(label) => `Data: ${label}`}
              />
              <Legend 
                formatter={(value) => value === "cobre_brl" ? "Cobre" : "Alumínio"}
              />
              <Line
                type="monotone"
                dataKey="cobre_brl"
                stroke="hsl(28, 70%, 45%)"
                strokeWidth={2}
                dot={{ fill: "hsl(28, 70%, 45%)", r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="aluminio_brl"
                stroke="hsl(220, 70%, 50%)"
                strokeWidth={2}
                dot={{ fill: "hsl(220, 70%, 50%)", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Barras USD/t */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cobre LME (USD/t)</CardTitle>
            <CardDescription>Cotação internacional</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="data" axisLine={false} tickLine={false} className="text-xs" />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  className="text-xs"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [formatUSD(value), "Cobre"]}
                />
                <Bar dataKey="cobre_usd" fill="hsl(28, 70%, 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dólar (R$)</CardTitle>
            <CardDescription>Cotação do dólar</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorDolar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 60%, 40%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 60%, 40%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="data" axisLine={false} tickLine={false} className="text-xs" />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  domain={["auto", "auto"]}
                  tickFormatter={(value) => `R$${value.toFixed(2)}`}
                  className="text-xs"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`R$ ${value.toFixed(4)}`, "Dólar"]}
                />
                <Area
                  type="monotone"
                  dataKey="dolar"
                  stroke="hsl(142, 60%, 40%)"
                  strokeWidth={2}
                  fill="url(#colorDolar)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

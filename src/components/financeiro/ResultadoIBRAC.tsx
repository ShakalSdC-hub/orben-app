import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Sparkles, Factory, Percent, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const COLORS = {
  lucroPerdas: "hsl(142, 60%, 40%)",
  receitaServicos: "hsl(220, 70%, 50%)",
  comissaoOperacoes: "hsl(28, 70%, 45%)",
};

export function ResultadoIBRAC() {
  const mesAtual = new Date();
  const dataInicio = format(startOfMonth(mesAtual), "yyyy-MM-dd");
  const dataFim = format(endOfMonth(mesAtual), "yyyy-MM-dd");

  // Beneficiamentos - Lucro na perda
  const { data: beneficiamentos = [], isLoading: loadingBenef } = useQuery({
    queryKey: ["resultado-ibrac-beneficiamentos", dataInicio, dataFim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamentos")
        .select(`
          id,
          codigo,
          lucro_perda_kg,
          lucro_perda_valor,
          perda_cobrada_pct,
          perda_real_pct,
          data_inicio
        `)
        .gte("data_inicio", dataInicio)
        .lte("data_inicio", dataFim)
        .eq("status", "finalizado");
      if (error) throw error;
      return data;
    },
  });

  // Saídas - Receita serviços + Comissões
  const { data: saidas = [], isLoading: loadingSaidas } = useQuery({
    queryKey: ["resultado-ibrac-saidas", dataInicio, dataFim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saidas")
        .select(`
          id,
          codigo,
          cenario_operacao,
          custos_cobrados,
          comissao_ibrac,
          valor_total,
          data_saida
        `)
        .gte("data_saida", dataInicio)
        .lte("data_saida", dataFim);
      if (error) throw error;
      return data;
    },
  });

  // Calcular totais
  const resultados = useMemo(() => {
    const lucroPerdas = beneficiamentos.reduce((acc, b) => acc + (b.lucro_perda_valor || 0), 0);
    const receitaServicos = saidas
      .filter((s: any) => s.cenario_operacao === "industrializacao")
      .reduce((acc, s) => acc + (s.custos_cobrados || 0), 0);
    const comissaoOperacoes = saidas
      .filter((s: any) => s.cenario_operacao === "operacao_terceiro")
      .reduce((acc, s) => acc + (s.comissao_ibrac || 0), 0);

    const lucroTotal = lucroPerdas + receitaServicos + comissaoOperacoes;

    return {
      lucroPerdas,
      receitaServicos,
      comissaoOperacoes,
      lucroTotal,
      qtdBeneficiamentos: beneficiamentos.length,
      qtdIndustrializacao: saidas.filter((s: any) => s.cenario_operacao === "industrializacao").length,
      qtdOperacoesTerceiro: saidas.filter((s: any) => s.cenario_operacao === "operacao_terceiro").length,
    };
  }, [beneficiamentos, saidas]);

  // Dados para gráfico de pizza
  const pieData = [
    { name: "Lucro Perda", value: resultados.lucroPerdas },
    { name: "Receita Serviços", value: resultados.receitaServicos },
    { name: "Comissão Operações", value: resultados.comissaoOperacoes },
  ].filter(d => d.value > 0);

  const isLoading = loadingBenef || loadingSaidas;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs de Resultado */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-success">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-success" />
              Lucro na Perda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{formatCurrency(resultados.lucroPerdas)}</p>
            <p className="text-xs text-muted-foreground">
              {resultados.qtdBeneficiamentos} beneficiamentos
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-info">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Factory className="h-4 w-4 text-info" />
              Receita Serviços
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-info">{formatCurrency(resultados.receitaServicos)}</p>
            <p className="text-xs text-muted-foreground">
              {resultados.qtdIndustrializacao} industrializações
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Percent className="h-4 w-4 text-primary" />
              Comissão Operações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(resultados.comissaoOperacoes)}</p>
            <p className="text-xs text-muted-foreground">
              {resultados.qtdOperacoesTerceiro} operações terceiro
            </p>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-l-4",
          resultados.lucroTotal >= 0 ? "border-l-success bg-success/5" : "border-l-destructive bg-destructive/5"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Lucro Total IBRAC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn(
              "text-2xl font-bold",
              resultados.lucroTotal >= 0 ? "text-success" : "text-destructive"
            )}>
              {formatCurrency(resultados.lucroTotal)}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(mesAtual, "MMMM yyyy", { locale: ptBR })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Composição do Lucro IBRAC</CardTitle>
            <CardDescription>Distribuição por fonte de receita</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={Object.values(COLORS)[index % Object.values(COLORS).length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Sem dados no período
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalhamento por Cenário</CardTitle>
            <CardDescription>Operações e resultados por tipo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-success/10">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium">Lucro na Perda</p>
                    <p className="text-xs text-muted-foreground">
                      Diferença entre perda cobrada e perda real
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-success">{formatCurrency(resultados.lucroPerdas)}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {resultados.qtdBeneficiamentos} ops
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-info/10">
                <div className="flex items-center gap-3">
                  <Factory className="h-5 w-5 text-info" />
                  <div>
                    <p className="font-medium">Industrialização</p>
                    <p className="text-xs text-muted-foreground">
                      MO + Frete cobrados do cliente
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-info">{formatCurrency(resultados.receitaServicos)}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {resultados.qtdIndustrializacao} ops
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                <div className="flex items-center gap-3">
                  <Percent className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Operação Terceiro</p>
                    <p className="text-xs text-muted-foreground">
                      Comissão sobre vendas de terceiros
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{formatCurrency(resultados.comissaoOperacoes)}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {resultados.qtdOperacoesTerceiro} ops
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

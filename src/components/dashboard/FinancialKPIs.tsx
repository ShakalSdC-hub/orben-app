import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Scale, Percent, Factory, Users, Sparkles, ArrowUpRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { detectarCenario, CenarioOperacao } from "@/lib/cenarios-orben";

interface FinancialKPIsProps {
  selectedDono?: string | null;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatWeight(kg: number) {
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  return `${kg.toFixed(0)} kg`;
}

export function FinancialKPIs({ selectedDono }: FinancialKPIsProps) {
  const mesAtual = new Date();
  const inicioMes = format(startOfMonth(mesAtual), "yyyy-MM-dd");
  const fimMes = format(endOfMonth(mesAtual), "yyyy-MM-dd");

  // Fetch beneficiamentos do mês
  const { data: beneficiamentos } = useQuery({
    queryKey: ["dashboard-beneficiamentos-mes", inicioMes, fimMes],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamentos")
        .select("*")
        .gte("data_inicio", inicioMes)
        .lte("data_inicio", fimMes)
        .eq("status", "finalizado");
      if (error) throw error;
      return data;
    },
  });

  // Fetch itens de entrada para pegar dono e cenário
  const { data: itensEntrada } = useQuery({
    queryKey: ["dashboard-itens-entrada-mes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamento_itens_entrada")
        .select(`
          beneficiamento_id,
          sublote:sublotes(
            dono_id,
            dono:donos_material(id, nome, is_ibrac, taxa_operacao_pct),
            entrada:entradas(tipo_entrada:tipos_entrada(gera_custo))
          )
        `);
      if (error) throw error;
      return data;
    },
  });

  // Fetch documentos vinculados
  const { data: benefEntradas } = useQuery({
    queryKey: ["dashboard-benef-entradas-mes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamento_entradas")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch histórico LME
  const { data: historicoLme } = useQuery({
    queryKey: ["dashboard-lme-economia"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_lme")
        .select("*")
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch sublotes de vergalhão em estoque
  const { data: sublotesVergalhao } = useQuery({
    queryKey: ["dashboard-sublotes-vergalhao", selectedDono],
    queryFn: async () => {
      let query = supabase
        .from("sublotes")
        .select(`
          *,
          tipo_produto:tipos_produto(nome, codigo)
        `)
        .eq("status", "disponivel");

      if (selectedDono) {
        query = query.eq("dono_id", selectedDono);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch acertos financeiros pendentes
  const { data: acertosPendentes } = useQuery({
    queryKey: ["dashboard-acertos-pendentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acertos_financeiros")
        .select("*")
        .eq("status", "pendente");
      if (error) throw error;
      return data;
    },
  });

  // Calcular KPIs por cenário
  const kpis = useMemo(() => {
    const resultado = {
      // KPIs gerais
      economiaTotalMes: 0,
      custoMedioVergalhao: 0,
      saldoVergalhao: 0,
      pesoProcessadoMes: 0,
      economiaPositiva: true,
      // KPIs por cenário - Lucro IBRAC
      lucroPerdaTotal: 0,
      lucroMOTotal: 0,
      lucroComissaoTotal: 0,
      // Repasses pendentes
      repassesPendentes: 0,
      // Por cenário
      cenarios: {
        proprio: { peso: 0, economia: 0, count: 0 },
        industrializacao: { peso: 0, receita: 0, count: 0 },
        operacao_terceiro: { peso: 0, comissao: 0, count: 0 },
      } as Record<CenarioOperacao, { peso: number; economia?: number; receita?: number; comissao?: number; count: number }>,
    };

    if (!beneficiamentos) return resultado;

    let custoTotalVergalhao = 0;
    let pesoTotalSaida = 0;

    for (const benef of beneficiamentos) {
      // Buscar info do sublote para detectar cenário
      const itensDoBenef = itensEntrada?.filter(ie => ie.beneficiamento_id === benef.id) || [];
      const primeiroItem = itensDoBenef[0]?.sublote as any;
      
      // Detectar cenário
      const geraCusto = primeiroItem?.entrada?.tipo_entrada?.gera_custo ?? true;
      const isIbrac = primeiroItem?.dono?.is_ibrac ?? false;
      const donoId = primeiroItem?.dono_id;
      const taxaOperacao = primeiroItem?.dono?.taxa_operacao_pct ?? 0;
      
      const cenario = detectarCenario({ geraCusto, donoId, isIbrac });

      // Filtrar por dono se selecionado
      if (selectedDono && donoId !== selectedDono) continue;

      const pesoEntrada = benef.peso_entrada_kg || 0;
      const pesoSaida = benef.peso_saida_kg || 0;
      resultado.pesoProcessadoMes += pesoEntrada;

      // Atualizar contadores por cenário
      resultado.cenarios[cenario].peso += pesoEntrada;
      resultado.cenarios[cenario].count += 1;

      // Buscar documentos vinculados
      const docsDoBenef = benefEntradas?.filter(be => be.beneficiamento_id === benef.id) || [];
      const valorDocumento = docsDoBenef.reduce((acc, doc) => acc + (doc.valor_documento || 0), 0);
      const custoFinanceiro = docsDoBenef.reduce((acc, doc) => acc + (doc.taxa_financeira_valor || 0), 0);

      // Custos operacionais
      const custoMO = (benef.custo_mo_terceiro || 0) + (benef.custo_mo_ibrac || 0);
      const custoFrete = (benef.custo_frete_ida || 0) + (benef.custo_frete_volta || 0);
      
      const custoTotal = valorDocumento + custoFinanceiro + custoMO + custoFrete;
      const custoKgVergalhao = pesoSaida > 0 ? custoTotal / pesoSaida : 0;
      custoTotalVergalhao += custoTotal;
      pesoTotalSaida += pesoSaida;

      // LME da semana
      let lmeSemana: number | null = null;
      if (benef.lme_referencia_kg) {
        lmeSemana = Number(benef.lme_referencia_kg);
      } else if (historicoLme && historicoLme.length > 0 && benef.data_inicio) {
        const dataBenef = parseISO(benef.data_inicio);
        const lmesDaData = historicoLme.filter(lme => new Date(lme.data) <= dataBenef);
        if (lmesDaData.length > 0) {
          lmeSemana = lmesDaData[0].cobre_brl_kg;
        }
      }

      // Lucro na perda (perda_cobrada - perda_real)
      const perdaCobrada = benef.perda_cobrada_pct || 0;
      const perdaReal = benef.perda_real_pct || 0;
      if (perdaCobrada > perdaReal && lmeSemana) {
        const diferencaKg = pesoEntrada * ((perdaCobrada - perdaReal) / 100);
        const lucroPerdaBenef = diferencaKg * lmeSemana;
        resultado.lucroPerdaTotal += lucroPerdaBenef;
      }

      // Lucro MO (para industrialização)
      if (cenario === 'industrializacao') {
        resultado.lucroMOTotal += custoMO + custoFrete;
        resultado.cenarios.industrializacao.receita = (resultado.cenarios.industrializacao.receita || 0) + custoMO + custoFrete;
      }

      // Economia vs LME (para material próprio)
      if (lmeSemana !== null && pesoSaida > 0) {
        const economiaKg = lmeSemana - custoKgVergalhao;
        const economiaBenef = economiaKg * pesoSaida;
        resultado.economiaTotalMes += economiaBenef;

        if (cenario === 'proprio') {
          resultado.cenarios.proprio.economia = (resultado.cenarios.proprio.economia || 0) + economiaBenef;
        }
      }
    }

    resultado.custoMedioVergalhao = pesoTotalSaida > 0 ? custoTotalVergalhao / pesoTotalSaida : 0;
    resultado.economiaPositiva = resultado.economiaTotalMes >= 0;

    // Saldo de vergalhão em estoque
    resultado.saldoVergalhao = sublotesVergalhao?.filter(s => 
      s.tipo_produto?.nome?.toLowerCase().includes("vergalhão") ||
      s.tipo_produto?.codigo?.toLowerCase().includes("verg")
    ).reduce((acc, s) => acc + (s.peso_kg || 0), 0) || 0;

    // Repasses pendentes (acertos tipo 'receita' para donos terceiros)
    resultado.repassesPendentes = acertosPendentes?.filter(a => 
      a.tipo === 'receita' && a.dono_id
    ).reduce((acc, a) => acc + (a.valor || 0), 0) || 0;

    return resultado;
  }, [beneficiamentos, itensEntrada, benefEntradas, historicoLme, sublotesVergalhao, acertosPendentes, selectedDono]);

  const lucroTotalIbrac = kpis.lucroPerdaTotal + kpis.lucroMOTotal + kpis.lucroComissaoTotal;

  return (
    <div className="space-y-4">
      {/* Linha 1: KPIs principais */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Economia Total do Mês */}
        <Card className={cn(
          "border-2",
          kpis.economiaPositiva ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Economia vs LME (Mês)</CardTitle>
            {kpis.economiaPositiva ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              kpis.economiaPositiva ? "text-success" : "text-destructive"
            )}>
              {formatCurrency(kpis.economiaTotalMes)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatWeight(kpis.pesoProcessadoMes)} processado
            </p>
          </CardContent>
        </Card>

        {/* Custo Médio Vergalhão */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Médio Vergalhão</CardTitle>
            <DollarSign className="h-4 w-4 text-copper" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-copper">
              {formatCurrency(kpis.custoMedioVergalhao)}/kg
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Custo total ÷ peso saída
            </p>
          </CardContent>
        </Card>

        {/* Saldo Vergalhão */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Vergalhão</CardTitle>
            <Scale className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatWeight(kpis.saldoVergalhao)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Em estoque disponível
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Linha 2: Lucro IBRAC por fonte */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Lucro Total IBRAC */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro IBRAC (Total)</CardTitle>
            <Sparkles className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(lucroTotalIbrac)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Perda + MO + Comissão
            </p>
          </CardContent>
        </Card>

        {/* Lucro na Perda */}
        <Card className="border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Perda</CardTitle>
            <Percent className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(kpis.lucroPerdaTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Diferença cobrada vs real
            </p>
          </CardContent>
        </Card>

        {/* Lucro MO (Industrialização) */}
        <Card className="border-l-4 border-l-info">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Serviços</CardTitle>
            <Factory className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">
              {formatCurrency(kpis.lucroMOTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.cenarios.industrializacao.count} industrializações
            </p>
          </CardContent>
        </Card>

        {/* Repasses Pendentes */}
        <Card className="border-l-4 border-l-warning">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repasses Pendentes</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {formatCurrency(kpis.repassesPendentes)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              A repassar para donos
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

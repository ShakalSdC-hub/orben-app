import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Scale, Percent, Factory } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format, parseISO, getISOWeek } from "date-fns";
import { cn } from "@/lib/utils";

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

  // Fetch itens de entrada para pegar dono
  const { data: itensEntrada } = useQuery({
    queryKey: ["dashboard-itens-entrada-mes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamento_itens_entrada")
        .select(`
          beneficiamento_id,
          sublote:sublotes(dono_id)
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

  // Calcular KPIs
  const kpis = useMemo(() => {
    if (!beneficiamentos) {
      return {
        economiaTotalMes: 0,
        custoMedioVergalhao: 0,
        saldoVergalhao: 0,
        pesoProcessadoMes: 0,
        economiaPositiva: true,
      };
    }

    let economiaTotalMes = 0;
    let custoTotalVergalhao = 0;
    let pesoTotalSaida = 0;
    let pesoProcessadoMes = 0;

    for (const benef of beneficiamentos) {
      // Filtrar por dono se selecionado
      if (selectedDono) {
        const itensDoBenef = itensEntrada?.filter(ie => ie.beneficiamento_id === benef.id) || [];
        const donoId = itensDoBenef[0]?.sublote?.dono_id;
        if (donoId !== selectedDono) continue;
      }

      const pesoEntrada = benef.peso_entrada_kg || 0;
      const pesoSaida = benef.peso_saida_kg || 0;
      pesoProcessadoMes += pesoEntrada;

      // Buscar documentos vinculados
      const docsDoBenef = benefEntradas?.filter(be => be.beneficiamento_id === benef.id) || [];
      const valorDocumento = docsDoBenef.reduce((acc, doc) => acc + (doc.valor_documento || 0), 0);
      const custoFinanceiro = docsDoBenef.reduce((acc, doc) => acc + (doc.taxa_financeira_valor || 0), 0);

      // Custos operacionais
      const custoTotal = valorDocumento + custoFinanceiro + 
        (benef.custo_frete_ida || 0) + 
        (benef.custo_mo_terceiro || 0) + 
        (benef.custo_mo_ibrac || 0) + 
        (benef.custo_frete_volta || 0);

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

      // Economia
      if (lmeSemana !== null && pesoSaida > 0) {
        const economiaKg = lmeSemana - custoKgVergalhao;
        economiaTotalMes += economiaKg * pesoSaida;
      }
    }

    const custoMedioVergalhao = pesoTotalSaida > 0 ? custoTotalVergalhao / pesoTotalSaida : 0;

    // Saldo de vergalhão em estoque (produtos finalizados como vergalhão)
    const saldoVergalhao = sublotesVergalhao?.filter(s => 
      s.tipo_produto?.nome?.toLowerCase().includes("vergalhão") ||
      s.tipo_produto?.codigo?.toLowerCase().includes("verg")
    ).reduce((acc, s) => acc + (s.peso_kg || 0), 0) || 0;

    return {
      economiaTotalMes,
      custoMedioVergalhao,
      saldoVergalhao,
      pesoProcessadoMes,
      economiaPositiva: economiaTotalMes >= 0,
    };
  }, [beneficiamentos, itensEntrada, benefEntradas, historicoLme, sublotesVergalhao, selectedDono]);

  return (
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
  );
}

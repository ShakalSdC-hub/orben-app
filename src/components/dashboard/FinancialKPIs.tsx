import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, TrendingDown, DollarSign, Scale, Percent, Factory, Sparkles, ArrowUpRight, Calculator } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { detectarCenario, CenarioOperacao } from "@/lib/cenarios-orben";

interface FinancialKPIsProps {
  selectedDono?: string | null;
}

interface DetalheEconomia {
  codigo: string;
  pesoEntrada: number;
  pesoSaida: number;
  custoAquisicao: number;
  custoMO: number;
  custoFrete: number;
  custoFinanceiro: number;
  custoTotal: number;
  custoKg: number;
  lmeKg: number | null;
  economiaKg: number;
  economiaTotal: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatWeight(kg: number) {
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  return `${kg.toFixed(0)} kg`;
}

export function FinancialKPIs({ selectedDono }: FinancialKPIsProps) {
  const [showEconomiaDialog, setShowEconomiaDialog] = useState(false);
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

  // Fetch itens de entrada para pegar dono, cenário e custo de aquisição
  const { data: itensEntrada } = useQuery({
    queryKey: ["dashboard-itens-entrada-mes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamento_itens_entrada")
        .select(`
          beneficiamento_id,
          peso_kg,
          sublote:sublotes(
            dono_id,
            custo_unitario_total,
            dono:donos_material(id, nome, is_ibrac, taxa_operacao_pct),
            entrada:entradas(id, valor_total, peso_liquido_kg, tipo_entrada:tipos_entrada(gera_custo))
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
  const { kpis, detalhesEconomia } = useMemo(() => {
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

    const detalhes: DetalheEconomia[] = [];

    if (!beneficiamentos) return { kpis: resultado, detalhesEconomia: detalhes };

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
      const valorDocumentoFromDocs = docsDoBenef.reduce((acc, doc) => acc + (doc.valor_documento || 0), 0);
      const custoFinanceiro = docsDoBenef.reduce((acc, doc) => acc + (doc.taxa_financeira_valor || 0), 0);

      // Custos operacionais
      const custoMO = (benef.custo_mo_terceiro || 0) + (benef.custo_mo_ibrac || 0);
      const custoFrete = (benef.custo_frete_ida || 0) + (benef.custo_frete_volta || 0);
      
      // Calcular custo de aquisição dos sublotes de entrada
      // Se tiver valor nos documentos, usar. Senão, calcular proporcional das entradas originais
      let custoAquisicao = valorDocumentoFromDocs;
      
      if (custoAquisicao === 0 && itensDoBenef.length > 0) {
        // Calcular custo proporcional a partir dos sublotes e suas entradas
        // Usar Set para não contar a mesma entrada mais de uma vez
        const entradasProcessadas = new Set<string>();
        
        for (const item of itensDoBenef) {
          const sublote = item.sublote as any;
          const entrada = sublote?.entrada;
          const entradaId = entrada?.id;
          
          if (entradaId && !entradasProcessadas.has(entradaId)) {
            entradasProcessadas.add(entradaId);
            custoAquisicao += entrada?.valor_total || 0;
          }
        }
      }
      
      const custoTotal = custoAquisicao + custoFinanceiro + custoMO + custoFrete;
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

        // Adicionar aos detalhes
        detalhes.push({
          codigo: benef.codigo,
          pesoEntrada,
          pesoSaida,
          custoAquisicao,
          custoMO,
          custoFrete,
          custoFinanceiro,
          custoTotal,
          custoKg: custoKgVergalhao,
          lmeKg: lmeSemana,
          economiaKg,
          economiaTotal: economiaBenef,
        });

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

    return { kpis: resultado, detalhesEconomia: detalhes };
  }, [beneficiamentos, itensEntrada, benefEntradas, historicoLme, sublotesVergalhao, acertosPendentes, selectedDono]);

  const lucroTotalIbrac = kpis.lucroPerdaTotal + kpis.lucroMOTotal + kpis.lucroComissaoTotal;

  return (
    <div className="space-y-4">
      {/* Linha 1: KPIs principais */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Economia Total do Mês */}
        <Card 
          className={cn(
            "border-2 cursor-pointer transition-all hover:shadow-md",
            kpis.economiaPositiva ? "border-success/30 bg-success/5 hover:border-success/50" : "border-destructive/30 bg-destructive/5 hover:border-destructive/50"
          )}
          onClick={() => setShowEconomiaDialog(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              Economia vs LME (Mês)
              <Calculator className="h-3 w-3 text-muted-foreground" />
            </CardTitle>
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
              {formatWeight(kpis.pesoProcessadoMes)} processado • Clique para detalhes
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

      {/* Dialog com Memória de Cálculo - Economia vs LME */}
      <Dialog open={showEconomiaDialog} onOpenChange={setShowEconomiaDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Memória de Cálculo - Economia vs LME
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Resumo */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Economia</p>
                <p className={cn(
                  "text-xl font-bold",
                  kpis.economiaPositiva ? "text-success" : "text-destructive"
                )}>
                  {formatCurrency(kpis.economiaTotalMes)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Peso Processado</p>
                <p className="text-xl font-bold">{formatWeight(kpis.pesoProcessadoMes)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Custo Médio</p>
                <p className="text-xl font-bold text-copper">{formatCurrency(kpis.custoMedioVergalhao)}/kg</p>
              </div>
            </div>

            {/* Fórmula */}
            <div className="p-3 bg-muted/30 rounded border text-sm">
              <p className="font-medium mb-1">Fórmula:</p>
              <code className="text-xs">
                Economia = (LME R$/kg - Custo R$/kg) × Peso Saída
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Onde Custo = (Aquisição + MO + Frete + Taxa Financeira) ÷ Peso Saída
              </p>
            </div>

            {/* Tabela de detalhes */}
            <ScrollArea className="h-[350px]">
              {detalhesEconomia.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum beneficiamento finalizado no mês atual
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Beneficiamento</TableHead>
                      <TableHead className="text-right">Peso Saída</TableHead>
                      <TableHead className="text-right">Aquisição</TableHead>
                      <TableHead className="text-right">MO</TableHead>
                      <TableHead className="text-right">Frete</TableHead>
                      <TableHead className="text-right">Financeiro</TableHead>
                      <TableHead className="text-right">Custo/kg</TableHead>
                      <TableHead className="text-right">LME/kg</TableHead>
                      <TableHead className="text-right">Economia/kg</TableHead>
                      <TableHead className="text-right">Economia Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalhesEconomia.map((d) => (
                      <TableRow key={d.codigo}>
                        <TableCell className="font-mono text-xs">{d.codigo}</TableCell>
                        <TableCell className="text-right">{formatWeight(d.pesoSaida)}</TableCell>
                        <TableCell className="text-right text-xs">{formatCurrency(d.custoAquisicao)}</TableCell>
                        <TableCell className="text-right text-xs">{formatCurrency(d.custoMO)}</TableCell>
                        <TableCell className="text-right text-xs">{formatCurrency(d.custoFrete)}</TableCell>
                        <TableCell className="text-right text-xs">{formatCurrency(d.custoFinanceiro)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(d.custoKg)}</TableCell>
                        <TableCell className="text-right font-medium text-primary">
                          {d.lmeKg ? formatCurrency(d.lmeKg) : "-"}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-medium",
                          d.economiaKg >= 0 ? "text-success" : "text-destructive"
                        )}>
                          {formatCurrency(d.economiaKg)}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-bold",
                          d.economiaTotal >= 0 ? "text-success" : "text-destructive"
                        )}>
                          {formatCurrency(d.economiaTotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Linha de total */}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>TOTAL ({detalhesEconomia.length} beneficiamentos)</TableCell>
                      <TableCell className="text-right">
                        {formatWeight(detalhesEconomia.reduce((acc, d) => acc + d.pesoSaida, 0))}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatCurrency(detalhesEconomia.reduce((acc, d) => acc + d.custoAquisicao, 0))}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatCurrency(detalhesEconomia.reduce((acc, d) => acc + d.custoMO, 0))}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatCurrency(detalhesEconomia.reduce((acc, d) => acc + d.custoFrete, 0))}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatCurrency(detalhesEconomia.reduce((acc, d) => acc + d.custoFinanceiro, 0))}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(kpis.custoMedioVergalhao)}</TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className={cn(
                        "text-right",
                        kpis.economiaPositiva ? "text-success" : "text-destructive"
                      )}>
                        {formatCurrency(kpis.economiaTotalMes)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

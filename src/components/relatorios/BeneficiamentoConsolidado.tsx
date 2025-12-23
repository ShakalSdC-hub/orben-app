import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download, TrendingUp, TrendingDown, DollarSign, Scale, Percent, Factory } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, getISOWeek } from "date-fns";
import * as XLSX from "xlsx";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BeneficiamentoConsolidadoProps {
  dataInicio: string;
  dataFim: string;
  donoFiltro?: string;
}

interface BeneficiamentoConsolidadoRow {
  id: string;
  codigo: string;
  data_inicio: string | null;
  semana: number;
  // Entrada
  nf_entrada: string;
  peso_entrada_kg: number;
  valor_documento: number;
  // Custos Financeiros
  taxa_financeira_pct: number;
  custo_financeiro: number;
  // Custos Operacionais
  custo_frete_ida: number;
  custo_mo_terceiro: number;
  custo_frete_volta: number;
  // Totais
  custo_total: number;
  custo_kg_sucata: number;
  // Perda
  perda_pct: number;
  perda_real_pct: number;
  perda_kg: number;
  // Saída
  peso_saida_kg: number;
  custo_kg_vergalhao: number;
  // LME e Economia
  lme_semana_kg: number | null;
  economia_kg: number | null;
  economia_total: number | null;
  // Dono
  dono_nome: string | null;
  dono_id: string | null;
  // Cenário e Lucro Perda
  cenario: 'proprio' | 'industrializacao' | 'operacao_terceiro' | null;
  lucro_perda_kg: number;
  lucro_perda_valor: number;
  is_ibrac: boolean;
}

function formatWeight(kg: number) {
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  return `${kg.toFixed(2)} kg`;
}

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(2)}%`;
}

export function BeneficiamentoConsolidado({ dataInicio, dataFim, donoFiltro }: BeneficiamentoConsolidadoProps) {
  // Fetch beneficiamentos com todos os dados relacionados
  const { data: beneficiamentos, isLoading: loadingBenef } = useQuery({
    queryKey: ["beneficiamento-consolidado", dataInicio, dataFim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamentos")
        .select(`
          *,
          processo:processos(nome),
          fornecedor_terceiro:parceiros!beneficiamentos_fornecedor_terceiro_id_fkey(razao_social)
        `)
        .gte("data_inicio", dataInicio)
        .lte("data_inicio", dataFim)
        .order("data_inicio", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch itens de entrada de cada beneficiamento
  const { data: itensEntrada } = useQuery({
    queryKey: ["beneficiamento-itens-entrada", dataInicio, dataFim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamento_itens_entrada")
        .select(`
          *,
          sublote:sublotes(
            id,
            codigo,
            dono:donos_material(id, nome),
            entrada:entradas(codigo, valor_total, nota_fiscal)
          )
        `);
      if (error) throw error;
      return data;
    },
  });

  // Fetch entradas de beneficiamento (documentos vinculados)
  const { data: benefEntradas } = useQuery({
    queryKey: ["beneficiamento-entradas-docs", dataInicio, dataFim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamento_entradas")
        .select(`
          *,
          entrada:entradas(codigo, valor_total, nota_fiscal)
        `);
      if (error) throw error;
      return data;
    },
  });

  // Fetch histórico LME para pegar valores por semana
  const { data: historicoLme } = useQuery({
    queryKey: ["historico-lme-semanas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_lme")
        .select("*")
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Processar dados consolidados
  const dadosConsolidados = useMemo<BeneficiamentoConsolidadoRow[]>(() => {
    if (!beneficiamentos) return [];

    return beneficiamentos.map((benef) => {
      // Dados básicos
      const dataInicioBenef = benef.data_inicio ? parseISO(benef.data_inicio) : new Date();
      const semana = getISOWeek(dataInicioBenef);

      // Buscar itens de entrada deste beneficiamento
      const itensDoBenef = itensEntrada?.filter(ie => ie.beneficiamento_id === benef.id) || [];
      
      // Buscar documentos de entrada vinculados
      const docsDoBenef = benefEntradas?.filter(be => be.beneficiamento_id === benef.id) || [];
      
      // Calcular valor total de documentos e taxa financeira
      const valorDocumento = docsDoBenef.reduce((acc, doc) => acc + (doc.valor_documento || 0), 0);
      const taxaFinanceiraPct = benef.taxa_financeira_pct || 0;
      const custoFinanceiro = docsDoBenef.reduce((acc, doc) => acc + (doc.taxa_financeira_valor || 0), 0);

      // Obter NF (primeira entrada)
      const nfEntrada = docsDoBenef[0]?.entrada?.nota_fiscal || 
                        itensDoBenef[0]?.sublote?.entrada?.nota_fiscal || 
                        benef.codigo;

      // Obter dono do primeiro item
      const donoNome = itensDoBenef[0]?.sublote?.dono?.nome || null;
      const donoId = itensDoBenef[0]?.sublote?.dono?.id || null;

      // Filtrar por dono se especificado
      if (donoFiltro && donoId !== donoFiltro) {
        return null;
      }

      // Custos operacionais
      const custoFreteIda = benef.custo_frete_ida || 0;
      const custoMoTerceiro = benef.custo_mo_terceiro || 0;
      const custoFreteVolta = benef.custo_frete_volta || 0;
      const custoMoIbrac = benef.custo_mo_ibrac || 0;

      // Peso entrada/saída
      const pesoEntrada = benef.peso_entrada_kg || 0;
      const pesoSaida = benef.peso_saida_kg || 0;

      // Perda
      const perdaPct = benef.perda_cobrada_pct || benef.perda_real_pct || 0;
      const perdaKg = pesoEntrada - pesoSaida;

      // Custo total
      const custoTotal = valorDocumento + custoFinanceiro + custoFreteIda + custoMoTerceiro + custoMoIbrac + custoFreteVolta;

      // Custo/kg
      const custoKgSucata = pesoEntrada > 0 ? custoTotal / pesoEntrada : 0;
      const custoKgVergalhao = pesoSaida > 0 ? custoTotal / pesoSaida : 0;

      // LME da semana (buscar registro mais próximo da data do beneficiamento)
      let lmeSemana: number | null = null;
      if (historicoLme && historicoLme.length > 0) {
        // Buscar LME mais recente até a data do beneficiamento
        const lmesDaData = historicoLme.filter(lme => 
          new Date(lme.data) <= dataInicioBenef
        );
        if (lmesDaData.length > 0) {
          lmeSemana = lmesDaData[0].cobre_brl_kg;
        }
      }

      // Usar lme_referencia_kg se existir no beneficiamento
      if (benef.lme_referencia_kg) {
        lmeSemana = Number(benef.lme_referencia_kg);
      }

      // Economia
      const economiaKg = lmeSemana !== null ? lmeSemana - custoKgVergalhao : null;
      const economiaTotal = economiaKg !== null ? economiaKg * pesoSaida : null;

      return {
        id: benef.id,
        codigo: benef.codigo,
        data_inicio: benef.data_inicio,
        semana,
        nf_entrada: nfEntrada,
        peso_entrada_kg: pesoEntrada,
        valor_documento: valorDocumento,
        taxa_financeira_pct: taxaFinanceiraPct,
        custo_financeiro: custoFinanceiro,
        custo_frete_ida: custoFreteIda,
        custo_mo_terceiro: custoMoTerceiro + custoMoIbrac,
        custo_frete_volta: custoFreteVolta,
        custo_total: custoTotal,
        custo_kg_sucata: custoKgSucata,
        perda_pct: perdaPct,
        perda_kg: perdaKg,
        peso_saida_kg: pesoSaida,
        custo_kg_vergalhao: custoKgVergalhao,
        lme_semana_kg: lmeSemana,
        economia_kg: economiaKg,
        economia_total: economiaTotal,
        dono_nome: donoNome,
      } as BeneficiamentoConsolidadoRow;
    }).filter(Boolean) as BeneficiamentoConsolidadoRow[];
  }, [beneficiamentos, itensEntrada, benefEntradas, historicoLme, donoFiltro]);

  // Totalizadores
  const totais = useMemo(() => {
    const pesoEntrada = dadosConsolidados.reduce((acc, d) => acc + d.peso_entrada_kg, 0);
    const pesoSaida = dadosConsolidados.reduce((acc, d) => acc + d.peso_saida_kg, 0);
    const valorDocumentos = dadosConsolidados.reduce((acc, d) => acc + d.valor_documento, 0);
    const custoFinanceiro = dadosConsolidados.reduce((acc, d) => acc + d.custo_financeiro, 0);
    const custoFreteIda = dadosConsolidados.reduce((acc, d) => acc + d.custo_frete_ida, 0);
    const custoMo = dadosConsolidados.reduce((acc, d) => acc + d.custo_mo_terceiro, 0);
    const custoFreteVolta = dadosConsolidados.reduce((acc, d) => acc + d.custo_frete_volta, 0);
    const custoTotal = dadosConsolidados.reduce((acc, d) => acc + d.custo_total, 0);
    const economiaTotal = dadosConsolidados.reduce((acc, d) => acc + (d.economia_total || 0), 0);
    
    const custoMedioKgVergalhao = pesoSaida > 0 ? custoTotal / pesoSaida : 0;
    const perdaMedia = pesoEntrada > 0 
      ? dadosConsolidados.reduce((acc, d) => acc + d.perda_pct * d.peso_entrada_kg, 0) / pesoEntrada 
      : 0;

    return {
      pesoEntrada,
      pesoSaida,
      valorDocumentos,
      custoFinanceiro,
      custoFreteIda,
      custoMo,
      custoFreteVolta,
      custoTotal,
      economiaTotal,
      custoMedioKgVergalhao,
      perdaMedia,
      registros: dadosConsolidados.length,
    };
  }, [dadosConsolidados]);

  // Export Excel
  const exportToExcel = () => {
    if (dadosConsolidados.length === 0) {
      toast({ title: "Sem dados para exportar", variant: "destructive" });
      return;
    }

    const rows = dadosConsolidados.map(d => ({
      "Código": d.codigo,
      "Data": d.data_inicio ? format(parseISO(d.data_inicio), "dd/MM/yyyy") : "",
      "Semana": d.semana,
      "NF Entrada": d.nf_entrada,
      "Dono": d.dono_nome || "IBRAC",
      "Peso Entrada (kg)": d.peso_entrada_kg,
      "Valor NF (R$)": d.valor_documento,
      "Taxa Fin. (%)": d.taxa_financeira_pct,
      "Custo Fin. (R$)": d.custo_financeiro,
      "Frete Ida (R$)": d.custo_frete_ida,
      "MO (R$)": d.custo_mo_terceiro,
      "Frete Volta (R$)": d.custo_frete_volta,
      "Custo Total (R$)": d.custo_total,
      "Custo/kg Sucata (R$)": d.custo_kg_sucata,
      "Perda (%)": d.perda_pct,
      "Perda (kg)": d.perda_kg,
      "Peso Saída (kg)": d.peso_saida_kg,
      "Custo/kg Vergalhão (R$)": d.custo_kg_vergalhao,
      "LME Semana (R$/kg)": d.lme_semana_kg || "",
      "Economia/kg (R$)": d.economia_kg || "",
      "Economia Total (R$)": d.economia_total || "",
    }));

    // Adicionar linha de totais
    rows.push({
      "Código": "TOTAL",
      "Data": "",
      "Semana": 0,
      "NF Entrada": "",
      "Dono": "",
      "Peso Entrada (kg)": totais.pesoEntrada,
      "Valor NF (R$)": totais.valorDocumentos,
      "Taxa Fin. (%)": 0,
      "Custo Fin. (R$)": totais.custoFinanceiro,
      "Frete Ida (R$)": totais.custoFreteIda,
      "MO (R$)": totais.custoMo,
      "Frete Volta (R$)": totais.custoFreteVolta,
      "Custo Total (R$)": totais.custoTotal,
      "Custo/kg Sucata (R$)": 0,
      "Perda (%)": totais.perdaMedia,
      "Perda (kg)": totais.pesoEntrada - totais.pesoSaida,
      "Peso Saída (kg)": totais.pesoSaida,
      "Custo/kg Vergalhão (R$)": totais.custoMedioKgVergalhao,
      "LME Semana (R$/kg)": "",
      "Economia/kg (R$)": "",
      "Economia Total (R$)": totais.economiaTotal,
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Beneficiamento Consolidado");
    XLSX.writeFile(wb, `beneficiamento_consolidado_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
    toast({ title: "Relatório exportado com sucesso!" });
  };

  const isLoading = loadingBenef;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Controle de Beneficiamento - Consolidado
          </CardTitle>
          <CardDescription>
            {format(parseISO(dataInicio), "dd/MM/yyyy")} a {format(parseISO(dataFim), "dd/MM/yyyy")}
            {" · "}Modelo igual ao controle Excel
          </CardDescription>
        </div>
        <Button variant="outline" onClick={exportToExcel}>
          <Download className="h-4 w-4 mr-2" />
          Exportar Excel
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPIs principais */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg bg-primary/10 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Scale className="h-4 w-4" />
              Peso Entrada
            </div>
            <p className="text-2xl font-bold">{formatWeight(totais.pesoEntrada)}</p>
          </div>
          <div className="rounded-lg bg-success/10 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Scale className="h-4 w-4" />
              Peso Saída
            </div>
            <p className="text-2xl font-bold text-success">{formatWeight(totais.pesoSaida)}</p>
          </div>
          <div className="rounded-lg bg-warning/10 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Custo Total
            </div>
            <p className="text-2xl font-bold text-warning">{formatCurrency(totais.custoTotal)}</p>
          </div>
          <div className="rounded-lg bg-copper/10 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Percent className="h-4 w-4" />
              Custo/kg Vergalhão
            </div>
            <p className="text-2xl font-bold text-copper">{formatCurrency(totais.custoMedioKgVergalhao)}/kg</p>
          </div>
          <div className={cn(
            "rounded-lg p-4",
            totais.economiaTotal >= 0 ? "bg-success/10" : "bg-destructive/10"
          )}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              {totais.economiaTotal >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              Economia Total
            </div>
            <p className={cn(
              "text-2xl font-bold",
              totais.economiaTotal >= 0 ? "text-success" : "text-destructive"
            )}>
              {formatCurrency(totais.economiaTotal)}
            </p>
          </div>
        </div>

        {/* Tabela detalhada */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="whitespace-nowrap">NF/Cód</TableHead>
                  <TableHead className="whitespace-nowrap">Data</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Peso Ent.</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Valor NF</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Fin. %</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Custo Fin.</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Frete Ida</TableHead>
                  <TableHead className="whitespace-nowrap text-right">MO</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Frete Volta</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Custo Total</TableHead>
                  <TableHead className="whitespace-nowrap text-right">R$/kg Sucata</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Perda %</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Peso Saída</TableHead>
                  <TableHead className="whitespace-nowrap text-right">R$/kg Vergalhão</TableHead>
                  <TableHead className="whitespace-nowrap text-right">LME Semana</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Economia/kg</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Economia Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosConsolidados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={17} className="text-center text-muted-foreground py-8">
                      Nenhum beneficiamento no período selecionado
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {dadosConsolidados.map((row) => (
                      <TableRow key={row.id} className="text-xs">
                        <TableCell className="font-mono whitespace-nowrap">{row.nf_entrada}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {row.data_inicio ? format(parseISO(row.data_inicio), "dd/MM/yy") : "—"}
                        </TableCell>
                        <TableCell className="text-right">{row.peso_entrada_kg.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.valor_documento)}</TableCell>
                        <TableCell className="text-right">{row.taxa_financeira_pct.toFixed(2)}%</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.custo_financeiro)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.custo_frete_ida)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.custo_mo_terceiro)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.custo_frete_volta)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(row.custo_total)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.custo_kg_sucata)}</TableCell>
                        <TableCell className="text-right">{row.perda_pct.toFixed(2)}%</TableCell>
                        <TableCell className="text-right">{row.peso_saida_kg.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium text-copper">{formatCurrency(row.custo_kg_vergalhao)}</TableCell>
                        <TableCell className="text-right">{row.lme_semana_kg ? formatCurrency(row.lme_semana_kg) : "—"}</TableCell>
                        <TableCell className={cn(
                          "text-right",
                          row.economia_kg !== null && row.economia_kg >= 0 ? "text-success" : "text-destructive"
                        )}>
                          {row.economia_kg !== null ? formatCurrency(row.economia_kg) : "—"}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-medium",
                          row.economia_total !== null && row.economia_total >= 0 ? "text-success" : "text-destructive"
                        )}>
                          {row.economia_total !== null ? formatCurrency(row.economia_total) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Linha de totais */}
                    <TableRow className="bg-muted/50 font-semibold text-xs">
                      <TableCell colSpan={2}>TOTAL</TableCell>
                      <TableCell className="text-right">{totais.pesoEntrada.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totais.valorDocumentos)}</TableCell>
                      <TableCell className="text-right">—</TableCell>
                      <TableCell className="text-right">{formatCurrency(totais.custoFinanceiro)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totais.custoFreteIda)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totais.custoMo)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totais.custoFreteVolta)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totais.custoTotal)}</TableCell>
                      <TableCell className="text-right">—</TableCell>
                      <TableCell className="text-right">{totais.perdaMedia.toFixed(2)}%</TableCell>
                      <TableCell className="text-right">{totais.pesoSaida.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-copper">{formatCurrency(totais.custoMedioKgVergalhao)}</TableCell>
                      <TableCell className="text-right">—</TableCell>
                      <TableCell className="text-right">—</TableCell>
                      <TableCell className={cn(
                        "text-right",
                        totais.economiaTotal >= 0 ? "text-success" : "text-destructive"
                      )}>
                        {formatCurrency(totais.economiaTotal)}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

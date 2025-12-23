/**
 * Biblioteca centralizada de cálculos de KPIs
 * Garante consistência em todas as telas do sistema
 */

import { parseISO, isValid } from "date-fns";
import { detectarCenario, CenarioOperacao } from "./cenarios-orben";

// Tipos base
export interface BeneficiamentoData {
  id: string;
  codigo: string;
  peso_entrada_kg: number | null;
  peso_saida_kg: number | null;
  perda_real_pct: number | null;
  perda_cobrada_pct: number | null;
  custo_mo_terceiro: number | null;
  custo_mo_ibrac: number | null;
  custo_frete_ida: number | null;
  custo_frete_volta: number | null;
  lme_referencia_kg: number | null;
  data_inicio: string | null;
  status: string | null;
}

export interface ItemEntradaData {
  beneficiamento_id: string;
  peso_kg: number;
  sublote?: {
    dono_id: string | null;
    custo_unitario_total: number | null;
    dono?: {
      id: string;
      nome: string;
      is_ibrac: boolean | null;
      taxa_operacao_pct: number | null;
    } | null;
    entrada?: {
      id: string;
      valor_total: number | null;
      peso_liquido_kg: number;
      tipo_entrada?: {
        gera_custo: boolean | null;
      } | null;
    } | null;
  } | null;
}

export interface DocumentoVinculado {
  beneficiamento_id: string;
  valor_documento: number;
  taxa_financeira_valor: number | null;
}

export interface HistoricoLME {
  data: string;
  cobre_brl_kg: number | null;
}

export interface SubloteEstoque {
  id: string;
  peso_kg: number;
  custo_unitario_total: number | null;
  status: string | null;
  tipo_produto?: {
    nome: string;
    codigo: string | null;
  } | null;
}

export interface AcertoFinanceiro {
  tipo: string;
  valor: number;
  status: string | null;
  dono_id: string | null;
}

// Formatadores padronizados
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { 
    style: "currency", 
    currency: "BRL" 
  }).format(value);
}

export function formatWeight(kg: number | null | undefined): string {
  if (kg === null || kg === undefined) return "—";
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  return `${kg.toFixed(0)} kg`;
}

export function formatWeightCompact(kg: number | null | undefined): string {
  if (kg === null || kg === undefined) return "—";
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${kg.toFixed(0)}kg`;
}

export function formatPercent(value: number | null | undefined, decimals: number = 1): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// Cálculo de economia vs LME (função simplificada para uso direto)
export function economiaVsLME(params: {
  pesoKg: number;
  custoTotal: number;
  lmeKg: number;
}): number {
  if (!params.lmeKg || params.lmeKg <= 0 || params.pesoKg <= 0) return 0;
  const custoLME = params.pesoKg * params.lmeKg;
  return custoLME - params.custoTotal;
}

// Cálculo de custo médio ponderado
export function custoMedioPonderado(
  sublotes: Array<{ peso_kg: number | null; custo_unitario_total: number | null }> | null | undefined
): number {
  if (!sublotes || sublotes.length === 0) return 0;
  
  let totalPeso = 0;
  let totalCusto = 0;
  
  for (const s of sublotes) {
    const peso = s.peso_kg || 0;
    const custo = s.custo_unitario_total || 0;
    totalPeso += peso;
    totalCusto += custo * peso;
  }
  
  return totalPeso > 0 ? totalCusto / totalPeso : 0;
}

// Busca LME mais próximo da data
export function getLMEForDate(
  historicoLme: HistoricoLME[] | null | undefined,
  targetDate: string | null,
  fallbackValue: number = 0
): number {
  if (!historicoLme || historicoLme.length === 0) return fallbackValue;
  if (!targetDate) return historicoLme[0]?.cobre_brl_kg ?? fallbackValue;

  const dataBenef = parseISO(targetDate);
  if (!isValid(dataBenef)) return historicoLme[0]?.cobre_brl_kg ?? fallbackValue;

  const lmesDaData = historicoLme.filter(lme => {
    const lmeDate = parseISO(lme.data);
    return isValid(lmeDate) && lmeDate <= dataBenef;
  });

  if (lmesDaData.length > 0) {
    return lmesDaData[0].cobre_brl_kg ?? fallbackValue;
  }

  return historicoLme[0]?.cobre_brl_kg ?? fallbackValue;
}

// Resultado do cálculo de economia por beneficiamento
export interface EconomiaBeneficiamento {
  codigo: string;
  pesoEntrada: number;
  pesoSaida: number;
  custoAquisicao: number;
  custoMO: number;
  custoFrete: number;
  custoFinanceiro: number;
  custoTotal: number;
  custoKg: number;
  lmeKg: number;
  economiaKg: number;
  economiaTotal: number;
  cenario: CenarioOperacao;
}

// Cálculo de custos de um beneficiamento
export function calcularCustosBeneficiamento(
  benef: BeneficiamentoData,
  itensEntrada: ItemEntradaData[],
  documentos: DocumentoVinculado[]
): {
  custoAquisicao: number;
  custoMO: number;
  custoFrete: number;
  custoFinanceiro: number;
  custoTotal: number;
  custoKg: number;
} {
  // Documentos vinculados
  const docsDoBenef = documentos.filter(d => d.beneficiamento_id === benef.id);
  const valorDocumento = docsDoBenef.reduce((acc, d) => acc + (d.valor_documento || 0), 0);
  const custoFinanceiro = docsDoBenef.reduce((acc, d) => acc + (d.taxa_financeira_valor || 0), 0);

  // Custos operacionais
  const custoMO = (benef.custo_mo_terceiro || 0) + (benef.custo_mo_ibrac || 0);
  const custoFrete = (benef.custo_frete_ida || 0) + (benef.custo_frete_volta || 0);

  // Custo de aquisição
  let custoAquisicao = valorDocumento;

  if (custoAquisicao === 0 && itensEntrada.length > 0) {
    const entradasProcessadas = new Set<string>();
    for (const item of itensEntrada) {
      const entrada = item.sublote?.entrada;
      const entradaId = entrada?.id;
      if (entradaId && !entradasProcessadas.has(entradaId)) {
        entradasProcessadas.add(entradaId);
        custoAquisicao += entrada?.valor_total || 0;
      }
    }
  }

  const custoTotal = custoAquisicao + custoFinanceiro + custoMO + custoFrete;
  const pesoSaida = benef.peso_saida_kg || 0;
  const custoKg = pesoSaida > 0 ? custoTotal / pesoSaida : 0;

  return {
    custoAquisicao,
    custoMO,
    custoFrete,
    custoFinanceiro,
    custoTotal,
    custoKg,
  };
}

// Cálculo do lucro na perda (diferença cobrada vs real)
export function calcularLucroPerda(
  pesoEntrada: number,
  perdaCobrada: number,
  perdaReal: number,
  lmeKg: number
): number {
  if (perdaCobrada <= perdaReal || lmeKg <= 0) return 0;
  const diferencaKg = pesoEntrada * ((perdaCobrada - perdaReal) / 100);
  return diferencaKg * lmeKg;
}

// Cálculo de economia vs LME
export function calcularEconomiaVsLME(
  pesoSaida: number,
  custoKg: number,
  lmeKg: number
): { economiaKg: number; economiaTotal: number } {
  if (lmeKg <= 0 || pesoSaida <= 0) {
    return { economiaKg: 0, economiaTotal: 0 };
  }
  const economiaKg = lmeKg - custoKg;
  const economiaTotal = economiaKg * pesoSaida;
  return { economiaKg, economiaTotal };
}

// KPIs consolidados
export interface KPIsConsolidados {
  // Economia
  economiaTotalMes: number;
  economiaPositiva: boolean;
  
  // Custos
  custoMedioVergalhao: number;
  custoTotalProcessado: number;
  pesoProcessadoMes: number;
  
  // Estoque
  saldoVergalhao: number;
  
  // Lucro IBRAC
  lucroPerdaTotal: number;
  lucroMOTotal: number;
  lucroComissaoTotal: number;
  lucroTotalIbrac: number;
  
  // Repasses
  repassesPendentes: number;
  
  // Por cenário
  cenarios: Record<CenarioOperacao, {
    peso: number;
    count: number;
    economia?: number;
    receita?: number;
    comissao?: number;
  }>;
}

// Cálculo completo dos KPIs
export function calcularKPIsConsolidados(
  beneficiamentos: BeneficiamentoData[] | null | undefined,
  itensEntrada: ItemEntradaData[] | null | undefined,
  documentos: DocumentoVinculado[] | null | undefined,
  historicoLme: HistoricoLME[] | null | undefined,
  sublotesVergalhao: SubloteEstoque[] | null | undefined,
  acertosPendentes: AcertoFinanceiro[] | null | undefined,
  selectedDono?: string | null
): { kpis: KPIsConsolidados; detalhes: EconomiaBeneficiamento[] } {
  const kpis: KPIsConsolidados = {
    economiaTotalMes: 0,
    economiaPositiva: true,
    custoMedioVergalhao: 0,
    custoTotalProcessado: 0,
    pesoProcessadoMes: 0,
    saldoVergalhao: 0,
    lucroPerdaTotal: 0,
    lucroMOTotal: 0,
    lucroComissaoTotal: 0,
    lucroTotalIbrac: 0,
    repassesPendentes: 0,
    cenarios: {
      proprio: { peso: 0, count: 0, economia: 0 },
      industrializacao: { peso: 0, count: 0, receita: 0 },
      operacao_terceiro: { peso: 0, count: 0, comissao: 0 },
    },
  };

  const detalhes: EconomiaBeneficiamento[] = [];

  if (!beneficiamentos) {
    return { kpis, detalhes };
  }

  let custoTotalVergalhao = 0;
  let pesoTotalSaida = 0;

  for (const benef of beneficiamentos) {
    // Itens deste beneficiamento
    const itensDoBenef = itensEntrada?.filter(ie => ie.beneficiamento_id === benef.id) || [];
    const primeiroItem = itensDoBenef[0]?.sublote;

    // Detectar cenário
    const geraCusto = primeiroItem?.entrada?.tipo_entrada?.gera_custo ?? true;
    const isIbrac = primeiroItem?.dono?.is_ibrac ?? false;
    const donoId = primeiroItem?.dono_id ?? null;

    const cenario = detectarCenario({ geraCusto, donoId, isIbrac });

    // Filtrar por dono se selecionado
    if (selectedDono && donoId !== selectedDono) continue;

    const pesoEntrada = benef.peso_entrada_kg || 0;
    const pesoSaida = benef.peso_saida_kg || 0;
    kpis.pesoProcessadoMes += pesoEntrada;

    // Atualizar contadores por cenário
    kpis.cenarios[cenario].peso += pesoEntrada;
    kpis.cenarios[cenario].count += 1;

    // Calcular custos
    const custos = calcularCustosBeneficiamento(
      benef,
      itensDoBenef,
      documentos || []
    );

    custoTotalVergalhao += custos.custoTotal;
    pesoTotalSaida += pesoSaida;
    kpis.custoTotalProcessado += custos.custoTotal;

    // LME de referência
    let lmeKg = benef.lme_referencia_kg 
      ? Number(benef.lme_referencia_kg)
      : getLMEForDate(historicoLme, benef.data_inicio);

    // Lucro na perda
    const lucroPerdaBenef = calcularLucroPerda(
      pesoEntrada,
      benef.perda_cobrada_pct || 0,
      benef.perda_real_pct || 0,
      lmeKg
    );
    kpis.lucroPerdaTotal += lucroPerdaBenef;

    // Receita de serviços (industrialização)
    if (cenario === 'industrializacao') {
      const receitaServico = custos.custoMO + custos.custoFrete;
      kpis.lucroMOTotal += receitaServico;
      kpis.cenarios.industrializacao.receita = (kpis.cenarios.industrializacao.receita || 0) + receitaServico;
    }

    // Economia vs LME
    if (lmeKg > 0 && pesoSaida > 0) {
      const economia = calcularEconomiaVsLME(pesoSaida, custos.custoKg, lmeKg);
      kpis.economiaTotalMes += economia.economiaTotal;

      detalhes.push({
        codigo: benef.codigo,
        pesoEntrada,
        pesoSaida,
        custoAquisicao: custos.custoAquisicao,
        custoMO: custos.custoMO,
        custoFrete: custos.custoFrete,
        custoFinanceiro: custos.custoFinanceiro,
        custoTotal: custos.custoTotal,
        custoKg: custos.custoKg,
        lmeKg,
        economiaKg: economia.economiaKg,
        economiaTotal: economia.economiaTotal,
        cenario,
      });

      if (cenario === 'proprio') {
        kpis.cenarios.proprio.economia = (kpis.cenarios.proprio.economia || 0) + economia.economiaTotal;
      }
    }
  }

  // Custo médio ponderado
  kpis.custoMedioVergalhao = pesoTotalSaida > 0 ? custoTotalVergalhao / pesoTotalSaida : 0;
  kpis.economiaPositiva = kpis.economiaTotalMes >= 0;

  // Saldo de vergalhão
  kpis.saldoVergalhao = sublotesVergalhao?.filter(s =>
    s.status === "disponivel" && (
      s.tipo_produto?.nome?.toLowerCase().includes("vergalhão") ||
      s.tipo_produto?.codigo?.toLowerCase().includes("verg")
    )
  ).reduce((acc, s) => acc + (s.peso_kg || 0), 0) || 0;

  // Repasses pendentes
  kpis.repassesPendentes = acertosPendentes?.filter(a =>
    a.tipo === 'receita' && a.dono_id && a.status === 'pendente'
  ).reduce((acc, a) => acc + (a.valor || 0), 0) || 0;

  // Lucro total IBRAC
  kpis.lucroTotalIbrac = kpis.lucroPerdaTotal + kpis.lucroMOTotal + kpis.lucroComissaoTotal;

  return { kpis, detalhes };
}

// Cálculo de custo médio ponderado de sublotes
export function calcularCustoMedioPonderado(
  sublotes: SubloteEstoque[] | null | undefined
): number {
  if (!sublotes || sublotes.length === 0) return 0;

  let pesoTotal = 0;
  let custoTotal = 0;

  for (const sublote of sublotes) {
    if (sublote.status !== "disponivel") continue;
    const peso = sublote.peso_kg || 0;
    const custo = sublote.custo_unitario_total || 0;
    pesoTotal += peso;
    custoTotal += peso * custo;
  }

  return pesoTotal > 0 ? custoTotal / pesoTotal : 0;
}

// Verificar se é vergalhão
export function isVergalhao(tipoProduto: { nome?: string; codigo?: string | null } | null | undefined): boolean {
  if (!tipoProduto) return false;
  const nome = tipoProduto.nome?.toLowerCase() || "";
  const codigo = tipoProduto.codigo?.toLowerCase() || "";
  return nome.includes("vergalhão") || codigo.includes("verg");
}

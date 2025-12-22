// ============================================================
// REGRAS DE NEGÓCIO - CENÁRIOS ORBEN
// ============================================================
// Cenário 1: Material Próprio (IBRAC) - gera_custo = true, dono = IBRAC
// Cenário 2: Industrialização - gera_custo = false, dono = Cliente
// Cenário 3: Operação Terceiro - gera_custo = true, dono = Terceiro (não IBRAC)
// ============================================================

export type CenarioOperacao = 'proprio' | 'industrializacao' | 'operacao_terceiro';

export interface CenarioInfo {
  tipo: CenarioOperacao;
  label: string;
  descricao: string;
  reconheceCusto: 'ibrac' | 'operacao' | 'nenhum';
  reconheceLucro: 'ibrac' | 'dono' | 'ambos';
  geraCustoMaterial: boolean;
  cobraCustos: boolean;
}

// Configuração dos cenários
export const CENARIOS_CONFIG: Record<CenarioOperacao, CenarioInfo> = {
  proprio: {
    tipo: 'proprio',
    label: 'Material Próprio',
    descricao: 'IBRAC compra, beneficia e consome/vende',
    reconheceCusto: 'ibrac',
    reconheceLucro: 'ibrac',
    geraCustoMaterial: true,
    cobraCustos: false,
  },
  industrializacao: {
    tipo: 'industrializacao',
    label: 'Industrialização',
    descricao: 'Cliente envia material para beneficiar, IBRAC presta serviço',
    reconheceCusto: 'ibrac', // Apenas MO/Frete como custo do serviço
    reconheceLucro: 'ibrac', // Lucro vem do serviço + perda
    geraCustoMaterial: false,
    cobraCustos: true,
  },
  operacao_terceiro: {
    tipo: 'operacao_terceiro',
    label: 'Operação Terceiro',
    descricao: 'IBRAC compra em nome do dono, beneficia e vende, cobra comissão',
    reconheceCusto: 'operacao', // Custos abatidos do resultado do dono
    reconheceLucro: 'ambos', // Dono recebe resultado líquido, IBRAC recebe comissão
    geraCustoMaterial: true,
    cobraCustos: true,
  },
};

// ============================================================
// FUNÇÕES DE DETECÇÃO DE CENÁRIO
// ============================================================

export interface DeteccaoCenarioParams {
  geraCusto: boolean;
  donoId?: string | null;
  isIbrac?: boolean;
}

/**
 * Detecta o cenário de operação baseado nas características do material
 */
export function detectarCenario(params: DeteccaoCenarioParams): CenarioOperacao {
  const { geraCusto, donoId, isIbrac } = params;

  // Se não gera custo (Remessa Industrialização) -> Cenário 2
  if (!geraCusto) {
    return 'industrializacao';
  }

  // Se gera custo e não tem dono OU dono é IBRAC -> Cenário 1
  if (!donoId || isIbrac) {
    return 'proprio';
  }

  // Se gera custo e tem dono terceiro -> Cenário 3
  return 'operacao_terceiro';
}

/**
 * Detecta cenário a partir de um sublote
 */
export function detectarCenarioSublote(sublote: {
  dono_id?: string | null;
  dono?: { is_ibrac?: boolean } | null;
  entrada?: {
    tipo_entrada?: { gera_custo?: boolean } | null;
  } | null;
}): CenarioOperacao {
  const geraCusto = sublote.entrada?.tipo_entrada?.gera_custo ?? true;
  const isIbrac = sublote.dono?.is_ibrac ?? false;
  const donoId = sublote.dono_id;

  return detectarCenario({ geraCusto, donoId, isIbrac });
}

/**
 * Detecta cenário predominante de uma lista de sublotes
 */
export function detectarCenarioPredominante(sublotes: Array<{
  dono_id?: string | null;
  dono?: { is_ibrac?: boolean } | null;
  entrada?: {
    tipo_entrada?: { gera_custo?: boolean } | null;
  } | null;
}>): CenarioOperacao | null {
  if (sublotes.length === 0) return null;

  const cenarios = sublotes.map(detectarCenarioSublote);
  
  // Verificar se todos são do mesmo cenário
  const primeiroC = cenarios[0];
  const todosIguais = cenarios.every(c => c === primeiroC);
  
  if (todosIguais) {
    return primeiroC;
  }
  
  // Se misturado, usar o primeiro como predominante
  return primeiroC;
}

// ============================================================
// CÁLCULOS POR CENÁRIO
// ============================================================

export interface CalculosSaidaParams {
  cenario: CenarioOperacao;
  pesoTotal: number;
  valorUnitario: number;
  custoMOBeneficiamento: number;
  custoPerda: number;
  custosAdicionais: number;
  taxaOperacaoPct: number; // Taxa de comissão IBRAC para operação terceiro
}

export interface ResultadoCalculosSaida {
  valorBruto: number;
  custosTotais: number;
  comissaoIbrac: number;
  valorRepasseDono: number;
  resultadoLiquidoDono: number;
  lucroIbrac: number;
}

/**
 * Calcula os valores de saída baseado no cenário
 */
export function calcularSaida(params: CalculosSaidaParams): ResultadoCalculosSaida {
  const {
    cenario,
    pesoTotal,
    valorUnitario,
    custoMOBeneficiamento,
    custoPerda,
    custosAdicionais,
    taxaOperacaoPct,
  } = params;

  const valorBruto = pesoTotal * valorUnitario;

  switch (cenario) {
    case 'proprio': {
      // Cenário 1: Consumo interno - apenas calcula economia vs LME
      return {
        valorBruto,
        custosTotais: 0,
        comissaoIbrac: 0,
        valorRepasseDono: 0,
        resultadoLiquidoDono: 0,
        lucroIbrac: valorBruto, // Valor vai para IBRAC
      };
    }

    case 'industrializacao': {
      // Cenário 2: Cobrar apenas MO + custos operacionais
      const custosTotais = custoMOBeneficiamento + custoPerda + custosAdicionais;
      return {
        valorBruto: custosTotais, // Valor cobrado = custos
        custosTotais,
        comissaoIbrac: 0,
        valorRepasseDono: 0,
        resultadoLiquidoDono: 0,
        lucroIbrac: custosTotais, // Lucro IBRAC = receita do serviço
      };
    }

    case 'operacao_terceiro': {
      // Cenário 3: Receita - Custos - Comissão = Repasse ao dono
      const custosTotais = custoMOBeneficiamento + custoPerda + custosAdicionais;
      const comissaoIbrac = valorBruto * (taxaOperacaoPct / 100);
      const resultadoLiquidoDono = valorBruto - custosTotais - comissaoIbrac;
      
      return {
        valorBruto,
        custosTotais,
        comissaoIbrac,
        valorRepasseDono: resultadoLiquidoDono,
        resultadoLiquidoDono,
        lucroIbrac: comissaoIbrac,
      };
    }

    default:
      return {
        valorBruto: 0,
        custosTotais: 0,
        comissaoIbrac: 0,
        valorRepasseDono: 0,
        resultadoLiquidoDono: 0,
        lucroIbrac: 0,
      };
  }
}

// ============================================================
// CÁLCULOS DE LUCRO NA PERDA (BENEFICIAMENTO)
// ============================================================

export interface CalculoLucroPerdaParams {
  pesoEntrada: number;
  perdaCobradaPct: number;
  perdaRealPct: number;
  lmeReferenciaKg: number;
}

export interface ResultadoLucroPerda {
  diferencaPct: number;
  diferencaKg: number;
  valorLucro: number;
  temLucro: boolean;
}

/**
 * Calcula o lucro na diferença de perda
 * Quando perda_cobrada > perda_real, IBRAC ganha a diferença
 */
export function calcularLucroPerda(params: CalculoLucroPerdaParams): ResultadoLucroPerda {
  const { pesoEntrada, perdaCobradaPct, perdaRealPct, lmeReferenciaKg } = params;

  const diferencaPct = perdaCobradaPct - perdaRealPct;
  const diferencaKg = pesoEntrada * (diferencaPct / 100);
  const valorLucro = diferencaKg * lmeReferenciaKg;
  const temLucro = diferencaPct > 0;

  return {
    diferencaPct,
    diferencaKg,
    valorLucro,
    temLucro,
  };
}

// ============================================================
// FORMATADORES
// ============================================================

export function formatCenarioLabel(cenario: CenarioOperacao): string {
  return CENARIOS_CONFIG[cenario]?.label || cenario;
}

export function getCenarioColor(cenario: CenarioOperacao): string {
  switch (cenario) {
    case 'proprio':
      return 'bg-primary/10 text-primary border-primary/30';
    case 'industrializacao':
      return 'bg-info/10 text-info border-info/30';
    case 'operacao_terceiro':
      return 'bg-warning/10 text-warning border-warning/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function getCenarioBadgeVariant(cenario: CenarioOperacao): 'default' | 'secondary' | 'outline' {
  switch (cenario) {
    case 'proprio':
      return 'default';
    case 'industrializacao':
      return 'secondary';
    case 'operacao_terceiro':
      return 'outline';
    default:
      return 'outline';
  }
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Package, Factory, Users, ArrowRight, DollarSign, 
  TrendingUp, AlertCircle, Info
} from "lucide-react";
import { 
  CenarioOperacao, 
  CENARIOS_CONFIG, 
  ResultadoCalculosSaida,
  formatCenarioLabel,
  getCenarioColor
} from "@/lib/cenarios-orben";
import { cn } from "@/lib/utils";

interface CenarioPreviewProps {
  cenario: CenarioOperacao | null;
  calculo?: ResultadoCalculosSaida;
  donoNome?: string;
  pesoTotal?: number;
  lmeReferencia?: number;
  custoMedio?: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatWeight(kg: number) {
  return kg >= 1000 ? `${(kg / 1000).toFixed(2)} t` : `${kg.toFixed(2)} kg`;
}

export function CenarioPreview({ 
  cenario, 
  calculo, 
  donoNome,
  pesoTotal,
  lmeReferencia,
  custoMedio
}: CenarioPreviewProps) {
  if (!cenario) return null;

  const config = CENARIOS_CONFIG[cenario];
  const colorClass = getCenarioColor(cenario);

  const getIcon = () => {
    switch (cenario) {
      case 'proprio':
        return <Package className="h-5 w-5" />;
      case 'industrializacao':
        return <Factory className="h-5 w-5" />;
      case 'operacao_terceiro':
        return <Users className="h-5 w-5" />;
    }
  };

  return (
    <Card className={cn("border-2", colorClass)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {getIcon()}
          <span>{formatCenarioLabel(cenario)}</span>
          {donoNome && cenario !== 'proprio' && (
            <Badge variant="outline" className="ml-auto font-normal">
              Dono: {donoNome}
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{config.descricao}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fluxo visual */}
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline">Entrada</Badge>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant="outline">Beneficiamento</Badge>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant="secondary">
            {cenario === 'proprio' && 'Consumo Interno'}
            {cenario === 'industrializacao' && 'Retorno Industrial'}
            {cenario === 'operacao_terceiro' && 'Venda'}
          </Badge>
        </div>

        {/* Detalhes por cenário */}
        {cenario === 'proprio' && pesoTotal && lmeReferencia && custoMedio && (
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-success" />
              Análise Economia vs LME
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">LME Referência:</span>
                <span className="ml-2 font-medium">{formatCurrency(lmeReferencia)}/kg</span>
              </div>
              <div>
                <span className="text-muted-foreground">Custo Médio:</span>
                <span className="ml-2 font-medium">{formatCurrency(custoMedio)}/kg</span>
              </div>
            </div>
            {lmeReferencia > custoMedio ? (
              <div className="flex items-center gap-2 text-success text-sm">
                <TrendingUp className="h-4 w-4" />
                Economia de {formatCurrency((lmeReferencia - custoMedio) * (pesoTotal || 0))} no lote
              </div>
            ) : (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                Prejuízo de {formatCurrency((custoMedio - lmeReferencia) * (pesoTotal || 0))} vs LME
              </div>
            )}
          </div>
        )}

        {cenario === 'industrializacao' && calculo && (
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4" />
              Custos a Cobrar do Cliente
            </div>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(calculo.custosTotais)}
            </div>
            <p className="text-xs text-muted-foreground">
              MO + Frete + Perda negociada = Receita IBRAC
            </p>
          </div>
        )}

        {cenario === 'operacao_terceiro' && calculo && (
          <div className="rounded-lg bg-muted/50 p-3 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4" />
              Decomposição da Operação
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Receita Bruta:</span>
                <span className="font-medium">{formatCurrency(calculo.valorBruto)}</span>
              </div>
              <div className="flex justify-between text-destructive">
                <span>(−) Custos Operacionais:</span>
                <span>{formatCurrency(calculo.custosTotais)}</span>
              </div>
              <div className="flex justify-between text-warning">
                <span>(−) Comissão IBRAC:</span>
                <span>{formatCurrency(calculo.comissaoIbrac)}</span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between font-bold">
                <span>Repasse ao Dono:</span>
                <span className="text-success">{formatCurrency(calculo.valorRepasseDono)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Legenda de regras */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>
            {cenario === 'proprio' && 'Todos os custos compõem o custo do material. Comparar com LME para avaliar economia.'}
            {cenario === 'industrializacao' && 'Material nunca é custo da IBRAC. Lucro vem do serviço + diferença de perda.'}
            {cenario === 'operacao_terceiro' && 'Nota fiscal é da IBRAC, mas resultado econômico pertence ao dono.'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertTriangle, Sparkles } from "lucide-react";
import { calcularLucroPerda, ResultadoLucroPerda } from "@/lib/cenarios-orben";
import { cn } from "@/lib/utils";
import { formatCurrency, formatWeight } from "@/lib/kpis";

interface LucroPerdaPreviewProps {
  pesoEntrada: number;
  perdaCobradaPct: number;
  perdaRealPct: number;
  lmeReferenciaKg: number;
}

export function LucroPerdaPreview({
  pesoEntrada,
  perdaCobradaPct,
  perdaRealPct,
  lmeReferenciaKg,
}: LucroPerdaPreviewProps) {
  const resultado = calcularLucroPerda({
    pesoEntrada,
    perdaCobradaPct,
    perdaRealPct,
    lmeReferenciaKg,
  });

  const { diferencaPct, diferencaKg, valorLucro, temLucro } = resultado;

  // Não mostrar se não há diferença significativa
  if (Math.abs(diferencaPct) < 0.01) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        <AlertTriangle className="h-4 w-4" />
        <span>Perda cobrada = Perda real. Sem lucro/prejuízo na perda.</span>
      </div>
    );
  }

  return (
    <Card className={cn(
      "border-2",
      temLucro ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {temLucro ? (
            <>
              <Sparkles className="h-5 w-5 text-success" />
              <span className="text-success">Lucro na Perda</span>
            </>
          ) : (
            <>
              <TrendingDown className="h-5 w-5 text-destructive" />
              <span className="text-destructive">Prejuízo na Perda</span>
            </>
          )}
          <Badge variant={temLucro ? "default" : "destructive"} className="ml-auto">
            {diferencaPct > 0 ? '+' : ''}{diferencaPct.toFixed(2)}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Perda Cobrada:</span>
            <span className="ml-2 font-medium">{perdaCobradaPct.toFixed(2)}%</span>
          </div>
          <div>
            <span className="text-muted-foreground">Perda Real:</span>
            <span className="ml-2 font-medium">{perdaRealPct.toFixed(2)}%</span>
          </div>
        </div>

        <div className="h-px bg-border" />

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Diferença em peso:</span>
            <span className={cn(
              "font-medium",
              temLucro ? "text-success" : "text-destructive"
            )}>
              {temLucro ? '+' : ''}{formatWeight(diferencaKg)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valor estimado:</span>
            <span className={cn(
              "text-xl font-bold",
              temLucro ? "text-success" : "text-destructive"
            )}>
              {temLucro ? '+' : ''}{formatCurrency(valorLucro)}
            </span>
          </div>
        </div>

        {temLucro && lmeReferenciaKg > 0 && (
          <div className="rounded-lg bg-success/10 p-3 text-sm">
            <div className="flex items-center gap-2 font-medium text-success">
              <TrendingUp className="h-4 w-4" />
              Será gerado sublote residual para IBRAC
            </div>
            <p className="text-muted-foreground mt-1">
              {formatWeight(diferencaKg)} de material a {formatCurrency(lmeReferenciaKg)}/kg
            </p>
          </div>
        )}

        {!temLucro && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm">
            <div className="flex items-center gap-2 font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Perda real maior que a cobrada
            </div>
            <p className="text-muted-foreground mt-1">
              Revisar negociação de perda com o cliente/fornecedor.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

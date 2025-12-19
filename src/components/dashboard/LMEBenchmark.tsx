import { TrendingUp, TrendingDown, ArrowRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface LMEBenchmarkProps {
  custoIndustrializado: number;
  precoLME: number;
}

export function LMEBenchmark({ custoIndustrializado, precoLME }: LMEBenchmarkProps) {
  const diferenca = precoLME - custoIndustrializado;
  const percentual = ((diferenca / precoLME) * 100).toFixed(1);
  const valeAPena = diferenca > 0;

  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-6 shadow-elevated animate-slide-up">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-copper shadow-copper">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">Benchmark LME</h3>
            <p className="text-xs text-muted-foreground">Comparativo em tempo real</p>
          </div>
        </div>
        <div
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            valeAPena
              ? "bg-success/10 text-success"
              : "bg-destructive/10 text-destructive"
          )}
        >
          {valeAPena ? "Vantagem Sucata" : "Vantagem LME"}
        </div>
      </div>

      {/* Comparison */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Custo Industrializado */}
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Vergalhão Industrializado
          </p>
          <p className="text-2xl font-bold text-foreground">
            R$ {custoIndustrializado.toFixed(2)}
            <span className="text-sm font-normal text-muted-foreground">/kg</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Custo final calculado
          </p>
        </div>

        {/* Arrow Indicator */}
        <div className="flex items-center justify-center">
          <div
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-3",
              valeAPena ? "border-success/30" : "border-destructive/30"
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                valeAPena ? "bg-success/10" : "bg-destructive/10"
              )}
            >
              {valeAPena ? (
                <TrendingDown className="h-5 w-5 text-success" />
              ) : (
                <TrendingUp className="h-5 w-5 text-destructive" />
              )}
            </div>
            <div className="text-center">
              <p
                className={cn(
                  "text-lg font-bold",
                  valeAPena ? "text-success" : "text-destructive"
                )}
              >
                {valeAPena ? "-" : "+"}R$ {Math.abs(diferenca).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">{percentual}%</p>
            </div>
          </div>
        </div>

        {/* Preço LME */}
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Vergalhão LME
          </p>
          <p className="text-2xl font-bold text-foreground">
            R$ {precoLME.toFixed(2)}
            <span className="text-sm font-normal text-muted-foreground">/kg</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Benchmark de mercado
          </p>
        </div>
      </div>

      {/* Footer */}
      <div
        className={cn(
          "mt-6 flex items-center justify-between rounded-lg p-4",
          valeAPena ? "bg-success/5" : "bg-warning/5"
        )}
      >
        <p className="text-sm font-medium">
          {valeAPena
            ? "✓ Comprar sucata hoje é vantajoso"
            : "⚠ Considere comprar vergalhão pronto"}
        </p>
        <button className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          Ver simulação completa
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

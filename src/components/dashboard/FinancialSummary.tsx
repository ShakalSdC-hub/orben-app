import { DollarSign, ArrowUpRight, ArrowDownRight, Wallet, CircleDollarSign, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinancialData {
  capitalInvestido: number;
  aReceber: number;
  aPagar: number;
  lucroMensal: number;
}

const financialData: FinancialData = {
  capitalInvestido: 1250000,
  aReceber: 380000,
  aPagar: 145000,
  lucroMensal: 85000,
};

export function FinancialSummary() {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const items = [
    {
      label: "Capital Investido",
      value: financialData.capitalInvestido,
      icon: Wallet,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "A Receber",
      value: financialData.aReceber,
      icon: ArrowUpRight,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "A Pagar",
      value: financialData.aPagar,
      icon: ArrowDownRight,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      label: "Lucro Mensal",
      value: financialData.lucroMensal,
      icon: CircleDollarSign,
      color: "text-copper",
      bgColor: "bg-copper/10",
    },
  ];

  return (
    <div className="rounded-xl border bg-card p-6 shadow-elevated animate-slide-up">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-copper shadow-copper">
            <DollarSign className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">Posição Financeira</h3>
            <p className="text-xs text-muted-foreground">IBRAC Consolidado</p>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-lg bg-muted/30 p-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("flex h-7 w-7 items-center justify-center rounded-md", item.bgColor)}>
                <item.icon className={cn("h-4 w-4", item.color)} />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {item.label}
              </span>
            </div>
            <p className={cn("text-xl font-bold", item.color === "text-destructive" ? "text-foreground" : "")}>
              {formatCurrency(item.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="my-4 border-t border-dashed" />

      {/* Cash Flow Summary */}
      <div className="flex items-center justify-between rounded-lg bg-primary/5 p-4">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Fluxo de Caixa Livre</span>
        </div>
        <p className="text-lg font-bold text-success">
          {formatCurrency(financialData.aReceber - financialData.aPagar)}
        </p>
      </div>
    </div>
  );
}

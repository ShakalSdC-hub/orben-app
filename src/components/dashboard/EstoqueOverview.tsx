import { Warehouse, Package, Truck, Factory, Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface LocalEstoque {
  nome: string;
  icon: React.ElementType;
  pesoKg: number;
  capacidadeKg?: number;
  tipo: "interno" | "processo" | "transito" | "cliente";
}

const locaisEstoque: LocalEstoque[] = [
  {
    nome: "IBRAC (Próprio)",
    icon: Warehouse,
    pesoKg: 45200,
    capacidadeKg: 80000,
    tipo: "interno",
  },
  {
    nome: "Plasinco Sul",
    icon: Factory,
    pesoKg: 12500,
    tipo: "processo",
  },
  {
    nome: "Laminador 2",
    icon: Factory,
    pesoKg: 8300,
    tipo: "processo",
  },
  {
    nome: "Em Trânsito",
    icon: Truck,
    pesoKg: 5600,
    tipo: "transito",
  },
  {
    nome: "Com Cliente",
    icon: Users,
    pesoKg: 3200,
    tipo: "cliente",
  },
];

const tipoColors = {
  interno: "bg-primary",
  processo: "bg-warning",
  transito: "bg-copper-light",
  cliente: "bg-success",
};

const tipoLabels = {
  interno: "Estoque Próprio",
  processo: "Em Processo",
  transito: "Em Trânsito",
  cliente: "Com Cliente",
};

export function EstoqueOverview() {
  const totalEstoque = locaisEstoque.reduce((acc, local) => acc + local.pesoKg, 0);

  const formatWeight = (kg: number) => {
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(1)}t`;
    }
    return `${kg}kg`;
  };

  return (
    <div className="rounded-xl border bg-card p-6 shadow-elevated animate-slide-up">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Posição de Estoque</h3>
            <p className="text-xs text-muted-foreground">Multi-localização</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{formatWeight(totalEstoque)}</p>
          <p className="text-xs text-muted-foreground">Total em cobre</p>
        </div>
      </div>

      {/* Stacked Bar */}
      <div className="mb-6">
        <div className="flex h-4 overflow-hidden rounded-full bg-muted">
          {locaisEstoque.map((local, index) => (
            <div
              key={local.nome}
              className={cn("transition-all duration-500", tipoColors[local.tipo])}
              style={{ width: `${(local.pesoKg / totalEstoque) * 100}%` }}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-3">
          {Object.entries(tipoLabels).map(([tipo, label]) => (
            <div key={tipo} className="flex items-center gap-1.5 text-xs">
              <div className={cn("h-2 w-2 rounded-full", tipoColors[tipo as keyof typeof tipoColors])} />
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {locaisEstoque.map((local) => (
          <div
            key={local.nome}
            className="flex items-center justify-between rounded-lg bg-muted/30 p-3 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-md", tipoColors[local.tipo], "bg-opacity-20")}>
                <local.icon className={cn("h-4 w-4", tipoColors[local.tipo].replace("bg-", "text-"))} />
              </div>
              <div>
                <p className="text-sm font-medium">{local.nome}</p>
                <p className="text-xs text-muted-foreground">{tipoLabels[local.tipo]}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold">{formatWeight(local.pesoKg)}</p>
              {local.capacidadeKg && (
                <div className="mt-1 flex items-center gap-2">
                  <Progress 
                    value={(local.pesoKg / local.capacidadeKg) * 100} 
                    className="h-1 w-16"
                  />
                  <span className="text-xs text-muted-foreground">
                    {Math.round((local.pesoKg / local.capacidadeKg) * 100)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

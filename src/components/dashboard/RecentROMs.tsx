import { FileInput, FileOutput, ArrowRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ROM {
  id: string;
  tipo: "entrada" | "saida";
  fornecedor: string;
  pesoKg: number;
  status: "pendente" | "conferido" | "processando" | "finalizado";
  data: string;
  hora: string;
}

const recentROMs: ROM[] = [
  {
    id: "ROM-ENT-2024-0156",
    tipo: "entrada",
    fornecedor: "Reciclagem São Paulo",
    pesoKg: 5200,
    status: "conferido",
    data: "18/12",
    hora: "14:32",
  },
  {
    id: "ROM-ENT-2024-0155",
    tipo: "entrada",
    fornecedor: "Cobre Sul Ltda",
    pesoKg: 3800,
    status: "processando",
    data: "18/12",
    hora: "10:15",
  },
  {
    id: "ROM-SAI-2024-0089",
    tipo: "saida",
    fornecedor: "Plasinco Sul",
    pesoKg: 4500,
    status: "finalizado",
    data: "17/12",
    hora: "16:45",
  },
  {
    id: "ROM-ENT-2024-0154",
    tipo: "entrada",
    fornecedor: "Metal Norte",
    pesoKg: 6100,
    status: "pendente",
    data: "17/12",
    hora: "09:20",
  },
];

const statusConfig = {
  pendente: { label: "Pendente", className: "bg-warning/10 text-warning border-warning/20" },
  conferido: { label: "Conferido", className: "bg-primary/10 text-primary border-primary/20" },
  processando: { label: "Processando", className: "bg-copper/10 text-copper border-copper/20" },
  finalizado: { label: "Finalizado", className: "bg-success/10 text-success border-success/20" },
};

export function RecentROMs() {
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
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">ROMs Recentes</h3>
            <p className="text-xs text-muted-foreground">Últimas movimentações</p>
          </div>
        </div>
        <button className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          Ver todos
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {recentROMs.map((rom) => (
          <div
            key={rom.id}
            className="group flex items-center justify-between rounded-lg border border-transparent bg-muted/30 p-4 transition-all hover:border-border hover:bg-muted/50 hover:shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  rom.tipo === "entrada"
                    ? "bg-success/10 text-success"
                    : "bg-copper/10 text-copper"
                )}
              >
                {rom.tipo === "entrada" ? (
                  <FileInput className="h-5 w-5" />
                ) : (
                  <FileOutput className="h-5 w-5" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">{rom.id}</p>
                <p className="text-xs text-muted-foreground">{rom.fornecedor}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-semibold">{formatWeight(rom.pesoKg)}</p>
                <p className="text-xs text-muted-foreground">
                  {rom.data} às {rom.hora}
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-medium",
                  statusConfig[rom.status].className
                )}
              >
                {statusConfig[rom.status].label}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

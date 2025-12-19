import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Warehouse,
  Package,
  Factory,
  Truck,
  Users,
  Search,
  Filter,
  ArrowRightLeft,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SubLote {
  id: string;
  romOrigem: string;
  tipoMaterial: "Mel" | "Mista";
  pesoKg: number;
  localizacao: string;
  status: "disponivel" | "reservado" | "processo" | "vendido";
  dataEntrada: string;
  dono: string;
}

const subLotes: SubLote[] = [
  {
    id: "0156-001",
    romOrigem: "ROM-ENT-2024-0156",
    tipoMaterial: "Mel",
    pesoKg: 450,
    localizacao: "IBRAC",
    status: "disponivel",
    dataEntrada: "18/12/2024",
    dono: "IBRAC",
  },
  {
    id: "0156-002",
    romOrigem: "ROM-ENT-2024-0156",
    tipoMaterial: "Mista",
    pesoKg: 380,
    localizacao: "IBRAC",
    status: "reservado",
    dataEntrada: "18/12/2024",
    dono: "IBRAC",
  },
  {
    id: "0155-001",
    romOrigem: "ROM-ENT-2024-0155",
    tipoMaterial: "Mel",
    pesoKg: 520,
    localizacao: "Plasinco Sul",
    status: "processo",
    dataEntrada: "18/12/2024",
    dono: "IBRAC",
  },
  {
    id: "0154-003",
    romOrigem: "ROM-ENT-2024-0154",
    tipoMaterial: "Mista",
    pesoKg: 410,
    localizacao: "Laminador 2",
    status: "processo",
    dataEntrada: "17/12/2024",
    dono: "Renato",
  },
  {
    id: "0153-002",
    romOrigem: "ROM-ENT-2024-0153",
    tipoMaterial: "Mel",
    pesoKg: 480,
    localizacao: "Em Trânsito",
    status: "reservado",
    dataEntrada: "17/12/2024",
    dono: "IBRAC",
  },
];

const localizacoes = [
  {
    nome: "IBRAC (Próprio)",
    icon: Warehouse,
    pesoKg: 45200,
    capacidadeKg: 80000,
    qtdLotes: 95,
    tipo: "interno" as const,
  },
  {
    nome: "Plasinco Sul",
    icon: Factory,
    pesoKg: 12500,
    qtdLotes: 28,
    tipo: "processo" as const,
  },
  {
    nome: "Laminador 2",
    icon: Factory,
    pesoKg: 8300,
    qtdLotes: 18,
    tipo: "processo" as const,
  },
  {
    nome: "Em Trânsito",
    icon: Truck,
    pesoKg: 5600,
    qtdLotes: 12,
    tipo: "transito" as const,
  },
  {
    nome: "Com Cliente",
    icon: Users,
    pesoKg: 3200,
    qtdLotes: 7,
    tipo: "cliente" as const,
  },
];

const tipoColors = {
  interno: "bg-primary text-primary-foreground",
  processo: "bg-warning text-warning-foreground",
  transito: "bg-copper text-primary-foreground",
  cliente: "bg-success text-success-foreground",
};

const statusConfig = {
  disponivel: { label: "Disponível", className: "bg-success/10 text-success border-success/20" },
  reservado: { label: "Reservado", className: "bg-warning/10 text-warning border-warning/20" },
  processo: { label: "Em Processo", className: "bg-copper/10 text-copper border-copper/20" },
  vendido: { label: "Vendido", className: "bg-muted text-muted-foreground border-border" },
};

export default function Estoque() {
  const formatWeight = (kg: number) => {
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(1)}t`;
    }
    return `${kg}kg`;
  };

  const totalEstoque = localizacoes.reduce((acc, loc) => acc + loc.pesoKg, 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Estoque</h1>
            <p className="text-muted-foreground">
              Controle de posição de estoque multi-localização
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <BarChart3 className="mr-2 h-4 w-4" />
              Relatório
            </Button>
            <Button size="sm" className="bg-gradient-copper hover:opacity-90 shadow-copper">
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transferir
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          {localizacoes.map((loc) => (
            <div
              key={loc.nome}
              className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", tipoColors[loc.tipo])}>
                  <loc.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{loc.nome}</p>
                  <p className="text-xs text-muted-foreground">{loc.qtdLotes} sub-lotes</p>
                </div>
              </div>
              <p className="text-2xl font-bold">{formatWeight(loc.pesoKg)}</p>
              {loc.capacidadeKg && (
                <div className="mt-2">
                  <Progress
                    value={(loc.pesoKg / loc.capacidadeKg) * 100}
                    className="h-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round((loc.pesoKg / loc.capacidadeKg) * 100)}% da capacidade
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="sublotes" className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <TabsList>
              <TabsTrigger value="sublotes">Sub-Lotes</TabsTrigger>
              <TabsTrigger value="consolidado">Consolidado</TabsTrigger>
              <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar sub-lote..." className="pl-10" />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filtros
              </Button>
            </div>
          </div>

          <TabsContent value="sublotes" className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {subLotes.map((lote) => (
                <div
                  key={lote.id}
                  className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-all hover:border-primary/30 cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{lote.id}</p>
                        <p className="text-xs text-muted-foreground">{lote.romOrigem}</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-xs", statusConfig[lote.status].className)}
                    >
                      {statusConfig[lote.status].label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Peso</p>
                      <p className="font-semibold">{formatWeight(lote.pesoKg)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Material</p>
                      <p className="font-medium">{lote.tipoMaterial}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Local</p>
                      <p className="font-medium">{lote.localizacao}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Dono</p>
                      <Badge variant="secondary" className="text-xs">
                        {lote.dono}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="consolidado">
            <div className="rounded-xl border bg-card p-8 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Visão Consolidada</h3>
              <p className="text-muted-foreground text-sm">
                Gráficos e relatórios consolidados de estoque
              </p>
            </div>
          </TabsContent>

          <TabsContent value="movimentacoes">
            <div className="rounded-xl border bg-card p-8 text-center">
              <ArrowRightLeft className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Histórico de Movimentações</h3>
              <p className="text-muted-foreground text-sm">
                Rastreabilidade completa de cada sub-lote
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

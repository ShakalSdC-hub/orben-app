import { useState } from "react";
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
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const statusConfig = {
  disponivel: { label: "Disponível", className: "bg-success/10 text-success border-success/20" },
  reservado: { label: "Reservado", className: "bg-warning/10 text-warning border-warning/20" },
  em_processo: { label: "Em Processo", className: "bg-copper/10 text-copper border-copper/20" },
  vendido: { label: "Vendido", className: "bg-muted text-muted-foreground border-border" },
};

const tipoColors = {
  interno: "bg-primary text-primary-foreground",
  processo: "bg-warning text-warning-foreground",
  transito: "bg-copper text-primary-foreground",
  cliente: "bg-success text-success-foreground",
};

export default function Estoque() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDono, setSelectedDono] = useState<string | null>(null);

  // Fetch sublotes com relacionamentos
  const { data: sublotes, isLoading } = useQuery({
    queryKey: ["sublotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sublotes")
        .select(`
          *,
          entrada:entradas(codigo),
          dono:donos_material(nome),
          tipo_produto:tipos_produto(nome),
          local_estoque:locais_estoque(nome, tipo)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch donos para filtro
  const { data: donos } = useQuery({
    queryKey: ["donos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("donos_material").select("*").eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  // Fetch locais de estoque
  const { data: locais } = useQuery({
    queryKey: ["locais-estoque"],
    queryFn: async () => {
      const { data, error } = await supabase.from("locais_estoque").select("*").eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  // Calcular estatísticas por localização
  const localizacoes = locais?.map((local) => {
    const sublotesLocal = sublotes?.filter((s) => s.local_estoque_id === local.id) || [];
    const pesoTotal = sublotesLocal.reduce((acc, s) => acc + (s.peso_kg || 0), 0);
    return {
      ...local,
      pesoKg: pesoTotal,
      qtdLotes: sublotesLocal.length,
      icon: local.tipo === "interno" ? Warehouse : local.tipo === "processo" ? Factory : local.tipo === "transito" ? Truck : Users,
      tipoColor: tipoColors[local.tipo as keyof typeof tipoColors] || tipoColors.interno,
    };
  }) || [];

  // Calcular estatísticas por dono
  const estatisticasPorDono = donos?.map((dono) => {
    const sublotesDono = sublotes?.filter((s) => s.dono_id === dono.id) || [];
    const pesoTotal = sublotesDono.reduce((acc, s) => acc + (s.peso_kg || 0), 0);
    return {
      ...dono,
      pesoKg: pesoTotal,
      qtdLotes: sublotesDono.length,
    };
  }) || [];

  // Estoque IBRAC (sem dono ou dono null)
  const estoqueIbrac = sublotes?.filter((s) => !s.dono_id) || [];
  const pesoIbrac = estoqueIbrac.reduce((acc, s) => acc + (s.peso_kg || 0), 0);

  const totalEstoque = sublotes?.reduce((acc, s) => acc + (s.peso_kg || 0), 0) || 0;

  const formatWeight = (kg: number) => {
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
    return `${kg}kg`;
  };

  // Filtrar sublotes
  const filteredSublotes = sublotes?.filter((s) => {
    const matchesSearch =
      s.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.entrada?.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.dono?.nome?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDono = !selectedDono || s.dono_id === selectedDono;
    return matchesSearch && matchesDono;
  });

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

        {/* Summary Cards by Location */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {localizacoes.slice(0, 4).map((loc) => (
              <div
                key={loc.id}
                className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", loc.tipoColor)}>
                    <loc.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{loc.nome}</p>
                    <p className="text-xs text-muted-foreground">{loc.qtdLotes} sub-lotes</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">{formatWeight(loc.pesoKg)}</p>
                {loc.capacidade_kg && (
                  <div className="mt-2">
                    <Progress value={(loc.pesoKg / loc.capacidade_kg) * 100} className="h-1.5" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round((loc.pesoKg / loc.capacidade_kg) * 100)}% da capacidade
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Estoque por Dono */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Estoque por Dono do Material
          </h3>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
            <div
              onClick={() => setSelectedDono(null)}
              className={cn(
                "rounded-lg border p-3 cursor-pointer transition-all hover:border-primary/50",
                !selectedDono && "border-primary bg-primary/5"
              )}
            >
              <p className="text-xs text-muted-foreground">IBRAC (Próprio)</p>
              <p className="text-lg font-bold">{formatWeight(pesoIbrac)}</p>
              <p className="text-xs text-muted-foreground">{estoqueIbrac.length} lotes</p>
            </div>
            {estatisticasPorDono.map((dono) => (
              <div
                key={dono.id}
                onClick={() => setSelectedDono(selectedDono === dono.id ? null : dono.id)}
                className={cn(
                  "rounded-lg border p-3 cursor-pointer transition-all hover:border-copper/50",
                  selectedDono === dono.id && "border-copper bg-copper/5"
                )}
              >
                <p className="text-xs text-muted-foreground">{dono.nome}</p>
                <p className="text-lg font-bold">{formatWeight(dono.pesoKg)}</p>
                <p className="text-xs text-muted-foreground">{dono.qtdLotes} lotes</p>
              </div>
            ))}
          </div>
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
                <Input
                  placeholder="Buscar sub-lote..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filtros
              </Button>
            </div>
          </div>

          <TabsContent value="sublotes" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filteredSublotes?.map((lote) => (
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
                          <p className="font-semibold">{lote.codigo}</p>
                          <p className="text-xs text-muted-foreground">{lote.entrada?.codigo || "—"}</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("text-xs", statusConfig[lote.status as keyof typeof statusConfig]?.className)}
                      >
                        {statusConfig[lote.status as keyof typeof statusConfig]?.label || lote.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Peso</p>
                        <p className="font-semibold">{formatWeight(lote.peso_kg)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Material</p>
                        <p className="font-medium">{lote.tipo_produto?.nome || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Local</p>
                        <p className="font-medium">{lote.local_estoque?.nome || "IBRAC"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Dono</p>
                        <Badge variant="secondary" className="text-xs">
                          {lote.dono?.nome || "IBRAC"}
                        </Badge>
                      </div>
                    </div>

                    {lote.custo_unitario_total && lote.custo_unitario_total > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground">Custo Unitário</p>
                        <p className="font-semibold text-copper">
                          R$ {lote.custo_unitario_total.toFixed(2)}/kg
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                {(!filteredSublotes || filteredSublotes.length === 0) && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    {searchTerm || selectedDono ? "Nenhum sublote encontrado" : "Nenhum sublote no estoque ainda"}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="consolidado">
            <div className="rounded-xl border bg-card p-8 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Visão Consolidada</h3>
              <p className="text-muted-foreground text-sm">
                Estoque total: <span className="font-bold">{formatWeight(totalEstoque)}</span>
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

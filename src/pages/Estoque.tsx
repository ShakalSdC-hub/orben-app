import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
  MoveRight,
  History,
  UserRoundCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { TransferenciaDono } from "@/components/estoque/TransferenciaDono";

const statusConfig = {
  disponivel: { label: "Disponível", className: "bg-success/10 text-success border-success/20" },
  reservado: { label: "Reservado", className: "bg-warning/10 text-warning border-warning/20" },
  em_beneficiamento: { label: "Em Beneficiamento", className: "bg-copper/10 text-copper border-copper/20" },
  vendido: { label: "Vendido", className: "bg-muted text-muted-foreground border-border" },
};

const tipoColors = {
  interno: "bg-primary text-primary-foreground",
  processo: "bg-warning text-warning-foreground",
  transito: "bg-copper text-primary-foreground",
  cliente: "bg-success text-success-foreground",
};

const CHART_COLORS = ["hsl(28, 70%, 45%)", "hsl(220, 70%, 50%)", "hsl(142, 60%, 40%)", "hsl(45, 80%, 50%)", "hsl(280, 60%, 50%)", "hsl(0, 70%, 50%)"];

export default function Estoque() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDono, setSelectedDono] = useState<string | null>(null);
  const [selectedTipo, setSelectedTipo] = useState<string | null>(null);
  const [selectedLocal, setSelectedLocal] = useState<string | null>(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [selectedLote, setSelectedLote] = useState<any | null>(null);
  const [transferData, setTransferData] = useState({ local_destino_id: "", motivo: "" });
  const [isTransferDonoOpen, setIsTransferDonoOpen] = useState(false);
  const [selectedLoteDono, setSelectedLoteDono] = useState<any | null>(null);

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

  // Fetch tipos de produto
  const { data: tiposProduto } = useQuery({
    queryKey: ["tipos-produto"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tipos_produto").select("*").eq("ativo", true);
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

  // Fetch movimentações
  const { data: movimentacoes } = useQuery({
    queryKey: ["movimentacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentacoes")
        .select(`
          *,
          sublote:sublotes(codigo),
          local_origem:locais_estoque!movimentacoes_local_origem_id_fkey(nome),
          local_destino:locais_estoque!movimentacoes_local_destino_id_fkey(nome)
        `)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Transferência mutation
  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!selectedLote || !transferData.local_destino_id) return;

      // Criar movimentação
      const { error: movError } = await supabase.from("movimentacoes").insert({
        sublote_id: selectedLote.id,
        tipo: "transferencia",
        peso_kg: selectedLote.peso_kg,
        local_origem_id: selectedLote.local_estoque_id,
        local_destino_id: transferData.local_destino_id,
        motivo: transferData.motivo || "Transferência de estoque",
        created_by: user?.id,
      });
      if (movError) throw movError;

      // Atualizar sublote
      const { error: subError } = await supabase
        .from("sublotes")
        .update({ local_estoque_id: transferData.local_destino_id })
        .eq("id", selectedLote.id);
      if (subError) throw subError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sublotes"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes"] });
      toast({ title: "Transferência realizada com sucesso!" });
      setIsTransferOpen(false);
      setSelectedLote(null);
      setTransferData({ local_destino_id: "", motivo: "" });
    },
    onError: (error) => {
      toast({ title: "Erro na transferência", description: error.message, variant: "destructive" });
    },
  });

  // Calcular estatísticas por localização
  const localizacoes = locais?.map((local) => {
    const sublotesLocal = sublotes?.filter((s) => s.local_estoque_id === local.id && s.status === "disponivel") || [];
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
    const sublotesDono = sublotes?.filter((s) => s.dono_id === dono.id && s.status === "disponivel") || [];
    const pesoTotal = sublotesDono.reduce((acc, s) => acc + (s.peso_kg || 0), 0);
    return {
      ...dono,
      pesoKg: pesoTotal,
      qtdLotes: sublotesDono.length,
    };
  }) || [];

  // Calcular por tipo de produto
  const estatisticasPorTipo = tiposProduto?.map((tipo) => {
    const sublotesTipo = sublotes?.filter((s) => s.tipo_produto_id === tipo.id && s.status === "disponivel") || [];
    const pesoTotal = sublotesTipo.reduce((acc, s) => acc + (s.peso_kg || 0), 0);
    return {
      name: tipo.nome,
      id: tipo.id,
      value: pesoTotal,
      qtdLotes: sublotesTipo.length,
    };
  }).filter(t => t.value > 0) || [];

  // Estoque IBRAC (sem dono ou dono null)
  const estoqueIbrac = sublotes?.filter((s) => !s.dono_id && s.status === "disponivel") || [];
  const pesoIbrac = estoqueIbrac.reduce((acc, s) => acc + (s.peso_kg || 0), 0);

  const sublotesDisponiveis = sublotes?.filter(s => s.status === "disponivel") || [];
  const totalEstoque = sublotesDisponiveis.reduce((acc, s) => acc + (s.peso_kg || 0), 0);

  const formatWeight = (kg: number) => {
    if (kg >= 1000) return `${(kg / 1000).toFixed(2)}t`;
    return `${kg.toFixed(0)}kg`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  // Filtrar sublotes
  const filteredSublotes = sublotes?.filter((s) => {
    const matchesSearch =
      s.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.entrada?.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.dono?.nome?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDono = !selectedDono || s.dono_id === selectedDono;
    const matchesTipo = !selectedTipo || s.tipo_produto_id === selectedTipo;
    const matchesLocal = !selectedLocal || s.local_estoque_id === selectedLocal;
    return matchesSearch && matchesDono && matchesTipo && matchesLocal;
  });

  const handleTransfer = (lote: any) => {
    setSelectedLote(lote);
    setIsTransferOpen(true);
  };

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
                onClick={() => setSelectedLocal(selectedLocal === loc.id ? null : loc.id)}
                className={cn(
                  "rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer",
                  selectedLocal === loc.id && "border-primary ring-1 ring-primary"
                )}
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
            {estatisticasPorDono.filter(d => d.pesoKg > 0).map((dono) => (
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
              <Select value={selectedTipo || ""} onValueChange={(v) => setSelectedTipo(v || null)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Tipo Produto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {tiposProduto?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-all hover:border-primary/30 group"
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

                    {lote.status === "disponivel" && (
                      <div className="mt-3 pt-3 border-t flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleTransfer(lote)}
                        >
                          <MoveRight className="h-4 w-4 mr-1" />
                          Local
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedLoteDono(lote);
                            setIsTransferDonoOpen(true);
                          }}
                        >
                          <UserRoundCog className="h-4 w-4 mr-1" />
                          Dono
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {(!filteredSublotes || filteredSublotes.length === 0) && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    {searchTerm || selectedDono || selectedTipo || selectedLocal ? "Nenhum sublote encontrado" : "Nenhum sublote no estoque ainda"}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="consolidado">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Por Tipo de Produto */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Estoque por Tipo de Produto</CardTitle>
                </CardHeader>
                <CardContent>
                  {estatisticasPorTipo.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={estatisticasPorTipo}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, value }) => `${name}: ${formatWeight(value)}`}
                          >
                            {estatisticasPorTipo.map((_, index) => (
                              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatWeight(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      Sem dados para exibir
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Por Local */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Estoque por Local</CardTitle>
                </CardHeader>
                <CardContent>
                  {localizacoes.filter(l => l.pesoKg > 0).length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={localizacoes.filter(l => l.pesoKg > 0)}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="nome" className="text-xs" />
                          <YAxis tickFormatter={(v) => formatWeight(v)} className="text-xs" />
                          <Tooltip formatter={(value: number) => formatWeight(value)} />
                          <Bar dataKey="pesoKg" fill="hsl(28, 70%, 45%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      Sem dados para exibir
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resumo Geral */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Resumo Geral do Estoque</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-lg bg-primary/10 p-4">
                      <p className="text-sm text-muted-foreground">Peso Total Disponível</p>
                      <p className="text-2xl font-bold text-primary">{formatWeight(totalEstoque)}</p>
                    </div>
                    <div className="rounded-lg bg-copper/10 p-4">
                      <p className="text-sm text-muted-foreground">Total de Sub-lotes</p>
                      <p className="text-2xl font-bold text-copper">{sublotesDisponiveis.length}</p>
                    </div>
                    <div className="rounded-lg bg-success/10 p-4">
                      <p className="text-sm text-muted-foreground">Locais Ativos</p>
                      <p className="text-2xl font-bold text-success">{localizacoes.filter(l => l.qtdLotes > 0).length}</p>
                    </div>
                    <div className="rounded-lg bg-warning/10 p-4">
                      <p className="text-sm text-muted-foreground">Donos com Estoque</p>
                      <p className="text-2xl font-bold text-warning">{estatisticasPorDono.filter(d => d.pesoKg > 0).length + (pesoIbrac > 0 ? 1 : 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="movimentacoes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Histórico de Movimentações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Sublote</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead className="text-right">Peso</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!movimentacoes || movimentacoes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          Nenhuma movimentação registrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      movimentacoes.map((mov: any) => (
                        <TableRow key={mov.id}>
                          <TableCell>{format(new Date(mov.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                          <TableCell className="font-mono">{mov.sublote?.codigo || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{mov.tipo}</Badge>
                          </TableCell>
                          <TableCell>{mov.local_origem?.nome || "-"}</TableCell>
                          <TableCell>{mov.local_destino?.nome || "-"}</TableCell>
                          <TableCell className="text-right">{formatWeight(mov.peso_kg)}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{mov.motivo || "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Transfer Dialog */}
        <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transferir Sublote</DialogTitle>
            </DialogHeader>
            {selectedLote && (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm text-muted-foreground">Sublote</p>
                  <p className="font-bold">{selectedLote.codigo}</p>
                  <p className="text-sm">{formatWeight(selectedLote.peso_kg)} - {selectedLote.tipo_produto?.nome || "-"}</p>
                  <p className="text-sm text-muted-foreground">Local atual: {selectedLote.local_estoque?.nome || "Não definido"}</p>
                </div>

                <div className="space-y-2">
                  <Label>Local de Destino</Label>
                  <Select
                    value={transferData.local_destino_id}
                    onValueChange={(v) => setTransferData({ ...transferData, local_destino_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o local de destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {locais?.filter(l => l.id !== selectedLote.local_estoque_id).map((local) => (
                        <SelectItem key={local.id} value={local.id}>{local.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Motivo (opcional)</Label>
                  <Textarea
                    value={transferData.motivo}
                    onChange={(e) => setTransferData({ ...transferData, motivo: e.target.value })}
                    placeholder="Ex: Reorganização de estoque, envio para processo..."
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTransferOpen(false)}>Cancelar</Button>
              <Button
                onClick={() => transferMutation.mutate()}
                disabled={transferMutation.isPending || !transferData.local_destino_id}
                className="bg-gradient-copper hover:opacity-90"
              >
                {transferMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Transferir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transfer Dono Dialog */}
        <TransferenciaDono
          sublote={selectedLoteDono}
          open={isTransferDonoOpen}
          onOpenChange={setIsTransferDonoOpen}
        />
      </div>
    </MainLayout>
  );
}

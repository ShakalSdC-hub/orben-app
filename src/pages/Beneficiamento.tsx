import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Cog, Package, Truck, DollarSign, Scale, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  em_andamento: { label: "Em Andamento", variant: "default" },
  finalizado: { label: "Finalizado", variant: "secondary" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

function formatWeight(kg: number) {
  return kg >= 1000 ? `${(kg / 1000).toFixed(2)} t` : `${kg.toFixed(2)} kg`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function Beneficiamento() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    processo_id: "",
    tipo_beneficiamento: "interno",
    fornecedor_terceiro_id: "",
    custo_frete_ida: 0,
    custo_frete_volta: 0,
    custo_mo_terceiro: 0,
    custo_mo_ibrac: 0,
    taxa_financeira_pct: 1.8,
    perda_real_pct: 3,
    perda_cobrada_pct: 5,
    peso_entrada_kg: 0,
    peso_saida_kg: 0,
  });

  const { data: beneficiamentos = [], isLoading } = useQuery({
    queryKey: ["beneficiamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamentos")
        .select(`
          *,
          processos(nome),
          fornecedores:fornecedor_terceiro_id(razao_social)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: processos = [] } = useQuery({
    queryKey: ["processos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("processos").select("*").eq("ativo", true).order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fornecedores").select("*").eq("ativo", true).order("razao_social");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const codigo = `BEN-${Date.now().toString().slice(-6)}`;
      const { error } = await supabase.from("beneficiamentos").insert({
        ...data,
        codigo,
        processo_id: data.processo_id || null,
        fornecedor_terceiro_id: data.fornecedor_terceiro_id || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiamentos"] });
      setIsOpen(false);
      setFormData({
        processo_id: "",
        tipo_beneficiamento: "interno",
        fornecedor_terceiro_id: "",
        custo_frete_ida: 0,
        custo_frete_volta: 0,
        custo_mo_terceiro: 0,
        custo_mo_ibrac: 0,
        taxa_financeira_pct: 1.8,
        perda_real_pct: 3,
        perda_cobrada_pct: 5,
        peso_entrada_kg: 0,
        peso_saida_kg: 0,
      });
      toast({ title: "Beneficiamento criado com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao criar beneficiamento", variant: "destructive" }),
  });

  const custoTotal = formData.custo_frete_ida + formData.custo_frete_volta + formData.custo_mo_terceiro + formData.custo_mo_ibrac;
  const lucroPerda = formData.perda_cobrada_pct - formData.perda_real_pct;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Beneficiamento</h1>
            <p className="text-muted-foreground">Gerencie os processos de beneficiamento de materiais</p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-copper"><Plus className="h-4 w-4 mr-2" />Novo Beneficiamento</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Beneficiamento</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Tipo e Processo */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={formData.tipo_beneficiamento} onValueChange={(v) => setFormData({ ...formData, tipo_beneficiamento: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="interno">Interno (IBRAC)</SelectItem>
                        <SelectItem value="externo">Externo (Terceiro)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Processo</Label>
                    <Select value={formData.processo_id} onValueChange={(v) => setFormData({ ...formData, processo_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {processos.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Fornecedor (se externo) */}
                {formData.tipo_beneficiamento === "externo" && (
                  <div className="space-y-2">
                    <Label>Fornecedor Terceiro</Label>
                    <Select value={formData.fornecedor_terceiro_id} onValueChange={(v) => setFormData({ ...formData, fornecedor_terceiro_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {fornecedores.map((f: any) => (
                          <SelectItem key={f.id} value={f.id}>{f.razao_social}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Custos */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" />Custos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Frete Ida (R$)</Label>
                        <Input type="number" step="0.01" value={formData.custo_frete_ida} onChange={(e) => setFormData({ ...formData, custo_frete_ida: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Frete Volta (R$)</Label>
                        <Input type="number" step="0.01" value={formData.custo_frete_volta} onChange={(e) => setFormData({ ...formData, custo_frete_volta: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>MO Terceiro (R$)</Label>
                        <Input type="number" step="0.01" value={formData.custo_mo_terceiro} onChange={(e) => setFormData({ ...formData, custo_mo_terceiro: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div className="space-y-2">
                        <Label>MO IBRAC (R$)</Label>
                        <Input type="number" step="0.01" value={formData.custo_mo_ibrac} onChange={(e) => setFormData({ ...formData, custo_mo_ibrac: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Taxa Financeira (%)</Label>
                      <Input type="number" step="0.01" value={formData.taxa_financeira_pct} onChange={(e) => setFormData({ ...formData, taxa_financeira_pct: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium">Custo Total: <span className="text-primary">{formatCurrency(custoTotal)}</span></p>
                    </div>
                  </CardContent>
                </Card>

                {/* Perdas */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Perdas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Perda Real (%)</Label>
                        <Input type="number" step="0.01" value={formData.perda_real_pct} onChange={(e) => setFormData({ ...formData, perda_real_pct: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Perda Cobrada (%)</Label>
                        <Input type="number" step="0.01" value={formData.perda_cobrada_pct} onChange={(e) => setFormData({ ...formData, perda_cobrada_pct: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium">
                        Lucro IBRAC na Perda: <span className={lucroPerda > 0 ? "text-success" : "text-destructive"}>{lucroPerda.toFixed(2)}%</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Pesos */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2"><Scale className="h-4 w-4" />Pesos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Peso Entrada (kg)</Label>
                        <Input type="number" step="0.01" value={formData.peso_entrada_kg} onChange={(e) => setFormData({ ...formData, peso_entrada_kg: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Peso Saída (kg)</Label>
                        <Input type="number" step="0.01" value={formData.peso_saida_kg} onChange={(e) => setFormData({ ...formData, peso_saida_kg: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button className="w-full" onClick={() => createMutation.mutate(formData)} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Criando..." : "Criar Beneficiamento"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de Beneficiamentos */}
        <Card>
          <CardHeader>
            <CardTitle>Beneficiamentos</CardTitle>
            <CardDescription>Lista de todos os beneficiamentos cadastrados</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Processo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data Início</TableHead>
                  <TableHead className="text-right">Peso Entrada</TableHead>
                  <TableHead className="text-right">Peso Saída</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center">Carregando...</TableCell></TableRow>
                ) : beneficiamentos.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum beneficiamento cadastrado</TableCell></TableRow>
                ) : (
                  beneficiamentos.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono font-medium">{b.codigo}</TableCell>
                      <TableCell>{b.processos?.nome || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={b.tipo_beneficiamento === "interno" ? "default" : "outline"}>
                          {b.tipo_beneficiamento === "interno" ? "Interno" : "Externo"}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(b.data_inicio), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                      <TableCell className="text-right">{formatWeight(b.peso_entrada_kg || 0)}</TableCell>
                      <TableCell className="text-right">{formatWeight(b.peso_saida_kg || 0)}</TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[b.status]?.variant || "secondary"}>
                          {statusConfig[b.status]?.label || b.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

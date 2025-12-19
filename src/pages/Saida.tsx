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
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileOutput, AlertCircle, Search, Filter } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendente: { label: "Pendente", variant: "outline" },
  processando: { label: "Processando", variant: "default" },
  finalizada: { label: "Finalizada", variant: "secondary" },
  cancelada: { label: "Cancelada", variant: "destructive" },
};

function formatWeight(kg: number) {
  return kg >= 1000 ? `${(kg / 1000).toFixed(2)} t` : `${kg.toFixed(2)} kg`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function Saida() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({
    tipo_saida_id: "",
    cliente_id: "",
    peso_total_kg: 0,
    valor_unitario: 0,
    nota_fiscal: "",
    observacoes: "",
  });

  const { data: saidas = [], isLoading } = useQuery({
    queryKey: ["saidas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saidas")
        .select(`
          *,
          clientes(razao_social),
          tipos_saida(nome, cobra_custos)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: tiposSaida = [] } = useQuery({
    queryKey: ["tipos_saida"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tipos_saida").select("*").eq("ativo", true).order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("*").eq("ativo", true).order("razao_social");
      if (error) throw error;
      return data;
    },
  });

  const tipoSelecionado = tiposSaida.find((t: any) => t.id === formData.tipo_saida_id);
  const valorTotal = formData.peso_total_kg * formData.valor_unitario;

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const codigo = `SAI-${Date.now().toString().slice(-6)}`;
      const { error } = await supabase.from("saidas").insert({
        codigo,
        tipo_saida: tipoSelecionado?.nome || "Venda",
        tipo_saida_id: data.tipo_saida_id || null,
        cliente_id: data.cliente_id || null,
        peso_total_kg: data.peso_total_kg,
        valor_unitario: data.valor_unitario,
        valor_total: valorTotal,
        nota_fiscal: data.nota_fiscal || null,
        observacoes: data.observacoes || null,
        custos_cobrados: tipoSelecionado?.cobra_custos ? valorTotal * 0.05 : 0,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saidas"] });
      setIsOpen(false);
      setFormData({
        tipo_saida_id: "",
        cliente_id: "",
        peso_total_kg: 0,
        valor_unitario: 0,
        nota_fiscal: "",
        observacoes: "",
      });
      toast({ title: "Saída registrada com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao registrar saída", variant: "destructive" }),
  });

  const filteredSaidas = saidas.filter((s: any) => 
    s.codigo?.toLowerCase().includes(search.toLowerCase()) ||
    s.clientes?.razao_social?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Saída</h1>
            <p className="text-muted-foreground">Registre as saídas de material do estoque</p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-copper"><Plus className="h-4 w-4 mr-2" />Nova Saída</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nova Saída</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tipo de Saída</Label>
                  <Select value={formData.tipo_saida_id} onValueChange={(v) => setFormData({ ...formData, tipo_saida_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {tiposSaida.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.nome} {t.cobra_custos && "(Cobra Custos)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {tipoSelecionado?.cobra_custos && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Este tipo de saída cobra os custos de beneficiamento do dono do material.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={formData.cliente_id} onValueChange={(v) => setFormData({ ...formData, cliente_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {clientes.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Peso Total (kg)</Label>
                    <Input type="number" step="0.01" value={formData.peso_total_kg} onChange={(e) => setFormData({ ...formData, peso_total_kg: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Unitário (R$/kg)</Label>
                    <Input type="number" step="0.01" value={formData.valor_unitario} onChange={(e) => setFormData({ ...formData, valor_unitario: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>

                <div className="p-3 bg-muted rounded-lg space-y-1">
                  <p className="text-sm font-medium">Valor Total: <span className="text-primary">{formatCurrency(valorTotal)}</span></p>
                  {tipoSelecionado?.cobra_custos && (
                    <p className="text-sm text-muted-foreground">Custos a cobrar: {formatCurrency(valorTotal * 0.05)}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Nota Fiscal</Label>
                  <Input value={formData.nota_fiscal} onChange={(e) => setFormData({ ...formData, nota_fiscal: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} />
                </div>

                <Button className="w-full" onClick={() => createMutation.mutate(formData)} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Registrando..." : "Registrar Saída"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filtros */}
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por código ou cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </div>

        {/* Lista de Saídas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileOutput className="h-5 w-5" />Saídas</CardTitle>
            <CardDescription>Lista de todas as saídas registradas</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Peso</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Custos</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center">Carregando...</TableCell></TableRow>
                ) : filteredSaidas.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhuma saída encontrada</TableCell></TableRow>
                ) : (
                  filteredSaidas.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono font-medium">{s.codigo}</TableCell>
                      <TableCell>
                        <Badge variant={s.tipos_saida?.cobra_custos ? "default" : "secondary"}>
                          {s.tipos_saida?.nome || s.tipo_saida}
                        </Badge>
                      </TableCell>
                      <TableCell>{s.clientes?.razao_social || "-"}</TableCell>
                      <TableCell>{format(new Date(s.data_saida), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                      <TableCell className="text-right">{formatWeight(s.peso_total_kg)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(s.valor_total || 0)}</TableCell>
                      <TableCell className="text-right">
                        {s.custos_cobrados > 0 ? (
                          <span className="text-warning">{formatCurrency(s.custos_cobrados)}</span>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[s.status]?.variant || "secondary"}>
                          {statusConfig[s.status]?.label || s.status}
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

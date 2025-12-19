import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileOutput, Search, Truck, DollarSign, Loader2, Trash2, Printer } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

interface SubloteSelecionado {
  id: string;
  codigo: string;
  peso_kg: number;
  custo_unitario_total: number;
  tipo_produto?: { nome: string } | null;
  dono?: { nome: string } | null;
}

export default function Saida() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchLotes, setSearchLotes] = useState("");
  const [activeTab, setActiveTab] = useState("lotes");
  const [selectedLotes, setSelectedLotes] = useState<SubloteSelecionado[]>([]);

  const [formData, setFormData] = useState({
    tipo_saida_id: "",
    cliente_id: "",
    valor_unitario: 0,
    nota_fiscal: "",
    observacoes: "",
    // Custos a cobrar
    perda_cobrada_pct: 0,
    custos_adicionais: 0,
    // Transporte
    transportadora_id: "",
    motorista: "",
    placa_veiculo: "",
  });

  // Queries
  const { data: saidas = [], isLoading } = useQuery({
    queryKey: ["saidas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saidas")
        .select(`
          *,
          tipos_saida(nome, cobra_custos)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: sublotesDisponiveis = [] } = useQuery({
    queryKey: ["sublotes_disponiveis_saida"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sublotes")
        .select(`
          *,
          tipo_produto:tipos_produto(nome),
          dono:donos_material(nome)
        `)
        .eq("status", "disponivel")
        .gt("peso_kg", 0)
        .order("codigo");
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

  const { data: parceiros = [] } = useQuery({
    queryKey: ["parceiros"],
    queryFn: async () => {
      const { data, error } = await supabase.from("parceiros").select("*").eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  const clientes = parceiros.filter((p) => p.is_cliente);
  const transportadoras = parceiros.filter((p) => p.is_transportadora);

  // Cálculos
  const pesoTotal = selectedLotes.reduce((acc, l) => acc + l.peso_kg, 0);
  const custoTotalAcumulado = selectedLotes.reduce((acc, l) => acc + (l.custo_unitario_total || 0) * l.peso_kg, 0);
  const valorBruto = pesoTotal * formData.valor_unitario;
  const perdaPeso = pesoTotal * (formData.perda_cobrada_pct / 100);
  const custoPerda = perdaPeso * formData.valor_unitario;
  const valorFinal = valorBruto - custoPerda - formData.custos_adicionais;

  const tipoSelecionado = tiposSaida.find((t: any) => t.id === formData.tipo_saida_id);

  // Filtro de sublotes
  const sublotesFiltrados = sublotesDisponiveis.filter(
    (s) =>
      s.codigo.toLowerCase().includes(searchLotes.toLowerCase()) ||
      s.tipo_produto?.nome?.toLowerCase().includes(searchLotes.toLowerCase()) ||
      s.dono?.nome?.toLowerCase().includes(searchLotes.toLowerCase())
  );

  const toggleLote = (sublote: SubloteSelecionado) => {
    const isSelected = selectedLotes.some((l) => l.id === sublote.id);
    if (isSelected) {
      setSelectedLotes(selectedLotes.filter((l) => l.id !== sublote.id));
    } else {
      setSelectedLotes([...selectedLotes, sublote]);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (selectedLotes.length === 0) throw new Error("Selecione ao menos um lote");

      const codigo = `SAI-${format(new Date(), "yyyyMMdd")}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;

      // Criar saída
      const { data: saida, error: saidaError } = await supabase
        .from("saidas")
        .insert({
          codigo,
          tipo_saida: tipoSelecionado?.nome || "Venda",
          tipo_saida_id: formData.tipo_saida_id || null,
          cliente_id: formData.cliente_id || null,
          peso_total_kg: pesoTotal,
          valor_unitario: formData.valor_unitario,
          valor_total: valorBruto,
          valor_repasse_dono: valorFinal,
          custos_cobrados: custoPerda + formData.custos_adicionais,
          nota_fiscal: formData.nota_fiscal || null,
          observacoes: formData.observacoes || null,
          transportadora_id: formData.transportadora_id || null,
          motorista: formData.motorista || null,
          placa_veiculo: formData.placa_veiculo || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (saidaError) throw saidaError;

      // Inserir itens de saída
      for (const lote of selectedLotes) {
        const { error: itemError } = await supabase.from("saida_itens").insert({
          saida_id: saida.id,
          sublote_id: lote.id,
          peso_kg: lote.peso_kg,
        });
        if (itemError) throw itemError;

        // Atualizar status do sublote
        const { error: updateError } = await supabase
          .from("sublotes")
          .update({ status: "vendido" })
          .eq("id", lote.id);
        if (updateError) throw updateError;
      }

      return saida;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saidas"] });
      queryClient.invalidateQueries({ queryKey: ["sublotes_disponiveis_saida"] });
      handleClose();
      toast({ title: "Saída registrada!", description: `${selectedLotes.length} lote(s) vendido(s)` });
    },
    onError: (error) => toast({ title: "Erro ao registrar saída", description: error.message, variant: "destructive" }),
  });

  const handleClose = () => {
    setIsOpen(false);
    setSelectedLotes([]);
    setActiveTab("lotes");
    setFormData({
      tipo_saida_id: "",
      cliente_id: "",
      valor_unitario: 0,
      nota_fiscal: "",
      observacoes: "",
      perda_cobrada_pct: 0,
      custos_adicionais: 0,
      transportadora_id: "",
      motorista: "",
      placa_veiculo: "",
    });
  };

  const filteredSaidas = saidas.filter((s: any) =>
    s.codigo?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Saída</h1>
            <p className="text-muted-foreground">Registre as saídas de material do estoque</p>
          </div>
          <Dialog open={isOpen} onOpenChange={(v) => v ? setIsOpen(true) : handleClose()}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-copper"><Plus className="h-4 w-4 mr-2" />Nova Saída</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Saída</DialogTitle>
              </DialogHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="lotes">1. Lotes</TabsTrigger>
                  <TabsTrigger value="cliente">2. Cliente</TabsTrigger>
                  <TabsTrigger value="custos">3. Valores</TabsTrigger>
                  <TabsTrigger value="transporte">4. Transporte</TabsTrigger>
                </TabsList>

                {/* Tab 1: Seleção de Lotes */}
                <TabsContent value="lotes" className="space-y-4 pt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar lotes por código, produto ou dono..."
                      value={searchLotes}
                      onChange={(e) => setSearchLotes(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="rounded-lg border max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-10"></TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead>Dono</TableHead>
                          <TableHead className="text-right">Peso</TableHead>
                          <TableHead className="text-right">Custo/kg</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sublotesFiltrados.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              Nenhum lote disponível
                            </TableCell>
                          </TableRow>
                        ) : (
                          sublotesFiltrados.map((sublote) => {
                            const isSelected = selectedLotes.some((l) => l.id === sublote.id);
                            return (
                              <TableRow
                                key={sublote.id}
                                className={`cursor-pointer ${isSelected ? "bg-primary/10" : "hover:bg-muted/30"}`}
                                onClick={() => toggleLote(sublote)}
                              >
                                <TableCell>
                                  <Checkbox checked={isSelected} />
                                </TableCell>
                                <TableCell className="font-mono text-primary">{sublote.codigo}</TableCell>
                                <TableCell>{sublote.tipo_produto?.nome || "-"}</TableCell>
                                <TableCell>{sublote.dono?.nome || "-"}</TableCell>
                                <TableCell className="text-right font-medium">{formatWeight(sublote.peso_kg)}</TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {formatCurrency(sublote.custo_unitario_total || 0)}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {selectedLotes.length > 0 && (
                    <Card className="bg-muted/30">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{selectedLotes.length} lote(s) selecionado(s)</p>
                            <p className="text-2xl font-bold text-primary">{formatWeight(pesoTotal)}</p>
                            <p className="text-sm text-muted-foreground">Custo acumulado: {formatCurrency(custoTotalAcumulado)}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setSelectedLotes([])}>
                            <Trash2 className="h-4 w-4 mr-2" />Limpar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Button className="w-full" onClick={() => setActiveTab("cliente")} disabled={selectedLotes.length === 0}>
                    Próximo: Cliente
                  </Button>
                </TabsContent>

                {/* Tab 2: Cliente */}
                <TabsContent value="cliente" className="space-y-4 pt-4">
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

                  <div className="space-y-2">
                    <Label>Cliente / Destinatário</Label>
                    <Select value={formData.cliente_id} onValueChange={(v) => setFormData({ ...formData, cliente_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {clientes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Nota Fiscal</Label>
                    <Input value={formData.nota_fiscal} onChange={(e) => setFormData({ ...formData, nota_fiscal: e.target.value })} placeholder="Número da NF" />
                  </div>

                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} placeholder="Observações adicionais..." />
                  </div>

                  <Button className="w-full" onClick={() => setActiveTab("custos")}>
                    Próximo: Valores
                  </Button>
                </TabsContent>

                {/* Tab 3: Valores/Custos */}
                <TabsContent value="custos" className="space-y-4 pt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" />Valores</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Valor Unitário (R$/kg)</Label>
                        <Input type="number" step="0.01" value={formData.valor_unitario} onChange={(e) => setFormData({ ...formData, valor_unitario: parseFloat(e.target.value) || 0 })} />
                      </div>

                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Valor Bruto: <span className="text-primary">{formatCurrency(valorBruto)}</span></p>
                      </div>

                      {tipoSelecionado?.cobra_custos && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Perda Cobrada (%)</Label>
                              <Input type="number" step="0.01" value={formData.perda_cobrada_pct} onChange={(e) => setFormData({ ...formData, perda_cobrada_pct: parseFloat(e.target.value) || 0 })} />
                            </div>
                            <div className="space-y-2">
                              <Label>Custos Adicionais (R$)</Label>
                              <Input type="number" step="0.01" value={formData.custos_adicionais} onChange={(e) => setFormData({ ...formData, custos_adicionais: parseFloat(e.target.value) || 0 })} />
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-primary">
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex justify-between">
                        <span>Valor Bruto:</span>
                        <span>{formatCurrency(valorBruto)}</span>
                      </div>
                      {tipoSelecionado?.cobra_custos && (
                        <>
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>- Perda ({formData.perda_cobrada_pct}%):</span>
                            <span>{formatCurrency(custoPerda)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>- Custos Adicionais:</span>
                            <span>{formatCurrency(formData.custos_adicionais)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Valor Repasse Dono:</span>
                        <span className="text-primary">{formatCurrency(valorFinal)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Custo Acumulado dos Lotes:</span>
                        <span>{formatCurrency(custoTotalAcumulado)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Button className="w-full" onClick={() => setActiveTab("transporte")}>
                    Próximo: Transporte
                  </Button>
                </TabsContent>

                {/* Tab 4: Transporte */}
                <TabsContent value="transporte" className="space-y-4 pt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" />Transporte</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Transportadora</Label>
                        <Select value={formData.transportadora_id} onValueChange={(v) => setFormData({ ...formData, transportadora_id: v })}>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {transportadoras.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.razao_social}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Motorista</Label>
                          <Input value={formData.motorista} onChange={(e) => setFormData({ ...formData, motorista: e.target.value })} placeholder="Nome do motorista" />
                        </div>
                        <div className="space-y-2">
                          <Label>Placa do Veículo</Label>
                          <Input value={formData.placa_veiculo} onChange={(e) => setFormData({ ...formData, placa_veiculo: e.target.value.toUpperCase() })} placeholder="ABC-1234" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Resumo */}
                  <Card className="bg-muted/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Resumo da Saída</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Lotes:</span>
                        <span className="font-bold">{selectedLotes.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Peso Total:</span>
                        <span className="font-bold">{formatWeight(pesoTotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Valor Total:</span>
                        <span className="font-bold text-primary">{formatCurrency(valorBruto)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || selectedLotes.length === 0}
                  className="bg-gradient-copper hover:opacity-90"
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Registrar Saída
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filtros */}
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por código..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
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
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Peso</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Custos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
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
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <Printer className="h-4 w-4" />
                        </Button>
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

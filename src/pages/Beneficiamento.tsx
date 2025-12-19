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
import { Plus, Cog, DollarSign, Scale, AlertTriangle, Truck, Package, Loader2, Search, Trash2, Printer } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BeneficiamentoRomaneioPrint } from "@/components/romaneio/BeneficiamentoRomaneioPrint";

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

interface SublotesSelecionados {
  id: string;
  codigo: string;
  peso_kg: number;
  tipo_produto?: { nome: string } | null;
  dono?: { nome: string } | null;
}

export default function Beneficiamento() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("lotes");
  const [searchLotes, setSearchLotes] = useState("");
  const [selectedLotes, setSelectedLotes] = useState<SublotesSelecionados[]>([]);
  const [romaneioBeneficiamento, setRomaneioBeneficiamento] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    processo_id: "",
    tipo_beneficiamento: "interno",
    fornecedor_terceiro_id: "",
    tipo_produto_saida_id: "",
    // Custos em R$/kg
    custo_frete_ida_kg: 0,
    custo_frete_volta_kg: 0,
    custo_mo_terceiro_kg: 0,
    custo_mo_ibrac_kg: 0,
    // Taxa financeira em %
    taxa_financeira_pct: 1.8,
    // Perdas
    perda_real_pct: 3,
    perda_cobrada_pct: 5,
    // Transporte
    transportadora_id: "",
    motorista: "",
    placa_veiculo: "",
  });

  // Queries
  const { data: beneficiamentos = [], isLoading } = useQuery({
    queryKey: ["beneficiamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamentos")
        .select(`
          *,
          processos(nome)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: sublotesDisponiveis = [] } = useQuery({
    queryKey: ["sublotes_disponiveis"],
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

  // Função para verificar se um sublote é relacionado (pai/filho) a algum já selecionado
  const isRelatedToSelected = (sublote: any): { isRelated: boolean; relatedCode: string | null } => {
    for (const selected of selectedLotes) {
      // Verifica se o sublote selecionado é pai do atual
      if (sublote.lote_pai_id === selected.id) {
        return { isRelated: true, relatedCode: selected.codigo };
      }
      // Verifica se o sublote atual é pai do selecionado
      const selectedFull = sublotesDisponiveis.find((s: any) => s.id === selected.id);
      if (selectedFull?.lote_pai_id === sublote.id) {
        return { isRelated: true, relatedCode: selected.codigo };
      }
      // Verifica se compartilham o mesmo entrada_id e um é pai do outro (mesma entrada)
      if (sublote.entrada_id && selectedFull?.entrada_id === sublote.entrada_id) {
        if (sublote.lote_pai_id || selectedFull?.lote_pai_id) {
          // Se um deles tem lote_pai_id, são relacionados (lote mãe e sublote)
          if (sublote.lote_pai_id === selected.id || selectedFull?.lote_pai_id === sublote.id) {
            return { isRelated: true, relatedCode: selected.codigo };
          }
        }
      }
    }
    return { isRelated: false, relatedCode: null };
  };

  const { data: processos = [] } = useQuery({
    queryKey: ["processos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("processos").select("*").eq("ativo", true).order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: tiposProduto = [] } = useQuery({
    queryKey: ["tipos_produto"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tipos_produto").select("*").eq("ativo", true).order("nome");
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

  const fornecedores = parceiros.filter((p) => p.is_fornecedor);
  const transportadoras = parceiros.filter((p) => p.is_transportadora);

  // Cálculos
  const pesoTotalEntrada = selectedLotes.reduce((acc, l) => acc + l.peso_kg, 0);
  const custoTotalKg = formData.custo_frete_ida_kg + formData.custo_frete_volta_kg + formData.custo_mo_terceiro_kg + formData.custo_mo_ibrac_kg;
  const custoTotal = custoTotalKg * pesoTotalEntrada;
  const custoFinanceiro = custoTotal * (formData.taxa_financeira_pct / 100);
  const pesoSaidaEstimado = pesoTotalEntrada * (1 - formData.perda_real_pct / 100);
  const lucroPerda = formData.perda_cobrada_pct - formData.perda_real_pct;

  // Filtro de sublotes
  const sublotesFiltrados = sublotesDisponiveis.filter(
    (s) =>
      s.codigo.toLowerCase().includes(searchLotes.toLowerCase()) ||
      s.tipo_produto?.nome?.toLowerCase().includes(searchLotes.toLowerCase()) ||
      s.dono?.nome?.toLowerCase().includes(searchLotes.toLowerCase())
  );

  const toggleLote = (sublote: any) => {
    const isSelected = selectedLotes.some((l) => l.id === sublote.id);
    if (isSelected) {
      setSelectedLotes(selectedLotes.filter((l) => l.id !== sublote.id));
    } else {
      // Verifica se já existe um sublote relacionado (pai/filho) selecionado
      const { isRelated, relatedCode } = isRelatedToSelected(sublote);
      if (isRelated) {
        toast({
          title: "Sublote relacionado já selecionado",
          description: `O lote "${sublote.codigo}" é parte do mesmo material que "${relatedCode}". Não é possível selecionar ambos.`,
          variant: "destructive",
        });
        return;
      }
      setSelectedLotes([...selectedLotes, sublote]);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (selectedLotes.length === 0) throw new Error("Selecione ao menos um lote");

      const codigo = `BEN-${format(new Date(), "yyyyMMdd")}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;

      // Criar beneficiamento
      const { data: beneficiamento, error: benError } = await supabase
        .from("beneficiamentos")
        .insert({
          codigo,
          processo_id: formData.processo_id || null,
          tipo_beneficiamento: formData.tipo_beneficiamento,
          fornecedor_terceiro_id: formData.fornecedor_terceiro_id || null,
          custo_frete_ida: formData.custo_frete_ida_kg * pesoTotalEntrada,
          custo_frete_volta: formData.custo_frete_volta_kg * pesoTotalEntrada,
          custo_mo_terceiro: formData.custo_mo_terceiro_kg * pesoTotalEntrada,
          custo_mo_ibrac: formData.custo_mo_ibrac_kg * pesoTotalEntrada,
          taxa_financeira_pct: formData.taxa_financeira_pct,
          perda_real_pct: formData.perda_real_pct,
          perda_cobrada_pct: formData.perda_cobrada_pct,
          peso_entrada_kg: pesoTotalEntrada,
          peso_saida_kg: pesoSaidaEstimado,
          transportadora_id: formData.transportadora_id || null,
          motorista: formData.motorista || null,
          placa_veiculo: formData.placa_veiculo || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (benError) throw benError;

      // Inserir itens de entrada
      for (const lote of selectedLotes) {
        const { error: itemError } = await supabase.from("beneficiamento_itens_entrada").insert({
          beneficiamento_id: beneficiamento.id,
          sublote_id: lote.id,
          peso_kg: lote.peso_kg,
          custo_unitario: custoTotalKg,
        });
        if (itemError) throw itemError;

        // Atualizar status do sublote
        const { error: updateError } = await supabase
          .from("sublotes")
          .update({ status: "em_beneficiamento" })
          .eq("id", lote.id);
        if (updateError) throw updateError;
      }

      return beneficiamento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiamentos"] });
      queryClient.invalidateQueries({ queryKey: ["sublotes_disponiveis"] });
      setIsOpen(false);
      setSelectedLotes([]);
      setFormData({
        processo_id: "",
        tipo_beneficiamento: "interno",
        fornecedor_terceiro_id: "",
        tipo_produto_saida_id: "",
        custo_frete_ida_kg: 0,
        custo_frete_volta_kg: 0,
        custo_mo_terceiro_kg: 0,
        custo_mo_ibrac_kg: 0,
        taxa_financeira_pct: 1.8,
        perda_real_pct: 3,
        perda_cobrada_pct: 5,
        transportadora_id: "",
        motorista: "",
        placa_veiculo: "",
      });
      setActiveTab("lotes");
      toast({ title: "Beneficiamento criado!", description: `${selectedLotes.length} lote(s) enviado(s) para beneficiamento` });
    },
    onError: (error) => toast({ title: "Erro ao criar beneficiamento", description: error.message, variant: "destructive" }),
  });

  const handleClose = () => {
    setIsOpen(false);
    setSelectedLotes([]);
    setActiveTab("lotes");
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Beneficiamento</h1>
            <p className="text-muted-foreground">Gerencie os processos de beneficiamento de materiais</p>
          </div>
          <Dialog open={isOpen} onOpenChange={(v) => v ? setIsOpen(true) : handleClose()}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-copper"><Plus className="h-4 w-4 mr-2" />Novo Beneficiamento</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Beneficiamento</DialogTitle>
              </DialogHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="lotes">1. Lotes</TabsTrigger>
                  <TabsTrigger value="config">2. Configuração</TabsTrigger>
                  <TabsTrigger value="custos">3. Custos</TabsTrigger>
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sublotesFiltrados.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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
                            <p className="text-2xl font-bold text-primary">{formatWeight(pesoTotalEntrada)}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setSelectedLotes([])}>
                            <Trash2 className="h-4 w-4 mr-2" />Limpar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Button className="w-full" onClick={() => setActiveTab("config")} disabled={selectedLotes.length === 0}>
                    Próximo: Configuração
                  </Button>
                </TabsContent>

                {/* Tab 2: Configuração */}
                <TabsContent value="config" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de Beneficiamento</Label>
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

                  {formData.tipo_beneficiamento === "externo" && (
                    <div className="space-y-2">
                      <Label>Fornecedor Terceiro</Label>
                      <Select value={formData.fornecedor_terceiro_id} onValueChange={(v) => setFormData({ ...formData, fornecedor_terceiro_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {fornecedores.map((f) => (
                            <SelectItem key={f.id} value={f.id}>{f.razao_social}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Produto de Saída (Transformação)</Label>
                    <Select value={formData.tipo_produto_saida_id} onValueChange={(v) => setFormData({ ...formData, tipo_produto_saida_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione o produto resultante..." /></SelectTrigger>
                      <SelectContent>
                        {tiposProduto.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">O material de entrada será transformado neste produto</p>
                  </div>

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
                          <Label>Perda Cobrada do Cliente (%)</Label>
                          <Input type="number" step="0.01" value={formData.perda_cobrada_pct} onChange={(e) => setFormData({ ...formData, perda_cobrada_pct: parseFloat(e.target.value) || 0 })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">Peso Saída Estimado</p>
                          <p className="font-bold">{formatWeight(pesoSaidaEstimado)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Lucro IBRAC na Perda</p>
                          <p className={`font-bold ${lucroPerda > 0 ? "text-success" : "text-destructive"}`}>{lucroPerda.toFixed(2)}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Button className="w-full" onClick={() => setActiveTab("custos")}>
                    Próximo: Custos
                  </Button>
                </TabsContent>

                {/* Tab 3: Custos */}
                <TabsContent value="custos" className="space-y-4 pt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" />Custos (R$/kg)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Frete Ida (R$/kg)</Label>
                          <Input type="number" step="0.01" value={formData.custo_frete_ida_kg} onChange={(e) => setFormData({ ...formData, custo_frete_ida_kg: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Frete Volta (R$/kg)</Label>
                          <Input type="number" step="0.01" value={formData.custo_frete_volta_kg} onChange={(e) => setFormData({ ...formData, custo_frete_volta_kg: parseFloat(e.target.value) || 0 })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>MO Terceiro (R$/kg)</Label>
                          <Input type="number" step="0.01" value={formData.custo_mo_terceiro_kg} onChange={(e) => setFormData({ ...formData, custo_mo_terceiro_kg: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div className="space-y-2">
                          <Label>MO IBRAC (R$/kg)</Label>
                          <Input type="number" step="0.01" value={formData.custo_mo_ibrac_kg} onChange={(e) => setFormData({ ...formData, custo_mo_ibrac_kg: parseFloat(e.target.value) || 0 })} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Taxa Financeira (%)</Label>
                        <Input type="number" step="0.01" value={formData.taxa_financeira_pct} onChange={(e) => setFormData({ ...formData, taxa_financeira_pct: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/30">
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex justify-between">
                        <span>Custo por kg:</span>
                        <span className="font-bold">{formatCurrency(custoTotalKg)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Custo Total ({formatWeight(pesoTotalEntrada)}):</span>
                        <span className="font-bold text-primary">{formatCurrency(custoTotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>+ Taxa Financeira:</span>
                        <span>{formatCurrency(custoFinanceiro)}</span>
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
                  <Card className="border-primary">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Resumo do Beneficiamento</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Lotes Selecionados:</span>
                        <span className="font-bold">{selectedLotes.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Peso Entrada:</span>
                        <span className="font-bold">{formatWeight(pesoTotalEntrada)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Peso Saída Estimado:</span>
                        <span className="font-bold">{formatWeight(pesoSaidaEstimado)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Custo Total:</span>
                        <span className="font-bold text-primary">{formatCurrency(custoTotal + custoFinanceiro)}</span>
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
                  Criar Beneficiamento
                </Button>
              </DialogFooter>
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
                  <TableHead className="w-12"></TableHead>
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
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setRomaneioBeneficiamento(b)}>
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

        {/* Romaneio Print Dialog */}
        {romaneioBeneficiamento && (
          <BeneficiamentoRomaneioPrint
            beneficiamento={romaneioBeneficiamento}
            isOpen={!!romaneioBeneficiamento}
            onClose={() => setRomaneioBeneficiamento(null)}
          />
        )}
      </div>
    </MainLayout>
  );
}

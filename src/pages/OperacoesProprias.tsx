import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2, FileText, Package, Cog, TrendingUp } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { formatWeight, formatCurrency } from "@/lib/kpis";

export default function OperacoesProprias() {
  const queryClient = useQueryClient();
  const { user, role } = useAuth();
  const canEdit = role === "admin" || role === "operacao";
  
  const [activeTab, setActiveTab] = useState("operacoes");
  const [isNewOperacao, setIsNewOperacao] = useState(false);
  const [selectedOperacao, setSelectedOperacao] = useState<string | null>(null);
  
  // Formulários
  const [operacaoForm, setOperacaoForm] = useState({
    nome: "",
    beneficiador_id: "",
    perda_mel_default: 5,
    perda_mista_default: 10,
    benchmark_vergalhao_default: 0,
    obs: "",
  });
  
  const [entradaForm, setEntradaForm] = useState({
    ticket_num: "",
    nf_num: "",
    procedencia: "",
    dt_emissao: format(new Date(), "yyyy-MM-dd"),
    dt_recebimento: format(new Date(), "yyyy-MM-dd"),
    ticket_mel_kg: 0,
    ticket_mista_kg: 0,
    perda_mel_pct: 5,
    perda_mista_pct: 10,
    valor_unit_sucata_rkg: 0,
    moagem_val: 0,
    moagem_mode: "RKG",
    frete_ida_moagem_val: 0,
    frete_ida_moagem_mode: "RKG",
    frete_volta_moagem_val: 0,
    frete_volta_moagem_mode: "RKG",
    financeiro_val: 0,
    financeiro_mode: "RKG",
  });

  // Queries
  const { data: operacoes = [], isLoading: loadingOperacoes } = useQuery({
    queryKey: ["operacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operacoes")
        .select(`*, beneficiador:parceiros!operacoes_beneficiador_id_fkey(razao_social, nome_fantasia)`)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: entradas = [], isLoading: loadingEntradas } = useQuery({
    queryKey: ["entradas_c1", selectedOperacao],
    queryFn: async () => {
      if (!selectedOperacao) return [];
      const { data, error } = await supabase
        .from("entradas_c1")
        .select("*")
        .eq("operacao_id", selectedOperacao)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedOperacao,
  });

  const { data: beneficiamentos = [] } = useQuery({
    queryKey: ["beneficiamentos_c1", selectedOperacao],
    queryFn: async () => {
      if (!selectedOperacao) return [];
      const { data, error } = await supabase
        .from("beneficiamentos_c1")
        .select("*")
        .eq("operacao_id", selectedOperacao)
        .eq("is_deleted", false)
        .order("dt", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedOperacao,
  });

  const { data: saidas = [] } = useQuery({
    queryKey: ["saidas_c1", selectedOperacao],
    queryFn: async () => {
      if (!selectedOperacao) return [];
      const { data, error } = await supabase
        .from("saidas_c1")
        .select(`*, parceiro:parceiros!saidas_c1_parceiro_destino_id_fkey(razao_social)`)
        .eq("operacao_id", selectedOperacao)
        .eq("is_deleted", false)
        .order("dt", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedOperacao,
  });

  const { data: parceiros = [] } = useQuery({
    queryKey: ["parceiros"],
    queryFn: async () => {
      const { data, error } = await supabase.from("parceiros").select("*").eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  const beneficiadores = parceiros.filter(p => p.tipo === "BENEFICIADOR" || p.is_fornecedor);

  // Mutations
  const createOperacao = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("operacoes").insert({
        nome: operacaoForm.nome,
        beneficiador_id: operacaoForm.beneficiador_id,
        perda_mel_default: operacaoForm.perda_mel_default / 100,
        perda_mista_default: operacaoForm.perda_mista_default / 100,
        benchmark_vergalhao_default: operacaoForm.benchmark_vergalhao_default || null,
        obs: operacaoForm.obs || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operacoes"] });
      setIsNewOperacao(false);
      setOperacaoForm({ nome: "", beneficiador_id: "", perda_mel_default: 5, perda_mista_default: 10, benchmark_vergalhao_default: 0, obs: "" });
      toast({ title: "Operação criada com sucesso!" });
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const createEntrada = useMutation({
    mutationFn: async () => {
      if (!selectedOperacao) throw new Error("Selecione uma operação");
      const { error } = await supabase.from("entradas_c1").insert({
        operacao_id: selectedOperacao,
        ...entradaForm,
        perda_mel_pct: entradaForm.perda_mel_pct / 100,
        perda_mista_pct: entradaForm.perda_mista_pct / 100,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entradas_c1"] });
      toast({ title: "Entrada registrada!" });
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  // Calcular totais da operação selecionada
  const operacaoSelecionada = operacoes.find(o => o.id === selectedOperacao);
  const totaisOperacao = {
    kgComprado: entradas.reduce((acc, e) => acc + (e.kg_ticket || 0), 0),
    kgLiquido: entradas.reduce((acc, e) => acc + (e.kg_liquido_total || 0), 0),
    kgDisponivel: entradas.reduce((acc, e) => acc + (e.kg_liquido_disponivel || 0), 0),
    custoTotal: entradas.reduce((acc, e) => acc + (e.custos_pre_total_rs || 0), 0),
    kgBeneficiado: beneficiamentos.reduce((acc, b) => acc + (b.kg_retornado || 0), 0),
    kgDisponivelVenda: beneficiamentos.reduce((acc, b) => acc + (b.kg_disponivel || 0), 0),
    kgVendido: saidas.reduce((acc, s) => acc + (s.kg_saida || 0), 0),
    receitaTotal: saidas.reduce((acc, s) => acc + (s.receita_simulada_rs || 0), 0),
    resultadoTotal: saidas.reduce((acc, s) => acc + (s.resultado_simulado_rs || 0), 0),
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cenário 1 - Material Próprio</h1>
            <p className="text-muted-foreground">Gestão de operações com material próprio IBRAC</p>
          </div>
          <Dialog open={isNewOperacao} onOpenChange={setIsNewOperacao}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-copper">
                <Plus className="mr-2 h-4 w-4" />
                Nova Operação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Operação</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome da Operação</Label>
                  <Input
                    value={operacaoForm.nome}
                    onChange={(e) => setOperacaoForm({ ...operacaoForm, nome: e.target.value })}
                    placeholder="Ex: Compra Fornecedor X - Jan/2025"
                  />
                </div>
                <div>
                  <Label>Beneficiador</Label>
                  <Select
                    value={operacaoForm.beneficiador_id}
                    onValueChange={(v) => setOperacaoForm({ ...operacaoForm, beneficiador_id: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {beneficiadores.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.nome_fantasia || b.razao_social}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Perda MEL Padrão (%)</Label>
                    <Input
                      type="number"
                      value={operacaoForm.perda_mel_default}
                      onChange={(e) => setOperacaoForm({ ...operacaoForm, perda_mel_default: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Perda Mista Padrão (%)</Label>
                    <Input
                      type="number"
                      value={operacaoForm.perda_mista_default}
                      onChange={(e) => setOperacaoForm({ ...operacaoForm, perda_mista_default: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Benchmark Vergalhão (R$/kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={operacaoForm.benchmark_vergalhao_default}
                    onChange={(e) => setOperacaoForm({ ...operacaoForm, benchmark_vergalhao_default: Number(e.target.value) })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewOperacao(false)}>Cancelar</Button>
                <Button onClick={() => createOperacao.mutate()} disabled={!operacaoForm.nome || !operacaoForm.beneficiador_id}>
                  Criar Operação
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Lista de Operações */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Operações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingOperacoes ? (
                <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : operacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma operação cadastrada</p>
              ) : (
                operacoes.map((op) => (
                  <button
                    key={op.id}
                    onClick={() => setSelectedOperacao(op.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedOperacao === op.id 
                        ? "bg-primary/10 border-primary" 
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="font-medium">{op.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {op.beneficiador?.nome_fantasia || op.beneficiador?.razao_social}
                    </div>
                    <Badge variant={op.status === "ABERTA" ? "default" : "secondary"} className="mt-1">
                      {op.status}
                    </Badge>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Detalhe da Operação */}
          <div className="lg:col-span-3 space-y-6">
            {!selectedOperacao ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Selecione uma operação para ver os detalhes
                </CardContent>
              </Card>
            ) : (
              <>
                {/* KPIs da Operação */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Kg Comprado</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatWeight(totaisOperacao.kgComprado)}</div>
                      <p className="text-xs text-muted-foreground">Líquido: {formatWeight(totaisOperacao.kgLiquido)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Custo Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(totaisOperacao.custoTotal)}</div>
                      <p className="text-xs text-muted-foreground">
                        R$ {totaisOperacao.kgLiquido > 0 ? (totaisOperacao.custoTotal / totaisOperacao.kgLiquido).toFixed(2) : "0.00"}/kg
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Kg Beneficiado</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatWeight(totaisOperacao.kgBeneficiado)}</div>
                      <p className="text-xs text-muted-foreground">Disponível: {formatWeight(totaisOperacao.kgDisponivelVenda)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Resultado</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${totaisOperacao.resultadoTotal >= 0 ? "text-success" : "text-destructive"}`}>
                        {formatCurrency(totaisOperacao.resultadoTotal)}
                      </div>
                      <p className="text-xs text-muted-foreground">Receita: {formatCurrency(totaisOperacao.receitaTotal)}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabs de Entradas, Beneficiamentos, Saídas */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="entradas" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Entradas ({entradas.length})
                    </TabsTrigger>
                    <TabsTrigger value="beneficiamentos" className="flex items-center gap-2">
                      <Cog className="h-4 w-4" /> Beneficiamentos ({beneficiamentos.length})
                    </TabsTrigger>
                    <TabsTrigger value="saidas" className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> Saídas ({saidas.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="entradas" className="mt-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Entradas de Sucata</CardTitle>
                        <Button size="sm" disabled={!canEdit}>
                          <Plus className="mr-2 h-4 w-4" /> Nova Entrada
                        </Button>
                      </CardHeader>
                      <CardContent>
                        {loadingEntradas ? (
                          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                        ) : entradas.length === 0 ? (
                          <p className="text-center py-8 text-muted-foreground">Nenhuma entrada registrada</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Ticket</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead className="text-right">Kg Ticket</TableHead>
                                <TableHead className="text-right">Kg Líquido</TableHead>
                                <TableHead className="text-right">Custo R$/kg</TableHead>
                                <TableHead className="text-right">Custo Total</TableHead>
                                <TableHead className="text-right">Saldo</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {entradas.map((e) => (
                                <TableRow key={e.id}>
                                  <TableCell className="font-medium">{e.ticket_num || e.nf_num || "-"}</TableCell>
                                  <TableCell>{format(new Date(e.dt_recebimento || e.created_at), "dd/MM/yy")}</TableCell>
                                  <TableCell className="text-right">{formatWeight(e.kg_ticket || 0)}</TableCell>
                                  <TableCell className="text-right">{formatWeight(e.kg_liquido_total || 0)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(e.custo_unit_pre_rkg || 0)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(e.custos_pre_total_rs || 0)}</TableCell>
                                  <TableCell className="text-right">
                                    <Badge variant={e.kg_liquido_disponivel > 0 ? "default" : "secondary"}>
                                      {formatWeight(e.kg_liquido_disponivel || 0)}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="beneficiamentos" className="mt-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Beneficiamentos</CardTitle>
                        <Button size="sm" disabled={!canEdit || totaisOperacao.kgDisponivel === 0}>
                          <Plus className="mr-2 h-4 w-4" /> Novo Beneficiamento
                        </Button>
                      </CardHeader>
                      <CardContent>
                        {beneficiamentos.length === 0 ? (
                          <p className="text-center py-8 text-muted-foreground">Nenhum beneficiamento registrado</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Documento</TableHead>
                                <TableHead className="text-right">Kg Retornado</TableHead>
                                <TableHead className="text-right">Custo Benef.</TableHead>
                                <TableHead className="text-right">Custo Real/kg</TableHead>
                                <TableHead className="text-right">Saldo</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {beneficiamentos.map((b) => (
                                <TableRow key={b.id}>
                                  <TableCell>{format(new Date(b.dt), "dd/MM/yy")}</TableCell>
                                  <TableCell>{b.documento || "-"}</TableCell>
                                  <TableCell className="text-right">{formatWeight(b.kg_retornado)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(b.custos_benef_total_rs || 0)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(b.custo_real_rkg || 0)}</TableCell>
                                  <TableCell className="text-right">
                                    <Badge variant={b.kg_disponivel > 0 ? "default" : "secondary"}>
                                      {formatWeight(b.kg_disponivel || 0)}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="saidas" className="mt-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Saídas (Vendas)</CardTitle>
                        <Button size="sm" disabled={!canEdit || totaisOperacao.kgDisponivelVenda === 0}>
                          <Plus className="mr-2 h-4 w-4" /> Nova Saída
                        </Button>
                      </CardHeader>
                      <CardContent>
                        {saidas.length === 0 ? (
                          <p className="text-center py-8 text-muted-foreground">Nenhuma saída registrada</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead className="text-right">Kg</TableHead>
                                <TableHead className="text-right">Receita</TableHead>
                                <TableHead className="text-right">Custo</TableHead>
                                <TableHead className="text-right">Resultado</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {saidas.map((s) => (
                                <TableRow key={s.id}>
                                  <TableCell>{format(new Date(s.dt), "dd/MM/yy")}</TableCell>
                                  <TableCell><Badge variant="outline">{s.tipo_saida}</Badge></TableCell>
                                  <TableCell>{s.parceiro?.razao_social || "-"}</TableCell>
                                  <TableCell className="text-right">{formatWeight(s.kg_saida)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(s.receita_simulada_rs || 0)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(s.custo_saida_rs || 0)}</TableCell>
                                  <TableCell className="text-right">
                                    <span className={s.resultado_simulado_rs >= 0 ? "text-success" : "text-destructive"}>
                                      {formatCurrency(s.resultado_simulado_rs || 0)}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

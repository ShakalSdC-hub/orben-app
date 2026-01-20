import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2, FileText, Cog, TrendingUp, Users, Pencil } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { formatWeight, formatCurrency } from "@/lib/kpis";
import { EntradaTerceirosForm } from "@/components/operacoes/EntradaTerceirosForm";
import { BeneficiamentoTerceirosForm } from "@/components/operacoes/BeneficiamentoTerceirosForm";
import { SaidaTerceirosForm } from "@/components/operacoes/SaidaTerceirosForm";
import { CobrancaTerceirosForm } from "@/components/operacoes/CobrancaTerceirosForm";

export default function OperacoesTerceiros() {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const canEdit = role === "admin" || role === "operacao";
  
  const [activeTab, setActiveTab] = useState("operacoes");
  const [isNewOperacao, setIsNewOperacao] = useState(false);
  const [selectedOperacao, setSelectedOperacao] = useState<string | null>(null);
  const [showEntradaForm, setShowEntradaForm] = useState(false);
  const [showBenefForm, setShowBenefForm] = useState(false);
  const [showSaidaForm, setShowSaidaForm] = useState(false);
  const [showCobrancaForm, setShowCobrancaForm] = useState(false);
  
  // Edit states
  const [editEntrada, setEditEntrada] = useState<any>(null);
  const [editBenef, setEditBenef] = useState<any>(null);
  const [editSaida, setEditSaida] = useState<any>(null);
  const [editCobranca, setEditCobranca] = useState<any>(null);
  
  const [operacaoForm, setOperacaoForm] = useState({
    nome: "",
    cliente_id: "",
    beneficiador_id: "",
    perda_comercial_val: 5,
    perda_comercial_mode: "PCT",
    valor_ref_material_rkg: 0,
    obs: "",
  });

  // Queries
  const { data: operacoes = [], isLoading: loadingOperacoes } = useQuery({
    queryKey: ["operacoes_terceiros"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operacoes_terceiros")
        .select(`
          *, 
          cliente:parceiros!operacoes_terceiros_cliente_id_fkey(razao_social, nome_fantasia),
          beneficiador:parceiros!operacoes_terceiros_beneficiador_id_fkey(razao_social, nome_fantasia)
        `)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: entradas = [] } = useQuery({
    queryKey: ["entradas_terceiros", selectedOperacao],
    queryFn: async () => {
      if (!selectedOperacao) return [];
      const { data, error } = await supabase
        .from("entradas_terceiros")
        .select("*, produto:produtos_terceiros(nome, codigo)")
        .eq("operacao_id", selectedOperacao)
        .eq("is_deleted", false)
        .order("dt", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedOperacao,
  });

  const { data: beneficiamentos = [] } = useQuery({
    queryKey: ["beneficiamentos_terceiros", selectedOperacao],
    queryFn: async () => {
      if (!selectedOperacao) return [];
      const { data, error } = await supabase
        .from("beneficiamentos_terceiros")
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
    queryKey: ["saidas_terceiros", selectedOperacao],
    queryFn: async () => {
      if (!selectedOperacao) return [];
      const { data, error } = await supabase
        .from("saidas_terceiros")
        .select("*")
        .eq("operacao_id", selectedOperacao)
        .eq("is_deleted", false)
        .order("dt", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedOperacao,
  });

  const { data: cobrancas = [] } = useQuery({
    queryKey: ["cobrancas_terceiros", selectedOperacao],
    queryFn: async () => {
      if (!selectedOperacao) return [];
      const { data, error } = await supabase
        .from("cobrancas_servico_terceiros")
        .select("*")
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

  const clientes = parceiros.filter(p => p.is_cliente);
  const beneficiadores = parceiros.filter(p => p.tipo === "BENEFICIADOR" || p.is_fornecedor);

  // Mutations
  const createOperacao = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("operacoes_terceiros").insert({
        nome: operacaoForm.nome,
        cliente_id: operacaoForm.cliente_id,
        beneficiador_id: operacaoForm.beneficiador_id,
        perda_comercial_val: operacaoForm.perda_comercial_mode === "PCT" 
          ? operacaoForm.perda_comercial_val / 100 
          : operacaoForm.perda_comercial_val,
        perda_comercial_mode: operacaoForm.perda_comercial_mode,
        valor_ref_material_rkg: operacaoForm.valor_ref_material_rkg || null,
        obs: operacaoForm.obs || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operacoes_terceiros"] });
      setIsNewOperacao(false);
      toast({ title: "Operação criada!" });
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  // Totais
  const totais = {
    kgRecebido: entradas.reduce((acc, e) => acc + (e.kg_recebido || 0), 0),
    kgDisponivel: entradas.reduce((acc, e) => acc + (e.kg_disponivel || 0), 0),
    kgBeneficiado: beneficiamentos.reduce((acc, b) => acc + (b.kg_retornado || 0), 0),
    kgDisponivelCliente: beneficiamentos.reduce((acc, b) => acc + (b.kg_disponivel_cliente || 0), 0),
    custoServico: beneficiamentos.reduce((acc, b) => acc + (b.custos_servico_total_rs || 0), 0),
    kgDevolvido: saidas.reduce((acc, s) => acc + (s.kg_devolvido || 0), 0),
    receitaServico: saidas.reduce((acc, s) => acc + (s.custo_servico_saida_rs || 0), 0),
  };

  // Função para calcular valor total de uma cobrança
  const calcularTotalCobranca = (c: any) => {
    const val = c.val || 0;
    if (c.mode === 'TOTAL') return val;
    
    // mode === 'RKG' - valor por kg
    let baseKg = 0;
    if (c.base_kg_mode === 'DEVOLVIDO') baseKg = totais.kgDevolvido;
    else if (c.base_kg_mode === 'RECEBIDO') baseKg = totais.kgRecebido;
    else if (c.base_kg_mode === 'BENEFICIADO') baseKg = totais.kgBeneficiado;
    else baseKg = totais.kgDevolvido; // default
    
    return val * baseKg;
  };

  const handleEditEntrada = (entrada: any) => {
    setEditEntrada(entrada);
    setShowEntradaForm(true);
  };

  const handleEditBenef = (benef: any) => {
    setEditBenef(benef);
    setShowBenefForm(true);
  };

  const handleEditSaida = (saida: any) => {
    setEditSaida(saida);
    setShowSaidaForm(true);
  };

  const handleEditCobranca = (cobranca: any) => {
    setEditCobranca(cobranca);
    setShowCobrancaForm(true);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cenário 2 - Serviço p/ Terceiros</h1>
            <p className="text-muted-foreground">Industrialização para clientes (material deles)</p>
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
                <DialogTitle>Nova Operação de Serviço</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome da Operação</Label>
                  <Input
                    value={operacaoForm.nome}
                    onChange={(e) => setOperacaoForm({ ...operacaoForm, nome: e.target.value })}
                    placeholder="Ex: Industrialização Cliente Y - Jan/2025"
                  />
                </div>
                <div>
                  <Label>Cliente</Label>
                  <Select
                    value={operacaoForm.cliente_id}
                    onValueChange={(v) => setOperacaoForm({ ...operacaoForm, cliente_id: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione o cliente..." /></SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <Label>Perda Comercial</Label>
                    <Input
                      type="number"
                      value={operacaoForm.perda_comercial_val}
                      onChange={(e) => setOperacaoForm({ ...operacaoForm, perda_comercial_val: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Modo</Label>
                    <Select
                      value={operacaoForm.perda_comercial_mode}
                      onValueChange={(v) => setOperacaoForm({ ...operacaoForm, perda_comercial_mode: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PCT">% (Percentual)</SelectItem>
                        <SelectItem value="KG">kg (Fixo)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Valor Ref. Material (R$/kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={operacaoForm.valor_ref_material_rkg}
                    onChange={(e) => setOperacaoForm({ ...operacaoForm, valor_ref_material_rkg: Number(e.target.value) })}
                    placeholder="Para cálculo de ganho IBRAC"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewOperacao(false)}>Cancelar</Button>
                <Button onClick={() => createOperacao.mutate()} disabled={!operacaoForm.nome || !operacaoForm.cliente_id || !operacaoForm.beneficiador_id}>
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
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" /> Operações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingOperacoes ? (
                <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : operacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma operação</p>
              ) : (
                operacoes.map((op) => (
                  <button
                    key={op.id}
                    onClick={() => setSelectedOperacao(op.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedOperacao === op.id ? "bg-primary/10 border-primary" : "hover:bg-muted"
                    }`}
                  >
                    <div className="font-medium">{op.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      Cliente: {op.cliente?.nome_fantasia || op.cliente?.razao_social}
                    </div>
                    <Badge variant={op.status === "ABERTA" ? "default" : "secondary"} className="mt-1">
                      {op.status}
                    </Badge>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Detalhe */}
          <div className="lg:col-span-3 space-y-6">
            {!selectedOperacao ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Selecione uma operação para ver os detalhes
                </CardContent>
              </Card>
            ) : (
              <>
                {/* KPIs */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Kg Recebido</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatWeight(totais.kgRecebido)}</div>
                      <p className="text-xs text-muted-foreground">Disponível: {formatWeight(totais.kgDisponivel)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Kg Beneficiado</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatWeight(totais.kgBeneficiado)}</div>
                      <p className="text-xs text-muted-foreground">P/ Cliente: {formatWeight(totais.kgDisponivelCliente)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Custo Serviço</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(totais.custoServico)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Receita Serviço</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-success">{formatCurrency(totais.receitaServico)}</div>
                      <p className="text-xs text-muted-foreground">Devolvido: {formatWeight(totais.kgDevolvido)}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="entradas"><FileText className="h-4 w-4 mr-1" /> Recebimentos</TabsTrigger>
                    <TabsTrigger value="beneficiamentos"><Cog className="h-4 w-4 mr-1" /> Beneficiamentos</TabsTrigger>
                    <TabsTrigger value="saidas"><TrendingUp className="h-4 w-4 mr-1" /> Devoluções</TabsTrigger>
                    <TabsTrigger value="cobrancas">Cobranças</TabsTrigger>
                  </TabsList>

                  <TabsContent value="entradas" className="mt-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Recebimentos do Cliente</CardTitle>
                        <Button size="sm" disabled={!canEdit} onClick={() => { setEditEntrada(null); setShowEntradaForm(true); }}><Plus className="mr-2 h-4 w-4" /> Novo</Button>
                      </CardHeader>
                      <CardContent>
                        {entradas.length === 0 ? (
                          <p className="text-center py-8 text-muted-foreground">Nenhum recebimento</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Produto</TableHead>
                                <TableHead>Documento</TableHead>
                                <TableHead className="text-right">Kg Recebido</TableHead>
                                <TableHead className="text-right">Saldo</TableHead>
                                <TableHead className="w-10"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {entradas.map((e) => (
                                <TableRow key={e.id}>
                                  <TableCell>{format(new Date(e.dt), "dd/MM/yy")}</TableCell>
                                  <TableCell>
                                    {e.produto ? (
                                      <Badge variant="outline">
                                        {e.produto.codigo || e.produto.nome}
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell>{e.documento || "-"}</TableCell>
                                  <TableCell className="text-right">{formatWeight(e.kg_recebido)}</TableCell>
                                  <TableCell className="text-right">
                                    <Badge variant={e.kg_disponivel > 0 ? "default" : "secondary"}>
                                      {formatWeight(e.kg_disponivel || 0)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {canEdit && (
                                      <Button variant="ghost" size="icon" onClick={() => handleEditEntrada(e)}>
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    )}
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
                        <Button size="sm" disabled={!canEdit || totais.kgDisponivel === 0} onClick={() => { setEditBenef(null); setShowBenefForm(true); }}><Plus className="mr-2 h-4 w-4" /> Novo</Button>
                      </CardHeader>
                      <CardContent>
                        {beneficiamentos.length === 0 ? (
                          <p className="text-center py-8 text-muted-foreground">Nenhum beneficiamento</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Documento</TableHead>
                                <TableHead className="text-right">Kg Entrada</TableHead>
                                <TableHead className="text-right">Perda</TableHead>
                                <TableHead className="text-right">Kg Retornado</TableHead>
                                <TableHead className="text-right">Custo Serviço</TableHead>
                                <TableHead className="text-right">Saldo Cliente</TableHead>
                                <TableHead className="w-10"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {beneficiamentos.map((b) => {
                                const perdaRealPct = b.perda_real_pct ? (b.perda_real_pct * 100).toFixed(1) : "0.0";
                                return (
                                  <TableRow key={b.id}>
                                    <TableCell>{format(new Date(b.dt), "dd/MM/yy")}</TableCell>
                                    <TableCell>{b.documento || "-"}</TableCell>
                                    <TableCell className="text-right">{formatWeight(b.kg_entrada || 0)}</TableCell>
                                    <TableCell className="text-right">
                                      <span className="text-destructive">{perdaRealPct}%</span>
                                    </TableCell>
                                    <TableCell className="text-right">{formatWeight(b.kg_retornado)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(b.custos_servico_total_rs || 0)}</TableCell>
                                    <TableCell className="text-right">
                                      <Badge variant={b.kg_disponivel_cliente > 0 ? "default" : "secondary"}>
                                        {formatWeight(b.kg_disponivel_cliente || 0)}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {canEdit && (
                                        <Button variant="ghost" size="icon" onClick={() => handleEditBenef(b)}>
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="saidas" className="mt-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Devoluções ao Cliente</CardTitle>
                        <Button size="sm" disabled={!canEdit || totais.kgDisponivelCliente === 0} onClick={() => { setEditSaida(null); setShowSaidaForm(true); }}><Plus className="mr-2 h-4 w-4" /> Nova</Button>
                      </CardHeader>
                      <CardContent>
                        {saidas.length === 0 ? (
                          <p className="text-center py-8 text-muted-foreground">Nenhuma devolução</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Documento</TableHead>
                                <TableHead className="text-right">Kg Devolvido</TableHead>
                                <TableHead className="text-right">Custo Serviço</TableHead>
                                <TableHead className="w-10"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {saidas.map((s) => (
                                <TableRow key={s.id}>
                                  <TableCell>{format(new Date(s.dt), "dd/MM/yy")}</TableCell>
                                  <TableCell>{s.documento || "-"}</TableCell>
                                  <TableCell className="text-right">{formatWeight(s.kg_devolvido)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(s.custo_servico_saida_rs || 0)}</TableCell>
                                  <TableCell>
                                    {canEdit && (
                                      <Button variant="ghost" size="icon" onClick={() => handleEditSaida(s)}>
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="cobrancas" className="mt-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Cobranças de Serviço</CardTitle>
                        <Button size="sm" disabled={!canEdit} onClick={() => { setEditCobranca(null); setShowCobrancaForm(true); }}><Plus className="mr-2 h-4 w-4" /> Nova</Button>
                      </CardHeader>
                      <CardContent>
                        {cobrancas.length === 0 ? (
                          <p className="text-center py-8 text-muted-foreground">Nenhuma cobrança</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Documento</TableHead>
                                <TableHead className="text-right">Valor Unit.</TableHead>
                                <TableHead>Modo/Base</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="w-10"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {cobrancas.map((c) => {
                                const totalCalculado = calcularTotalCobranca(c);
                                const modoLabel = c.mode === 'RKG' ? 'R$/kg' : 'Total';
                                const baseLabel = c.mode === 'RKG' ? (c.base_kg_mode || 'DEVOLVIDO') : '-';
                                
                                return (
                                  <TableRow key={c.id}>
                                    <TableCell>{format(new Date(c.dt), "dd/MM/yy")}</TableCell>
                                    <TableCell><Badge variant="outline">{c.tipo}</Badge></TableCell>
                                    <TableCell>{c.documento || "-"}</TableCell>
                                    <TableCell className="text-right">
                                      {c.mode === 'RKG' 
                                        ? `${formatCurrency(c.val || 0)}/kg` 
                                        : formatCurrency(c.val || 0)}
                                    </TableCell>
                                    <TableCell>
                                      <span className="text-xs text-muted-foreground">
                                        {modoLabel}{c.mode === 'RKG' && ` × ${baseLabel.toLowerCase()}`}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-success">
                                      {formatCurrency(totalCalculado)}
                                    </TableCell>
                                    <TableCell>
                                      {canEdit && (
                                        <Button variant="ghost" size="icon" onClick={() => handleEditCobranca(c)}>
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
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

        {/* Forms */}
        {selectedOperacao && (
          <>
            <EntradaTerceirosForm 
              open={showEntradaForm} 
              onOpenChange={(open) => { setShowEntradaForm(open); if (!open) setEditEntrada(null); }} 
              operacaoId={selectedOperacao}
              editData={editEntrada}
            />
            <BeneficiamentoTerceirosForm 
              open={showBenefForm} 
              onOpenChange={(open) => { setShowBenefForm(open); if (!open) setEditBenef(null); }} 
              operacaoId={selectedOperacao}
              kgDisponivel={totais.kgDisponivel}
              editData={editBenef}
            />
            <SaidaTerceirosForm 
              open={showSaidaForm} 
              onOpenChange={(open) => { setShowSaidaForm(open); if (!open) setEditSaida(null); }} 
              operacaoId={selectedOperacao}
              kgDisponivel={totais.kgDisponivelCliente}
              editData={editSaida}
            />
            <CobrancaTerceirosForm 
              open={showCobrancaForm} 
              onOpenChange={(open) => { setShowCobrancaForm(open); if (!open) setEditCobranca(null); }} 
              operacaoId={selectedOperacao}
              editData={editCobranca}
            />
          </>
        )}
      </div>
    </MainLayout>
  );
}

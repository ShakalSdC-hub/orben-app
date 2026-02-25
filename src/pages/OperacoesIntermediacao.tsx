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
import { Plus, Loader2, ShoppingCart, Cog, TrendingUp, DollarSign, Handshake, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { formatWeight, formatCurrency } from "@/lib/kpis";
import { CompraIntermForm } from "@/components/operacoes/CompraIntermForm";
import { BeneficiamentoIntermForm } from "@/components/operacoes/BeneficiamentoIntermForm";
import { VendaIntermForm } from "@/components/operacoes/VendaIntermForm";
import { CustoIntermForm } from "@/components/operacoes/CustoIntermForm";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";

export default function OperacoesIntermediacao() {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const canEdit = role === "admin" || role === "operacao";
  const isAdmin = role === "admin";
  
  const [activeTab, setActiveTab] = useState("operacoes");
  const [isNewOperacao, setIsNewOperacao] = useState(false);
  const [selectedOperacao, setSelectedOperacao] = useState<string | null>(null);
  const [showCompraForm, setShowCompraForm] = useState(false);
  const [showBenefForm, setShowBenefForm] = useState(false);
  const [showVendaForm, setShowVendaForm] = useState(false);
  const [showCustoForm, setShowCustoForm] = useState(false);
  
  // Edit states
  const [editCompra, setEditCompra] = useState<any>(null);
  const [editBenef, setEditBenef] = useState<any>(null);
  const [editVenda, setEditVenda] = useState<any>(null);
  const [editCusto, setEditCusto] = useState<any>(null);

  // Delete states
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; label?: string } | null>(null);
  
  const [operacaoForm, setOperacaoForm] = useState({
    nome: "",
    dono_economico_id: "",
    comprador_operacional_id: "",
    beneficiador_id: "",
    comissao_val: 3,
    comissao_mode: "PCT",
    valor_ref_material_rkg: 0,
    obs: "",
  });

  // Queries
  const { data: operacoes = [], isLoading: loadingOperacoes } = useQuery({
    queryKey: ["operacoes_intermediacao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operacoes_intermediacao")
        .select(`
          *, 
          dono_economico:parceiros!operacoes_intermediacao_dono_economico_id_fkey(razao_social, nome_fantasia),
          comprador_operacional:parceiros!operacoes_intermediacao_comprador_operacional_id_fkey(razao_social, nome_fantasia),
          beneficiador:parceiros!operacoes_intermediacao_beneficiador_id_fkey(razao_social, nome_fantasia)
        `)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: compras = [] } = useQuery({
    queryKey: ["compras_intermediacao", selectedOperacao],
    queryFn: async () => {
      if (!selectedOperacao) return [];
      const { data, error } = await supabase
        .from("compras_intermediacao")
        .select(`*, fornecedor:parceiros!compras_intermediacao_fornecedor_compra_id_fkey(razao_social)`)
        .eq("operacao_id", selectedOperacao)
        .eq("is_deleted", false)
        .order("dt", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedOperacao,
  });

  const { data: beneficiamentos = [] } = useQuery({
    queryKey: ["beneficiamentos_intermediacao", selectedOperacao],
    queryFn: async () => {
      if (!selectedOperacao) return [];
      const { data, error } = await supabase
        .from("beneficiamentos_intermediacao")
        .select("*")
        .eq("operacao_id", selectedOperacao)
        .eq("is_deleted", false)
        .order("dt", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedOperacao,
  });

  const { data: vendas = [] } = useQuery({
    queryKey: ["vendas_intermediacao", selectedOperacao],
    queryFn: async () => {
      if (!selectedOperacao) return [];
      const { data, error } = await supabase
        .from("vendas_intermediacao")
        .select(`*, cliente:parceiros!vendas_intermediacao_cliente_id_fkey(razao_social)`)
        .eq("operacao_id", selectedOperacao)
        .eq("is_deleted", false)
        .order("dt", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedOperacao,
  });

  const { data: custos = [] } = useQuery({
    queryKey: ["custos_intermediacao", selectedOperacao],
    queryFn: async () => {
      if (!selectedOperacao) return [];
      const { data, error } = await supabase
        .from("custos_intermediacao")
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

  const donos = parceiros.filter(p => p.tipo === "DONO" || p.is_fornecedor);
  const beneficiadores = parceiros.filter(p => p.tipo === "BENEFICIADOR" || p.is_fornecedor);

  // Mutations
  const createOperacao = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("operacoes_intermediacao").insert({
        nome: operacaoForm.nome,
        dono_economico_id: operacaoForm.dono_economico_id,
        comprador_operacional_id: operacaoForm.comprador_operacional_id,
        beneficiador_id: operacaoForm.beneficiador_id,
        comissao_val: operacaoForm.comissao_mode === "PCT" 
          ? operacaoForm.comissao_val / 100 
          : operacaoForm.comissao_val,
        comissao_mode: operacaoForm.comissao_mode,
        valor_ref_material_rkg: operacaoForm.valor_ref_material_rkg || null,
        obs: operacaoForm.obs || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operacoes_intermediacao"] });
      setIsNewOperacao(false);
      toast({ title: "Operação criada!" });
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  // Delete mutations
  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      let table: string;
      switch (type) {
        case "compra": table = "compras_intermediacao"; break;
        case "benef": table = "beneficiamentos_intermediacao"; break;
        case "venda": table = "vendas_intermediacao"; break;
        case "custo": table = "custos_intermediacao"; break;
        default: throw new Error("Tipo inválido");
      }

      // Validação: compras com alocações em uso não podem ser excluídas
      if (type === "compra") {
        const compra = compras.find(c => c.id === id);
        if (compra && compra.kg_disponivel_compra !== compra.kg_comprado) {
          throw new Error("Esta compra possui kg alocados em beneficiamentos. Exclua os beneficiamentos primeiro.");
        }
      }

      // Validação: beneficiamentos com vendas alocadas não podem ser excluídos
      if (type === "benef") {
        const benef = beneficiamentos.find(b => b.id === id);
        if (benef && benef.kg_disponivel_venda !== benef.kg_retornado) {
          throw new Error("Este beneficiamento possui kg alocados em vendas. Exclua as vendas primeiro.");
        }
      }

      const { error } = await supabase.from(table as any).update({ is_deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compras_intermediacao"] });
      queryClient.invalidateQueries({ queryKey: ["beneficiamentos_intermediacao"] });
      queryClient.invalidateQueries({ queryKey: ["vendas_intermediacao"] });
      queryClient.invalidateQueries({ queryKey: ["custos_intermediacao"] });
      setDeleteTarget(null);
      toast({ title: "Registro excluído com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  // Totais
  const totais = {
    kgComprado: compras.reduce((acc, c) => acc + (c.kg_comprado || 0), 0),
    kgDisponivelCompra: compras.reduce((acc, c) => acc + (c.kg_disponivel_compra || 0), 0),
    valorCompras: compras.reduce((acc, c) => acc + (c.valor_compra_rs || 0), 0),
    kgBeneficiado: beneficiamentos.reduce((acc, b) => acc + (b.kg_retornado || 0), 0),
    kgDisponivelVenda: beneficiamentos.reduce((acc, b) => acc + (b.kg_disponivel_venda || 0), 0),
    custosBenef: beneficiamentos.reduce((acc, b) => acc + (b.custos_benef_total_rs || 0), 0),
    kgVendido: vendas.reduce((acc, v) => acc + (v.kg_vendido || 0), 0),
    receitaVendas: vendas.reduce((acc, v) => acc + (v.valor_venda_rs || 0), 0),
    comissaoIbrac: vendas.reduce((acc, v) => acc + (v.comissao_ibrac_rs || 0), 0),
    repasseDono: vendas.reduce((acc, v) => acc + (v.saldo_repassar_rs || 0), 0),
    outrosCustos: custos.reduce((acc, c) => acc + (c.val || 0), 0),
  };

  const handleEditCompra = (compra: any) => { setEditCompra(compra); setShowCompraForm(true); };
  const handleEditBenef = (benef: any) => { setEditBenef(benef); setShowBenefForm(true); };
  const handleEditVenda = (venda: any) => { setEditVenda(venda); setShowVendaForm(true); };
  const handleEditCusto = (custo: any) => { setEditCusto(custo); setShowCustoForm(true); };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cenário 3 - Intermediação</h1>
            <p className="text-muted-foreground">IBRAC compra e beneficia material de terceiros (dono econômico)</p>
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
                <DialogTitle>Nova Operação de Intermediação</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome da Operação</Label>
                  <Input
                    value={operacaoForm.nome}
                    onChange={(e) => setOperacaoForm({ ...operacaoForm, nome: e.target.value })}
                    placeholder="Ex: Operação Dono Z - Jan/2025"
                  />
                </div>
                <div>
                  <Label>Dono Econômico (recebe resultado)</Label>
                  <Select
                    value={operacaoForm.dono_economico_id}
                    onValueChange={(v) => setOperacaoForm({ ...operacaoForm, dono_economico_id: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {donos.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.nome_fantasia || d.razao_social}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Comprador Operacional (IBRAC ou representante)</Label>
                  <Select
                    value={operacaoForm.comprador_operacional_id}
                    onValueChange={(v) => setOperacaoForm({ ...operacaoForm, comprador_operacional_id: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {parceiros.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nome_fantasia || p.razao_social}</SelectItem>
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
                    <Label>Comissão IBRAC</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={operacaoForm.comissao_val}
                      onChange={(e) => setOperacaoForm({ ...operacaoForm, comissao_val: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Modo</Label>
                    <Select
                      value={operacaoForm.comissao_mode}
                      onValueChange={(v) => setOperacaoForm({ ...operacaoForm, comissao_mode: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PCT">% sobre venda</SelectItem>
                        <SelectItem value="TOTAL">R$ fixo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewOperacao(false)}>Cancelar</Button>
                <Button 
                  onClick={() => createOperacao.mutate()} 
                  disabled={!operacaoForm.nome || !operacaoForm.dono_economico_id || !operacaoForm.comprador_operacional_id || !operacaoForm.beneficiador_id}
                >
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
                <Handshake className="h-5 w-5" /> Operações
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
                      Dono: {op.dono_economico?.nome_fantasia || op.dono_economico?.razao_social}
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
                      <CardTitle className="text-sm font-medium text-muted-foreground">Compras</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatWeight(totais.kgComprado)}</div>
                      <p className="text-xs text-muted-foreground">{formatCurrency(totais.valorCompras)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Vendas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatWeight(totais.kgVendido)}</div>
                      <p className="text-xs text-muted-foreground">{formatCurrency(totais.receitaVendas)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Comissão IBRAC</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-success">{formatCurrency(totais.comissaoIbrac)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Repasse Dono</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(totais.repasseDono)}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="compras"><ShoppingCart className="h-4 w-4 mr-1" /> Compras</TabsTrigger>
                    <TabsTrigger value="beneficiamentos"><Cog className="h-4 w-4 mr-1" /> Benef.</TabsTrigger>
                    <TabsTrigger value="vendas"><TrendingUp className="h-4 w-4 mr-1" /> Vendas</TabsTrigger>
                    <TabsTrigger value="custos"><DollarSign className="h-4 w-4 mr-1" /> Custos</TabsTrigger>
                  </TabsList>

                  {/* COMPRAS */}
                  <TabsContent value="compras" className="mt-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Compras de Material</CardTitle>
                        <Button size="sm" disabled={!canEdit} onClick={() => { setEditCompra(null); setShowCompraForm(true); }}><Plus className="mr-2 h-4 w-4" /> Nova</Button>
                      </CardHeader>
                      <CardContent>
                        {compras.length === 0 ? (
                          <p className="text-center py-8 text-muted-foreground">Nenhuma compra</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Fornecedor</TableHead>
                                <TableHead>NF</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-right">Kg</TableHead>
                                <TableHead className="text-right">R$/kg</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead className="text-right">Saldo</TableHead>
                                <TableHead className="w-20"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {compras.map((c) => (
                                <TableRow key={c.id}>
                                  <TableCell>{format(new Date(c.dt), "dd/MM/yy")}</TableCell>
                                  <TableCell>{c.fornecedor?.razao_social || "-"}</TableCell>
                                  <TableCell>{c.nf_compra || "-"}</TableCell>
                                  <TableCell>
                                    <Badge variant={c.tipo_material === "MEL" ? "default" : "secondary"}>
                                      {c.tipo_material || "MEL"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">{formatWeight(c.kg_comprado)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(c.preco_compra_rkg)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(c.valor_compra_rs || 0)}</TableCell>
                                  <TableCell className="text-right">
                                    <Badge variant={c.kg_disponivel_compra > 0 ? "default" : "secondary"}>
                                      {formatWeight(c.kg_disponivel_compra || 0)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      {canEdit && (
                                        <Button variant="ghost" size="icon" onClick={() => handleEditCompra(c)}>
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                      )}
                                      {isAdmin && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="text-destructive hover:text-destructive"
                                          disabled={c.kg_disponivel_compra !== c.kg_comprado}
                                          title={c.kg_disponivel_compra !== c.kg_comprado ? "Exclua os beneficiamentos primeiro" : "Excluir"}
                                          onClick={() => setDeleteTarget({ type: "compra", id: c.id })}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* BENEFICIAMENTOS */}
                  <TabsContent value="beneficiamentos" className="mt-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Beneficiamentos</CardTitle>
                        <Button size="sm" disabled={!canEdit || totais.kgDisponivelCompra === 0} onClick={() => { setEditBenef(null); setShowBenefForm(true); }}><Plus className="mr-2 h-4 w-4" /> Novo</Button>
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
                                <TableHead className="text-right">Entrada</TableHead>
                                <TableHead className="text-right">Perda</TableHead>
                                <TableHead className="text-right">Retornado</TableHead>
                                <TableHead className="text-right">Custos</TableHead>
                                <TableHead className="text-right">Saldo</TableHead>
                                <TableHead className="w-20"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {beneficiamentos.map((b) => {
                                const kgEntrada = (b.kg_mel_entrada || 0) + (b.kg_mista_entrada || 0);
                                return (
                                  <TableRow key={b.id}>
                                    <TableCell>{format(new Date(b.dt), "dd/MM/yy")}</TableCell>
                                    <TableCell>{b.documento || "-"}</TableCell>
                                    <TableCell className="text-right text-sm">
                                      <div>{formatWeight(kgEntrada)}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {b.kg_mel_entrada > 0 && `Mel: ${formatWeight(b.kg_mel_entrada || 0)}`}
                                        {b.kg_mel_entrada > 0 && b.kg_mista_entrada > 0 && " | "}
                                        {b.kg_mista_entrada > 0 && `Mista: ${formatWeight(b.kg_mista_entrada || 0)}`}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right text-destructive text-sm">
                                      -{formatWeight(b.perda_total_kg || 0)}
                                      <div className="text-xs text-muted-foreground">
                                        {b.perda_mel_pct != null && `Mel: ${((b.perda_mel_pct || 0) * 100).toFixed(1)}%`}
                                        {b.perda_mel_pct != null && b.perda_mista_pct != null && " | "}
                                        {b.perda_mista_pct != null && `Mista: ${((b.perda_mista_pct || 0) * 100).toFixed(1)}%`}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">{formatWeight(b.kg_retornado)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(b.custos_benef_total_rs || 0)}</TableCell>
                                    <TableCell className="text-right">
                                      <Badge variant={b.kg_disponivel_venda > 0 ? "default" : "secondary"}>
                                        {formatWeight(b.kg_disponivel_venda || 0)}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex gap-1">
                                        {canEdit && (
                                          <Button variant="ghost" size="icon" onClick={() => handleEditBenef(b)}>
                                            <Pencil className="h-4 w-4" />
                                          </Button>
                                        )}
                                        {isAdmin && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive"
                                            disabled={b.kg_disponivel_venda !== b.kg_retornado}
                                            title={b.kg_disponivel_venda !== b.kg_retornado ? "Exclua as vendas primeiro" : "Excluir"}
                                            onClick={() => setDeleteTarget({ type: "benef", id: b.id })}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
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

                  {/* VENDAS */}
                  <TabsContent value="vendas" className="mt-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Vendas</CardTitle>
                        <Button size="sm" disabled={!canEdit || totais.kgDisponivelVenda === 0} onClick={() => { setEditVenda(null); setShowVendaForm(true); }}><Plus className="mr-2 h-4 w-4" /> Nova</Button>
                      </CardHeader>
                      <CardContent>
                        {vendas.length === 0 ? (
                          <p className="text-center py-8 text-muted-foreground">Nenhuma venda</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead className="text-right">Kg</TableHead>
                                <TableHead className="text-right">Receita</TableHead>
                                <TableHead className="text-right">Comissão</TableHead>
                                <TableHead className="text-right">Repasse</TableHead>
                                <TableHead className="w-20"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {vendas.map((v: any) => (
                                <TableRow key={v.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {format(new Date(v.dt), "dd/MM/yy")}
                                      {v.venda_pela_ibrac && <Badge variant="outline" className="text-xs">IBRAC</Badge>}
                                    </div>
                                  </TableCell>
                                  <TableCell>{v.cliente?.razao_social || "-"}</TableCell>
                                  <TableCell className="text-right">{formatWeight(v.kg_vendido)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(v.valor_venda_rs || 0)}</TableCell>
                                  <TableCell className="text-right text-success">{formatCurrency(v.comissao_ibrac_rs || 0)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(v.saldo_repassar_rs || 0)}</TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      {canEdit && (
                                        <Button variant="ghost" size="icon" onClick={() => handleEditVenda(v)}>
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                      )}
                                      {isAdmin && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="text-destructive hover:text-destructive"
                                          onClick={() => setDeleteTarget({ type: "venda", id: v.id })}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* CUSTOS */}
                  <TabsContent value="custos" className="mt-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Outros Custos</CardTitle>
                        <Button size="sm" disabled={!canEdit} onClick={() => { setEditCusto(null); setShowCustoForm(true); }}><Plus className="mr-2 h-4 w-4" /> Novo</Button>
                      </CardHeader>
                      <CardContent>
                        {custos.length === 0 ? (
                          <p className="text-center py-8 text-muted-foreground">Nenhum custo adicional</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Documento</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead className="w-20"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {custos.map((c) => (
                                <TableRow key={c.id}>
                                  <TableCell>{format(new Date(c.dt), "dd/MM/yy")}</TableCell>
                                  <TableCell><Badge variant="outline">{c.categoria}</Badge></TableCell>
                                  <TableCell>{c.documento || "-"}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(c.val)}</TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      {canEdit && (
                                        <Button variant="ghost" size="icon" onClick={() => handleEditCusto(c)}>
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                      )}
                                      {isAdmin && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="text-destructive hover:text-destructive"
                                          onClick={() => setDeleteTarget({ type: "custo", id: c.id })}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
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

        {/* Forms */}
        {selectedOperacao && (
          <>
            <CompraIntermForm 
              open={showCompraForm} 
              onOpenChange={(open) => { setShowCompraForm(open); if (!open) setEditCompra(null); }} 
              operacaoId={selectedOperacao}
              editData={editCompra}
            />
            <BeneficiamentoIntermForm 
              open={showBenefForm} 
              onOpenChange={(open) => { setShowBenefForm(open); if (!open) setEditBenef(null); }} 
              operacaoId={selectedOperacao}
              kgDisponivel={totais.kgDisponivelCompra}
              editData={editBenef}
            />
            <VendaIntermForm 
              open={showVendaForm} 
              onOpenChange={(open) => { setShowVendaForm(open); if (!open) setEditVenda(null); }} 
              operacaoId={selectedOperacao}
              kgDisponivel={totais.kgDisponivelVenda}
              editData={editVenda}
            />
            <CustoIntermForm 
              open={showCustoForm} 
              onOpenChange={(open) => { setShowCustoForm(open); if (!open) setEditCusto(null); }} 
              operacaoId={selectedOperacao}
              editData={editCusto}
            />
          </>
        )}

        {/* Delete Dialog */}
        <DeleteConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
          onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget); }}
          isLoading={deleteMutation.isPending}
        />
      </div>
    </MainLayout>
  );
}

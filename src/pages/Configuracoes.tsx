import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, Building2, Percent, DollarSign, Plus, Edit, Trash2, AlertTriangle, CheckCircle, Database } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Configurações Fiscais Tab
function ConfigFiscalTab() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nome: "", valor: 0, descricao: "" });

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["config_fiscal"],
    queryFn: async () => {
      const { data, error } = await supabase.from("config_fiscal").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingId) {
        const { error } = await supabase.from("config_fiscal").update(data).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("config_fiscal").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config_fiscal"] });
      handleClose();
      toast({ title: editingId ? "Configuração atualizada!" : "Configuração criada!" });
    },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("config_fiscal").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config_fiscal"] });
      toast({ title: "Configuração excluída!" });
    },
    onError: () => toast({ title: "Erro ao excluir", variant: "destructive" }),
  });

  const handleEdit = (config: any) => {
    setEditingId(config.id);
    setFormData({ nome: config.nome, valor: config.valor, descricao: config.descricao || "" });
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingId(null);
    setFormData({ nome: "", valor: 0, descricao: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Configurações Fiscais</h3>
          <p className="text-sm text-muted-foreground">Taxas, impostos e parâmetros fiscais</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); else setIsOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Configuração</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Editar" : "Nova"} Configuração Fiscal</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: Taxa Financeira Padrão" />
              </div>
              <div className="space-y-2">
                <Label>Valor (%)</Label>
                <Input type="number" step="0.01" value={formData.valor} onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} placeholder="Descrição opcional" />
              </div>
              <Button className="w-full" onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={5} className="text-center">Carregando...</TableCell></TableRow>
          ) : configs.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhuma configuração cadastrada</TableCell></TableRow>
          ) : (
            configs.map((config: any) => (
              <TableRow key={config.id}>
                <TableCell className="font-medium">{config.nome}</TableCell>
                <TableCell>{config.valor}%</TableCell>
                <TableCell className="text-muted-foreground">{config.descricao || "-"}</TableCell>
                <TableCell><Badge variant={config.ativo ? "default" : "secondary"}>{config.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(config)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(config.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// Relatório de Integridade
function IntegridadeTab() {
  const [running, setRunning] = useState(false);

  const { data: sublotesDuplicados = [], refetch: refetchSublotes, isLoading: loadingSublotes } = useQuery({
    queryKey: ["integridade-sublotes-duplicados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sublotes")
        .select("codigo, entrada_id, id")
        .order("codigo");
      if (error) throw error;
      
      // Find duplicates by codigo
      const codigoCount: Record<string, any[]> = {};
      data.forEach(s => {
        if (!codigoCount[s.codigo]) codigoCount[s.codigo] = [];
        codigoCount[s.codigo].push(s);
      });
      
      return Object.entries(codigoCount)
        .filter(([_, items]) => items.length > 1)
        .map(([codigo, items]) => ({ codigo, count: items.length, items }));
    },
    enabled: false,
  });

  const { data: entradasSemSublotes = [], refetch: refetchEntradas, isLoading: loadingEntradas } = useQuery({
    queryKey: ["integridade-entradas-sem-sublotes"],
    queryFn: async () => {
      const { data: entradas, error: entErr } = await supabase
        .from("entradas")
        .select("id, codigo, data_entrada")
        .order("data_entrada", { ascending: false });
      if (entErr) throw entErr;
      
      const { data: sublotes, error: subErr } = await supabase
        .from("sublotes")
        .select("entrada_id");
      if (subErr) throw subErr;
      
      const entradasComSublotes = new Set(sublotes.map(s => s.entrada_id));
      return entradas.filter(e => !entradasComSublotes.has(e.id));
    },
    enabled: false,
  });

  const { data: sublotesOrfaos = [], refetch: refetchOrfaos, isLoading: loadingOrfaos } = useQuery({
    queryKey: ["integridade-sublotes-orfaos"],
    queryFn: async () => {
      const { data: sublotes, error: subErr } = await supabase
        .from("sublotes")
        .select("id, codigo, entrada_id, lote_pai_id");
      if (subErr) throw subErr;
      
      const { data: entradas, error: entErr } = await supabase
        .from("entradas")
        .select("id");
      if (entErr) throw entErr;
      
      const entradaIds = new Set(entradas.map(e => e.id));
      const subloteIds = new Set(sublotes.map(s => s.id));
      
      return sublotes.filter(s => 
        (s.entrada_id && !entradaIds.has(s.entrada_id)) ||
        (s.lote_pai_id && !subloteIds.has(s.lote_pai_id))
      );
    },
    enabled: false,
  });

  const runAnalysis = async () => {
    setRunning(true);
    await Promise.all([refetchSublotes(), refetchEntradas(), refetchOrfaos()]);
    setRunning(false);
    toast({ title: "Análise concluída!" });
  };

  const isLoading = loadingSublotes || loadingEntradas || loadingOrfaos;

  const totalIssues = sublotesDuplicados.length + entradasSemSublotes.length + sublotesOrfaos.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Database className="h-5 w-5" />
            Relatório de Integridade de Dados
          </h3>
          <p className="text-sm text-muted-foreground">Identifica registros duplicados ou inconsistentes</p>
        </div>
        <Button onClick={runAnalysis} disabled={running || isLoading}>
          {running || isLoading ? "Analisando..." : "Executar Análise"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={sublotesDuplicados.length > 0 ? "border-destructive/50" : "border-success/50"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {sublotesDuplicados.length > 0 ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <CheckCircle className="h-4 w-4 text-success" />}
              Sublotes Duplicados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sublotesDuplicados.length}</div>
            <p className="text-xs text-muted-foreground">Códigos repetidos</p>
          </CardContent>
        </Card>

        <Card className={entradasSemSublotes.length > 0 ? "border-warning/50" : "border-success/50"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {entradasSemSublotes.length > 0 ? <AlertTriangle className="h-4 w-4 text-warning" /> : <CheckCircle className="h-4 w-4 text-success" />}
              Entradas sem Sublotes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entradasSemSublotes.length}</div>
            <p className="text-xs text-muted-foreground">Sem volumes associados</p>
          </CardContent>
        </Card>

        <Card className={sublotesOrfaos.length > 0 ? "border-destructive/50" : "border-success/50"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {sublotesOrfaos.length > 0 ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <CheckCircle className="h-4 w-4 text-success" />}
              Sublotes Órfãos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sublotesOrfaos.length}</div>
            <p className="text-xs text-muted-foreground">Referências inválidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Results */}
      {totalIssues > 0 && (
        <div className="space-y-4">
          {sublotesDuplicados.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Sublotes com Código Duplicado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Ocorrências</TableHead>
                      <TableHead>IDs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sublotesDuplicados.map((dup: any) => (
                      <TableRow key={dup.codigo}>
                        <TableCell className="font-mono">{dup.codigo}</TableCell>
                        <TableCell><Badge variant="destructive">{dup.count}x</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {dup.items.map((i: any) => i.id.slice(0, 8)).join(", ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {entradasSemSublotes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-warning flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Entradas sem Sublotes Associados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entradasSemSublotes.slice(0, 20).map((entrada: any) => (
                      <TableRow key={entrada.id}>
                        <TableCell className="font-mono">{entrada.codigo}</TableCell>
                        <TableCell>{new Date(entrada.data_entrada).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{entrada.id.slice(0, 8)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {entradasSemSublotes.length > 20 && (
                  <p className="text-xs text-muted-foreground mt-2">E mais {entradasSemSublotes.length - 20} registros...</p>
                )}
              </CardContent>
            </Card>
          )}

          {sublotesOrfaos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Sublotes com Referências Inválidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Problema</TableHead>
                      <TableHead>ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sublotesOrfaos.slice(0, 20).map((sublote: any) => (
                      <TableRow key={sublote.id}>
                        <TableCell className="font-mono">{sublote.codigo}</TableCell>
                        <TableCell className="text-xs">
                          {sublote.entrada_id && "Entrada inexistente"}
                          {sublote.lote_pai_id && "Lote pai inexistente"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{sublote.id.slice(0, 8)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {totalIssues === 0 && sublotesDuplicados !== undefined && (
        <Card className="border-success/50 bg-success/5">
          <CardContent className="flex items-center gap-4 py-8">
            <CheckCircle className="h-12 w-12 text-success" />
            <div>
              <h4 className="font-semibold text-success">Nenhum problema encontrado!</h4>
              <p className="text-sm text-muted-foreground">A integridade dos dados está OK.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function Configuracoes() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Configurações
          </h1>
          <p className="text-muted-foreground">Configurações do sistema e ferramentas de integridade</p>
        </div>

        <Tabs defaultValue="fiscal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="fiscal" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Fiscal
            </TabsTrigger>
            <TabsTrigger value="integridade" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Integridade
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fiscal">
            <Card>
              <CardContent className="pt-6">
                <ConfigFiscalTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integridade">
            <Card>
              <CardContent className="pt-6">
                <IntegridadeTab />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

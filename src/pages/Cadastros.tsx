import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Building2, Package, FileInput, FileOutput, Cog, Users, DollarSign } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ParceirosTab } from "@/components/cadastros/ParceirosTab";

// Componentes de Cadastro
function DonosMaterialTab() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ nome: "", documento: "", telefone: "", email: "", taxa_operacao_pct: 0 });

  const { data: donos = [], isLoading } = useQuery({
    queryKey: ["donos_material"],
    queryFn: async () => {
      const { data, error } = await supabase.from("donos_material").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("donos_material").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donos_material"] });
      setIsOpen(false);
      setFormData({ nome: "", documento: "", telefone: "", email: "", taxa_operacao_pct: 0 });
      toast({ title: "Dono cadastrado com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao cadastrar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("donos_material").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donos_material"] });
      toast({ title: "Dono excluído com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao excluir", variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Donos de Material</h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Dono</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Dono de Material</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>CPF/CNPJ</Label>
                <Input value={formData.documento} onChange={(e) => setFormData({ ...formData, documento: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Taxa IBRAC (%)</Label>
                  <Input type="number" step="0.01" value={formData.taxa_operacao_pct} onChange={(e) => setFormData({ ...formData, taxa_operacao_pct: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate(formData)} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Documento</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Taxa IBRAC</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={6} className="text-center">Carregando...</TableCell></TableRow>
          ) : donos.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum dono cadastrado</TableCell></TableRow>
          ) : (
            donos.map((dono: any) => (
              <TableRow key={dono.id}>
                <TableCell className="font-medium">{dono.nome}</TableCell>
                <TableCell>{dono.documento || "-"}</TableCell>
                <TableCell>{dono.telefone || "-"}</TableCell>
                <TableCell>{dono.taxa_operacao_pct}%</TableCell>
                <TableCell><Badge variant={dono.ativo ? "default" : "secondary"}>{dono.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(dono.id)} disabled={deleteMutation.isPending}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function TiposProdutoTab() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ nome: "", codigo: "", ncm: "", icms_pct: 12, pis_cofins_pct: 9.25 });

  const { data: tipos = [], isLoading } = useQuery({
    queryKey: ["tipos_produto"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tipos_produto").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("tipos_produto").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos_produto"] });
      setIsOpen(false);
      setFormData({ nome: "", codigo: "", ncm: "", icms_pct: 12, pis_cofins_pct: 9.25 });
      toast({ title: "Tipo de produto cadastrado com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao cadastrar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tipos_produto").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos_produto"] });
      toast({ title: "Tipo excluído com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao excluir", variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Tipos de Produto</h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Tipo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Tipo de Produto</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input value={formData.codigo} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>NCM</Label>
                <Input value={formData.ncm} onChange={(e) => setFormData({ ...formData, ncm: e.target.value })} placeholder="0000.00.00" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ICMS (%)</Label>
                  <Input type="number" step="0.01" value={formData.icms_pct} onChange={(e) => setFormData({ ...formData, icms_pct: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>PIS/COFINS (%)</Label>
                  <Input type="number" step="0.01" value={formData.pis_cofins_pct} onChange={(e) => setFormData({ ...formData, pis_cofins_pct: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate(formData)} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>NCM</TableHead>
            <TableHead>ICMS</TableHead>
            <TableHead>PIS/COFINS</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={6} className="text-center">Carregando...</TableCell></TableRow>
          ) : tipos.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum tipo cadastrado</TableCell></TableRow>
          ) : (
            tipos.map((tipo: any) => (
              <TableRow key={tipo.id}>
                <TableCell className="font-mono">{tipo.codigo || "-"}</TableCell>
                <TableCell className="font-medium">{tipo.nome}</TableCell>
                <TableCell>{tipo.ncm || "-"}</TableCell>
                <TableCell>{tipo.icms_pct}%</TableCell>
                <TableCell>{tipo.pis_cofins_pct}%</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(tipo.id)} disabled={deleteMutation.isPending}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function ProcessosTab() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ nome: "", descricao: "", inclui_frete_ida: false, inclui_frete_volta: false, inclui_mo: true });

  const { data: processos = [], isLoading } = useQuery({
    queryKey: ["processos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("processos").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("processos").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processos"] });
      setIsOpen(false);
      setFormData({ nome: "", descricao: "", inclui_frete_ida: false, inclui_frete_volta: false, inclui_mo: true });
      toast({ title: "Processo cadastrado com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao cadastrar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("processos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processos"] });
      toast({ title: "Processo excluído com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao excluir", variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Processos de Beneficiamento</h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Processo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Processo</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Inclui Frete Ida</Label>
                  <Switch checked={formData.inclui_frete_ida} onCheckedChange={(v) => setFormData({ ...formData, inclui_frete_ida: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Inclui Frete Volta</Label>
                  <Switch checked={formData.inclui_frete_volta} onCheckedChange={(v) => setFormData({ ...formData, inclui_frete_volta: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Inclui Mão de Obra</Label>
                  <Switch checked={formData.inclui_mo} onCheckedChange={(v) => setFormData({ ...formData, inclui_mo: v })} />
                </div>
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate(formData)} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Frete Ida</TableHead>
            <TableHead>Frete Volta</TableHead>
            <TableHead>MO</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={6} className="text-center">Carregando...</TableCell></TableRow>
          ) : processos.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum processo cadastrado</TableCell></TableRow>
          ) : (
            processos.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nome}</TableCell>
                <TableCell className="text-muted-foreground">{p.descricao || "-"}</TableCell>
                <TableCell>{p.inclui_frete_ida ? <Badge variant="default">Sim</Badge> : <Badge variant="secondary">Não</Badge>}</TableCell>
                <TableCell>{p.inclui_frete_volta ? <Badge variant="default">Sim</Badge> : <Badge variant="secondary">Não</Badge>}</TableCell>
                <TableCell>{p.inclui_mo ? <Badge variant="default">Sim</Badge> : <Badge variant="secondary">Não</Badge>}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)} disabled={deleteMutation.isPending}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function TiposEntradaSaidaTab() {
  const { data: tiposEntrada = [] } = useQuery({
    queryKey: ["tipos_entrada"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tipos_entrada").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: tiposSaida = [] } = useQuery({
    queryKey: ["tipos_saida"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tipos_saida").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileInput className="h-5 w-5" />Tipos de Entrada</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Gera Custo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiposEntrada.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.nome}</TableCell>
                  <TableCell>{t.gera_custo ? <Badge>Sim</Badge> : <Badge variant="secondary">Não</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileOutput className="h-5 w-5" />Tipos de Saída</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cobra Custos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiposSaida.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.nome}</TableCell>
                  <TableCell>{t.cobra_custos ? <Badge>Sim</Badge> : <Badge variant="secondary">Não</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Cadastros() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cadastros</h1>
          <p className="text-muted-foreground">Gerencie os cadastros auxiliares do sistema</p>
        </div>

        <Tabs defaultValue="parceiros" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="parceiros" className="gap-2"><Building2 className="h-4 w-4" />Parceiros</TabsTrigger>
            <TabsTrigger value="donos" className="gap-2"><Users className="h-4 w-4" />Donos</TabsTrigger>
            <TabsTrigger value="produtos" className="gap-2"><Package className="h-4 w-4" />Produtos</TabsTrigger>
            <TabsTrigger value="processos" className="gap-2"><Cog className="h-4 w-4" />Processos</TabsTrigger>
            <TabsTrigger value="tipos" className="gap-2"><FileInput className="h-4 w-4" />Tipos E/S</TabsTrigger>
          </TabsList>

          <TabsContent value="parceiros" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <ParceirosTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="donos" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <DonosMaterialTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="produtos" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <TiposProdutoTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="processos" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <ProcessosTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tipos" className="mt-6">
            <TiposEntradaSaidaTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

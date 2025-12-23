import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Building2, FileOutput, Settings } from "lucide-react";
import { ParceirosTab } from "@/components/cadastros/ParceirosTab";

export default function Cadastros() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cadastros</h1>
          <p className="text-muted-foreground">Gerencie os cadastros básicos do sistema</p>
        </div>

        <Tabs defaultValue="parceiros" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-none lg:flex">
            <TabsTrigger value="parceiros" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Parceiros
            </TabsTrigger>
            <TabsTrigger value="tipos-saida" className="flex items-center gap-2">
              <FileOutput className="h-4 w-4" />
              Tipos de Saída
            </TabsTrigger>
          </TabsList>

          <TabsContent value="parceiros">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Parceiros
                </CardTitle>
                <CardDescription>
                  Cadastre fornecedores, clientes, beneficiadores e donos de material
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ParceirosTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tipos-saida">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileOutput className="h-5 w-5" />
                  Tipos de Saída
                </CardTitle>
                <CardDescription>
                  Configure os tipos de saída para as operações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TiposSaidaTab />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

// Tipos de Saída Tab
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

function TiposSaidaTab() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nome: "", descricao: "", cobra_custos: true });

  const { data: tipos = [], isLoading } = useQuery({
    queryKey: ["tipos_saida"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tipos_saida").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingId) {
        const { error } = await supabase.from("tipos_saida").update(data).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tipos_saida").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos_saida"] });
      handleClose();
      toast({ title: editingId ? "Tipo atualizado!" : "Tipo cadastrado!" });
    },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tipos_saida").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos_saida"] });
      toast({ title: "Tipo excluído!" });
    },
    onError: () => toast({ title: "Erro ao excluir", variant: "destructive" }),
  });

  const handleEdit = (tipo: any) => {
    setEditingId(tipo.id);
    setFormData({ nome: tipo.nome, descricao: tipo.descricao || "", cobra_custos: tipo.cobra_custos !== false });
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingId(null);
    setFormData({ nome: "", descricao: "", cobra_custos: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Tipos de Saída</h3>
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); else setIsOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Tipo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Editar" : "Novo"} Tipo de Saída</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Cobra Custos</Label>
                <Switch checked={formData.cobra_custos} onCheckedChange={(v) => setFormData({ ...formData, cobra_custos: v })} />
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
            <TableHead>Descrição</TableHead>
            <TableHead>Cobra Custos</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={5} className="text-center">Carregando...</TableCell></TableRow>
          ) : tipos.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum tipo cadastrado</TableCell></TableRow>
          ) : (
            tipos.map((tipo: any) => (
              <TableRow key={tipo.id}>
                <TableCell className="font-medium">{tipo.nome}</TableCell>
                <TableCell className="text-muted-foreground">{tipo.descricao || "-"}</TableCell>
                <TableCell><Badge variant={tipo.cobra_custos ? "default" : "secondary"}>{tipo.cobra_custos ? "Sim" : "Não"}</Badge></TableCell>
                <TableCell><Badge variant={tipo.ativo ? "default" : "secondary"}>{tipo.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(tipo)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(tipo.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

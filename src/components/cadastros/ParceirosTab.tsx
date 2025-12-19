import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, Building2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Parceiro {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  is_fornecedor: boolean;
  is_cliente: boolean;
  is_transportadora: boolean;
  ativo: boolean;
}

const initialFormData = {
  razao_social: "",
  nome_fantasia: "",
  cnpj: "",
  telefone: "",
  email: "",
  endereco: "",
  cidade: "",
  estado: "",
  cep: "",
  is_fornecedor: false,
  is_cliente: false,
  is_transportadora: false,
};

export function ParceirosTab() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [filter, setFilter] = useState<"all" | "fornecedor" | "cliente" | "transportadora">("all");

  const { data: parceiros = [], isLoading } = useQuery({
    queryKey: ["parceiros"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parceiros")
        .select("*")
        .order("razao_social");
      if (error) throw error;
      return data as Parceiro[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("parceiros").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parceiros"] });
      setIsOpen(false);
      setFormData(initialFormData);
      toast({ title: "Parceiro cadastrado com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao cadastrar", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from("parceiros").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parceiros"] });
      setIsOpen(false);
      setEditingId(null);
      setFormData(initialFormData);
      toast({ title: "Parceiro atualizado com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("parceiros").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parceiros"] });
      toast({ title: "Parceiro excluído com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao excluir", variant: "destructive" }),
  });

  const handleEdit = (parceiro: Parceiro) => {
    setEditingId(parceiro.id);
    setFormData({
      razao_social: parceiro.razao_social,
      nome_fantasia: parceiro.nome_fantasia || "",
      cnpj: parceiro.cnpj || "",
      telefone: parceiro.telefone || "",
      email: parceiro.email || "",
      endereco: parceiro.endereco || "",
      cidade: parceiro.cidade || "",
      estado: parceiro.estado || "",
      cep: parceiro.cep || "",
      is_fornecedor: parceiro.is_fornecedor,
      is_cliente: parceiro.is_cliente,
      is_transportadora: parceiro.is_transportadora,
    });
    setIsOpen(true);
  };

  const handleSubmit = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingId(null);
    setFormData(initialFormData);
  };

  const filteredParceiros = parceiros.filter((p) => {
    if (filter === "all") return true;
    if (filter === "fornecedor") return p.is_fornecedor;
    if (filter === "cliente") return p.is_cliente;
    if (filter === "transportadora") return p.is_transportadora;
    return true;
  });

  const getTipos = (p: Parceiro) => {
    const tipos = [];
    if (p.is_fornecedor) tipos.push("Fornecedor");
    if (p.is_cliente) tipos.push("Cliente");
    if (p.is_transportadora) tipos.push("Transportadora");
    return tipos;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Parceiros</h3>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1">
            {(["all", "fornecedor", "cliente", "transportadora"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1) + "s"}
              </Button>
            ))}
          </div>
          <Dialog open={isOpen} onOpenChange={(v) => v ? setIsOpen(true) : handleClose()}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Novo Parceiro</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Parceiro" : "Novo Parceiro"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Razão Social *</Label>
                    <Input 
                      value={formData.razao_social} 
                      onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome Fantasia</Label>
                    <Input 
                      value={formData.nome_fantasia} 
                      onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })} 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CNPJ</Label>
                    <Input 
                      value={formData.cnpj} 
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input 
                      value={formData.telefone} 
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={formData.email} 
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Endereço</Label>
                    <Input 
                      value={formData.endereco} 
                      onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <Input 
                      value={formData.cep} 
                      onChange={(e) => setFormData({ ...formData, cep: e.target.value })} 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input 
                      value={formData.cidade} 
                      onChange={(e) => setFormData({ ...formData, cidade: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Input 
                      value={formData.estado} 
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })} 
                      maxLength={2}
                    />
                  </div>
                </div>
                <div className="space-y-3 pt-2">
                  <Label className="text-base font-medium">Tipo de Parceiro</Label>
                  <div className="flex gap-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="is_fornecedor" 
                        checked={formData.is_fornecedor}
                        onCheckedChange={(v) => setFormData({ ...formData, is_fornecedor: !!v })}
                      />
                      <label htmlFor="is_fornecedor" className="text-sm">Fornecedor</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="is_cliente" 
                        checked={formData.is_cliente}
                        onCheckedChange={(v) => setFormData({ ...formData, is_cliente: !!v })}
                      />
                      <label htmlFor="is_cliente" className="text-sm">Cliente</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="is_transportadora" 
                        checked={formData.is_transportadora}
                        onCheckedChange={(v) => setFormData({ ...formData, is_transportadora: !!v })}
                      />
                      <label htmlFor="is_transportadora" className="text-sm">Transportadora</label>
                    </div>
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleSubmit} 
                  disabled={createMutation.isPending || updateMutation.isPending || !formData.razao_social}
                >
                  {(createMutation.isPending || updateMutation.isPending) ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Razão Social</TableHead>
            <TableHead>Nome Fantasia</TableHead>
            <TableHead>CNPJ</TableHead>
            <TableHead>Cidade/UF</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={7} className="text-center">Carregando...</TableCell></TableRow>
          ) : filteredParceiros.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum parceiro cadastrado</TableCell></TableRow>
          ) : (
            filteredParceiros.map((parceiro) => (
              <TableRow key={parceiro.id}>
                <TableCell className="font-medium">{parceiro.razao_social}</TableCell>
                <TableCell>{parceiro.nome_fantasia || "-"}</TableCell>
                <TableCell className="font-mono text-sm">{parceiro.cnpj || "-"}</TableCell>
                <TableCell>{parceiro.cidade ? `${parceiro.cidade}/${parceiro.estado}` : "-"}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {getTipos(parceiro).map((tipo) => (
                      <Badge key={tipo} variant="secondary" className="text-xs">{tipo}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={parceiro.ativo ? "default" : "secondary"}>
                    {parceiro.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(parceiro)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => deleteMutation.mutate(parceiro.id)} 
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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

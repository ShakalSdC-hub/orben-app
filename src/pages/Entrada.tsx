import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  FileInput,
  MoreHorizontal,
  Eye,
  Edit,
  Printer,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

const statusConfig = {
  pendente: { label: "Pendente", className: "bg-warning/10 text-warning border-warning/20" },
  conferido: { label: "Conferido", className: "bg-primary/10 text-primary border-primary/20" },
  processando: { label: "Processando", className: "bg-copper/10 text-copper border-copper/20" },
  finalizado: { label: "Finalizado", className: "bg-success/10 text-success border-success/20" },
};

export default function Entrada() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    tipo_material: "",
    peso_bruto_kg: "",
    peso_liquido_kg: "",
    fornecedor_id: "",
    dono_id: "",
    tipo_entrada_id: "",
    tipo_produto_id: "",
    taxa_financeira_pct: "0",
    nota_fiscal: "",
    teor_cobre: "",
    valor_unitario: "",
    observacoes: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch entradas
  const { data: entradas, isLoading } = useQuery({
    queryKey: ["entradas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entradas")
        .select(`
          *,
          fornecedor:fornecedores(razao_social),
          dono:donos_material(nome),
          tipo_entrada:tipos_entrada(nome),
          tipo_produto:tipos_produto(nome)
        `)
        .order("data_entrada", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch relacionados
  const { data: fornecedores } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fornecedores").select("*").eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: donos } = useQuery({
    queryKey: ["donos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("donos_material").select("*").eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: tiposEntrada } = useQuery({
    queryKey: ["tipos-entrada"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tipos_entrada").select("*").eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: tiposProduto } = useQuery({
    queryKey: ["tipos-produto"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tipos_produto").select("*").eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  // Create entrada mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const codigo = `ENT-${format(new Date(), "yyyy")}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;
      const pesoBruto = parseFloat(data.peso_bruto_kg) || 0;
      const pesoLiquido = parseFloat(data.peso_liquido_kg) || pesoBruto;
      const valorUnitario = parseFloat(data.valor_unitario) || 0;
      const valorTotal = pesoLiquido * valorUnitario;

      const { data: entrada, error } = await supabase
        .from("entradas")
        .insert({
          codigo,
          tipo_material: data.tipo_material,
          peso_bruto_kg: pesoBruto,
          peso_liquido_kg: pesoLiquido,
          fornecedor_id: data.fornecedor_id || null,
          dono_id: data.dono_id || null,
          tipo_entrada_id: data.tipo_entrada_id || null,
          tipo_produto_id: data.tipo_produto_id || null,
          taxa_financeira_pct: parseFloat(data.taxa_financeira_pct) || 0,
          nota_fiscal: data.nota_fiscal || null,
          teor_cobre: parseFloat(data.teor_cobre) || null,
          valor_unitario: valorUnitario,
          valor_total: valorTotal,
          observacoes: data.observacoes || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Criar sublote automaticamente
      const subloteCodigo = `${codigo}-001`;
      const { error: subloteError } = await supabase.from("sublotes").insert({
        codigo: subloteCodigo,
        entrada_id: entrada.id,
        peso_kg: pesoLiquido,
        dono_id: data.dono_id || null,
        tipo_produto_id: data.tipo_produto_id || null,
        teor_cobre: parseFloat(data.teor_cobre) || null,
        custo_unitario_total: valorUnitario,
        status: "disponivel",
      });

      if (subloteError) throw subloteError;

      return entrada;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entradas"] });
      queryClient.invalidateQueries({ queryKey: ["sublotes"] });
      toast({ title: "Entrada criada", description: "Entrada e sublote criados com sucesso." });
      setDialogOpen(false);
      setFormData({
        tipo_material: "",
        peso_bruto_kg: "",
        peso_liquido_kg: "",
        fornecedor_id: "",
        dono_id: "",
        tipo_entrada_id: "",
        tipo_produto_id: "",
        taxa_financeira_pct: "0",
        nota_fiscal: "",
        teor_cobre: "",
        valor_unitario: "",
        observacoes: "",
      });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const formatWeight = (kg: number) => {
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
    return `${kg}kg`;
  };

  const filteredEntradas = entradas?.filter(
    (e) =>
      e.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.fornecedor?.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.dono?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Entrada de Material</h1>
            <p className="text-muted-foreground">Gerenciamento de recebimento de material</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Importar XML
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-copper hover:opacity-90 shadow-copper">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Entrada
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nova Entrada de Material</DialogTitle>
                  <DialogDescription>Registre a entrada de material no sistema</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de Entrada *</Label>
                      <Select
                        value={formData.tipo_entrada_id}
                        onValueChange={(v) => setFormData({ ...formData, tipo_entrada_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {tiposEntrada?.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Dono do Material *</Label>
                      <Select
                        value={formData.dono_id}
                        onValueChange={(v) => setFormData({ ...formData, dono_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {donos?.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fornecedor</Label>
                      <Select
                        value={formData.fornecedor_id}
                        onValueChange={(v) => setFormData({ ...formData, fornecedor_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {fornecedores?.map((f) => (
                            <SelectItem key={f.id} value={f.id}>{f.razao_social}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Produto *</Label>
                      <Select
                        value={formData.tipo_produto_id}
                        onValueChange={(v) => setFormData({ ...formData, tipo_produto_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {tiposProduto?.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo Material (descrição) *</Label>
                      <Input
                        value={formData.tipo_material}
                        onChange={(e) => setFormData({ ...formData, tipo_material: e.target.value })}
                        placeholder="Ex: Mel, Mista, Fio..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nota Fiscal</Label>
                      <Input
                        value={formData.nota_fiscal}
                        onChange={(e) => setFormData({ ...formData, nota_fiscal: e.target.value })}
                        placeholder="NF-00000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Peso Bruto (kg) *</Label>
                      <Input
                        type="number"
                        value={formData.peso_bruto_kg}
                        onChange={(e) => setFormData({ ...formData, peso_bruto_kg: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Peso Líquido (kg) *</Label>
                      <Input
                        type="number"
                        value={formData.peso_liquido_kg}
                        onChange={(e) => setFormData({ ...formData, peso_liquido_kg: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Teor de Cobre (%)</Label>
                      <Input
                        type="number"
                        value={formData.teor_cobre}
                        onChange={(e) => setFormData({ ...formData, teor_cobre: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Valor Unitário (R$/kg)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.valor_unitario}
                        onChange={(e) => setFormData({ ...formData, valor_unitario: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Taxa Financeira (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.taxa_financeira_pct}
                        onChange={(e) => setFormData({ ...formData, taxa_financeira_pct: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Input
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button
                    onClick={() => createMutation.mutate(formData)}
                    disabled={createMutation.isPending || !formData.tipo_material || !formData.peso_bruto_kg}
                    className="bg-gradient-copper hover:opacity-90"
                  >
                    {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Criar Entrada
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, fornecedor, dono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card shadow-elevated overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Código</TableHead>
                  <TableHead className="font-semibold">Fornecedor</TableHead>
                  <TableHead className="font-semibold">Data</TableHead>
                  <TableHead className="font-semibold">NF</TableHead>
                  <TableHead className="font-semibold text-right">Peso</TableHead>
                  <TableHead className="font-semibold">Material</TableHead>
                  <TableHead className="font-semibold">Dono</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntradas?.map((entrada) => (
                  <TableRow key={entrada.id} className="group hover:bg-muted/30 cursor-pointer">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-success/10">
                          <FileInput className="h-4 w-4 text-success" />
                        </div>
                        <span className="font-medium text-sm">{entrada.codigo}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{entrada.fornecedor?.razao_social || "—"}</p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(entrada.data_entrada), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entrada.nota_fiscal || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatWeight(entrada.peso_liquido_kg)}
                    </TableCell>
                    <TableCell className="text-sm">{entrada.tipo_material}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {entrada.dono?.nome || "IBRAC"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("text-xs", statusConfig[entrada.status as keyof typeof statusConfig]?.className)}
                      >
                        {statusConfig[entrada.status as keyof typeof statusConfig]?.label || entrada.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem><Eye className="mr-2 h-4 w-4" />Visualizar</DropdownMenuItem>
                          <DropdownMenuItem><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                          <DropdownMenuItem><Printer className="mr-2 h-4 w-4" />Imprimir Romaneio</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {(!filteredEntradas || filteredEntradas.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? "Nenhuma entrada encontrada" : "Nenhuma entrada registrada ainda"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

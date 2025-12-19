import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface Volume {
  id: string;
  codigo: string;
  peso_kg: string;
  tipo_produto_id: string;
  valor_unitario: string;
}

interface EntradaFormProps {
  onClose: () => void;
}

export function EntradaForm({ onClose }: EntradaFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState("info");

  const [formData, setFormData] = useState({
    tipo_entrada_id: "",
    parceiro_id: "",
    dono_id: "",
    nota_fiscal: "",
    data_entrada: format(new Date(), "yyyy-MM-dd"),
    motorista: "",
    placa_veiculo: "",
    transportadora_id: "",
    peso_nf_kg: "",
    observacoes: "",
  });

  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [newVolume, setNewVolume] = useState({ codigo: "", peso_kg: "", tipo_produto_id: "", valor_unitario: "" });

  // Queries
  const { data: tiposEntrada } = useQuery({
    queryKey: ["tipos_entrada"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tipos_entrada").select("*").eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: parceiros } = useQuery({
    queryKey: ["parceiros"],
    queryFn: async () => {
      const { data, error } = await supabase.from("parceiros").select("*").eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: donos } = useQuery({
    queryKey: ["donos_material"],
    queryFn: async () => {
      const { data, error } = await supabase.from("donos_material").select("*").eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: tiposProduto } = useQuery({
    queryKey: ["tipos_produto"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tipos_produto").select("*").eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  const fornecedores = parceiros?.filter((p) => p.is_fornecedor) || [];
  const transportadoras = parceiros?.filter((p) => p.is_transportadora) || [];

  const generateVolumeCode = () => {
    const date = format(new Date(), "ddMMyy");
    const seq = String(volumes.length + 1).padStart(3, "0");
    return `TKT-${date}-${seq}`;
  };

  const addVolume = () => {
    if (!newVolume.peso_kg) {
      toast({ title: "Informe o peso do volume", variant: "destructive" });
      return;
    }
    if (!newVolume.tipo_produto_id) {
      toast({ title: "Selecione o tipo de produto", variant: "destructive" });
      return;
    }
    const codigo = newVolume.codigo || generateVolumeCode();
    setVolumes([...volumes, { 
      id: crypto.randomUUID(), 
      codigo, 
      peso_kg: newVolume.peso_kg, 
      tipo_produto_id: newVolume.tipo_produto_id,
      valor_unitario: newVolume.valor_unitario 
    }]);
    setNewVolume({ codigo: "", peso_kg: "", tipo_produto_id: newVolume.tipo_produto_id, valor_unitario: newVolume.valor_unitario });
  };

  const removeVolume = (id: string) => {
    setVolumes(volumes.filter((v) => v.id !== id));
  };

  const totalPeso = volumes.reduce((acc, v) => acc + (parseFloat(v.peso_kg) || 0), 0);
  const totalValor = volumes.reduce((acc, v) => {
    const peso = parseFloat(v.peso_kg) || 0;
    const valor = parseFloat(v.valor_unitario) || 0;
    return acc + (peso * valor);
  }, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      // Gerar código da entrada (lote mãe)
      const codigo = `ENT-${format(new Date(), "yyyyMMdd")}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;
      const firstTipoProduto = volumes[0]?.tipo_produto_id || null;
      const tipoMaterial = tiposProduto?.find((t) => t.id === firstTipoProduto)?.nome || "Material";
      
      // Calcular valor total e unitário médio
      const valorTotal = totalValor;
      const valorUnitarioMedio = totalPeso > 0 ? valorTotal / totalPeso : null;
      
      // Criar entrada
      const { data: entrada, error: entradaError } = await supabase
        .from("entradas")
        .insert({
          codigo,
          tipo_material: tipoMaterial,
          peso_bruto_kg: totalPeso,
          peso_liquido_kg: totalPeso,
          peso_nf_kg: parseFloat(formData.peso_nf_kg) || null,
          fornecedor_id: null,
          parceiro_id: formData.parceiro_id || null,
          dono_id: formData.dono_id || null,
          tipo_entrada_id: formData.tipo_entrada_id || null,
          tipo_produto_id: firstTipoProduto,
          nota_fiscal: formData.nota_fiscal || null,
          data_entrada: formData.data_entrada,
          motorista: formData.motorista || null,
          placa_veiculo: formData.placa_veiculo || null,
          transportadora_id: formData.transportadora_id || null,
          conferente_id: user?.id || null,
          observacoes: formData.observacoes || null,
          created_by: user?.id,
          valor_total: valorTotal || null,
          valor_unitario: valorUnitarioMedio || null,
        })
        .select()
        .single();

      if (entradaError) throw entradaError;

      // Criar sublote mãe (representa o documento todo)
      const { data: loteMae, error: loteMaeError } = await supabase
        .from("sublotes")
        .insert({
          codigo: codigo,
          entrada_id: entrada.id,
          peso_kg: totalPeso,
          dono_id: formData.dono_id || null,
          tipo_produto_id: firstTipoProduto,
          status: "disponivel",
          numero_volume: 0,
          custo_unitario_total: valorUnitarioMedio || null,
        })
        .select()
        .single();

      if (loteMaeError) throw loteMaeError;

      // Criar sublotes filhos (volumes)
      for (let i = 0; i < volumes.length; i++) {
        const volume = volumes[i];
        const custoUnitario = parseFloat(volume.valor_unitario) || null;
        
        const { error: subloteError } = await supabase.from("sublotes").insert({
          codigo: volume.codigo,
          entrada_id: entrada.id,
          lote_pai_id: loteMae.id,
          peso_kg: parseFloat(volume.peso_kg),
          dono_id: formData.dono_id || null,
          tipo_produto_id: volume.tipo_produto_id || null,
          status: "disponivel",
          numero_volume: i + 1,
          custo_unitario_total: custoUnitario,
        });

        if (subloteError) throw subloteError;
      }

      return entrada;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entradas"] });
      queryClient.invalidateQueries({ queryKey: ["sublotes"] });
      toast({ title: "Entrada criada com sucesso!", description: `${volumes.length} volume(s) registrado(s)` });
      onClose();
    },
    onError: (error) => {
      toast({ title: "Erro ao criar entrada", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!formData.tipo_entrada_id) {
      toast({ title: "Selecione o tipo de operação", variant: "destructive" });
      return;
    }
    if (volumes.length === 0) {
      toast({ title: "Adicione ao menos um volume/ticket", variant: "destructive" });
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="info">1. Informações</TabsTrigger>
          <TabsTrigger value="volumes">2. Volumes/Tickets</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Operação *</Label>
              <Select
                value={formData.tipo_entrada_id}
                onValueChange={(v) => setFormData({ ...formData, tipo_entrada_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {tiposEntrada?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Parceiro (Fornecedor/Remetente) *</Label>
              <Select
                value={formData.parceiro_id}
                onValueChange={(v) => setFormData({ ...formData, parceiro_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {fornecedores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Dono do Material</Label>
              <Select
                value={formData.dono_id}
                onValueChange={(v) => setFormData({ ...formData, dono_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {donos?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Número da NF</Label>
              <Input
                value={formData.nota_fiscal}
                onChange={(e) => setFormData({ ...formData, nota_fiscal: e.target.value })}
                placeholder="000000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Emissão</Label>
              <Input
                type="date"
                value={formData.data_entrada}
                onChange={(e) => setFormData({ ...formData, data_entrada: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Peso NF (kg)</Label>
              <Input
                type="number"
                value={formData.peso_nf_kg}
                onChange={(e) => setFormData({ ...formData, peso_nf_kg: e.target.value })}
                placeholder="Peso conforme nota fiscal"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Motorista</Label>
              <Input
                value={formData.motorista}
                onChange={(e) => setFormData({ ...formData, motorista: e.target.value })}
                placeholder="Nome do motorista"
              />
            </div>
            <div className="space-y-2">
              <Label>Placa do Veículo</Label>
              <Input
                value={formData.placa_veiculo}
                onChange={(e) => setFormData({ ...formData, placa_veiculo: e.target.value.toUpperCase() })}
                placeholder="ABC-1234"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Transportadora</Label>
              <Select
                value={formData.transportadora_id}
                onValueChange={(v) => setFormData({ ...formData, transportadora_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {transportadoras.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conferente</Label>
              <Input
                value={profile?.full_name || user?.email || ""}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Input
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Observações gerais..."
            />
          </div>

          <Button className="w-full" onClick={() => setActiveTab("volumes")}>
            Próximo: Adicionar Volumes
          </Button>
        </TabsContent>

        <TabsContent value="volumes" className="space-y-4 pt-4">
          <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
            <Label className="text-base font-medium">Adicionar Volume/Ticket</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
              <div className="space-y-2">
                <Label className="text-sm">Tipo Produto *</Label>
                <Select
                  value={newVolume.tipo_produto_id}
                  onValueChange={(v) => setNewVolume({ ...newVolume, tipo_produto_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposProduto?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Código TKT</Label>
                <Input
                  value={newVolume.codigo}
                  onChange={(e) => setNewVolume({ ...newVolume, codigo: e.target.value })}
                  placeholder="Auto"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Peso (kg) *</Label>
                <Input
                  type="number"
                  value={newVolume.peso_kg}
                  onChange={(e) => setNewVolume({ ...newVolume, peso_kg: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Valor (R$/kg)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={newVolume.valor_unitario}
                    onChange={(e) => setNewVolume({ ...newVolume, valor_unitario: e.target.value })}
                    placeholder="0,00"
                  />
                  <Button onClick={addVolume} className="bg-primary shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {volumes.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Código</TableHead>
                    <TableHead>Tipo Produto</TableHead>
                    <TableHead className="text-right">Peso (kg)</TableHead>
                    <TableHead className="text-right">Valor (R$/kg)</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {volumes.map((volume) => {
                    const peso = parseFloat(volume.peso_kg) || 0;
                    const valor = parseFloat(volume.valor_unitario) || 0;
                    const total = peso * valor;
                    return (
                      <TableRow key={volume.id}>
                        <TableCell className="font-mono text-primary">{volume.codigo}</TableCell>
                        <TableCell>{tiposProduto?.find(t => t.id === volume.tipo_produto_id)?.nome || "—"}</TableCell>
                        <TableCell className="text-right font-medium">{peso.toLocaleString("pt-BR")} kg</TableCell>
                        <TableCell className="text-right">{valor > 0 ? formatCurrency(valor) : "—"}</TableCell>
                        <TableCell className="text-right font-medium">{total > 0 ? formatCurrency(total) : "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeVolume(volume.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/30 font-bold">
                    <TableCell colSpan={2}>TOTAL ({volumes.length} volumes)</TableCell>
                    <TableCell className="text-right">{totalPeso.toLocaleString("pt-BR")} kg</TableCell>
                    <TableCell className="text-right">—</TableCell>
                    <TableCell className="text-right">{totalValor > 0 ? formatCurrency(totalValor) : "—"}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}

          {volumes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum volume adicionado. Adicione pelo menos um volume para continuar.
            </div>
          )}
        </TabsContent>
      </Tabs>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending || volumes.length === 0}
          className="bg-gradient-copper hover:opacity-90"
        >
          {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Criar Entrada ({volumes.length} volumes)
        </Button>
      </DialogFooter>
    </div>
  );
}

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
    tipo_produto_id: "",
    observacoes: "",
  });

  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [newVolume, setNewVolume] = useState({ codigo: "", peso_kg: "" });

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
    const codigo = newVolume.codigo || generateVolumeCode();
    setVolumes([...volumes, { id: crypto.randomUUID(), codigo, peso_kg: newVolume.peso_kg }]);
    setNewVolume({ codigo: "", peso_kg: "" });
  };

  const removeVolume = (id: string) => {
    setVolumes(volumes.filter((v) => v.id !== id));
  };

  const totalPeso = volumes.reduce((acc, v) => acc + (parseFloat(v.peso_kg) || 0), 0);

  const createMutation = useMutation({
    mutationFn: async () => {
      // Gerar código da entrada (lote mãe)
      const codigo = `ENT-${format(new Date(), "yyyyMMdd")}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;
      
      // Criar entrada
      const { data: entrada, error: entradaError } = await supabase
        .from("entradas")
        .insert({
          codigo,
          tipo_material: tiposProduto?.find((t) => t.id === formData.tipo_produto_id)?.nome || "Material",
          peso_bruto_kg: totalPeso,
          peso_liquido_kg: totalPeso,
          peso_nf_kg: parseFloat(formData.peso_nf_kg) || null,
          fornecedor_id: null, // Mantido para compatibilidade
          parceiro_id: formData.parceiro_id || null,
          dono_id: formData.dono_id || null,
          tipo_entrada_id: formData.tipo_entrada_id || null,
          tipo_produto_id: formData.tipo_produto_id || null,
          nota_fiscal: formData.nota_fiscal || null,
          data_entrada: formData.data_entrada,
          motorista: formData.motorista || null,
          placa_veiculo: formData.placa_veiculo || null,
          transportadora_id: formData.transportadora_id || null,
          conferente_id: user?.id || null,
          observacoes: formData.observacoes || null,
          created_by: user?.id,
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
          tipo_produto_id: formData.tipo_produto_id || null,
          status: "disponivel",
          numero_volume: 0, // 0 indica lote mãe
        })
        .select()
        .single();

      if (loteMaeError) throw loteMaeError;

      // Criar sublotes filhos (volumes)
      for (let i = 0; i < volumes.length; i++) {
        const volume = volumes[i];
        const { error: subloteError } = await supabase.from("sublotes").insert({
          codigo: volume.codigo,
          entrada_id: entrada.id,
          lote_pai_id: loteMae.id,
          peso_kg: parseFloat(volume.peso_kg),
          dono_id: formData.dono_id || null,
          tipo_produto_id: formData.tipo_produto_id || null,
          status: "disponivel",
          numero_volume: i + 1,
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
            <Label>Tipo de Produto</Label>
            <Select
              value={formData.tipo_produto_id}
              onValueChange={(v) => setFormData({ ...formData, tipo_produto_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o produto..." />
              </SelectTrigger>
              <SelectContent>
                {tiposProduto?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full" onClick={() => setActiveTab("volumes")}>
            Próximo: Adicionar Volumes
          </Button>
        </TabsContent>

        <TabsContent value="volumes" className="space-y-4 pt-4">
          <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
            <Label className="text-base font-medium">Adicionar Volume/Ticket</Label>
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-2">
                <Label className="text-sm">Código TKT</Label>
                <Input
                  value={newVolume.codigo}
                  onChange={(e) => setNewVolume({ ...newVolume, codigo: e.target.value })}
                  placeholder="Auto (opcional)"
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label className="text-sm">Peso (kg) *</Label>
                <Input
                  type="number"
                  value={newVolume.peso_kg}
                  onChange={(e) => setNewVolume({ ...newVolume, peso_kg: e.target.value })}
                  placeholder="0"
                />
              </div>
              <Button onClick={addVolume} className="bg-primary">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </div>

          {volumes.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Código</TableHead>
                    <TableHead className="text-right">Peso (kg)</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {volumes.map((volume) => (
                    <TableRow key={volume.id}>
                      <TableCell className="font-mono text-primary">{volume.codigo}</TableCell>
                      <TableCell className="text-right font-medium">{parseFloat(volume.peso_kg).toLocaleString("pt-BR")} kg</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeVolume(volume.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30 font-bold">
                    <TableCell>TOTAL ({volumes.length} volumes)</TableCell>
                    <TableCell className="text-right">{totalPeso.toLocaleString("pt-BR")} kg</TableCell>
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

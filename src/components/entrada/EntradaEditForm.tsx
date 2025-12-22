import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface EntradaEditFormProps {
  entrada: any;
  onClose: () => void;
  readOnly?: boolean;
}

export function EntradaEditForm({ entrada, onClose, readOnly = false }: EntradaEditFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("info");

  const [formData, setFormData] = useState({
    tipo_entrada_id: entrada.tipo_entrada_id || "",
    parceiro_id: entrada.parceiro_id || "",
    dono_id: entrada.dono_id || "ibrac",
    nota_fiscal: entrada.nota_fiscal || "",
    data_entrada: entrada.data_entrada || format(new Date(), "yyyy-MM-dd"),
    motorista: entrada.motorista || "",
    placa_veiculo: entrada.placa_veiculo || "",
    transportadora_id: entrada.transportadora_id || "",
    peso_nf_kg: entrada.peso_nf_kg?.toString() || "",
    observacoes: entrada.observacoes || "",
    valor_unitario: entrada.valor_unitario?.toString() || "",
    status: entrada.status || "pendente",
  });

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

  const { data: sublotes } = useQuery({
    queryKey: ["sublotes-entrada", entrada.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sublotes")
        .select("*, tipo_produto:tipos_produto(nome)")
        .eq("entrada_id", entrada.id)
        .gt("numero_volume", 0)
        .order("numero_volume");
      if (error) throw error;
      return data;
    },
  });

  const fornecedores = parceiros?.filter((p) => p.is_fornecedor) || [];
  const transportadoras = parceiros?.filter((p) => p.is_transportadora) || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("entradas")
        .update({
          tipo_entrada_id: formData.tipo_entrada_id || null,
          parceiro_id: formData.parceiro_id || null,
          dono_id: formData.dono_id === "ibrac" ? null : formData.dono_id || null,
          nota_fiscal: formData.nota_fiscal || null,
          data_entrada: formData.data_entrada,
          motorista: formData.motorista || null,
          placa_veiculo: formData.placa_veiculo || null,
          transportadora_id: formData.transportadora_id || null,
          peso_nf_kg: parseFloat(formData.peso_nf_kg) || null,
          observacoes: formData.observacoes || null,
          valor_unitario: parseFloat(formData.valor_unitario) || null,
          status: formData.status,
        })
        .eq("id", entrada.id);
      if (error) throw error;

      // Atualizar dono nos sublotes se mudou
      if (formData.dono_id !== entrada.dono_id) {
        await supabase
          .from("sublotes")
          .update({ dono_id: formData.dono_id === "ibrac" ? null : formData.dono_id || null })
          .eq("entrada_id", entrada.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entradas"] });
      queryClient.invalidateQueries({ queryKey: ["sublotes"] });
      toast({ title: "Entrada atualizada com sucesso!" });
      onClose();
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="volumes">Volumes ({sublotes?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input value={entrada.codigo} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="conferido">Conferido</SelectItem>
                  <SelectItem value="processando">Processando</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Operação</Label>
              <Select
                value={formData.tipo_entrada_id}
                onValueChange={(v) => setFormData({ ...formData, tipo_entrada_id: v })}
                disabled={readOnly}
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
              <Label>Parceiro (Fornecedor)</Label>
              <Select
                value={formData.parceiro_id}
                onValueChange={(v) => setFormData({ ...formData, parceiro_id: v })}
                disabled={readOnly}
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
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="IBRAC (Próprio)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ibrac">IBRAC (Próprio)</SelectItem>
                  {donos?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nota Fiscal</Label>
              <Input
                value={formData.nota_fiscal}
                onChange={(e) => setFormData({ ...formData, nota_fiscal: e.target.value })}
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Entrada</Label>
              <Input
                type="date"
                value={formData.data_entrada}
                onChange={(e) => setFormData({ ...formData, data_entrada: e.target.value })}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Unitário (R$/kg)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.valor_unitario}
                onChange={(e) => setFormData({ ...formData, valor_unitario: e.target.value })}
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Motorista</Label>
              <Input
                value={formData.motorista}
                onChange={(e) => setFormData({ ...formData, motorista: e.target.value })}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Placa do Veículo</Label>
              <Input
                value={formData.placa_veiculo}
                onChange={(e) => setFormData({ ...formData, placa_veiculo: e.target.value.toUpperCase() })}
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Transportadora</Label>
            <Select
              value={formData.transportadora_id}
              onValueChange={(v) => setFormData({ ...formData, transportadora_id: v })}
              disabled={readOnly}
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
            <Label>Observações</Label>
              <Input
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                disabled={readOnly}
              />
          </div>
        </TabsContent>

        <TabsContent value="volumes" className="pt-4">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Volume</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo Produto</TableHead>
                  <TableHead className="text-right">Peso (kg)</TableHead>
                  <TableHead className="text-right">Custo/kg</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sublotes?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum volume registrado
                    </TableCell>
                  </TableRow>
                ) : (
                  sublotes?.map((sublote) => (
                    <TableRow key={sublote.id}>
                      <TableCell>#{sublote.numero_volume}</TableCell>
                      <TableCell className="font-mono text-primary">{sublote.codigo}</TableCell>
                      <TableCell>{sublote.tipo_produto?.nome || "—"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {sublote.peso_kg.toLocaleString("pt-BR")} kg
                      </TableCell>
                      <TableCell className="text-right">
                        {sublote.custo_unitario_total ? formatCurrency(sublote.custo_unitario_total) : "—"}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs">{sublote.status}</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {readOnly ? "Fechar" : "Cancelar"}
        </Button>
        {!readOnly && (
          <Button 
            onClick={() => updateMutation.mutate()} 
            disabled={updateMutation.isPending}
            className="bg-gradient-copper"
          >
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SaidaEditFormProps {
  saida: any;
  onClose: () => void;
}

export function SaidaEditForm({ saida, onClose }: SaidaEditFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("info");

  const [formData, setFormData] = useState({
    tipo_saida_id: saida.tipo_saida_id || "",
    cliente_id: saida.cliente_id || "",
    nota_fiscal: saida.nota_fiscal || "",
    valor_unitario: saida.valor_unitario?.toString() || "",
    custos_cobrados: saida.custos_cobrados?.toString() || "",
    motorista: saida.motorista || "",
    placa_veiculo: saida.placa_veiculo || "",
    transportadora_id: saida.transportadora_id || "",
    observacoes: saida.observacoes || "",
    status: saida.status || "pendente",
  });

  const { data: tiposSaida } = useQuery({
    queryKey: ["tipos_saida"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tipos_saida").select("*").eq("ativo", true).order("nome");
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

  const { data: itensSaida } = useQuery({
    queryKey: ["itens-saida", saida.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saida_itens")
        .select("*, sublote:sublotes!fk_saida_itens_sublote(codigo, tipo_produto:tipos_produto!fk_sublotes_tipo_produto(nome), dono:donos_material!fk_sublotes_dono(nome))")
        .eq("saida_id", saida.id);
      if (error) throw error;
      return data;
    },
  });

  const clientes = parceiros?.filter((p) => p.is_cliente) || [];
  const transportadoras = parceiros?.filter((p) => p.is_transportadora) || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const formatWeight = (kg: number) => {
    return kg >= 1000 ? `${(kg / 1000).toFixed(2)} t` : `${kg.toFixed(2)} kg`;
  };

  const valorUnitario = parseFloat(formData.valor_unitario) || 0;
  const valorTotal = saida.peso_total_kg * valorUnitario;
  const custosTotal = parseFloat(formData.custos_cobrados) || 0;
  const valorFinal = valorTotal - custosTotal;

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("saidas")
        .update({
          tipo_saida_id: formData.tipo_saida_id || null,
          cliente_id: formData.cliente_id || null,
          nota_fiscal: formData.nota_fiscal || null,
          valor_unitario: parseFloat(formData.valor_unitario) || null,
          valor_total: valorTotal || null,
          valor_repasse_dono: valorFinal || null,
          custos_cobrados: custosTotal || null,
          motorista: formData.motorista || null,
          placa_veiculo: formData.placa_veiculo || null,
          transportadora_id: formData.transportadora_id || null,
          observacoes: formData.observacoes || null,
          status: formData.status,
        })
        .eq("id", saida.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saidas"] });
      toast({ title: "Saída atualizada com sucesso!" });
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
          <TabsTrigger value="itens">Itens ({itensSaida?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input value={saida.codigo} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="processando">Processando</SelectItem>
                  <SelectItem value="finalizada">Finalizada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Saída</Label>
              <Select
                value={formData.tipo_saida_id}
                onValueChange={(v) => setFormData({ ...formData, tipo_saida_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {tiposSaida?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={formData.cliente_id}
                onValueChange={(v) => setFormData({ ...formData, cliente_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nota Fiscal</Label>
              <Input
                value={formData.nota_fiscal}
                onChange={(e) => setFormData({ ...formData, nota_fiscal: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Peso Total</Label>
              <Input value={formatWeight(saida.peso_total_kg)} disabled className="bg-muted" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
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
              <Label>Custos Cobrados</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.custos_cobrados}
                onChange={(e) => setFormData({ ...formData, custos_cobrados: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Total</Label>
              <Input value={formatCurrency(valorTotal)} disabled className="bg-muted" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Motorista</Label>
              <Input
                value={formData.motorista}
                onChange={(e) => setFormData({ ...formData, motorista: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Placa do Veículo</Label>
              <Input
                value={formData.placa_veiculo}
                onChange={(e) => setFormData({ ...formData, placa_veiculo: e.target.value.toUpperCase() })}
              />
            </div>
          </div>

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
            <Label>Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={3}
            />
          </div>
        </TabsContent>

        <TabsContent value="itens" className="pt-4">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo Produto</TableHead>
                  <TableHead>Dono</TableHead>
                  <TableHead className="text-right">Peso (kg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itensSaida?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nenhum item registrado
                    </TableCell>
                  </TableRow>
                ) : (
                  itensSaida?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-primary">{item.sublote?.codigo}</TableCell>
                      <TableCell>{item.sublote?.tipo_produto?.nome || "—"}</TableCell>
                      <TableCell>{item.sublote?.dono?.nome || "IBRAC"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {item.peso_kg.toLocaleString("pt-BR")} kg
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
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button 
          onClick={() => updateMutation.mutate()} 
          disabled={updateMutation.isPending}
          className="bg-gradient-copper"
        >
          {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Alterações
        </Button>
      </DialogFooter>
    </div>
  );
}

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

interface BeneficiamentoEditFormProps {
  beneficiamento: any;
  onClose: () => void;
  readOnly?: boolean;
}

export function BeneficiamentoEditForm({ beneficiamento, onClose, readOnly = false }: BeneficiamentoEditFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("info");

  const [formData, setFormData] = useState({
    processo_id: beneficiamento.processo_id || "",
    tipo_beneficiamento: beneficiamento.tipo_beneficiamento || "interno",
    fornecedor_terceiro_id: beneficiamento.fornecedor_terceiro_id || "",
    custo_frete_ida: beneficiamento.custo_frete_ida?.toString() || "0",
    custo_frete_volta: beneficiamento.custo_frete_volta?.toString() || "0",
    custo_mo_terceiro: beneficiamento.custo_mo_terceiro?.toString() || "0",
    custo_mo_ibrac: beneficiamento.custo_mo_ibrac?.toString() || "0",
    taxa_financeira_pct: beneficiamento.taxa_financeira_pct?.toString() || "0",
    perda_real_pct: beneficiamento.perda_real_pct?.toString() || "0",
    perda_cobrada_pct: beneficiamento.perda_cobrada_pct?.toString() || "0",
    motorista: beneficiamento.motorista || "",
    placa_veiculo: beneficiamento.placa_veiculo || "",
    transportadora_id: beneficiamento.transportadora_id || "",
    observacoes: beneficiamento.observacoes || "",
    status: beneficiamento.status || "em_andamento",
  });

  // Calcular custo por kg para exibição
  const pesoEntrada = beneficiamento.peso_entrada_kg || 1;

  const { data: processos } = useQuery({
    queryKey: ["processos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("processos").select("*").eq("ativo", true).order("nome");
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

  const { data: itensEntrada } = useQuery({
    queryKey: ["itens-entrada-benef", beneficiamento.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamento_itens_entrada")
        .select("*, sublote:sublotes(codigo, peso_kg, tipo_produto:tipos_produto(nome), dono:donos_material(nome))")
        .eq("beneficiamento_id", beneficiamento.id);
      if (error) throw error;
      return data;
    },
  });

  const fornecedores = parceiros?.filter((p) => p.is_fornecedor) || [];
  const transportadoras = parceiros?.filter((p) => p.is_transportadora) || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const formatWeight = (kg: number) => {
    return kg >= 1000 ? `${(kg / 1000).toFixed(2)} t` : `${kg.toFixed(2)} kg`;
  };

  const custoTotal = (parseFloat(formData.custo_frete_ida) || 0) +
                     (parseFloat(formData.custo_frete_volta) || 0) +
                     (parseFloat(formData.custo_mo_terceiro) || 0) +
                     (parseFloat(formData.custo_mo_ibrac) || 0);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("beneficiamentos")
        .update({
          processo_id: formData.processo_id || null,
          tipo_beneficiamento: formData.tipo_beneficiamento,
          fornecedor_terceiro_id: formData.fornecedor_terceiro_id || null,
          custo_frete_ida: parseFloat(formData.custo_frete_ida) || 0,
          custo_frete_volta: parseFloat(formData.custo_frete_volta) || 0,
          custo_mo_terceiro: parseFloat(formData.custo_mo_terceiro) || 0,
          custo_mo_ibrac: parseFloat(formData.custo_mo_ibrac) || 0,
          taxa_financeira_pct: parseFloat(formData.taxa_financeira_pct) || 0,
          perda_real_pct: parseFloat(formData.perda_real_pct) || 0,
          perda_cobrada_pct: parseFloat(formData.perda_cobrada_pct) || 0,
          motorista: formData.motorista || null,
          placa_veiculo: formData.placa_veiculo || null,
          transportadora_id: formData.transportadora_id || null,
          observacoes: formData.observacoes || null,
          status: formData.status,
        })
        .eq("id", beneficiamento.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiamentos"] });
      toast({ title: "Beneficiamento atualizado com sucesso!" });
      onClose();
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="custos">Custos</TabsTrigger>
          <TabsTrigger value="itens">Itens ({itensEntrada?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input value={beneficiamento.codigo} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
                disabled={readOnly}
              >
                <SelectTrigger className={readOnly ? "bg-muted" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Processo</Label>
              <Select
                value={formData.processo_id}
                onValueChange={(v) => setFormData({ ...formData, processo_id: v })}
                disabled={readOnly}
              >
                <SelectTrigger className={readOnly ? "bg-muted" : ""}>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {processos?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Beneficiamento</Label>
              <Select
                value={formData.tipo_beneficiamento}
                onValueChange={(v) => setFormData({ ...formData, tipo_beneficiamento: v })}
                disabled={readOnly}
              >
                <SelectTrigger className={readOnly ? "bg-muted" : ""}>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interno">Interno</SelectItem>
                  <SelectItem value="terceiro">Terceiro</SelectItem>
                  <SelectItem value="externo">Externo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.tipo_beneficiamento === "terceiro" && (
            <div className="space-y-2">
              <Label>Fornecedor Terceiro</Label>
              <Select
                value={formData.fornecedor_terceiro_id}
                onValueChange={(v) => setFormData({ ...formData, fornecedor_terceiro_id: v })}
                disabled={readOnly}
              >
                <SelectTrigger className={readOnly ? "bg-muted" : ""}>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {fornecedores.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Peso Entrada</Label>
              <Input value={formatWeight(beneficiamento.peso_entrada_kg || 0)} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Peso Saída Estimado</Label>
              <Input value={formatWeight(beneficiamento.peso_saida_kg || 0)} disabled className="bg-muted" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Motorista</Label>
              <Input
                value={formData.motorista}
                onChange={(e) => setFormData({ ...formData, motorista: e.target.value })}
                disabled={readOnly}
                className={readOnly ? "bg-muted" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Placa do Veículo</Label>
              <Input
                value={formData.placa_veiculo}
                onChange={(e) => setFormData({ ...formData, placa_veiculo: e.target.value.toUpperCase() })}
                disabled={readOnly}
                className={readOnly ? "bg-muted" : ""}
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
              <SelectTrigger className={readOnly ? "bg-muted" : ""}>
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
              disabled={readOnly}
              className={readOnly ? "bg-muted" : ""}
            />
          </div>
        </TabsContent>

        <TabsContent value="custos" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Custo Frete Ida (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.custo_frete_ida}
                onChange={(e) => setFormData({ ...formData, custo_frete_ida: e.target.value })}
                disabled={readOnly}
                className={readOnly ? "bg-muted" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Custo Frete Volta (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.custo_frete_volta}
                onChange={(e) => setFormData({ ...formData, custo_frete_volta: e.target.value })}
                disabled={readOnly}
                className={readOnly ? "bg-muted" : ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Custo MO Terceiro (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.custo_mo_terceiro}
                onChange={(e) => setFormData({ ...formData, custo_mo_terceiro: e.target.value })}
                disabled={readOnly}
                className={readOnly ? "bg-muted" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Custo MO IBRAC (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.custo_mo_ibrac}
                onChange={(e) => setFormData({ ...formData, custo_mo_ibrac: e.target.value })}
                disabled={readOnly}
                className={readOnly ? "bg-muted" : ""}
              />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Custo Total</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(custoTotal)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">R$/kg</p>
                <p className="text-lg font-semibold">{formatCurrency(custoTotal / pesoEntrada)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Taxa Financeira (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.taxa_financeira_pct}
                onChange={(e) => setFormData({ ...formData, taxa_financeira_pct: e.target.value })}
                disabled={readOnly}
                className={readOnly ? "bg-muted" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Perda Real (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.perda_real_pct}
                onChange={(e) => setFormData({ ...formData, perda_real_pct: e.target.value })}
                disabled={readOnly}
                className={readOnly ? "bg-muted" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Perda Cobrada (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.perda_cobrada_pct}
                onChange={(e) => setFormData({ ...formData, perda_cobrada_pct: e.target.value })}
                disabled={readOnly}
                className={readOnly ? "bg-muted" : ""}
              />
            </div>
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
                  <TableHead className="text-right">Peso Entrada</TableHead>
                  <TableHead className="text-right">Saldo Atual</TableHead>
                  <TableHead className="text-right">Custo/kg</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itensEntrada?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum item registrado
                    </TableCell>
                  </TableRow>
                ) : (
                  itensEntrada?.map((item) => {
                    const pesoEntradaItem = item.peso_kg; // peso registrado na entrada do beneficiamento
                    const saldoAtual = item.sublote?.peso_kg || 0; // peso atual do sublote (pode ser 0 se consumido)
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-primary">{item.sublote?.codigo}</TableCell>
                        <TableCell>{item.sublote?.tipo_produto?.nome || "—"}</TableCell>
                        <TableCell>{item.sublote?.dono?.nome || "IBRAC"}</TableCell>
                        <TableCell className="text-right font-medium">
                          {pesoEntradaItem.toLocaleString("pt-BR")} kg
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={saldoAtual === 0 ? "text-muted-foreground" : ""}>
                            {saldoAtual.toLocaleString("pt-BR")} kg
                          </span>
                          {saldoAtual === 0 && (
                            <span className="ml-1 text-xs text-success">(consumido)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.custo_unitario ? formatCurrency(item.custo_unitario) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>{readOnly ? "Fechar" : "Cancelar"}</Button>
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

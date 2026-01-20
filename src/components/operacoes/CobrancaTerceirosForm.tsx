import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface CobrancaTerceiros {
  id: string;
  dt: string;
  documento: string | null;
  tipo: string | null;
  val: number | null;
  mode: string | null;
  base_kg_mode: string | null;
  tipo_pagamento: string | null;
  kg_cobre_recebido: number | null;
  valor_ref_cobre_rkg: number | null;
}

interface CobrancaTerceirosFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operacaoId: string;
  editData?: CobrancaTerceiros | null;
}

export function CobrancaTerceirosForm({ open, onOpenChange, operacaoId, editData }: CobrancaTerceirosFormProps) {
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState({
    dt: format(new Date(), "yyyy-MM-dd"),
    documento: "",
    tipo: "MO",
    val: 0,
    mode: "RKG",
    base_kg_mode: "DEVOLVIDO",
    tipo_pagamento: "DINHEIRO",
    kg_cobre_recebido: 0,
    valor_ref_cobre_rkg: 0,
  });

  useEffect(() => {
    if (open) {
      if (editData) {
        setForm({
          dt: editData.dt,
          documento: editData.documento || "",
          tipo: editData.tipo || "MO",
          val: editData.val || 0,
          mode: editData.mode || "RKG",
          base_kg_mode: editData.base_kg_mode || "DEVOLVIDO",
          tipo_pagamento: editData.tipo_pagamento || "DINHEIRO",
          kg_cobre_recebido: editData.kg_cobre_recebido || 0,
          valor_ref_cobre_rkg: editData.valor_ref_cobre_rkg || 0,
        });
      } else {
        resetForm();
      }
    }
  }, [open, editData]);

  const valorCobreEquivalente = form.kg_cobre_recebido * form.valor_ref_cobre_rkg;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        dt: form.dt,
        documento: form.documento || null,
        tipo: form.tipo,
        val: form.val,
        mode: form.mode,
        base_kg_mode: form.base_kg_mode,
        tipo_pagamento: form.tipo_pagamento,
        kg_cobre_recebido: form.tipo_pagamento === "COBRE" ? form.kg_cobre_recebido : 0,
        valor_ref_cobre_rkg: form.tipo_pagamento === "COBRE" ? form.valor_ref_cobre_rkg : 0,
      };

      if (editData) {
        const { error } = await supabase.from("cobrancas_servico_terceiros").update(payload).eq("id", editData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cobrancas_servico_terceiros").insert({ ...payload, operacao_id: operacaoId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cobrancas_terceiros"] });
      toast({ title: editData ? "Cobrança atualizada!" : "Cobrança registrada!" });
      onOpenChange(false);
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setForm({
      dt: format(new Date(), "yyyy-MM-dd"),
      documento: "",
      tipo: "MO",
      val: 0,
      mode: "RKG",
      base_kg_mode: "DEVOLVIDO",
      tipo_pagamento: "DINHEIRO",
      kg_cobre_recebido: 0,
      valor_ref_cobre_rkg: 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editData ? "Editar Cobrança" : "Nova Cobrança de Serviço"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.dt} onChange={(e) => setForm({ ...form, dt: e.target.value })} />
            </div>
            <div>
              <Label>Documento</Label>
              <Input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} placeholder="NF Serviço" />
            </div>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MO">Mão de Obra</SelectItem>
                <SelectItem value="FRETE">Frete</SelectItem>
                <SelectItem value="SERVICO_ADICIONAL">Serviço Adicional</SelectItem>
                <SelectItem value="COMISSAO">Comissão</SelectItem>
                <SelectItem value="OUTROS">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Valor</Label>
              <Input type="number" step="0.01" value={form.val} onChange={(e) => setForm({ ...form, val: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Modo</Label>
              <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RKG">R$/kg</SelectItem>
                  <SelectItem value="TOTAL">Total R$</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Base Kg</Label>
            <Select value={form.base_kg_mode} onValueChange={(v) => setForm({ ...form, base_kg_mode: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DEVOLVIDO">Kg Devolvido</SelectItem>
                <SelectItem value="RECEBIDO">Kg Recebido</SelectItem>
                <SelectItem value="BENEFICIADO">Kg Beneficiado</SelectItem>
                <SelectItem value="RETORNADO">Kg Retornado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-4">
            <Label>Tipo de Pagamento</Label>
            <Select value={form.tipo_pagamento} onValueChange={(v) => setForm({ ...form, tipo_pagamento: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DINHEIRO">Dinheiro (R$)</SelectItem>
                <SelectItem value="COBRE">Cobre (Material)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.tipo_pagamento === "COBRE" && (
            <div className="space-y-3 p-3 bg-muted rounded-lg">
              <h4 className="font-medium text-sm">Pagamento em Cobre</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Kg Cobre Recebido</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={form.kg_cobre_recebido} 
                    onChange={(e) => setForm({ ...form, kg_cobre_recebido: Number(e.target.value) })} 
                  />
                </div>
                <div>
                  <Label>Valor Ref. (R$/kg)</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={form.valor_ref_cobre_rkg} 
                    onChange={(e) => setForm({ ...form, valor_ref_cobre_rkg: Number(e.target.value) })} 
                  />
                </div>
              </div>
              {valorCobreEquivalente > 0 && (
                <p className="text-sm">
                  Valor equivalente: <strong>R$ {valorCobreEquivalente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                </p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || form.val <= 0}>
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editData ? "Salvar" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

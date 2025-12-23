import { useState } from "react";
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

interface CobrancaTerceirosFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operacaoId: string;
}

export function CobrancaTerceirosForm({ open, onOpenChange, operacaoId }: CobrancaTerceirosFormProps) {
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState({
    dt: format(new Date(), "yyyy-MM-dd"),
    documento: "",
    tipo: "MO",
    val: 0,
    mode: "RKG",
    base_kg_mode: "DEVOLVIDO",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("cobrancas_servico_terceiros").insert({
        operacao_id: operacaoId,
        dt: form.dt,
        documento: form.documento || null,
        tipo: form.tipo,
        val: form.val,
        mode: form.mode,
        base_kg_mode: form.base_kg_mode,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cobrancas_terceiros"] });
      toast({ title: "Cobrança registrada!" });
      onOpenChange(false);
      resetForm();
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
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Cobrança de Serviço</DialogTitle>
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
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || form.val <= 0}>
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

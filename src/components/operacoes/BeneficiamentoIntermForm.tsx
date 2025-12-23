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

interface BeneficiamentoIntermFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operacaoId: string;
  kgDisponivel: number;
}

export function BeneficiamentoIntermForm({ open, onOpenChange, operacaoId, kgDisponivel }: BeneficiamentoIntermFormProps) {
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState({
    dt: format(new Date(), "yyyy-MM-dd"),
    documento: "",
    kg_retornado: 0,
    mo_benef_val: 0,
    mo_benef_mode: "TOTAL",
    frete_ida_val: 0,
    frete_ida_mode: "TOTAL",
    frete_volta_val: 0,
    frete_volta_mode: "TOTAL",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("beneficiamentos_intermediacao").insert({
        operacao_id: operacaoId,
        dt: form.dt,
        documento: form.documento || null,
        kg_retornado: form.kg_retornado,
        mo_benef_val: form.mo_benef_val,
        mo_benef_mode: form.mo_benef_mode,
        frete_ida_val: form.frete_ida_val,
        frete_ida_mode: form.frete_ida_mode,
        frete_volta_val: form.frete_volta_val,
        frete_volta_mode: form.frete_volta_mode,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiamentos_intermediacao"] });
      queryClient.invalidateQueries({ queryKey: ["compras_intermediacao"] });
      onOpenChange(false);
      toast({ title: "Beneficiamento registrado!" });
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Beneficiamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg text-sm">
            Material disponível: <strong>{kgDisponivel.toLocaleString()} kg</strong>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.dt} onChange={(e) => setForm({ ...form, dt: e.target.value })} />
            </div>
            <div>
              <Label>Documento</Label>
              <Input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
            </div>
          </div>

          <div>
            <Label>Kg Retornado (vergalhão)</Label>
            <Input 
              type="number" 
              value={form.kg_retornado} 
              onChange={(e) => setForm({ ...form, kg_retornado: Number(e.target.value) })}
              max={kgDisponivel}
            />
            {form.kg_retornado > kgDisponivel && (
              <p className="text-xs text-destructive mt-1">Excede disponível</p>
            )}
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Custos de Beneficiamento</h4>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>Mão de Obra</Label>
                  <Input type="number" step="0.01" value={form.mo_benef_val} onChange={(e) => setForm({ ...form, mo_benef_val: Number(e.target.value) })} />
                </div>
                <div className="w-24">
                  <Label>Modo</Label>
                  <Select value={form.mo_benef_mode} onValueChange={(v) => setForm({ ...form, mo_benef_mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RKG">R$/kg</SelectItem>
                      <SelectItem value="TOTAL">Total</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>Frete Ida</Label>
                  <Input type="number" step="0.01" value={form.frete_ida_val} onChange={(e) => setForm({ ...form, frete_ida_val: Number(e.target.value) })} />
                </div>
                <div className="w-24">
                  <Label>Modo</Label>
                  <Select value={form.frete_ida_mode} onValueChange={(v) => setForm({ ...form, frete_ida_mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RKG">R$/kg</SelectItem>
                      <SelectItem value="TOTAL">Total</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>Frete Volta</Label>
                  <Input type="number" step="0.01" value={form.frete_volta_val} onChange={(e) => setForm({ ...form, frete_volta_val: Number(e.target.value) })} />
                </div>
                <div className="w-24">
                  <Label>Modo</Label>
                  <Select value={form.frete_volta_mode} onValueChange={(v) => setForm({ ...form, frete_volta_mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RKG">R$/kg</SelectItem>
                      <SelectItem value="TOTAL">Total</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button 
            onClick={() => createMutation.mutate()} 
            disabled={createMutation.isPending || form.kg_retornado <= 0 || form.kg_retornado > kgDisponivel}
          >
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

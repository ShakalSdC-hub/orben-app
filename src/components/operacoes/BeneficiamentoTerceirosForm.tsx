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

interface BeneficiamentoTerceiros {
  id: string;
  dt: string;
  documento: string | null;
  kg_retornado: number;
  mo_terceiro_val: number | null;
  mo_terceiro_mode: string | null;
  mo_ibrac_val: number | null;
  mo_ibrac_mode: string | null;
  frete_ida_val: number | null;
  frete_ida_mode: string | null;
  frete_volta_val: number | null;
  frete_volta_mode: string | null;
}

interface BeneficiamentoTerceirosFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operacaoId: string;
  kgDisponivel: number;
  editData?: BeneficiamentoTerceiros | null;
}

export function BeneficiamentoTerceirosForm({ open, onOpenChange, operacaoId, kgDisponivel, editData }: BeneficiamentoTerceirosFormProps) {
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState({
    dt: format(new Date(), "yyyy-MM-dd"),
    documento: "",
    kg_retornado: 0,
    mo_terceiro_val: 0,
    mo_terceiro_mode: "RKG",
    mo_ibrac_val: 0,
    mo_ibrac_mode: "RKG",
    frete_ida_val: 0,
    frete_ida_mode: "RKG",
    frete_volta_val: 0,
    frete_volta_mode: "RKG",
  });

  useEffect(() => {
    if (open) {
      if (editData) {
        setForm({
          dt: editData.dt,
          documento: editData.documento || "",
          kg_retornado: editData.kg_retornado,
          mo_terceiro_val: editData.mo_terceiro_val || 0,
          mo_terceiro_mode: editData.mo_terceiro_mode || "RKG",
          mo_ibrac_val: editData.mo_ibrac_val || 0,
          mo_ibrac_mode: editData.mo_ibrac_mode || "RKG",
          frete_ida_val: editData.frete_ida_val || 0,
          frete_ida_mode: editData.frete_ida_mode || "RKG",
          frete_volta_val: editData.frete_volta_val || 0,
          frete_volta_mode: editData.frete_volta_mode || "RKG",
        });
      } else {
        resetForm();
      }
    }
  }, [open, editData]);

  const kgMaximo = editData ? kgDisponivel + editData.kg_retornado : kgDisponivel;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (form.kg_retornado > kgMaximo) {
        throw new Error(`Kg retornado não pode exceder saldo disponível (${kgMaximo} kg)`);
      }
      const payload = {
        dt: form.dt,
        documento: form.documento || null,
        kg_retornado: form.kg_retornado,
        mo_terceiro_val: form.mo_terceiro_val,
        mo_terceiro_mode: form.mo_terceiro_mode,
        mo_ibrac_val: form.mo_ibrac_val,
        mo_ibrac_mode: form.mo_ibrac_mode,
        frete_ida_val: form.frete_ida_val,
        frete_ida_mode: form.frete_ida_mode,
        frete_volta_val: form.frete_volta_val,
        frete_volta_mode: form.frete_volta_mode,
      };

      if (editData) {
        const { error } = await supabase.from("beneficiamentos_terceiros").update(payload).eq("id", editData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("beneficiamentos_terceiros").insert({ ...payload, operacao_id: operacaoId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiamentos_terceiros"] });
      queryClient.invalidateQueries({ queryKey: ["entradas_terceiros"] });
      toast({ title: editData ? "Beneficiamento atualizado!" : "Beneficiamento registrado!" });
      onOpenChange(false);
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setForm({
      dt: format(new Date(), "yyyy-MM-dd"),
      documento: "",
      kg_retornado: 0,
      mo_terceiro_val: 0,
      mo_terceiro_mode: "RKG",
      mo_ibrac_val: 0,
      mo_ibrac_mode: "RKG",
      frete_ida_val: 0,
      frete_ida_mode: "RKG",
      frete_volta_val: 0,
      frete_volta_mode: "RKG",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editData ? "Editar Beneficiamento" : "Novo Beneficiamento (Terceiros)"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.dt} onChange={(e) => setForm({ ...form, dt: e.target.value })} />
            </div>
            <div>
              <Label>Documento</Label>
              <Input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} placeholder="NF, CT-e, etc." />
            </div>
          </div>
          <div>
            <Label>Kg Retornado (máx: {kgMaximo.toLocaleString("pt-BR")} kg)</Label>
            <Input type="number" value={form.kg_retornado} onChange={(e) => setForm({ ...form, kg_retornado: Number(e.target.value) })} />
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Custos do Serviço</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label>MO Terceiro</Label>
                  <Input type="number" step="0.01" value={form.mo_terceiro_val} onChange={(e) => setForm({ ...form, mo_terceiro_val: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Modo</Label>
                  <Select value={form.mo_terceiro_mode} onValueChange={(v) => setForm({ ...form, mo_terceiro_mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RKG">R$/kg</SelectItem>
                      <SelectItem value="TOTAL">Total</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label>MO IBRAC</Label>
                  <Input type="number" step="0.01" value={form.mo_ibrac_val} onChange={(e) => setForm({ ...form, mo_ibrac_val: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Modo</Label>
                  <Select value={form.mo_ibrac_mode} onValueChange={(v) => setForm({ ...form, mo_ibrac_mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RKG">R$/kg</SelectItem>
                      <SelectItem value="TOTAL">Total</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label>Frete Ida</Label>
                  <Input type="number" step="0.01" value={form.frete_ida_val} onChange={(e) => setForm({ ...form, frete_ida_val: Number(e.target.value) })} />
                </div>
                <div>
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
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label>Frete Volta</Label>
                  <Input type="number" step="0.01" value={form.frete_volta_val} onChange={(e) => setForm({ ...form, frete_volta_val: Number(e.target.value) })} />
                </div>
                <div>
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
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || form.kg_retornado <= 0 || form.kg_retornado > kgMaximo}>
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editData ? "Salvar" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

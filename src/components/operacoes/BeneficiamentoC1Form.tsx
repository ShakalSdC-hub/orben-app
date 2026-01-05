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

interface BeneficiamentoC1 {
  id: string;
  dt: string;
  documento?: string | null;
  kg_retornado: number;
  mo_benef_val?: number | null;
  mo_benef_mode?: string | null;
  frete_ida_val?: number | null;
  frete_ida_mode?: string | null;
  frete_volta_val?: number | null;
  frete_volta_mode?: string | null;
  benchmark_vergalhao_rkg?: number | null;
}

interface BeneficiamentoC1FormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operacaoId: string;
  kgDisponivel: number;
  editData?: BeneficiamentoC1 | null;
}

export function BeneficiamentoC1Form({ open, onOpenChange, operacaoId, kgDisponivel, editData }: BeneficiamentoC1FormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!editData;
  
  const [form, setForm] = useState({
    dt: format(new Date(), "yyyy-MM-dd"),
    documento: "",
    kg_retornado: 0,
    mo_benef_val: 0,
    mo_benef_mode: "RKG",
    frete_ida_val: 0,
    frete_ida_mode: "RKG",
    frete_volta_val: 0,
    frete_volta_mode: "RKG",
    benchmark_vergalhao_rkg: 0,
  });

  // Reset form when dialog opens/closes or editData changes
  useEffect(() => {
    if (open && editData) {
      setForm({
        dt: editData.dt || format(new Date(), "yyyy-MM-dd"),
        documento: editData.documento || "",
        kg_retornado: editData.kg_retornado || 0,
        mo_benef_val: editData.mo_benef_val || 0,
        mo_benef_mode: editData.mo_benef_mode || "RKG",
        frete_ida_val: editData.frete_ida_val || 0,
        frete_ida_mode: editData.frete_ida_mode || "RKG",
        frete_volta_val: editData.frete_volta_val || 0,
        frete_volta_mode: editData.frete_volta_mode || "RKG",
        benchmark_vergalhao_rkg: editData.benchmark_vergalhao_rkg || 0,
      });
    } else if (open && !editData) {
      setForm({
        dt: format(new Date(), "yyyy-MM-dd"),
        documento: "",
        kg_retornado: 0,
        mo_benef_val: 0,
        mo_benef_mode: "RKG",
        frete_ida_val: 0,
        frete_ida_mode: "RKG",
        frete_volta_val: 0,
        frete_volta_mode: "RKG",
        benchmark_vergalhao_rkg: 0,
      });
    }
  }, [open, editData]);

  // Calcular kg máximo disponível para edição (considera o próprio registro)
  const kgMaximo = isEditing && editData ? kgDisponivel + editData.kg_retornado : kgDisponivel;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
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
        benchmark_vergalhao_rkg: form.benchmark_vergalhao_rkg || null,
      };

      if (isEditing && editData) {
        const { error } = await supabase.from("beneficiamentos_c1").update(payload).eq("id", editData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("beneficiamentos_c1").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiamentos_c1"] });
      queryClient.invalidateQueries({ queryKey: ["entradas_c1"] });
      queryClient.invalidateQueries({ queryKey: ["saidas_c1"] });
      onOpenChange(false);
      toast({ title: isEditing ? "Beneficiamento atualizado!" : "Beneficiamento registrado!" });
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Beneficiamento" : "Novo Beneficiamento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg text-sm">
            Kg disponível para beneficiamento: <strong>{kgMaximo.toLocaleString()} kg</strong>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.dt} onChange={(e) => setForm({ ...form, dt: e.target.value })} />
            </div>
            <div>
              <Label>Documento</Label>
              <Input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} placeholder="NF retorno" />
            </div>
          </div>

          <div>
            <Label>Kg Retornado (vergalhão)</Label>
            <Input 
              type="number" 
              value={form.kg_retornado} 
              onChange={(e) => setForm({ ...form, kg_retornado: Number(e.target.value) })}
              max={kgMaximo}
            />
            {form.kg_retornado > kgMaximo && (
              <p className="text-xs text-destructive mt-1">Excede o saldo disponível</p>
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

          <div>
            <Label>Benchmark Vergalhão (R$/kg)</Label>
            <Input 
              type="number" 
              step="0.01"
              value={form.benchmark_vergalhao_rkg} 
              onChange={(e) => setForm({ ...form, benchmark_vergalhao_rkg: Number(e.target.value) })}
              placeholder="Preço referência para cálculo de receita"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Ao alterar, as saídas vinculadas serão recalculadas automaticamente.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending || form.kg_retornado <= 0 || form.kg_retornado > kgMaximo}
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Salvar Alterações" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
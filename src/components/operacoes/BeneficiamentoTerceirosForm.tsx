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
  kg_mel_entrada: number | null;
  kg_mista_entrada: number | null;
  perda_mel_pct: number | null;
  perda_mista_pct: number | null;
  perda_total_kg: number | null;
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
    kg_mel_entrada: 0,
    kg_mista_entrada: 0,
    perda_mel_pct: 5,
    perda_mista_pct: 10,
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
          kg_mel_entrada: editData.kg_mel_entrada || 0,
          kg_mista_entrada: editData.kg_mista_entrada || 0,
          perda_mel_pct: (editData.perda_mel_pct || 0) * 100,
          perda_mista_pct: (editData.perda_mista_pct || 0) * 100,
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

  // Calcular kg total entrada e perda
  const kgTotalEntrada = form.kg_mel_entrada + form.kg_mista_entrada;
  const perdaMelKg = form.kg_mel_entrada * (form.perda_mel_pct / 100);
  const perdaMistaKg = form.kg_mista_entrada * (form.perda_mista_pct / 100);
  const perdaTotalKg = perdaMelKg + perdaMistaKg;
  const kgRetornadoEsperado = kgTotalEntrada - perdaTotalKg;

  const kgMaximo = editData 
    ? kgDisponivel + (editData.kg_mel_entrada || 0) + (editData.kg_mista_entrada || 0)
    : kgDisponivel;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (kgTotalEntrada > kgMaximo) {
        throw new Error(`Kg entrada não pode exceder saldo disponível (${kgMaximo} kg)`);
      }
      const payload = {
        dt: form.dt,
        documento: form.documento || null,
        kg_mel_entrada: form.kg_mel_entrada,
        kg_mista_entrada: form.kg_mista_entrada,
        perda_mel_pct: form.perda_mel_pct / 100,
        perda_mista_pct: form.perda_mista_pct / 100,
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
      kg_mel_entrada: 0,
      kg_mista_entrada: 0,
      perda_mel_pct: 5,
      perda_mista_pct: 10,
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

  // Auto-fill kg_retornado quando entrada muda
  useEffect(() => {
    if (kgRetornadoEsperado > 0 && form.kg_retornado === 0) {
      setForm(prev => ({ ...prev, kg_retornado: Math.round(kgRetornadoEsperado * 100) / 100 }));
    }
  }, [kgRetornadoEsperado]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editData ? "Editar Beneficiamento" : "Novo Beneficiamento (Terceiros)"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
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

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Entrada de Material (máx: {kgMaximo.toLocaleString("pt-BR")} kg)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Kg Mel</Label>
                <Input 
                  type="number" 
                  value={form.kg_mel_entrada} 
                  onChange={(e) => setForm({ ...form, kg_mel_entrada: Number(e.target.value) })} 
                />
              </div>
              <div>
                <Label>Kg Mista</Label>
                <Input 
                  type="number" 
                  value={form.kg_mista_entrada} 
                  onChange={(e) => setForm({ ...form, kg_mista_entrada: Number(e.target.value) })} 
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Perdas de Processo</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Perda Mel (%)</Label>
                <Input 
                  type="number" 
                  step="0.1"
                  value={form.perda_mel_pct} 
                  onChange={(e) => setForm({ ...form, perda_mel_pct: Number(e.target.value) })} 
                />
                <p className="text-xs text-muted-foreground mt-1">Perda: {perdaMelKg.toFixed(2)} kg</p>
              </div>
              <div>
                <Label>Perda Mista (%)</Label>
                <Input 
                  type="number" 
                  step="0.1"
                  value={form.perda_mista_pct} 
                  onChange={(e) => setForm({ ...form, perda_mista_pct: Number(e.target.value) })} 
                />
                <p className="text-xs text-muted-foreground mt-1">Perda: {perdaMistaKg.toFixed(2)} kg</p>
              </div>
            </div>
            <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
              <div className="flex justify-between">
                <span>Total Entrada:</span>
                <strong>{kgTotalEntrada.toLocaleString("pt-BR")} kg</strong>
              </div>
              <div className="flex justify-between">
                <span>Perda Total:</span>
                <strong className="text-destructive">{perdaTotalKg.toFixed(2)} kg</strong>
              </div>
              <div className="flex justify-between">
                <span>Retornado Esperado:</span>
                <strong className="text-primary">{kgRetornadoEsperado.toFixed(2)} kg</strong>
              </div>
            </div>
          </div>

          <div>
            <Label>Kg Retornado (real)</Label>
            <Input 
              type="number" 
              value={form.kg_retornado} 
              onChange={(e) => setForm({ ...form, kg_retornado: Number(e.target.value) })} 
            />
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
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || form.kg_retornado <= 0 || kgTotalEntrada > kgMaximo}>
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editData ? "Salvar" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

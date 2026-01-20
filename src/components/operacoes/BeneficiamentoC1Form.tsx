import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2, AlertCircle } from "lucide-react";
import { formatCurrency, formatWeight } from "@/lib/kpis";

interface BeneficiamentoC1 {
  id: string;
  dt: string;
  documento?: string | null;
  kg_retornado: number;
  kg_mel_entrada?: number | null;
  kg_mista_entrada?: number | null;
  perda_mel_pct?: number | null;
  perda_mista_pct?: number | null;
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
  defaultPerdaMel?: number;
  defaultPerdaMista?: number;
  editData?: BeneficiamentoC1 | null;
}

export function BeneficiamentoC1Form({ 
  open, 
  onOpenChange, 
  operacaoId, 
  kgDisponivel, 
  defaultPerdaMel = 3,
  defaultPerdaMista = 8,
  editData 
}: BeneficiamentoC1FormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!editData;
  
  const [form, setForm] = useState({
    dt: format(new Date(), "yyyy-MM-dd"),
    documento: "",
    kg_mel_entrada: 0,
    kg_mista_entrada: 0,
    perda_mel_pct: defaultPerdaMel,
    perda_mista_pct: defaultPerdaMista,
    mo_benef_val: 0,
    mo_benef_mode: "RKG",
    frete_ida_val: 0,
    frete_ida_mode: "RKG",
    frete_volta_val: 0,
    frete_volta_mode: "RKG",
    benchmark_vergalhao_rkg: 0,
  });

  // Buscar benchmark semanal
  const { data: lmeSemana } = useQuery({
    queryKey: ["lme_semana_atual"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lme_semana_config")
        .select("lme_final_brl_kg")
        .order("ano", { ascending: false })
        .order("semana", { ascending: false })
        .limit(1)
        .single();
      if (error) return null;
      return data;
    },
  });

  const benchmarkLME = Number(lmeSemana?.lme_final_brl_kg) || 0;

  // Reset form when dialog opens/closes or editData changes
  useEffect(() => {
    if (open && editData) {
      setForm({
        dt: editData.dt || format(new Date(), "yyyy-MM-dd"),
        documento: editData.documento || "",
        kg_mel_entrada: editData.kg_mel_entrada || 0,
        kg_mista_entrada: editData.kg_mista_entrada || 0,
        perda_mel_pct: (editData.perda_mel_pct || 0) * 100,
        perda_mista_pct: (editData.perda_mista_pct || 0) * 100,
        mo_benef_val: editData.mo_benef_val || 0,
        mo_benef_mode: editData.mo_benef_mode || "RKG",
        frete_ida_val: editData.frete_ida_val || 0,
        frete_ida_mode: editData.frete_ida_mode || "RKG",
        frete_volta_val: editData.frete_volta_val || 0,
        frete_volta_mode: editData.frete_volta_mode || "RKG",
        benchmark_vergalhao_rkg: editData.benchmark_vergalhao_rkg || benchmarkLME,
      });
    } else if (open && !editData) {
      setForm({
        dt: format(new Date(), "yyyy-MM-dd"),
        documento: "",
        kg_mel_entrada: 0,
        kg_mista_entrada: 0,
        perda_mel_pct: defaultPerdaMel,
        perda_mista_pct: defaultPerdaMista,
        mo_benef_val: 0,
        mo_benef_mode: "RKG",
        frete_ida_val: 0,
        frete_ida_mode: "RKG",
        frete_volta_val: 0,
        frete_volta_mode: "RKG",
        benchmark_vergalhao_rkg: benchmarkLME,
      });
    }
  }, [open, editData, defaultPerdaMel, defaultPerdaMista, benchmarkLME]);

  // Cálculos derivados
  const calculos = useMemo(() => {
    const kgEntrada = form.kg_mel_entrada + form.kg_mista_entrada;
    const perdaMelKg = form.kg_mel_entrada * (form.perda_mel_pct / 100);
    const perdaMistaKg = form.kg_mista_entrada * (form.perda_mista_pct / 100);
    const kgPerdaTotal = perdaMelKg + perdaMistaKg;
    const kgRetornado = kgEntrada - kgPerdaTotal;

    // Custos de beneficiamento
    const custoMO = form.mo_benef_mode === "RKG" 
      ? form.mo_benef_val * kgRetornado 
      : form.mo_benef_val;
    const custoFreteIda = form.frete_ida_mode === "RKG" 
      ? form.frete_ida_val * kgRetornado 
      : form.frete_ida_val;
    const custoFreteVolta = form.frete_volta_mode === "RKG" 
      ? form.frete_volta_val * kgRetornado 
      : form.frete_volta_val;
    const custoBenefTotal = custoMO + custoFreteIda + custoFreteVolta;

    return {
      kgEntrada,
      perdaMelKg,
      perdaMistaKg,
      kgPerdaTotal,
      kgRetornado,
      custoMO,
      custoFreteIda,
      custoFreteVolta,
      custoBenefTotal,
    };
  }, [form]);

  // Calcular kg máximo disponível para edição (considera o próprio registro)
  const kgMaximo = isEditing && editData ? kgDisponivel + editData.kg_retornado : kgDisponivel;
  const excedeDisponivel = calculos.kgEntrada > kgMaximo;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        operacao_id: operacaoId,
        dt: form.dt,
        documento: form.documento || null,
        kg_mel_entrada: form.kg_mel_entrada,
        kg_mista_entrada: form.kg_mista_entrada,
        perda_mel_pct: form.perda_mel_pct / 100,
        perda_mista_pct: form.perda_mista_pct / 100,
        kg_perda_total: calculos.kgPerdaTotal,
        kg_retornado: calculos.kgRetornado,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Beneficiamento" : "Novo Beneficiamento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Saldo disponível */}
          <div className="p-3 bg-muted rounded-lg text-sm flex justify-between items-center">
            <span>Kg disponível para beneficiamento:</span>
            <strong className={excedeDisponivel ? "text-destructive" : ""}>{kgMaximo.toLocaleString()} kg</strong>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.dt} onChange={(e) => setForm({ ...form, dt: e.target.value })} />
            </div>
            <div>
              <Label>Documento (NF Retorno)</Label>
              <Input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} placeholder="NF retorno" />
            </div>
          </div>

          {/* Entrada de Material */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Material Enviado para Beneficiamento</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Kg MEL (Cobre Mel)</Label>
                <Input 
                  type="number" 
                  value={form.kg_mel_entrada} 
                  onChange={(e) => setForm({ ...form, kg_mel_entrada: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Kg Mista (Cobre Mista)</Label>
                <Input 
                  type="number" 
                  value={form.kg_mista_entrada} 
                  onChange={(e) => setForm({ ...form, kg_mista_entrada: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Perda */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Perda no Beneficiamento</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Perda MEL (%)</Label>
                <Input 
                  type="number" 
                  step="0.1"
                  value={form.perda_mel_pct} 
                  onChange={(e) => setForm({ ...form, perda_mel_pct: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Perda: {formatWeight(calculos.perdaMelKg)}
                </p>
              </div>
              <div>
                <Label>Perda Mista (%)</Label>
                <Input 
                  type="number" 
                  step="0.1"
                  value={form.perda_mista_pct} 
                  onChange={(e) => setForm({ ...form, perda_mista_pct: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Perda: {formatWeight(calculos.perdaMistaKg)}
                </p>
              </div>
            </div>
          </div>

          {/* Resumo Kg */}
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Kg Entrada:</span>
              <strong>{formatWeight(calculos.kgEntrada)}</strong>
            </div>
            <div className="flex justify-between text-sm text-destructive">
              <span>Perda Total:</span>
              <strong>- {formatWeight(calculos.kgPerdaTotal)}</strong>
            </div>
            <div className="flex justify-between text-sm font-bold border-t pt-2">
              <span>Kg Retornado (Vergalhão):</span>
              <span className="text-primary">{formatWeight(calculos.kgRetornado)}</span>
            </div>
          </div>

          {excedeDisponivel && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>Quantidade de entrada ({formatWeight(calculos.kgEntrada)}) excede o saldo disponível ({formatWeight(kgMaximo)})</span>
            </div>
          )}

          {/* Custos de Beneficiamento */}
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
                <div className="w-28 text-right self-end pb-2">
                  <span className="text-sm text-muted-foreground">{formatCurrency(calculos.custoMO)}</span>
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
                <div className="w-28 text-right self-end pb-2">
                  <span className="text-sm text-muted-foreground">{formatCurrency(calculos.custoFreteIda)}</span>
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
                <div className="w-28 text-right self-end pb-2">
                  <span className="text-sm text-muted-foreground">{formatCurrency(calculos.custoFreteVolta)}</span>
                </div>
              </div>
              <div className="flex justify-between pt-2 border-t font-medium">
                <span>Total Custos Beneficiamento:</span>
                <span>{formatCurrency(calculos.custoBenefTotal)}</span>
              </div>
            </div>
          </div>

          {/* Benchmark */}
          <div>
            <Label>Benchmark Vergalhão (R$/kg)</Label>
            <Input 
              type="number" 
              step="0.01"
              value={form.benchmark_vergalhao_rkg} 
              onChange={(e) => setForm({ ...form, benchmark_vergalhao_rkg: Number(e.target.value) })}
              placeholder="Preço referência LME"
            />
            <p className="text-xs text-muted-foreground mt-1">
              LME Semanal atual: {formatCurrency(benchmarkLME)}/kg
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending || calculos.kgRetornado <= 0 || excedeDisponivel}
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Salvar Alterações" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2, AlertCircle } from "lucide-react";
import { formatWeight } from "@/lib/kpis";

interface BeneficiamentoInterm {
  id: string;
  dt: string;
  documento: string | null;
  kg_retornado: number;
  kg_mel_entrada: number | null;
  kg_mista_entrada: number | null;
  perda_mel_pct: number | null;
  perda_mista_pct: number | null;
  mo_benef_val: number | null;
  mo_benef_mode: string | null;
  frete_ida_val: number | null;
  frete_ida_mode: string | null;
  frete_volta_val: number | null;
  frete_volta_mode: string | null;
}

interface CompraDisponivel {
  id: string;
  dt: string;
  nf_compra: string | null;
  tipo_material: string | null;
  kg_disponivel_compra: number;
  fornecedor?: { razao_social: string } | null;
}

interface BeneficiamentoIntermFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operacaoId: string;
  kgDisponivel: number;
  editData?: BeneficiamentoInterm | null;
}

export function BeneficiamentoIntermForm({ open, onOpenChange, operacaoId, kgDisponivel, editData }: BeneficiamentoIntermFormProps) {
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState({
    dt: format(new Date(), "yyyy-MM-dd"),
    documento: "",
    kg_mel_entrada: 0,
    kg_mista_entrada: 0,
    perda_mel_pct: 5,
    perda_mista_pct: 10,
    mo_benef_val: 0,
    mo_benef_mode: "TOTAL",
    frete_ida_val: 0,
    frete_ida_mode: "TOTAL",
    frete_volta_val: 0,
    frete_volta_mode: "TOTAL",
  });

  const [selectedCompras, setSelectedCompras] = useState<string[]>([]);

  // Fetch compras disponíveis
  const { data: comprasDisponiveis = [] } = useQuery({
    queryKey: ["compras_intermediacao_disponiveis", operacaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compras_intermediacao")
        .select(`*, fornecedor:parceiros!compras_intermediacao_fornecedor_compra_id_fkey(razao_social)`)
        .eq("operacao_id", operacaoId)
        .eq("is_deleted", false)
        .gt("kg_disponivel_compra", 0)
        .order("dt", { ascending: true });
      if (error) throw error;
      return data as CompraDisponivel[];
    },
    enabled: open && !editData,
  });

  useEffect(() => {
    if (open) {
      if (editData) {
        setForm({
          dt: editData.dt,
          documento: editData.documento || "",
          kg_mel_entrada: editData.kg_mel_entrada || 0,
          kg_mista_entrada: editData.kg_mista_entrada || 0,
          perda_mel_pct: editData.perda_mel_pct != null ? editData.perda_mel_pct * 100 : 5,
          perda_mista_pct: editData.perda_mista_pct != null ? editData.perda_mista_pct * 100 : 10,
          mo_benef_val: editData.mo_benef_val || 0,
          mo_benef_mode: editData.mo_benef_mode || "TOTAL",
          frete_ida_val: editData.frete_ida_val || 0,
          frete_ida_mode: editData.frete_ida_mode || "TOTAL",
          frete_volta_val: editData.frete_volta_val || 0,
          frete_volta_mode: editData.frete_volta_mode || "TOTAL",
        });
        setSelectedCompras([]);
      } else {
        setForm({
          dt: format(new Date(), "yyyy-MM-dd"),
          documento: "",
          kg_mel_entrada: 0,
          kg_mista_entrada: 0,
          perda_mel_pct: 5,
          perda_mista_pct: 10,
          mo_benef_val: 0,
          mo_benef_mode: "TOTAL",
          frete_ida_val: 0,
          frete_ida_mode: "TOTAL",
          frete_volta_val: 0,
          frete_volta_mode: "TOTAL",
        });
        setSelectedCompras([]);
      }
    }
  }, [open, editData]);

  // Quando seleciona compras, calcular kg por tipo automaticamente
  useEffect(() => {
    if (!editData && selectedCompras.length > 0) {
      let kgMel = 0;
      let kgMista = 0;
      comprasDisponiveis.forEach(c => {
        if (selectedCompras.includes(c.id)) {
          if (c.tipo_material === "MEL") {
            kgMel += c.kg_disponivel_compra || 0;
          } else {
            kgMista += c.kg_disponivel_compra || 0;
          }
        }
      });
      setForm(prev => ({
        ...prev,
        kg_mel_entrada: kgMel,
        kg_mista_entrada: kgMista,
      }));
    }
  }, [selectedCompras, comprasDisponiveis, editData]);

  const toggleCompra = (compraId: string) => {
    setSelectedCompras(prev => 
      prev.includes(compraId) 
        ? prev.filter(id => id !== compraId)
        : [...prev, compraId]
    );
  };

  // Cálculos
  const kgTotalEntrada = form.kg_mel_entrada + form.kg_mista_entrada;
  const perdaMelKg = form.kg_mel_entrada * (form.perda_mel_pct / 100);
  const perdaMistaKg = form.kg_mista_entrada * (form.perda_mista_pct / 100);
  const perdaTotalKg = perdaMelKg + perdaMistaKg;
  const kgRetornado = kgTotalEntrada - perdaTotalKg;

  const kgMaximo = editData ? kgDisponivel + (editData.kg_mel_entrada || 0) + (editData.kg_mista_entrada || 0) : kgDisponivel;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        dt: form.dt,
        documento: form.documento || null,
        kg_retornado: kgRetornado,
        kg_mel_entrada: form.kg_mel_entrada,
        kg_mista_entrada: form.kg_mista_entrada,
        perda_mel_pct: form.perda_mel_pct / 100,
        perda_mista_pct: form.perda_mista_pct / 100,
        perda_total_kg: perdaTotalKg,
        mo_benef_val: form.mo_benef_val,
        mo_benef_mode: form.mo_benef_mode,
        frete_ida_val: form.frete_ida_val,
        frete_ida_mode: form.frete_ida_mode,
        frete_volta_val: form.frete_volta_val,
        frete_volta_mode: form.frete_volta_mode,
      };

      if (editData) {
        const { error } = await supabase.from("beneficiamentos_intermediacao").update(payload).eq("id", editData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("beneficiamentos_intermediacao").insert({ ...payload, operacao_id: operacaoId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiamentos_intermediacao"] });
      queryClient.invalidateQueries({ queryKey: ["compras_intermediacao"] });
      onOpenChange(false);
      toast({ title: editData ? "Beneficiamento atualizado!" : "Beneficiamento registrado!" });
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? "Editar Beneficiamento" : "Novo Beneficiamento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Seleção de Compras (apenas para novo) */}
          {!editData && comprasDisponiveis.length > 0 && (
            <div className="border rounded-lg p-4 space-y-3">
              <Label className="text-base font-medium">Selecionar Documentos de Compra</Label>
              <p className="text-sm text-muted-foreground">Selecione as compras a serem beneficiadas (FIFO - mais antigas primeiro)</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {comprasDisponiveis.map((c) => (
                  <div 
                    key={c.id} 
                    className={`flex items-center gap-3 p-2 rounded border cursor-pointer transition-colors ${
                      selectedCompras.includes(c.id) ? "bg-primary/10 border-primary" : "hover:bg-muted"
                    }`}
                    onClick={() => toggleCompra(c.id)}
                  >
                    <Checkbox 
                      checked={selectedCompras.includes(c.id)}
                      onCheckedChange={() => toggleCompra(c.id)}
                    />
                    <div className="flex-1 text-sm">
                      <span className="font-medium">{format(new Date(c.dt), "dd/MM/yy")}</span>
                      {c.nf_compra && <span className="ml-2 text-muted-foreground">NF: {c.nf_compra}</span>}
                      <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${c.tipo_material === "MEL" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}`}>
                        {c.tipo_material || "MEL"}
                      </span>
                    </div>
                    <div className="text-sm font-medium">{formatWeight(c.kg_disponivel_compra || 0)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.dt} onChange={(e) => setForm({ ...form, dt: e.target.value })} />
            </div>
            <div>
              <Label>Documento</Label>
              <Input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} placeholder="NF Industrialização" />
            </div>
          </div>

          {/* Entrada por Tipo de Material */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Entrada de Material</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Kg Mel (entrada)</Label>
                <Input 
                  type="number" 
                  value={form.kg_mel_entrada} 
                  onChange={(e) => setForm({ ...form, kg_mel_entrada: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Kg Mista (entrada)</Label>
                <Input 
                  type="number" 
                  value={form.kg_mista_entrada} 
                  onChange={(e) => setForm({ ...form, kg_mista_entrada: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          {/* Perdas por Tipo */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Perda de Processo</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>% Perda Mel</Label>
                <Input 
                  type="number" 
                  step="0.1"
                  value={form.perda_mel_pct} 
                  onChange={(e) => setForm({ ...form, perda_mel_pct: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground mt-1">Perda: {perdaMelKg.toFixed(2)} kg</p>
              </div>
              <div>
                <Label>% Perda Mista</Label>
                <Input 
                  type="number" 
                  step="0.1"
                  value={form.perda_mista_pct} 
                  onChange={(e) => setForm({ ...form, perda_mista_pct: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground mt-1">Perda: {perdaMistaKg.toFixed(2)} kg</p>
              </div>
            </div>
            
            {/* Resumo de Perdas */}
            <div className="mt-3 p-3 bg-muted rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Entrada Total:</span>
                  <p className="font-medium">{kgTotalEntrada.toLocaleString()} kg</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Perda Total:</span>
                  <p className="font-medium text-destructive">-{perdaTotalKg.toFixed(2)} kg</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Kg Retornado:</span>
                  <p className="font-bold text-lg text-primary">{kgRetornado.toFixed(2)} kg</p>
                </div>
              </div>
            </div>

            {kgTotalEntrada > kgMaximo && (
              <div className="mt-2 p-2 bg-destructive/10 text-destructive rounded flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4" />
                Entrada excede o material disponível ({formatWeight(kgMaximo)})
              </div>
            )}
          </div>

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
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending || kgRetornado <= 0 || kgTotalEntrada > kgMaximo}
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editData ? "Salvar" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
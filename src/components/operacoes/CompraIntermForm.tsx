import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface CompraInterm {
  id: string;
  dt: string;
  fornecedor_compra_id: string | null;
  nf_compra: string | null;
  kg_comprado: number;
  preco_compra_rkg: number;
  tipo_material: string | null;
  compra_pela_ibrac?: boolean;
  perda_mel_pct?: number;
  perda_mista_pct?: number;
}

interface CompraIntermFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operacaoId: string;
  editData?: CompraInterm | null;
}

export function CompraIntermForm({ open, onOpenChange, operacaoId, editData }: CompraIntermFormProps) {
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState({
    dt: format(new Date(), "yyyy-MM-dd"),
    fornecedor_compra_id: "",
    nf_compra: "",
    kg_comprado: 0,
    preco_compra_rkg: 0,
    tipo_material: "MEL",
    compra_pela_ibrac: true,
    perda_mel_pct: 5,
    perda_mista_pct: 10,
  });

  useEffect(() => {
    if (open) {
      if (editData) {
        setForm({
          dt: editData.dt,
          fornecedor_compra_id: editData.fornecedor_compra_id || "",
          nf_compra: editData.nf_compra || "",
          kg_comprado: editData.kg_comprado,
          preco_compra_rkg: editData.preco_compra_rkg,
          tipo_material: editData.tipo_material || "MEL",
          compra_pela_ibrac: editData.compra_pela_ibrac ?? true,
          perda_mel_pct: (editData.perda_mel_pct ?? 0.05) * 100,
          perda_mista_pct: (editData.perda_mista_pct ?? 0.10) * 100,
        });
      } else {
        setForm({ dt: format(new Date(), "yyyy-MM-dd"), fornecedor_compra_id: "", nf_compra: "", kg_comprado: 0, preco_compra_rkg: 0, tipo_material: "MEL", compra_pela_ibrac: true, perda_mel_pct: 5, perda_mista_pct: 10 });
      }
    }
  }, [open, editData]);

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["parceiros_fornecedores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("parceiros").select("*").eq("ativo", true).eq("is_fornecedor", true);
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        dt: form.dt,
        fornecedor_compra_id: form.fornecedor_compra_id || null,
        nf_compra: form.nf_compra || null,
        kg_comprado: form.kg_comprado,
        preco_compra_rkg: form.preco_compra_rkg,
        tipo_material: form.tipo_material,
        compra_pela_ibrac: form.compra_pela_ibrac,
        perda_mel_pct: form.perda_mel_pct / 100,
        perda_mista_pct: form.perda_mista_pct / 100,
      };

      if (editData) {
        const { error } = await supabase.from("compras_intermediacao").update(payload).eq("id", editData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("compras_intermediacao").insert({ ...payload, operacao_id: operacaoId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compras_intermediacao"] });
      onOpenChange(false);
      toast({ title: editData ? "Compra atualizada!" : "Compra registrada!" });
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const valorTotal = form.kg_comprado * form.preco_compra_rkg;
  const perdaAtiva = form.tipo_material === "MEL" ? form.perda_mel_pct : form.perda_mista_pct;
  const previsaoRetorno = form.kg_comprado * (1 - perdaAtiva / 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editData ? "Editar Compra" : "Nova Compra de Material"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <Label htmlFor="compra-ibrac" className="font-medium">Compra pela IBRAC</Label>
              <p className="text-xs text-muted-foreground">
                {form.compra_pela_ibrac
                  ? "IBRAC comprou com NF própria (custo descontado do repasse)"
                  : "Dono comprou direto (IBRAC só intermedia a MO)"}
              </p>
            </div>
            <Switch
              id="compra-ibrac"
              checked={form.compra_pela_ibrac}
              onCheckedChange={(checked) => setForm({ ...form, compra_pela_ibrac: checked })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.dt} onChange={(e) => setForm({ ...form, dt: e.target.value })} />
            </div>
            <div>
              <Label>NF Compra</Label>
              <Input value={form.nf_compra} onChange={(e) => setForm({ ...form, nf_compra: e.target.value })} />
            </div>
          </div>

          <div>
            <Label>Fornecedor</Label>
            <Select value={form.fornecedor_compra_id} onValueChange={(v) => setForm({ ...form, fornecedor_compra_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {fornecedores.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tipo de Material</Label>
            <Select value={form.tipo_material} onValueChange={(v) => setForm({ ...form, tipo_material: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MEL">Cobre Mel</SelectItem>
                <SelectItem value="MISTA">Mista</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>% Perda Mel</Label>
              <Input type="number" step="0.1" value={form.perda_mel_pct} onChange={(e) => setForm({ ...form, perda_mel_pct: Number(e.target.value) })} />
            </div>
            <div>
              <Label>% Perda Mista</Label>
              <Input type="number" step="0.1" value={form.perda_mista_pct} onChange={(e) => setForm({ ...form, perda_mista_pct: Number(e.target.value) })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Kg Comprado</Label>
              <Input type="number" value={form.kg_comprado} onChange={(e) => setForm({ ...form, kg_comprado: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Preço (R$/kg)</Label>
              <Input type="number" step="0.01" value={form.preco_compra_rkg} onChange={(e) => setForm({ ...form, preco_compra_rkg: Number(e.target.value) })} />
            </div>
          </div>

          {valorTotal > 0 && (
            <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
              <div>Valor total: <strong>R$ {valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></div>
              {form.kg_comprado > 0 && (
                <div>Previsão retorno: <strong>{previsaoRetorno.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} kg</strong> <span className="text-muted-foreground">(perda {perdaAtiva}%)</span></div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || form.kg_comprado <= 0 || form.preco_compra_rkg <= 0}>
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editData ? "Salvar" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
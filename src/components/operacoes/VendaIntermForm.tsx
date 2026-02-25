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

interface VendaInterm {
  id: string;
  dt: string;
  cliente_id: string | null;
  nf_venda: string | null;
  kg_vendido: number;
  preco_venda_rkg: number;
  venda_pela_ibrac?: boolean;
  comissao_ibrac_pct?: number;
  pis_cofins_pct?: number;
  icms_pct?: number;
}

interface VendaIntermFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operacaoId: string;
  kgDisponivel: number;
  editData?: VendaInterm | null;
}

export function VendaIntermForm({ open, onOpenChange, operacaoId, kgDisponivel, editData }: VendaIntermFormProps) {
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState({
    dt: format(new Date(), "yyyy-MM-dd"),
    cliente_id: "",
    nf_venda: "",
    kg_vendido: 0,
    preco_venda_rkg: 0,
    venda_pela_ibrac: false,
    comissao_ibrac_pct: 0,
    pis_cofins_pct: 9.25,
    icms_pct: 0,
  });

  useEffect(() => {
    if (open) {
      if (editData) {
        setForm({
          dt: editData.dt,
          cliente_id: editData.cliente_id || "",
          nf_venda: editData.nf_venda || "",
          kg_vendido: editData.kg_vendido,
          preco_venda_rkg: editData.preco_venda_rkg,
          venda_pela_ibrac: editData.venda_pela_ibrac || false,
          comissao_ibrac_pct: editData.comissao_ibrac_pct || 0,
          pis_cofins_pct: editData.pis_cofins_pct ?? 9.25,
          icms_pct: editData.icms_pct || 0,
        });
      } else {
        setForm({ dt: format(new Date(), "yyyy-MM-dd"), cliente_id: "", nf_venda: "", kg_vendido: 0, preco_venda_rkg: 0, venda_pela_ibrac: false, comissao_ibrac_pct: 0, pis_cofins_pct: 9.25, icms_pct: 0 });
      }
    }
  }, [open, editData]);

  const kgMaximo = editData ? kgDisponivel + editData.kg_vendido : kgDisponivel;

  const { data: clientes = [] } = useQuery({
    queryKey: ["parceiros_clientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("parceiros").select("*").eq("ativo", true).eq("is_cliente", true);
      if (error) throw error;
      return data;
    },
  });

  const valorTotal = form.kg_vendido * form.preco_venda_rkg;
  const comissaoIbracRs = form.venda_pela_ibrac ? valorTotal * (form.comissao_ibrac_pct / 100) : 0;
  const pisCofinsRs = form.venda_pela_ibrac ? valorTotal * (form.pis_cofins_pct / 100) : 0;
  const icmsRs = form.venda_pela_ibrac ? valorTotal * (form.icms_pct / 100) : 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        dt: form.dt,
        cliente_id: form.cliente_id || null,
        nf_venda: form.nf_venda || null,
        kg_vendido: form.kg_vendido,
        preco_venda_rkg: form.preco_venda_rkg,
        venda_pela_ibrac: form.venda_pela_ibrac,
        comissao_ibrac_pct: form.venda_pela_ibrac ? form.comissao_ibrac_pct : 0,
        pis_cofins_pct: form.venda_pela_ibrac ? form.pis_cofins_pct : 0,
        pis_cofins_rs: pisCofinsRs,
        icms_pct: form.venda_pela_ibrac ? form.icms_pct : 0,
        icms_rs: icmsRs,
      };

      if (editData) {
        const { error } = await supabase.from("vendas_intermediacao").update(payload).eq("id", editData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vendas_intermediacao").insert({ ...payload, operacao_id: operacaoId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas_intermediacao"] });
      queryClient.invalidateQueries({ queryKey: ["beneficiamentos_intermediacao"] });
      onOpenChange(false);
      toast({ title: editData ? "Venda atualizada!" : "Venda registrada!" });
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editData ? "Editar Venda" : "Nova Venda"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg text-sm">
            Vergalhão disponível: <strong>{kgMaximo.toLocaleString()} kg</strong>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.dt} onChange={(e) => setForm({ ...form, dt: e.target.value })} />
            </div>
            <div>
              <Label>NF Venda</Label>
              <Input value={form.nf_venda} onChange={(e) => setForm({ ...form, nf_venda: e.target.value })} />
            </div>
          </div>

          <div>
            <Label>Cliente</Label>
            <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Kg Vendido</Label>
              <Input 
                type="number" 
                value={form.kg_vendido} 
                onChange={(e) => setForm({ ...form, kg_vendido: Number(e.target.value) })}
                max={kgMaximo}
              />
              {form.kg_vendido > kgMaximo && (
                <p className="text-xs text-destructive mt-1">Excede disponível</p>
              )}
            </div>
            <div>
              <Label>Preço Venda (R$/kg)</Label>
              <Input type="number" step="0.01" value={form.preco_venda_rkg} onChange={(e) => setForm({ ...form, preco_venda_rkg: Number(e.target.value) })} />
            </div>
          </div>

          {valorTotal > 0 && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              Valor total: <strong>R$ {valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
            </div>
          )}

          {/* Venda pela IBRAC */}
          <div className="flex items-center justify-between border rounded-lg p-3">
            <Label htmlFor="venda-ibrac" className="cursor-pointer">Venda pela IBRAC</Label>
            <Switch
              id="venda-ibrac"
              checked={form.venda_pela_ibrac}
              onCheckedChange={(checked) => setForm({ ...form, venda_pela_ibrac: checked })}
            />
          </div>

          {form.venda_pela_ibrac && (
            <div className="space-y-3 border rounded-lg p-3 bg-muted/50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Comissão IBRAC (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.comissao_ibrac_pct}
                    onChange={(e) => setForm({ ...form, comissao_ibrac_pct: Number(e.target.value) })}
                  />
                  {comissaoIbracRs > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">= R$ {comissaoIbracRs.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  )}
                </div>
                <div>
                  <Label>PIS/COFINS (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.pis_cofins_pct}
                    onChange={(e) => setForm({ ...form, pis_cofins_pct: Number(e.target.value) })}
                  />
                  {pisCofinsRs > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">= R$ {pisCofinsRs.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ICMS (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.icms_pct}
                    onChange={(e) => setForm({ ...form, icms_pct: Number(e.target.value) })}
                  />
                  {icmsRs > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">= R$ {icmsRs.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  )}
                </div>
                <div className="flex items-end">
                  <p className="text-xs text-muted-foreground pb-2">ICMS é apenas informativo, não soma no total da operação.</p>
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending || form.kg_vendido <= 0 || form.kg_vendido > kgMaximo || form.preco_venda_rkg <= 0}
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editData ? "Salvar" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

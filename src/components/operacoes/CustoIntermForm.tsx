import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface CustoIntermFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operacaoId: string;
}

export function CustoIntermForm({ open, onOpenChange, operacaoId }: CustoIntermFormProps) {
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState({
    dt: format(new Date(), "yyyy-MM-dd"),
    categoria: "OUTROS",
    documento: "",
    val: 0,
    mode: "TOTAL",
    base_kg_mode: "COMPRADO",
    obs: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("custos_intermediacao").insert({
        operacao_id: operacaoId,
        dt: form.dt,
        categoria: form.categoria,
        documento: form.documento || null,
        val: form.val,
        mode: form.mode,
        base_kg_mode: form.base_kg_mode,
        obs: form.obs || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custos_intermediacao"] });
      onOpenChange(false);
      setForm({ dt: format(new Date(), "yyyy-MM-dd"), categoria: "OUTROS", documento: "", val: 0, mode: "TOTAL", base_kg_mode: "COMPRADO", obs: "" });
      toast({ title: "Custo registrado!" });
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Custo da Operação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
            <Label>Categoria</Label>
            <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FRETE">Frete</SelectItem>
                <SelectItem value="MO">Mão de Obra</SelectItem>
                <SelectItem value="IMPOSTOS">Impostos</SelectItem>
                <SelectItem value="FINANCEIRO">Financeiro</SelectItem>
                <SelectItem value="ADMINISTRATIVO">Administrativo</SelectItem>
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
                  <SelectItem value="TOTAL">R$ Total</SelectItem>
                  <SelectItem value="RKG">R$/kg</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.mode === "RKG" && (
            <div>
              <Label>Base Kg</Label>
              <Select value={form.base_kg_mode} onValueChange={(v) => setForm({ ...form, base_kg_mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPRADO">Kg Comprado</SelectItem>
                  <SelectItem value="VENDIDO">Kg Vendido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Observações</Label>
            <Textarea value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || form.val <= 0}>
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

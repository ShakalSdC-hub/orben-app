import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface CompraIntermFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operacaoId: string;
}

export function CompraIntermForm({ open, onOpenChange, operacaoId }: CompraIntermFormProps) {
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState({
    dt: format(new Date(), "yyyy-MM-dd"),
    fornecedor_compra_id: "",
    nf_compra: "",
    kg_comprado: 0,
    preco_compra_rkg: 0,
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["parceiros_fornecedores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("parceiros").select("*").eq("ativo", true).eq("is_fornecedor", true);
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("compras_intermediacao").insert({
        operacao_id: operacaoId,
        dt: form.dt,
        fornecedor_compra_id: form.fornecedor_compra_id || null,
        nf_compra: form.nf_compra || null,
        kg_comprado: form.kg_comprado,
        preco_compra_rkg: form.preco_compra_rkg,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compras_intermediacao"] });
      onOpenChange(false);
      setForm({ dt: format(new Date(), "yyyy-MM-dd"), fornecedor_compra_id: "", nf_compra: "", kg_comprado: 0, preco_compra_rkg: 0 });
      toast({ title: "Compra registrada!" });
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const valorTotal = form.kg_comprado * form.preco_compra_rkg;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Compra de Material</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
            <div className="p-3 bg-muted rounded-lg text-sm">
              Valor total: <strong>R$ {valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || form.kg_comprado <= 0 || form.preco_compra_rkg <= 0}>
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

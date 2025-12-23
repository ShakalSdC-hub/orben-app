import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface EntradaTerceirosFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operacaoId: string;
}

export function EntradaTerceirosForm({ open, onOpenChange, operacaoId }: EntradaTerceirosFormProps) {
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState({
    dt: format(new Date(), "yyyy-MM-dd"),
    documento: "",
    kg_recebido: 0,
    valor_ref_rkg: 0,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("entradas_terceiros").insert({
        operacao_id: operacaoId,
        dt: form.dt,
        documento: form.documento || null,
        kg_recebido: form.kg_recebido,
        valor_ref_rkg: form.valor_ref_rkg || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entradas_terceiros"] });
      onOpenChange(false);
      setForm({ dt: format(new Date(), "yyyy-MM-dd"), documento: "", kg_recebido: 0, valor_ref_rkg: 0 });
      toast({ title: "Recebimento registrado!" });
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Recebimento do Cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.dt} onChange={(e) => setForm({ ...form, dt: e.target.value })} />
            </div>
            <div>
              <Label>Documento</Label>
              <Input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} placeholder="NF remessa" />
            </div>
          </div>

          <div>
            <Label>Kg Recebido</Label>
            <Input type="number" value={form.kg_recebido} onChange={(e) => setForm({ ...form, kg_recebido: Number(e.target.value) })} />
          </div>

          <div>
            <Label>Valor Ref. Material (R$/kg) - opcional</Label>
            <Input type="number" step="0.01" value={form.valor_ref_rkg} onChange={(e) => setForm({ ...form, valor_ref_rkg: Number(e.target.value) })} placeholder="Para cálculo de ganho IBRAC" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || form.kg_recebido <= 0}>
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

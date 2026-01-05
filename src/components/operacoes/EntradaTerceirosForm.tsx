import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface EntradaTerceiros {
  id: string;
  dt: string;
  documento: string | null;
  kg_recebido: number;
  valor_ref_rkg: number | null;
}

interface EntradaTerceirosFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operacaoId: string;
  editData?: EntradaTerceiros | null;
}

export function EntradaTerceirosForm({ open, onOpenChange, operacaoId, editData }: EntradaTerceirosFormProps) {
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState({
    dt: format(new Date(), "yyyy-MM-dd"),
    documento: "",
    kg_recebido: 0,
    valor_ref_rkg: 0,
  });

  useEffect(() => {
    if (open) {
      if (editData) {
        setForm({
          dt: editData.dt,
          documento: editData.documento || "",
          kg_recebido: editData.kg_recebido,
          valor_ref_rkg: editData.valor_ref_rkg || 0,
        });
      } else {
        setForm({ dt: format(new Date(), "yyyy-MM-dd"), documento: "", kg_recebido: 0, valor_ref_rkg: 0 });
      }
    }
  }, [open, editData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editData) {
        const { error } = await supabase.from("entradas_terceiros").update({
          dt: form.dt,
          documento: form.documento || null,
          kg_recebido: form.kg_recebido,
          valor_ref_rkg: form.valor_ref_rkg || null,
        }).eq("id", editData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("entradas_terceiros").insert({
          operacao_id: operacaoId,
          dt: form.dt,
          documento: form.documento || null,
          kg_recebido: form.kg_recebido,
          valor_ref_rkg: form.valor_ref_rkg || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entradas_terceiros"] });
      onOpenChange(false);
      toast({ title: editData ? "Recebimento atualizado!" : "Recebimento registrado!" });
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editData ? "Editar Recebimento" : "Novo Recebimento do Cliente"}</DialogTitle>
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
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || form.kg_recebido <= 0}>
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editData ? "Salvar" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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

interface SaidaTerceiros {
  id: string;
  dt: string;
  documento: string | null;
  kg_devolvido: number;
}

interface SaidaTerceirosFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operacaoId: string;
  kgDisponivel: number;
  editData?: SaidaTerceiros | null;
}

export function SaidaTerceirosForm({ open, onOpenChange, operacaoId, kgDisponivel, editData }: SaidaTerceirosFormProps) {
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState({
    dt: format(new Date(), "yyyy-MM-dd"),
    documento: "",
    kg_devolvido: 0,
  });

  useEffect(() => {
    if (open) {
      if (editData) {
        setForm({
          dt: editData.dt,
          documento: editData.documento || "",
          kg_devolvido: editData.kg_devolvido,
        });
      } else {
        resetForm();
      }
    }
  }, [open, editData]);

  const kgMaximo = editData ? kgDisponivel + editData.kg_devolvido : kgDisponivel;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (form.kg_devolvido > kgMaximo) {
        throw new Error(`Kg devolvido não pode exceder saldo disponível (${kgMaximo} kg)`);
      }

      if (editData) {
        const { error } = await supabase.from("saidas_terceiros").update({
          dt: form.dt,
          documento: form.documento || null,
          kg_devolvido: form.kg_devolvido,
        }).eq("id", editData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("saidas_terceiros").insert({
          operacao_id: operacaoId,
          dt: form.dt,
          documento: form.documento || null,
          kg_devolvido: form.kg_devolvido,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saidas_terceiros"] });
      queryClient.invalidateQueries({ queryKey: ["beneficiamentos_terceiros"] });
      toast({ title: editData ? "Devolução atualizada!" : "Devolução registrada!" });
      onOpenChange(false);
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setForm({
      dt: format(new Date(), "yyyy-MM-dd"),
      documento: "",
      kg_devolvido: 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editData ? "Editar Devolução" : "Nova Devolução ao Cliente"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.dt} onChange={(e) => setForm({ ...form, dt: e.target.value })} />
            </div>
            <div>
              <Label>Documento</Label>
              <Input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} placeholder="NF, Romaneio" />
            </div>
          </div>
          <div>
            <Label>Kg Devolvido (máx: {kgMaximo.toLocaleString("pt-BR")} kg)</Label>
            <Input type="number" value={form.kg_devolvido} onChange={(e) => setForm({ ...form, kg_devolvido: Number(e.target.value) })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || form.kg_devolvido <= 0 || form.kg_devolvido > kgMaximo}>
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editData ? "Salvar" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

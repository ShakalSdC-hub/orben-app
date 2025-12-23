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

interface SaidaTerceirosFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operacaoId: string;
  kgDisponivel: number;
}

export function SaidaTerceirosForm({ open, onOpenChange, operacaoId, kgDisponivel }: SaidaTerceirosFormProps) {
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState({
    dt: format(new Date(), "yyyy-MM-dd"),
    documento: "",
    kg_devolvido: 0,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (form.kg_devolvido > kgDisponivel) {
        throw new Error(`Kg devolvido não pode exceder saldo disponível (${kgDisponivel} kg)`);
      }
      const { error } = await supabase.from("saidas_terceiros").insert({
        operacao_id: operacaoId,
        dt: form.dt,
        documento: form.documento || null,
        kg_devolvido: form.kg_devolvido,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saidas_terceiros"] });
      queryClient.invalidateQueries({ queryKey: ["beneficiamentos_terceiros"] });
      toast({ title: "Devolução registrada!" });
      onOpenChange(false);
      resetForm();
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
          <DialogTitle>Nova Devolução ao Cliente</DialogTitle>
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
            <Label>Kg Devolvido (máx: {kgDisponivel.toLocaleString("pt-BR")} kg)</Label>
            <Input type="number" value={form.kg_devolvido} onChange={(e) => setForm({ ...form, kg_devolvido: Number(e.target.value) })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || form.kg_devolvido <= 0}>
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

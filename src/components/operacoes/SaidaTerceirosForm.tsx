import { useState, useEffect } from "react";
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

interface SaidaTerceiros {
  id: string;
  dt: string;
  documento: string | null;
  kg_devolvido: number;
  beneficiamento_id: string | null;
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
    beneficiamento_id: "",
  });

  // Fetch beneficiamentos disponíveis
  const { data: beneficiamentos = [] } = useQuery({
    queryKey: ["beneficiamentos_terceiros", operacaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamentos_terceiros")
        .select("id, dt, documento, kg_retornado, kg_disponivel_cliente")
        .eq("operacao_id", operacaoId)
        .eq("is_deleted", false)
        .order("dt", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const beneficiamentosDisponiveis = beneficiamentos.filter(b => (b.kg_disponivel_cliente || 0) > 0);

  useEffect(() => {
    if (open) {
      if (editData) {
        setForm({
          dt: editData.dt,
          documento: editData.documento || "",
          kg_devolvido: editData.kg_devolvido,
          beneficiamento_id: editData.beneficiamento_id || "",
        });
      } else {
        resetForm();
      }
    }
  }, [open, editData]);

  // Quando seleciona beneficiamento, atualizar kg sugerido
  useEffect(() => {
    if (form.beneficiamento_id && !editData) {
      const benef = beneficiamentos.find(b => b.id === form.beneficiamento_id);
      if (benef && form.kg_devolvido === 0) {
        setForm(prev => ({ ...prev, kg_devolvido: benef.kg_disponivel_cliente || 0 }));
      }
    }
  }, [form.beneficiamento_id, beneficiamentos, editData]);

  const selectedBenef = beneficiamentos.find(b => b.id === form.beneficiamento_id);
  const kgMaximo = editData 
    ? kgDisponivel + editData.kg_devolvido 
    : selectedBenef 
      ? selectedBenef.kg_disponivel_cliente || 0
      : kgDisponivel;

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
          beneficiamento_id: form.beneficiamento_id || null,
        }).eq("id", editData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("saidas_terceiros").insert({
          operacao_id: operacaoId,
          dt: form.dt,
          documento: form.documento || null,
          kg_devolvido: form.kg_devolvido,
          beneficiamento_id: form.beneficiamento_id || null,
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
      beneficiamento_id: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editData ? "Editar Devolução" : "Nova Devolução ao Cliente"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Documento de Beneficiamento</Label>
            <Select 
              value={form.beneficiamento_id} 
              onValueChange={(v) => setForm({ ...form, beneficiamento_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o beneficiamento..." />
              </SelectTrigger>
              <SelectContent>
                {beneficiamentosDisponiveis.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {format(new Date(b.dt), "dd/MM/yy")} - {b.documento || "S/Doc"} ({(b.kg_disponivel_cliente || 0).toLocaleString("pt-BR")} kg disp.)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

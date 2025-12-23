import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface SaidaC1FormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operacaoId: string;
  kgDisponivel: number;
  benchmarkDefault?: number;
}

export function SaidaC1Form({ open, onOpenChange, operacaoId, kgDisponivel, benchmarkDefault = 0 }: SaidaC1FormProps) {
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState({
    dt: format(new Date(), "yyyy-MM-dd"),
    documento: "",
    tipo_saida: "VENDA",
    kg_saida: 0,
    parceiro_destino_id: "",
    benchmark_vergalhao_rkg: benchmarkDefault,
    obs: "",
  });

  const { data: parceiros = [] } = useQuery({
    queryKey: ["parceiros_clientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("parceiros").select("*").eq("ativo", true).eq("is_cliente", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: tiposSaida = [] } = useQuery({
    queryKey: ["tipos_saida"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tipos_saida").select("*").eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("saidas_c1").insert({
        operacao_id: operacaoId,
        dt: form.dt,
        documento: form.documento || null,
        tipo_saida: form.tipo_saida,
        kg_saida: form.kg_saida,
        parceiro_destino_id: form.parceiro_destino_id || null,
        benchmark_vergalhao_rkg: form.benchmark_vergalhao_rkg || null,
        obs: form.obs || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saidas_c1"] });
      queryClient.invalidateQueries({ queryKey: ["beneficiamentos_c1"] });
      onOpenChange(false);
      toast({ title: "Saída registrada!" });
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const isVenda = form.tipo_saida === "VENDA";
  const receitaSimulada = form.kg_saida * form.benchmark_vergalhao_rkg;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Saída</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg text-sm">
            Vergalhão disponível para saída: <strong>{kgDisponivel.toLocaleString()} kg</strong>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.dt} onChange={(e) => setForm({ ...form, dt: e.target.value })} />
            </div>
            <div>
              <Label>Documento</Label>
              <Input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} placeholder="NF saída" />
            </div>
          </div>

          <div>
            <Label>Tipo de Saída</Label>
            <Select value={form.tipo_saida} onValueChange={(v) => setForm({ ...form, tipo_saida: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="VENDA">Venda</SelectItem>
                <SelectItem value="RETORNO_DONO">Retorno ao Dono</SelectItem>
                <SelectItem value="CONSUMO_INTERNO">Consumo Interno</SelectItem>
                {tiposSaida.map((t) => (
                  <SelectItem key={t.id} value={t.nome}>{t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Kg Saída</Label>
            <Input 
              type="number" 
              value={form.kg_saida} 
              onChange={(e) => setForm({ ...form, kg_saida: Number(e.target.value) })}
              max={kgDisponivel}
            />
            {form.kg_saida > kgDisponivel && (
              <p className="text-xs text-destructive mt-1">Excede o saldo disponível</p>
            )}
          </div>

          {isVenda && (
            <>
              <div>
                <Label>Cliente</Label>
                <Select value={form.parceiro_destino_id} onValueChange={(v) => setForm({ ...form, parceiro_destino_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente..." /></SelectTrigger>
                  <SelectContent>
                    {parceiros.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome_fantasia || p.razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Benchmark Vergalhão (R$/kg)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={form.benchmark_vergalhao_rkg} 
                  onChange={(e) => setForm({ ...form, benchmark_vergalhao_rkg: Number(e.target.value) })}
                />
                {receitaSimulada > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Receita simulada: R$ {receitaSimulada.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </>
          )}

          <div>
            <Label>Observações</Label>
            <Textarea value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button 
            onClick={() => createMutation.mutate()} 
            disabled={createMutation.isPending || form.kg_saida <= 0 || form.kg_saida > kgDisponivel || (isVenda && !form.parceiro_destino_id)}
          >
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar Saída
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

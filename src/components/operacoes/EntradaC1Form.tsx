import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface EntradaC1FormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operacaoId: string;
  defaultPerdaMel?: number;
  defaultPerdaMista?: number;
}

export function EntradaC1Form({ open, onOpenChange, operacaoId, defaultPerdaMel = 5, defaultPerdaMista = 10 }: EntradaC1FormProps) {
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState({
    ticket_num: "",
    nf_num: "",
    procedencia: "",
    dt_emissao: format(new Date(), "yyyy-MM-dd"),
    dt_recebimento: format(new Date(), "yyyy-MM-dd"),
    ticket_mel_kg: 0,
    ticket_mista_kg: 0,
    perda_mel_pct: defaultPerdaMel,
    perda_mista_pct: defaultPerdaMista,
    valor_unit_sucata_rkg: 0,
    moagem_val: 0,
    moagem_mode: "RKG",
    frete_ida_moagem_val: 0,
    frete_ida_moagem_mode: "RKG",
    frete_volta_moagem_val: 0,
    frete_volta_moagem_mode: "RKG",
    financeiro_val: 0,
    financeiro_mode: "RKG",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("entradas_c1").insert({
        operacao_id: operacaoId,
        ticket_num: form.ticket_num || null,
        nf_num: form.nf_num || null,
        procedencia: form.procedencia || null,
        dt_emissao: form.dt_emissao,
        dt_recebimento: form.dt_recebimento,
        ticket_mel_kg: form.ticket_mel_kg,
        ticket_mista_kg: form.ticket_mista_kg,
        perda_mel_pct: form.perda_mel_pct / 100,
        perda_mista_pct: form.perda_mista_pct / 100,
        valor_unit_sucata_rkg: form.valor_unit_sucata_rkg,
        moagem_val: form.moagem_val,
        moagem_mode: form.moagem_mode,
        frete_ida_moagem_val: form.frete_ida_moagem_val,
        frete_ida_moagem_mode: form.frete_ida_moagem_mode,
        frete_volta_moagem_val: form.frete_volta_moagem_val,
        frete_volta_moagem_mode: form.frete_volta_moagem_mode,
        financeiro_val: form.financeiro_val,
        financeiro_mode: form.financeiro_mode,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entradas_c1"] });
      onOpenChange(false);
      toast({ title: "Entrada registrada com sucesso!" });
    },
    onError: (error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const kgTicket = form.ticket_mel_kg + form.ticket_mista_kg;
  const kgPerda = (form.ticket_mel_kg * form.perda_mel_pct / 100) + (form.ticket_mista_kg * form.perda_mista_pct / 100);
  const kgLiquido = kgTicket - kgPerda;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Entrada de Sucata</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Identificação */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Nº Ticket</Label>
              <Input value={form.ticket_num} onChange={(e) => setForm({ ...form, ticket_num: e.target.value })} />
            </div>
            <div>
              <Label>Nº NF</Label>
              <Input value={form.nf_num} onChange={(e) => setForm({ ...form, nf_num: e.target.value })} />
            </div>
            <div>
              <Label>Procedência</Label>
              <Input value={form.procedencia} onChange={(e) => setForm({ ...form, procedencia: e.target.value })} />
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Emissão</Label>
              <Input type="date" value={form.dt_emissao} onChange={(e) => setForm({ ...form, dt_emissao: e.target.value })} />
            </div>
            <div>
              <Label>Data Recebimento</Label>
              <Input type="date" value={form.dt_recebimento} onChange={(e) => setForm({ ...form, dt_recebimento: e.target.value })} />
            </div>
          </div>

          {/* Pesagem */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Ticket MEL (kg)</Label>
              <Input type="number" value={form.ticket_mel_kg} onChange={(e) => setForm({ ...form, ticket_mel_kg: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Ticket Mista (kg)</Label>
              <Input type="number" value={form.ticket_mista_kg} onChange={(e) => setForm({ ...form, ticket_mista_kg: Number(e.target.value) })} />
            </div>
          </div>

          {/* Perdas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Perda MEL (%)</Label>
              <Input type="number" step="0.1" value={form.perda_mel_pct} onChange={(e) => setForm({ ...form, perda_mel_pct: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Perda Mista (%)</Label>
              <Input type="number" step="0.1" value={form.perda_mista_pct} onChange={(e) => setForm({ ...form, perda_mista_pct: Number(e.target.value) })} />
            </div>
          </div>

          {/* Resumo */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Kg Ticket: <strong>{kgTicket.toLocaleString()}</strong></span>
              <span>Perda: <strong>{kgPerda.toLocaleString()} kg</strong></span>
              <span>Kg Líquido: <strong>{kgLiquido.toLocaleString()}</strong></span>
            </div>
          </div>

          {/* Valor Sucata */}
          <div>
            <Label>Valor Unit. Sucata (R$/kg)</Label>
            <Input type="number" step="0.01" value={form.valor_unit_sucata_rkg} onChange={(e) => setForm({ ...form, valor_unit_sucata_rkg: Number(e.target.value) })} />
          </div>

          {/* Custos PRÉ */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Custos PRÉ-Beneficiamento</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>Moagem</Label>
                  <Input type="number" step="0.01" value={form.moagem_val} onChange={(e) => setForm({ ...form, moagem_val: Number(e.target.value) })} />
                </div>
                <div className="w-24">
                  <Label>Modo</Label>
                  <Select value={form.moagem_mode} onValueChange={(v) => setForm({ ...form, moagem_mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RKG">R$/kg</SelectItem>
                      <SelectItem value="TOTAL">Total</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>Frete Ida</Label>
                  <Input type="number" step="0.01" value={form.frete_ida_moagem_val} onChange={(e) => setForm({ ...form, frete_ida_moagem_val: Number(e.target.value) })} />
                </div>
                <div className="w-24">
                  <Label>Modo</Label>
                  <Select value={form.frete_ida_moagem_mode} onValueChange={(v) => setForm({ ...form, frete_ida_moagem_mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RKG">R$/kg</SelectItem>
                      <SelectItem value="TOTAL">Total</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>Frete Volta</Label>
                  <Input type="number" step="0.01" value={form.frete_volta_moagem_val} onChange={(e) => setForm({ ...form, frete_volta_moagem_val: Number(e.target.value) })} />
                </div>
                <div className="w-24">
                  <Label>Modo</Label>
                  <Select value={form.frete_volta_moagem_mode} onValueChange={(v) => setForm({ ...form, frete_volta_moagem_mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RKG">R$/kg</SelectItem>
                      <SelectItem value="TOTAL">Total</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>Financeiro</Label>
                  <Input type="number" step="0.01" value={form.financeiro_val} onChange={(e) => setForm({ ...form, financeiro_val: Number(e.target.value) })} />
                </div>
                <div className="w-24">
                  <Label>Modo</Label>
                  <Select value={form.financeiro_mode} onValueChange={(v) => setForm({ ...form, financeiro_mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RKG">R$/kg</SelectItem>
                      <SelectItem value="TOTAL">Total</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || kgTicket <= 0}>
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar Entrada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

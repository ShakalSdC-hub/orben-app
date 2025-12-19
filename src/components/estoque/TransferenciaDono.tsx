import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserRoundCog, ArrowRight, DollarSign } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface TransferenciaDonoProps {
  sublote: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferenciaDono({
  sublote,
  open,
  onOpenChange,
}: TransferenciaDonoProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [novoDonoId, setNovoDonoId] = useState("");
  const [valorAcrescimo, setValorAcrescimo] = useState("0");
  const [observacoes, setObservacoes] = useState("");

  // Fetch donos
  const { data: donos } = useQuery({
    queryKey: ["donos-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donos_material")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!sublote || !novoDonoId) throw new Error("Dados incompletos");

      // 1. Registrar na tabela transferencias_dono
      const { error: transferError } = await supabase
        .from("transferencias_dono")
        .insert({
          sublote_id: sublote.id,
          dono_origem_id: sublote.dono_id,
          dono_destino_id: novoDonoId === "ibrac" ? null : novoDonoId,
          peso_kg: sublote.peso_kg,
          valor_acrescimo: parseFloat(valorAcrescimo) || 0,
          observacoes: observacoes || null,
          created_by: user?.id,
        });
      if (transferError) throw transferError;

      // 2. Atualizar o sublote com novo dono
      const { error: subloteError } = await supabase
        .from("sublotes")
        .update({
          dono_id: novoDonoId === "ibrac" ? null : novoDonoId,
          custo_unitario_total:
            (sublote.custo_unitario_total || 0) +
            (parseFloat(valorAcrescimo) || 0) / (sublote.peso_kg || 1),
        })
        .eq("id", sublote.id);
      if (subloteError) throw subloteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sublotes"] });
      queryClient.invalidateQueries({ queryKey: ["transferencias-dono"] });
      toast({ title: "Transferência de dono realizada com sucesso!" });
      onOpenChange(false);
      setNovoDonoId("");
      setValorAcrescimo("0");
      setObservacoes("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro na transferência",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatWeight = (kg: number) => {
    if (kg >= 1000) return `${(kg / 1000).toFixed(2)}t`;
    return `${kg.toFixed(0)}kg`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Filter out current owner
  const availableDonos =
    donos?.filter((d) => d.id !== sublote?.dono_id) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRoundCog className="h-5 w-5 text-copper" />
            Transferir Dono do Material
          </DialogTitle>
        </DialogHeader>

        {sublote && (
          <div className="space-y-4">
            {/* Current Info */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sublote</span>
                <span className="font-mono font-bold">{sublote.codigo}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Peso</span>
                <span className="font-semibold">
                  {formatWeight(sublote.peso_kg)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Material</span>
                <span>{sublote.tipo_produto?.nome || "—"}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">Dono Atual</span>
                <span className="font-semibold text-primary">
                  {sublote.dono?.nome || "IBRAC (Próprio)"}
                </span>
              </div>
            </div>

            {/* Transfer Arrow */}
            <div className="flex items-center justify-center">
              <ArrowRight className="h-6 w-6 text-copper" />
            </div>

            {/* New Owner Selection */}
            <div className="space-y-2">
              <Label>Novo Dono</Label>
              <Select value={novoDonoId} onValueChange={setNovoDonoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o novo dono" />
                </SelectTrigger>
                <SelectContent>
                  {sublote.dono_id && (
                    <SelectItem value="ibrac">IBRAC (Próprio)</SelectItem>
                  )}
                  {availableDonos.map((dono) => (
                    <SelectItem key={dono.id} value={dono.id}>
                      {dono.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Value Adjustment */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Valor de Acréscimo (R$)
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={valorAcrescimo}
                onChange={(e) => setValorAcrescimo(e.target.value)}
                placeholder="0,00"
              />
              <p className="text-xs text-muted-foreground">
                Será adicionado ao custo unitário do material
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Motivo da transferência, acordo comercial, etc."
                rows={3}
              />
            </div>

            {/* Preview */}
            {parseFloat(valorAcrescimo) > 0 && (
              <div className="rounded-lg bg-copper/10 p-3 space-y-1">
                <p className="text-xs text-muted-foreground">
                  Novo custo unitário:
                </p>
                <p className="font-semibold text-copper">
                  {formatCurrency(
                    (sublote.custo_unitario_total || 0) +
                      parseFloat(valorAcrescimo) / (sublote.peso_kg || 1)
                  )}
                  /kg
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => transferMutation.mutate()}
            disabled={transferMutation.isPending || !novoDonoId}
            className="bg-gradient-copper hover:opacity-90"
          >
            {transferMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Confirmar Transferência
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

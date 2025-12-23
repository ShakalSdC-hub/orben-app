import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Edit, Save, DollarSign, Truck, Cog } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BeneficiamentoCustoReviewProps {
  beneficiamentos: any[];
  canEdit: boolean;
}

import { formatCurrency, formatWeight } from "@/lib/kpis";

export function BeneficiamentoCustoReview({ beneficiamentos, canEdit }: BeneficiamentoCustoReviewProps) {
  const queryClient = useQueryClient();
  const [editingBeneficiamento, setEditingBeneficiamento] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    custo_frete_ida: 0,
    custo_frete_volta: 0,
    custo_mo_terceiro: 0,
    custo_mo_ibrac: 0,
    taxa_financeira_pct: 0,
    perda_real_pct: 0,
    perda_cobrada_pct: 0,
  });

  const openEdit = (ben: any) => {
    setEditingBeneficiamento(ben);
    setFormData({
      custo_frete_ida: ben.custo_frete_ida || 0,
      custo_frete_volta: ben.custo_frete_volta || 0,
      custo_mo_terceiro: ben.custo_mo_terceiro || 0,
      custo_mo_ibrac: ben.custo_mo_ibrac || 0,
      taxa_financeira_pct: ben.taxa_financeira_pct || 0,
      perda_real_pct: ben.perda_real_pct || 0,
      perda_cobrada_pct: ben.perda_cobrada_pct || 0,
    });
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingBeneficiamento) return;

      const { error } = await supabase
        .from("beneficiamentos")
        .update({
          custo_frete_ida: formData.custo_frete_ida,
          custo_frete_volta: formData.custo_frete_volta,
          custo_mo_terceiro: formData.custo_mo_terceiro,
          custo_mo_ibrac: formData.custo_mo_ibrac,
          taxa_financeira_pct: formData.taxa_financeira_pct,
          perda_real_pct: formData.perda_real_pct,
          perda_cobrada_pct: formData.perda_cobrada_pct,
        })
        .eq("id", editingBeneficiamento.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiamentos_financeiro"] });
      toast({ title: "Custos atualizados com sucesso!" });
      setEditingBeneficiamento(null);
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });

  const custoTotal = formData.custo_frete_ida + formData.custo_frete_volta + 
                     formData.custo_mo_terceiro + formData.custo_mo_ibrac;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Revisão de Custos - Beneficiamentos
          </CardTitle>
          <CardDescription>Ajuste os custos dos documentos de beneficiamento finalizados</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Data Fim</TableHead>
                <TableHead>Processo</TableHead>
                <TableHead className="text-right">Peso Entrada</TableHead>
                <TableHead className="text-right">Peso Saída</TableHead>
                <TableHead className="text-right">Frete Total</TableHead>
                <TableHead className="text-right">MO Total</TableHead>
                <TableHead className="text-right">Custo Total</TableHead>
                {canEdit && <TableHead className="w-12"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {beneficiamentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 9 : 8} className="text-center text-muted-foreground py-8">
                    Nenhum beneficiamento finalizado
                  </TableCell>
                </TableRow>
              ) : (
                beneficiamentos.map((ben: any) => {
                  const custoFrete = (ben.custo_frete_ida || 0) + (ben.custo_frete_volta || 0);
                  const custoMO = (ben.custo_mo_terceiro || 0) + (ben.custo_mo_ibrac || 0);
                  const total = custoFrete + custoMO;

                  return (
                    <TableRow key={ben.id}>
                      <TableCell className="font-mono font-medium">{ben.codigo}</TableCell>
                      <TableCell>
                        {ben.data_fim ? format(new Date(ben.data_fim), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{ben.processo?.nome || "Interno"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatWeight(ben.peso_entrada_kg || 0)}</TableCell>
                      <TableCell className="text-right">{formatWeight(ben.peso_saida_kg || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(custoFrete)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(custoMO)}</TableCell>
                      <TableCell className="text-right font-bold text-primary">{formatCurrency(total)}</TableCell>
                      {canEdit && (
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(ben)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de Edição de Custos */}
      <Dialog open={!!editingBeneficiamento} onOpenChange={() => setEditingBeneficiamento(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Editar Custos - {editingBeneficiamento?.codigo}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="rounded-lg bg-muted p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Peso Entrada:</span>
                  <span className="font-medium ml-2">{formatWeight(editingBeneficiamento?.peso_entrada_kg || 0)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Peso Saída:</span>
                  <span className="font-medium ml-2">{formatWeight(editingBeneficiamento?.peso_saida_kg || 0)}</span>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Custos de Frete (R$)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frete Ida</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.custo_frete_ida}
                    onChange={(e) => setFormData({ ...formData, custo_frete_ida: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frete Volta</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.custo_frete_volta}
                    onChange={(e) => setFormData({ ...formData, custo_frete_volta: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Cog className="h-4 w-4" />
                  Mão de Obra (R$)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>MO Terceiro</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.custo_mo_terceiro}
                    onChange={(e) => setFormData({ ...formData, custo_mo_terceiro: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>MO IBRAC</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.custo_mo_ibrac}
                    onChange={(e) => setFormData({ ...formData, custo_mo_ibrac: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Taxas e Perdas (%)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Taxa Financeira (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.taxa_financeira_pct}
                    onChange={(e) => setFormData({ ...formData, taxa_financeira_pct: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Perda Real (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.perda_real_pct}
                    onChange={(e) => setFormData({ ...formData, perda_real_pct: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Perda Cobrada (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.perda_cobrada_pct}
                    onChange={(e) => setFormData({ ...formData, perda_cobrada_pct: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/30 border-primary">
              <CardContent className="pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Custo Total:</span>
                  <span className="text-2xl font-bold text-primary">{formatCurrency(custoTotal)}</span>
                </div>
                {editingBeneficiamento?.peso_entrada_kg > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    R$/kg: {formatCurrency(custoTotal / editingBeneficiamento.peso_entrada_kg)}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBeneficiamento(null)}>Cancelar</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
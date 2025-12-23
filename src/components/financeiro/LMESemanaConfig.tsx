import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Edit2, Trash2, Calculator, Loader2, TrendingUp } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, getWeek, getYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

interface LMESemanaFormData {
  ano: number;
  semana: number;
  data_inicio: string;
  data_fim: string;
  lme_cobre_usd_t: number;
  dolar_brl: number;
  icms_pct: number;
  pis_cofins_pct: number;
  taxa_financeira_pct: number;
  observacoes: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatNumber(value: number, decimals = 2) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

export function LMESemanaConfig() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const hoje = new Date();
  const [formData, setFormData] = useState<LMESemanaFormData>({
    ano: getYear(hoje),
    semana: getWeek(hoje, { weekStartsOn: 1 }),
    data_inicio: format(startOfWeek(hoje, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    data_fim: format(endOfWeek(hoje, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    lme_cobre_usd_t: 9000,
    dolar_brl: 6.0,
    icms_pct: 7.0,
    pis_cofins_pct: 1.65,
    taxa_financeira_pct: 4.3,
    observacoes: "",
  });

  // Fetch configurations
  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["lme_semana_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lme_semana_config")
        .select("*")
        .order("ano", { ascending: false })
        .order("semana", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: LMESemanaFormData) => {
      const { error } = await supabase.from("lme_semana_config").insert({
        ...data,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lme_semana_config"] });
      toast({ title: "Configuração LME criada com sucesso!" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar configuração", description: error.message, variant: "destructive" });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: LMESemanaFormData }) => {
      const { error } = await supabase
        .from("lme_semana_config")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lme_semana_config"] });
      toast({ title: "Configuração LME atualizada com sucesso!" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar configuração", description: error.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lme_semana_config").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lme_semana_config"] });
      toast({ title: "Configuração LME excluída!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    const hoje = new Date();
    setFormData({
      ano: getYear(hoje),
      semana: getWeek(hoje, { weekStartsOn: 1 }),
      data_inicio: format(startOfWeek(hoje, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      data_fim: format(endOfWeek(hoje, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      lme_cobre_usd_t: 9000,
      dolar_brl: 6.0,
      icms_pct: 7.0,
      pis_cofins_pct: 1.65,
      taxa_financeira_pct: 4.3,
      observacoes: "",
    });
    setEditingId(null);
  };

  const handleEdit = (config: any) => {
    setFormData({
      ano: config.ano,
      semana: config.semana,
      data_inicio: config.data_inicio,
      data_fim: config.data_fim,
      lme_cobre_usd_t: Number(config.lme_cobre_usd_t),
      dolar_brl: Number(config.dolar_brl),
      icms_pct: Number(config.icms_pct),
      pis_cofins_pct: Number(config.pis_cofins_pct),
      taxa_financeira_pct: Number(config.taxa_financeira_pct),
      observacoes: config.observacoes || "",
    });
    setEditingId(config.id);
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Calculate preview values
  const lmeBase = (formData.lme_cobre_usd_t * formData.dolar_brl) / 1000;
  const fatorTotal = (1 + formData.icms_pct / 100) * (1 + formData.pis_cofins_pct / 100) * (1 + formData.taxa_financeira_pct / 100);
  const lmeFinal = lmeBase * fatorTotal;

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              LME Semana - Configuração
            </CardTitle>
            <CardDescription>
              Configure os valores LME por semana incluindo impostos e custos financeiros para cálculo do custo de referência
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Semana
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Editar Configuração LME" : "Nova Configuração LME Semanal"}
                </DialogTitle>
              </DialogHeader>
              
              <div className="grid gap-6">
                {/* Period */}
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Ano</Label>
                    <Input
                      type="number"
                      value={formData.ano}
                      onChange={(e) => setFormData({ ...formData, ano: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Semana</Label>
                    <Input
                      type="number"
                      min={1}
                      max={53}
                      value={formData.semana}
                      onChange={(e) => setFormData({ ...formData, semana: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Início</Label>
                    <Input
                      type="date"
                      value={formData.data_inicio}
                      onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Fim</Label>
                    <Input
                      type="date"
                      value={formData.data_fim}
                      onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                    />
                  </div>
                </div>

                {/* LME Values */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>LME Cobre (USD/t)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.lme_cobre_usd_t}
                      onChange={(e) => setFormData({ ...formData, lme_cobre_usd_t: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dólar (R$)</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={formData.dolar_brl}
                      onChange={(e) => setFormData({ ...formData, dolar_brl: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                {/* Taxes and Costs */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>ICMS (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.icms_pct}
                      onChange={(e) => setFormData({ ...formData, icms_pct: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>PIS/COFINS (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.pis_cofins_pct}
                      onChange={(e) => setFormData({ ...formData, pis_cofins_pct: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Taxa Financeira (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.taxa_financeira_pct}
                      onChange={(e) => setFormData({ ...formData, taxa_financeira_pct: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                {/* Preview Calculation */}
                <Card className="bg-muted/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Cálculo Prévia
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid gap-4 md:grid-cols-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">LME Base:</span>
                        <p className="font-medium">
                          {formatNumber(formData.lme_cobre_usd_t)} × {formatNumber(formData.dolar_brl, 4)} ÷ 1000 = <strong>R$ {formatNumber(lmeBase)}/kg</strong>
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fator Total:</span>
                        <p className="font-medium">
                          (1 + {formatNumber(formData.icms_pct)}%) × (1 + {formatNumber(formData.pis_cofins_pct)}%) × (1 + {formatNumber(formData.taxa_financeira_pct)}%) = <strong>{formatNumber(fatorTotal, 4)}</strong>
                        </p>
                      </div>
                      <div className="bg-primary/10 p-3 rounded-lg">
                        <span className="text-muted-foreground">LME Final:</span>
                        <p className="text-xl font-bold text-primary">
                          R$ {formatNumber(lmeFinal)}/kg
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Notas sobre esta semana..."
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingId ? "Atualizar" : "Criar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          {configs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma configuração de LME semanal cadastrada.</p>
              <p className="text-sm">Clique em "Nova Semana" para adicionar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Semana</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">LME (USD/t)</TableHead>
                    <TableHead className="text-right">Dólar</TableHead>
                    <TableHead className="text-right">LME Base</TableHead>
                    <TableHead className="text-right">ICMS</TableHead>
                    <TableHead className="text-right">PIS/COF</TableHead>
                    <TableHead className="text-right">Fin.</TableHead>
                    <TableHead className="text-right">LME Final</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((config: any) => (
                    <TableRow key={config.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {config.ano}/S{config.semana}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(config.data_inicio + "T00:00:00"), "dd/MM")} - {format(new Date(config.data_fim + "T00:00:00"), "dd/MM")}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(Number(config.lme_cobre_usd_t), 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(Number(config.dolar_brl), 4)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        R$ {formatNumber(Number(config.lme_base_brl_kg))}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatNumber(Number(config.icms_pct))}%
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatNumber(Number(config.pis_cofins_pct))}%
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatNumber(Number(config.taxa_financeira_pct))}%
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">
                        R$ {formatNumber(Number(config.lme_final_brl_kg))}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(config)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Excluir esta configuração?")) {
                                deleteMutation.mutate(config.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formula explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Fórmula de Cálculo</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p><strong>LME Base (R$/kg)</strong> = LME Cobre (USD/t) × Dólar (R$) ÷ 1000</p>
          <p><strong>Fator Total</strong> = (1 + ICMS%) × (1 + PIS/COFINS%) × (1 + Taxa Financeira%)</p>
          <p><strong>LME Final (R$/kg)</strong> = LME Base × Fator Total</p>
          <p className="pt-2 border-t">
            Este valor representa o custo de referência do cobre considerando impostos e custos financeiros, 
            usado para calcular a economia vs LME nos beneficiamentos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

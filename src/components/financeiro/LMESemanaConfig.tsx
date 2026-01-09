import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Edit2, Trash2, Calculator, Loader2, TrendingUp, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, getWeek, getYear, parseISO, getISOWeek, getISOWeekYear } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatNumber } from "@/lib/kpis";

interface LMESemanaFormData {
  ano: number;
  semana: number;
  data_inicio: string;
  data_fim: string;
  lme_cobre_usd_t: number;
  dolar_brl: number;
  fator_imposto: number;
  observacoes: string;
}

export function LMESemanaConfig() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
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
    fator_imposto: 0.7986,
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

  // Query para buscar médias semanais do histórico
  const { data: mediasHistorico = [] } = useQuery({
    queryKey: ["historico_lme_medias_import"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_lme")
        .select("*")
        .eq("is_media_semanal", true)
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Calcular semanas disponíveis para importar
  const semanasExistentes = new Set(
    configs.map((c: any) => `${c.ano}-${c.semana}`)
  );
  
  const semanasParaImportar = mediasHistorico
    .filter((m: any) => {
      const dataRegistro = parseISO(m.data);
      const ano = getISOWeekYear(dataRegistro);
      const semana = m.semana_numero || getISOWeek(dataRegistro);
      return !semanasExistentes.has(`${ano}-${semana}`);
    })
    .map((m: any) => {
      const dataRegistro = parseISO(m.data);
      return {
        ...m,
        ano: getISOWeekYear(dataRegistro),
        semana: m.semana_numero || getISOWeek(dataRegistro),
      };
    });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: LMESemanaFormData) => {
      const { error } = await supabase.from("lme_semana_config").insert({
        ...data,
        icms_pct: 0,
        pis_cofins_pct: 0,
        taxa_financeira_pct: 0,
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
        .update({
          ...data,
          icms_pct: 0,
          pis_cofins_pct: 0,
          taxa_financeira_pct: 0,
        })
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

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (semanas: any[]) => {
      for (const s of semanas) {
        const dataBase = parseISO(s.data);
        const dow = dataBase.getDay();
        const dataInicio = new Date(dataBase);
        dataInicio.setDate(dataBase.getDate() - dow + 1); // Segunda
        const dataFim = new Date(dataBase);
        dataFim.setDate(dataBase.getDate() - dow + 5); // Sexta

        const lmeBaseBrlKg = s.cobre_brl_kg || ((s.cobre_usd_t || 0) * (s.dolar_brl || 0) / 1000);

        const { error } = await supabase.from("lme_semana_config").insert({
          ano: s.ano,
          semana: s.semana,
          data_inicio: format(dataInicio, "yyyy-MM-dd"),
          data_fim: format(dataFim, "yyyy-MM-dd"),
          lme_cobre_usd_t: s.cobre_usd_t || 0,
          dolar_brl: s.dolar_brl || 0,
          fator_imposto: 0.7986,
          lme_base_brl_kg: lmeBaseBrlKg,
          icms_pct: 0,
          pis_cofins_pct: 0,
          taxa_financeira_pct: 0,
          observacoes: "Importado automaticamente do histórico LME (média dias úteis)",
          created_by: user?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lme_semana_config"] });
      queryClient.invalidateQueries({ queryKey: ["historico_lme_medias_import"] });
      toast({ title: "Importação concluída!", description: `${semanasParaImportar.length} semanas importadas.` });
      setIsImportDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Erro na importação", description: error.message, variant: "destructive" });
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
      fator_imposto: 0.7986,
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
      fator_imposto: Number(config.fator_imposto) || 0.7986,
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

  // Calculate preview values - simplified formula: LME Final = LME Base ÷ Fator Imposto
  const lmeBase = (formData.lme_cobre_usd_t * formData.dolar_brl) / 1000;
  const lmeFinal = formData.fator_imposto > 0 ? lmeBase / formData.fator_imposto : lmeBase;

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
              Configure os valores LME por semana para cálculo do benchmark de custo
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {/* Import Button */}
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Importar do Histórico
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Importar Médias Semanais</DialogTitle>
                </DialogHeader>
                {semanasParaImportar.length === 0 ? (
                  <p className="text-muted-foreground">Todas as semanas do histórico já foram importadas.</p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {semanasParaImportar.length} semana(s) disponível(is) para importar:
                    </p>
                    <ul className="list-disc pl-4 max-h-48 overflow-auto space-y-1 text-sm">
                      {semanasParaImportar.map((s: any) => (
                        <li key={`${s.ano}-${s.semana}`}>
                          <strong>S{s.semana}/{s.ano}</strong> - LME: {formatNumber(s.cobre_usd_t)} USD/t, Dólar: {formatNumber(s.dolar_brl, 4)}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={() => importMutation.mutate(semanasParaImportar)}
                    disabled={semanasParaImportar.length === 0 || importMutation.isPending}
                  >
                    {importMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Importar {semanasParaImportar.length} semana(s)
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* New Config Button */}
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
              <DialogContent className="max-w-lg">
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
                  <div className="grid gap-4 md:grid-cols-3">
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
                    <div className="space-y-2">
                      <Label>Fator Imposto</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={formData.fator_imposto}
                        onChange={(e) => setFormData({ ...formData, fator_imposto: parseFloat(e.target.value) || 0.7986 })}
                      />
                      <p className="text-xs text-muted-foreground">Padrão: 0.7986 (~25% impostos)</p>
                    </div>
                  </div>

                  {/* Preview Calculation */}
                  <Card className="bg-muted/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Cálculo
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">LME Base:</span>
                          <p className="font-medium">
                            ({formatNumber(formData.lme_cobre_usd_t)} × {formatNumber(formData.dolar_brl, 4)}) ÷ 1000 = <strong>R$ {formatNumber(lmeBase)}/kg</strong>
                          </p>
                        </div>
                        <div className="bg-primary/10 p-3 rounded-lg">
                          <span className="text-muted-foreground">LME Final (Benchmark):</span>
                          <p className="font-medium">
                            R$ {formatNumber(lmeBase)} ÷ {formatNumber(formData.fator_imposto, 4)} = 
                          </p>
                          <p className="text-2xl font-bold text-primary">
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
          </div>
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
                    <TableHead className="text-right">Fator Imp.</TableHead>
                    <TableHead className="text-right">LME Base</TableHead>
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
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatNumber(Number(config.fator_imposto) || 0.7986, 4)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        R$ {formatNumber(Number(config.lme_base_brl_kg))}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">
                        R$ {formatNumber(Number(config.lme_final_brl_kg))}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
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
    </div>
  );
}

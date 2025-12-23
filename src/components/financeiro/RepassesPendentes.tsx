import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, CheckCircle, DollarSign, User, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/kpis";

export function RepassesPendentes() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Acertos pendentes do tipo repasse
  const { data: acertos = [], isLoading } = useQuery({
    queryKey: ["repasses-pendentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acertos_financeiros")
        .select(`
          *,
          dono:donos_material(id, nome),
          parceiro:parceiros(razao_social)
        `)
        .eq("status", "pendente")
        .in("tipo", ["repasse", "divida"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Agrupar por dono
  const repassesPorDono = useMemo(() => {
    const grupos: Record<string, { dono_nome: string; total: number; acertos: any[] }> = {};

    acertos.forEach((acerto: any) => {
      const donoId = acerto.dono_id || "sem_dono";
      const donoNome = acerto.dono?.nome || acerto.parceiro?.razao_social || "Sem dono";

      if (!grupos[donoId]) {
        grupos[donoId] = { dono_nome: donoNome, total: 0, acertos: [] };
      }
      grupos[donoId].total += acerto.valor || 0;
      grupos[donoId].acertos.push(acerto);
    });

    return Object.entries(grupos).map(([id, data]) => ({
      dono_id: id,
      ...data,
    }));
  }, [acertos]);

  const totalPendente = acertos.reduce((acc: number, a: any) => acc + (a.valor || 0), 0);
  const totalSelecionado = acertos
    .filter((a: any) => selectedIds.includes(a.id))
    .reduce((acc: number, a: any) => acc + (a.valor || 0), 0);

  // Toggle seleção
  const toggleAcerto = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Selecionar todos de um dono
  const toggleDono = (donoId: string) => {
    const acertosDono = acertos.filter((a: any) => (a.dono_id || "sem_dono") === donoId);
    const todosIdsRepasse = acertosDono.map((a: any) => a.id);
    const todosSelecionados = todosIdsRepasse.every(id => selectedIds.includes(id));

    if (todosSelecionados) {
      setSelectedIds(prev => prev.filter(id => !todosIdsRepasse.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...todosIdsRepasse])]);
    }
  };

  // Conciliar repasses
  const conciliarMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        const { error } = await supabase
          .from("acertos_financeiros")
          .update({ status: "pago", data_pagamento: new Date().toISOString().split("T")[0] })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repasses-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["acertos_financeiros"] });
      toast({ title: "Repasses conciliados com sucesso!" });
      setSelectedIds([]);
    },
    onError: (error) => {
      toast({ title: "Erro ao conciliar", description: error.message, variant: "destructive" });
    },
  });

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
      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-warning">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
                <AlertCircle className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pendente</p>
                <p className="text-2xl font-bold text-warning">{formatCurrency(totalPendente)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-info">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-info/10">
                <User className="h-6 w-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Donos com Pendência</p>
                <p className="text-2xl font-bold text-info">{repassesPorDono.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Selecionado</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalSelecionado)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ação de Conciliação */}
      {selectedIds.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{selectedIds.length} repasse(s) selecionado(s)</p>
              <p className="text-sm text-muted-foreground">
                Total: {formatCurrency(totalSelecionado)}
              </p>
            </div>
            <Button 
              onClick={() => conciliarMutation.mutate(selectedIds)}
              disabled={conciliarMutation.isPending}
            >
              {conciliarMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Conciliar Repasses
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lista por Dono */}
      {repassesPorDono.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
            <p className="text-lg font-medium">Nenhum repasse pendente</p>
            <p className="text-sm">Todos os repasses foram conciliados.</p>
          </CardContent>
        </Card>
      ) : (
        repassesPorDono.map((grupo) => (
          <Card key={grupo.dono_id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={grupo.acertos.every((a: any) => selectedIds.includes(a.id))}
                    onCheckedChange={() => toggleDono(grupo.dono_id)}
                  />
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {grupo.dono_nome}
                    </CardTitle>
                    <CardDescription>
                      {grupo.acertos.length} repasse(s) pendente(s)
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {formatCurrency(grupo.total)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grupo.acertos.map((acerto: any) => (
                    <TableRow key={acerto.id} className="text-sm">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(acerto.id)}
                          onCheckedChange={() => toggleAcerto(acerto.id)}
                        />
                      </TableCell>
                      <TableCell>
                        {acerto.data_acerto ? format(new Date(acerto.data_acerto), "dd/MM/yy") : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={acerto.tipo === "repasse" ? "default" : "secondary"}>
                          {acerto.tipo === "repasse" ? "Repasse" : "Dívida"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {acerto.referencia_tipo}: {acerto.referencia_id?.slice(0, 8) || "—"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {acerto.observacoes || "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(acerto.valor)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, TrendingDown, Users, AlertTriangle, CheckCircle, Clock, Calculator } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  pendente: { label: "Pendente", variant: "outline", icon: Clock },
  pago: { label: "Pago", variant: "default", icon: CheckCircle },
  cancelado: { label: "Cancelado", variant: "destructive", icon: AlertTriangle },
};

export default function Financeiro() {
  const { data: acertos = [] } = useQuery({
    queryKey: ["acertos_financeiros"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acertos_financeiros")
        .select(`
          *,
          donos_material(nome)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: configFiscal = [] } = useQuery({
    queryKey: ["config_fiscal"],
    queryFn: async () => {
      const { data, error } = await supabase.from("config_fiscal").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: beneficiamentos = [] } = useQuery({
    queryKey: ["beneficiamentos_financeiro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamentos")
        .select("*")
        .eq("status", "finalizado");
      if (error) throw error;
      return data;
    },
  });

  // Calcular totais
  const creditoAcumulado = configFiscal.find((c: any) => c.nome === "credito_acumulado_ibrac")?.valor || 0;
  const fatorImposto = configFiscal.find((c: any) => c.nome === "fator_imposto")?.valor || 0.7986;

  const totalPendente = acertos.filter((a: any) => a.status === "pendente").reduce((acc: number, a: any) => acc + (a.valor || 0), 0);
  const totalPago = acertos.filter((a: any) => a.status === "pago").reduce((acc: number, a: any) => acc + (a.valor || 0), 0);
  
  const lucroPerdas = beneficiamentos.reduce((acc: number, b: any) => {
    const lucro = ((b.perda_cobrada_pct || 0) - (b.perda_real_pct || 0)) * (b.peso_entrada_kg || 0) / 100;
    return acc + lucro;
  }, 0);

  // Simular perda tributária (12% ICMS + 9.25% PIS/COFINS)
  const totalOperacoes = beneficiamentos.reduce((acc: number, b: any) => acc + (b.peso_entrada_kg || 0), 0);
  const perdaTributaria = totalOperacoes * 35 * 0.2125; // Estimativa: R$35/kg * 21.25% impostos

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground">Acompanhe os acertos financeiros e comparativo fiscal</p>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />Pendente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-warning">{formatCurrency(totalPendente)}</p>
              <p className="text-xs text-muted-foreground">{acertos.filter((a: any) => a.status === "pendente").length} acertos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />Recebido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">{formatCurrency(totalPago)}</p>
              <p className="text-xs text-muted-foreground">{acertos.filter((a: any) => a.status === "pago").length} acertos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />Lucro Perdas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{formatCurrency(lucroPerdas * 35)}</p>
              <p className="text-xs text-muted-foreground">{lucroPerdas.toFixed(0)} kg de material</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />Crédito ICMS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(creditoAcumulado)}</p>
              <p className="text-xs text-muted-foreground">Crédito acumulado</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="acertos" className="w-full">
          <TabsList>
            <TabsTrigger value="acertos">Acertos Financeiros</TabsTrigger>
            <TabsTrigger value="fiscal">Comparativo Fiscal</TabsTrigger>
          </TabsList>

          <TabsContent value="acertos" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Acertos por Dono</CardTitle>
                <CardDescription>Controle de cobranças e repasses por proprietário do material</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dono</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data Acerto</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {acertos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Nenhum acerto financeiro registrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      acertos.map((a: any) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.donos_material?.nome || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{a.tipo}</Badge>
                          </TableCell>
                          <TableCell>{format(new Date(a.data_acerto), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(a.valor)}</TableCell>
                          <TableCell>
                            <Badge variant={statusConfig[a.status]?.variant || "secondary"}>
                              {statusConfig[a.status]?.label || a.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fiscal" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Comparativo Fiscal
                  </CardTitle>
                  <CardDescription>Análise de viabilidade tributária</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm">Crédito Acumulado IBRAC</span>
                      <span className="font-mono font-bold text-success">{formatCurrency(creditoAcumulado)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm">Perda Tributária Estimada</span>
                      <span className="font-mono font-bold text-destructive">{formatCurrency(perdaTributaria)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm">Fator Imposto</span>
                      <span className="font-mono font-bold">{fatorImposto}</span>
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg border-2 ${creditoAcumulado > perdaTributaria ? "border-success bg-success/10" : "border-warning bg-warning/10"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {creditoAcumulado > perdaTributaria ? (
                        <TrendingUp className="h-5 w-5 text-success" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-warning" />
                      )}
                      <span className="font-semibold">
                        {creditoAcumulado > perdaTributaria ? "Operação Viável" : "Atenção Necessária"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {creditoAcumulado > perdaTributaria 
                        ? "O crédito acumulado cobre as perdas tributárias. Continuar operando."
                        : "A perda tributária está consumindo o crédito. Avaliar estratégia."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resumo por Operação</CardTitle>
                  <CardDescription>Lucro IBRAC por beneficiamento</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Operação</TableHead>
                        <TableHead className="text-right">Perda Real</TableHead>
                        <TableHead className="text-right">Perda Cobrada</TableHead>
                        <TableHead className="text-right">Lucro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {beneficiamentos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Nenhum beneficiamento finalizado
                          </TableCell>
                        </TableRow>
                      ) : (
                        beneficiamentos.slice(0, 5).map((b: any) => {
                          const lucro = (b.perda_cobrada_pct - b.perda_real_pct);
                          return (
                            <TableRow key={b.id}>
                              <TableCell className="font-mono">{b.codigo}</TableCell>
                              <TableCell className="text-right">{b.perda_real_pct?.toFixed(2)}%</TableCell>
                              <TableCell className="text-right">{b.perda_cobrada_pct?.toFixed(2)}%</TableCell>
                              <TableCell className={`text-right font-medium ${lucro > 0 ? "text-success" : "text-destructive"}`}>
                                {lucro.toFixed(2)}%
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

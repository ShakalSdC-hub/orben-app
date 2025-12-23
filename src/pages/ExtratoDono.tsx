import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Package, ArrowUpRight, ArrowDownRight, Factory, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatWeightCompact as formatWeight } from "@/lib/kpis";
import { useState } from "react";

export default function ExtratoDono() {
  const [selectedDono, setSelectedDono] = useState<string>("todos");

  // Fetch parceiros tipo DONO
  const { data: donos = [] } = useQuery({
    queryKey: ["parceiros-donos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parceiros")
        .select("id, razao_social, nome_fantasia")
        .eq("ativo", true)
        .eq("tipo", "DONO")
        .order("razao_social");
      if (error) throw error;
      return data;
    },
  });

  // Acertos financeiros
  const { data: acertos = [] } = useQuery({
    queryKey: ["acertos_extrato", selectedDono],
    queryFn: async () => {
      let query = supabase
        .from("acertos_financeiros")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (selectedDono !== "todos") {
        query = query.eq("dono_id", selectedDono);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const acertosPendentes = acertos.filter((a: any) => a.status === "pendente");
  const totalAPagar = acertosPendentes
    .filter((a: any) => a.tipo === "divida")
    .reduce((acc: number, a: any) => acc + (a.valor || 0), 0);
  const totalAReceber = acertosPendentes
    .filter((a: any) => a.tipo === "receita")
    .reduce((acc: number, a: any) => acc + (a.valor || 0), 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Extrato por Dono</h1>
            <p className="text-muted-foreground">Visualize acertos e movimentações por dono</p>
          </div>
          <Select value={selectedDono} onValueChange={setSelectedDono}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecione o dono" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Donos</SelectItem>
              {donos.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>{d.nome_fantasia || d.razao_social}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* KPIs Principais */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Donos Cadastrados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{donos.length}</p>
              <p className="text-sm text-muted-foreground">Parceiros tipo DONO</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-info">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Factory className="h-4 w-4 text-info" />
                Em Construção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-info">—</p>
              <p className="text-sm text-muted-foreground">Novos KPIs virão</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-success">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-success" />
                A Receber
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">{formatCurrency(totalAReceber)}</p>
              <p className="text-sm text-muted-foreground">
                {acertosPendentes.filter((a: any) => a.tipo === "receita").length} pendentes
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-destructive">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4 text-destructive" />
                A Pagar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(totalAPagar)}</p>
              <p className="text-sm text-muted-foreground">
                {acertosPendentes.filter((a: any) => a.tipo === "divida").length} pendentes
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Em Construção</CardTitle>
            <CardDescription>
              Esta página será atualizada para o novo modelo de dados com os 3 cenários de operação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Os extratos detalhados por dono serão implementados após a criação das telas de operação.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

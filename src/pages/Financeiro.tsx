import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, Clock, HandCoins, Calendar } from "lucide-react";
import { RepassesPendentes } from "@/components/financeiro/RepassesPendentes";
import { LMESemanaConfig } from "@/components/financeiro/LMESemanaConfig";
import { formatCurrency } from "@/lib/kpis";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Financeiro() {
  // Acertos financeiros
  const { data: acertos = [] } = useQuery({
    queryKey: ["acertos_financeiros"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acertos_financeiros")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const totalPendente = acertos.filter((a: any) => a.status === "pendente").reduce((acc: number, a: any) => acc + (a.valor || 0), 0);
  const totalPago = acertos.filter((a: any) => a.status === "pago").reduce((acc: number, a: any) => acc + (a.valor || 0), 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
            <p className="text-muted-foreground">Dashboard financeiro - em construção para novo modelo</p>
          </div>
        </div>

        {/* KPIs Principais */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-warning">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" />
                Acertos Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-warning">{formatCurrency(totalPendente)}</p>
              <p className="text-xs text-muted-foreground">
                {acertos.filter((a: any) => a.status === "pendente").length} acertos pendentes
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-success">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-success" />
                Total Pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">{formatCurrency(totalPago)}</p>
              <p className="text-xs text-muted-foreground">
                {acertos.filter((a: any) => a.status === "pago").length} acertos pagos
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Em Construção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">—</p>
              <p className="text-xs text-muted-foreground">
                Novos KPIs serão adicionados
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Em Construção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-muted-foreground">—</p>
              <p className="text-xs text-muted-foreground">
                Novos KPIs serão adicionados
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="repasses" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-none lg:flex">
            <TabsTrigger value="repasses" className="flex items-center gap-1">
              <HandCoins className="h-3 w-3" />
              Repasses
            </TabsTrigger>
            <TabsTrigger value="lme-semana" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              LME Semana
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="repasses" className="mt-6">
            <RepassesPendentes />
          </TabsContent>
          
          <TabsContent value="lme-semana" className="mt-6">
            <LMESemanaConfig />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

import { MainLayout } from "@/components/layout/MainLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { LMEBenchmark } from "@/components/dashboard/LMEBenchmark";
import { EstoqueOverview } from "@/components/dashboard/EstoqueOverview";
import { RecentROMs } from "@/components/dashboard/RecentROMs";
import { FinancialSummary } from "@/components/dashboard/FinancialSummary";
import {
  Package,
  FileInput,
  TrendingUp,
  Factory,
  Calendar,
} from "lucide-react";

export default function Index() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Quinta-feira, 19 de Dezembro de 2024</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Painel de Controle
          </h1>
          <p className="text-muted-foreground">
            Visão geral das operações da IBRAC
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Estoque Total"
            value="74.8t"
            subtitle="Cobre em todas as localizações"
            icon={<Package className="h-5 w-5" />}
            trend="up"
            trendValue="+12%"
          />
          <KPICard
            title="Movimentações Hoje"
            value="8"
            subtitle="4 entradas · 4 saídas"
            icon={<FileInput className="h-5 w-5" />}
            trend="neutral"
            trendValue="="
          />
          <KPICard
            title="Custo Médio"
            value="R$ 42,50"
            subtitle="Por kg de vergalhão"
            icon={<TrendingUp className="h-5 w-5" />}
            trend="down"
            trendValue="-3.2%"
            variant="copper"
          />
          <KPICard
            title="Em Processo"
            value="20.8t"
            subtitle="Plasinco + Laminador 2"
            icon={<Factory className="h-5 w-5" />}
            trend="up"
            trendValue="+5.3t"
          />
        </div>

        {/* LME Benchmark - Full Width */}
        <LMEBenchmark custoIndustrializado={42.5} precoLME={48.2} />

        {/* Two Column Layout */}
        <div className="grid gap-6 lg:grid-cols-2">
          <EstoqueOverview />
          <FinancialSummary />
        </div>

        {/* Recent ROMs - Full Width */}
        <RecentROMs />
      </div>
    </MainLayout>
  );
}

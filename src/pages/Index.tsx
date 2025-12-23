import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Loader2,
  Factory,
  Handshake,
  Building2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LMECharts } from "@/components/dashboard/LMECharts";
import { formatCurrency } from "@/lib/kpis";
import { Link } from "react-router-dom";

export default function Index() {
  // Fetch última cotação LME
  const { data: ultimaLme, isLoading: loadingLme } = useQuery({
    queryKey: ["dashboard-lme"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_lme")
        .select("*")
        .order("data", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  // Fetch operações dos 3 cenários
  const { data: operacoesProprias = [] } = useQuery({
    queryKey: ["dashboard-op-proprias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operacoes")
        .select("id, nome, status")
        .eq("is_deleted", false);
      if (error) throw error;
      return data;
    },
  });

  const { data: operacoesTerceiros = [] } = useQuery({
    queryKey: ["dashboard-op-terceiros"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operacoes_terceiros")
        .select("id, nome, status")
        .eq("is_deleted", false);
      if (error) throw error;
      return data;
    },
  });

  const { data: operacoesIntermediacao = [] } = useQuery({
    queryKey: ["dashboard-op-intermediacao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operacoes_intermediacao")
        .select("id, nome, status")
        .eq("is_deleted", false);
      if (error) throw error;
      return data;
    },
  });

  const lmeAtual = ultimaLme?.[0];
  const lmeAnterior = ultimaLme?.[1];
  const variacaoLme = lmeAtual && lmeAnterior && lmeAnterior.cobre_brl_kg
    ? ((lmeAtual.cobre_brl_kg! - lmeAnterior.cobre_brl_kg!) / lmeAnterior.cobre_brl_kg!) * 100
    : 0;

  const totalOpAbertas = 
    operacoesProprias.filter(o => o.status === "ABERTA").length +
    operacoesTerceiros.filter(o => o.status === "ABERTA").length +
    operacoesIntermediacao.filter(o => o.status === "ABERTA").length;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Painel de Controle</h1>
            <p className="text-muted-foreground">Visão geral das operações da IBRAC</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cobre LME (R$/kg)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {lmeAtual?.cobre_brl_kg ? formatCurrency(lmeAtual.cobre_brl_kg) : "—"}
              </div>
              <div className="flex items-center text-xs">
                {variacaoLme !== 0 && (
                  <>
                    {variacaoLme > 0 ? (
                      <TrendingUp className="h-3 w-3 text-success mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-destructive mr-1" />
                    )}
                    <span className={variacaoLme > 0 ? "text-success" : "text-destructive"}>
                      {variacaoLme > 0 ? "+" : ""}{variacaoLme.toFixed(2)}%
                    </span>
                    <span className="text-muted-foreground ml-1">vs ontem</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Operações Abertas</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOpAbertas}</div>
              <p className="text-xs text-muted-foreground">
                Nos 3 cenários
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Operações</CardTitle>
              <Factory className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {operacoesProprias.length + operacoesTerceiros.length + operacoesIntermediacao.length}
              </div>
              <p className="text-xs text-muted-foreground">Todas as operações</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dólar (BRL)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {lmeAtual?.dolar_brl ? `R$ ${lmeAtual.dolar_brl.toFixed(2)}` : "—"}
              </div>
              <p className="text-xs text-muted-foreground">Última cotação</p>
            </CardContent>
          </Card>
        </div>

        {/* Cenários */}
        <div className="grid gap-4 md:grid-cols-3">
          <Link to="/operacoes-proprias">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Factory className="h-5 w-5 text-primary" />
                  Material Próprio
                </CardTitle>
                <CardDescription>Cenário 1 - Compra e beneficiamento próprio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Operações</span>
                  <Badge variant="secondary">{operacoesProprias.length}</Badge>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-muted-foreground">Abertas</span>
                  <Badge>{operacoesProprias.filter(o => o.status === "ABERTA").length}</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/operacoes-terceiros">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Handshake className="h-5 w-5 text-info" />
                  Serviço Terceiros
                </CardTitle>
                <CardDescription>Cenário 2 - Beneficiamento para terceiros</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Operações</span>
                  <Badge variant="secondary">{operacoesTerceiros.length}</Badge>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-muted-foreground">Abertas</span>
                  <Badge>{operacoesTerceiros.filter(o => o.status === "ABERTA").length}</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/operacoes-intermediacao">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-warning" />
                  Intermediação
                </CardTitle>
                <CardDescription>Cenário 3 - Compra/venda para terceiros</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Operações</span>
                  <Badge variant="secondary">{operacoesIntermediacao.length}</Badge>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-muted-foreground">Abertas</span>
                  <Badge>{operacoesIntermediacao.filter(o => o.status === "ABERTA").length}</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Gráficos LME */}
        <LMECharts lmeData={ultimaLme || []} isLoading={loadingLme} />
      </div>
    </MainLayout>
  );
}

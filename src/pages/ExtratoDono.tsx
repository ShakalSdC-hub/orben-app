import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DollarSign, Package, ArrowUpRight, ArrowDownRight, Factory, Users, TrendingUp, Layers, CalendarIcon, FileSpreadsheet, FileText, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatWeightCompact as formatWeight } from "@/lib/kpis";
import { CENARIOS_CONFIG, getCenarioColor, type CenarioOperacao } from "@/lib/cenarios-orben";
import { useState, useMemo, useCallback } from "react";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface CenarioTotals {
  cenario: string;
  label: string;
  kgTotal: number;
  valorTotal: number;
  custoTotal: number;
  resultadoTotal: number;
  operacoes: number;
}

const COLORS = ['hsl(210, 80%, 60%)', 'hsl(150, 60%, 50%)', 'hsl(45, 90%, 55%)'];

export default function ExtratoDono() {
  const [selectedDono, setSelectedDono] = useState<string>("todos");
  const [dataInicio, setDataInicio] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dataFim, setDataFim] = useState<Date | undefined>(endOfMonth(new Date()));

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

  // Fetch saídas C1 (Cenário Próprio)
  const { data: saidasC1 = [] } = useQuery({
    queryKey: ["saidas-c1-extrato"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saidas_c1")
        .select(`
          id, dt, kg_saida, tipo_saida, documento,
          custo_saida_rs, receita_simulada_rs, resultado_simulado_rs,
          operacao:operacoes!saidas_c1_operacao_id_fkey(id, nome, beneficiador_id)
        `)
        .eq("is_deleted", false)
        .order("dt", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch saídas Terceiros (Cenário Industrialização)
  const { data: saidasTerceiros = [] } = useQuery({
    queryKey: ["saidas-terceiros-extrato"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saidas_terceiros")
        .select(`
          id, dt, kg_devolvido, documento, custo_servico_saida_rs,
          operacao:operacoes_terceiros!saidas_terceiros_operacao_id_fkey(
            id, nome, cliente_id,
            cliente:parceiros!operacoes_terceiros_cliente_id_fkey(id, razao_social, nome_fantasia)
          )
        `)
        .eq("is_deleted", false)
        .order("dt", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch vendas Intermediação (Cenário Operação Terceiro)
  const { data: vendasIntermediacao = [] } = useQuery({
    queryKey: ["vendas-intermediacao-extrato", selectedDono],
    queryFn: async () => {
      let query = supabase
        .from("vendas_intermediacao")
        .select(`
          id, dt, kg_vendido, nf_venda, preco_venda_rkg, valor_venda_rs,
          custo_material_dono_rs, comissao_ibrac_rs, saldo_repassar_rs,
          operacao:operacoes_intermediacao!vendas_intermediacao_operacao_id_fkey(
            id, nome, dono_economico_id,
            dono:parceiros!operacoes_intermediacao_dono_economico_id_fkey(id, razao_social, nome_fantasia)
          )
        `)
        .eq("is_deleted", false)
        .order("dt", { ascending: false });
      
      const { data, error } = await query;
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

  // Filter by date range
  const filterByDateRange = useCallback((items: any[], dateField: string) => {
    if (!dataInicio && !dataFim) return items;
    return items.filter((item: any) => {
      const itemDate = parseISO(item[dateField]);
      if (dataInicio && dataFim) {
        return isWithinInterval(itemDate, { start: dataInicio, end: dataFim });
      }
      if (dataInicio) return itemDate >= dataInicio;
      if (dataFim) return itemDate <= dataFim;
      return true;
    });
  }, [dataInicio, dataFim]);

  // Filtered data by date
  const saidasC1Filtradas = useMemo(() => filterByDateRange(saidasC1, 'dt'), [saidasC1, filterByDateRange]);
  const saidasTerceirosFiltradas = useMemo(() => filterByDateRange(saidasTerceiros, 'dt'), [saidasTerceiros, filterByDateRange]);
  const vendasIntermediacaoFiltradas = useMemo(() => filterByDateRange(vendasIntermediacao, 'dt'), [vendasIntermediacao, filterByDateRange]);

  // Filter vendas by selected dono
  const vendasFiltradas = selectedDono === "todos" 
    ? vendasIntermediacaoFiltradas 
    : vendasIntermediacaoFiltradas.filter((v: any) => v.operacao?.dono_economico_id === selectedDono);

  // Calculate totals by cenário
  const cenarioTotals: CenarioTotals[] = useMemo(() => [
    {
      cenario: 'proprio',
      label: CENARIOS_CONFIG.proprio.label,
      kgTotal: saidasC1Filtradas.reduce((acc: number, s: any) => acc + (s.kg_saida || 0), 0),
      valorTotal: saidasC1Filtradas.reduce((acc: number, s: any) => acc + (s.receita_simulada_rs || 0), 0),
      custoTotal: saidasC1Filtradas.reduce((acc: number, s: any) => acc + (s.custo_saida_rs || 0), 0),
      resultadoTotal: saidasC1Filtradas.reduce((acc: number, s: any) => acc + (s.resultado_simulado_rs || 0), 0),
      operacoes: saidasC1Filtradas.length,
    },
    {
      cenario: 'industrializacao',
      label: CENARIOS_CONFIG.industrializacao.label,
      kgTotal: saidasTerceirosFiltradas.reduce((acc: number, s: any) => acc + (s.kg_devolvido || 0), 0),
      valorTotal: saidasTerceirosFiltradas.reduce((acc: number, s: any) => acc + (s.custo_servico_saida_rs || 0), 0),
      custoTotal: 0,
      resultadoTotal: saidasTerceirosFiltradas.reduce((acc: number, s: any) => acc + (s.custo_servico_saida_rs || 0), 0),
      operacoes: saidasTerceirosFiltradas.length,
    },
    {
      cenario: 'operacao_terceiro',
      label: CENARIOS_CONFIG.operacao_terceiro.label,
      kgTotal: vendasFiltradas.reduce((acc: number, v: any) => acc + (v.kg_vendido || 0), 0),
      valorTotal: vendasFiltradas.reduce((acc: number, v: any) => acc + (v.valor_venda_rs || 0), 0),
      custoTotal: vendasFiltradas.reduce((acc: number, v: any) => acc + (v.custo_material_dono_rs || 0) + (v.comissao_ibrac_rs || 0), 0),
      resultadoTotal: vendasFiltradas.reduce((acc: number, v: any) => acc + (v.saldo_repassar_rs || 0), 0),
      operacoes: vendasFiltradas.length,
    },
  ], [saidasC1Filtradas, saidasTerceirosFiltradas, vendasFiltradas]);

  const acertosPendentes = acertos.filter((a: any) => a.status === "pendente");
  const totalAPagar = acertosPendentes
    .filter((a: any) => a.tipo === "divida")
    .reduce((acc: number, a: any) => acc + (a.valor || 0), 0);
  const totalAReceber = acertosPendentes
    .filter((a: any) => a.tipo === "receita")
    .reduce((acc: number, a: any) => acc + (a.valor || 0), 0);

  const totalGeral = cenarioTotals.reduce((acc, c) => acc + c.resultadoTotal, 0);
  const kgGeral = cenarioTotals.reduce((acc, c) => acc + c.kgTotal, 0);

  // Chart data
  const pieChartData = cenarioTotals.map((ct, index) => ({
    name: ct.label,
    value: Math.abs(ct.resultadoTotal),
    color: COLORS[index],
  }));

  const barChartData = cenarioTotals.map((ct) => ({
    name: ct.label.replace(' ', '\n'),
    kg: ct.kgTotal,
    receita: ct.valorTotal,
    resultado: ct.resultadoTotal,
  }));

  // Export functions
  const exportToExcel = useCallback(() => {
    const donoNome = selectedDono === "todos" 
      ? "Todos" 
      : donos.find((d: any) => d.id === selectedDono)?.nome_fantasia || "Dono";
    
    // Sheet 1: Resumo por cenário
    const resumoData = cenarioTotals.map((ct) => ({
      "Cenário": ct.label,
      "Operações": ct.operacoes,
      "Kg Total": ct.kgTotal,
      "Valor Bruto (R$)": ct.valorTotal,
      "Custos (R$)": ct.custoTotal,
      "Resultado (R$)": ct.resultadoTotal,
    }));
    resumoData.push({
      "Cenário": "TOTAL GERAL",
      "Operações": cenarioTotals.reduce((acc, c) => acc + c.operacoes, 0),
      "Kg Total": kgGeral,
      "Valor Bruto (R$)": cenarioTotals.reduce((acc, c) => acc + c.valorTotal, 0),
      "Custos (R$)": cenarioTotals.reduce((acc, c) => acc + c.custoTotal, 0),
      "Resultado (R$)": totalGeral,
    });

    // Sheet 2: Material Próprio
    const saidasC1Data = saidasC1Filtradas.map((s: any) => ({
      "Data": format(parseISO(s.dt), 'dd/MM/yyyy'),
      "Operação": s.operacao?.nome || '-',
      "Tipo": s.tipo_saida,
      "Documento": s.documento || '-',
      "Kg": s.kg_saida,
      "Custo (R$)": s.custo_saida_rs || 0,
      "Receita (R$)": s.receita_simulada_rs || 0,
      "Resultado (R$)": s.resultado_simulado_rs || 0,
    }));

    // Sheet 3: Industrialização
    const saidasTercData = saidasTerceirosFiltradas.map((s: any) => ({
      "Data": format(parseISO(s.dt), 'dd/MM/yyyy'),
      "Operação": s.operacao?.nome || '-',
      "Cliente": s.operacao?.cliente?.nome_fantasia || s.operacao?.cliente?.razao_social || '-',
      "Documento": s.documento || '-',
      "Kg Devolvido": s.kg_devolvido,
      "Receita Serviço (R$)": s.custo_servico_saida_rs || 0,
    }));

    // Sheet 4: Operação Terceiro
    const vendasData = vendasFiltradas.map((v: any) => ({
      "Data": format(parseISO(v.dt), 'dd/MM/yyyy'),
      "Operação": v.operacao?.nome || '-',
      "Dono": v.operacao?.dono?.nome_fantasia || v.operacao?.dono?.razao_social || '-',
      "NF": v.nf_venda || '-',
      "Kg": v.kg_vendido,
      "Valor Venda (R$)": v.valor_venda_rs || 0,
      "Comissão (R$)": v.comissao_ibrac_rs || 0,
      "Repasse Dono (R$)": v.saldo_repassar_rs || 0,
    }));

    const workbook = XLSX.utils.book_new();
    
    const wsResumo = XLSX.utils.json_to_sheet(resumoData);
    XLSX.utils.book_append_sheet(workbook, wsResumo, "Resumo");
    
    if (saidasC1Data.length > 0) {
      const wsC1 = XLSX.utils.json_to_sheet(saidasC1Data);
      XLSX.utils.book_append_sheet(workbook, wsC1, "Material Próprio");
    }
    
    if (saidasTercData.length > 0) {
      const wsTerc = XLSX.utils.json_to_sheet(saidasTercData);
      XLSX.utils.book_append_sheet(workbook, wsTerc, "Industrialização");
    }
    
    if (vendasData.length > 0) {
      const wsVendas = XLSX.utils.json_to_sheet(vendasData);
      XLSX.utils.book_append_sheet(workbook, wsVendas, "Operação Terceiro");
    }

    const periodo = dataInicio && dataFim 
      ? `${format(dataInicio, 'ddMMyy')}_a_${format(dataFim, 'ddMMyy')}` 
      : format(new Date(), 'yyyyMMdd');
    
    XLSX.writeFile(workbook, `Extrato_${donoNome}_${periodo}.xlsx`);
  }, [cenarioTotals, saidasC1Filtradas, saidasTerceirosFiltradas, vendasFiltradas, donos, selectedDono, dataInicio, dataFim, kgGeral, totalGeral]);

  const exportToPDF = useCallback(() => {
    const donoNome = selectedDono === "todos" 
      ? "Todos os Donos" 
      : donos.find((d: any) => d.id === selectedDono)?.nome_fantasia || "Dono";
    
    const periodoStr = dataInicio && dataFim 
      ? `${format(dataInicio, 'dd/MM/yyyy')} a ${format(dataFim, 'dd/MM/yyyy')}` 
      : 'Todos os períodos';

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Extrato por Dono - IBRAC</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
          h1 { color: #333; border-bottom: 2px solid #B87333; padding-bottom: 10px; font-size: 20px; }
          h2 { color: #555; font-size: 16px; margin-top: 20px; }
          .info { color: #666; margin-bottom: 20px; }
          .kpis { display: flex; gap: 15px; margin: 20px 0; flex-wrap: wrap; }
          .kpi { padding: 10px 15px; border: 1px solid #ddd; border-radius: 6px; min-width: 120px; }
          .kpi-label { font-size: 10px; color: #888; }
          .kpi-value { font-size: 18px; font-weight: bold; }
          .positive { color: #16a34a; }
          .negative { color: #dc2626; }
          table { border-collapse: collapse; width: 100%; margin: 10px 0; }
          th { background-color: #B87333; color: white; padding: 8px; text-align: left; font-size: 11px; }
          td { border: 1px solid #ddd; padding: 6px; font-size: 11px; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .text-right { text-align: right; }
          .section { page-break-inside: avoid; margin-bottom: 30px; }
          .totals-row { background-color: #f0f0f0 !important; font-weight: bold; }
          @media print {
            body { margin: 0; }
            .section { page-break-after: auto; }
          }
        </style>
      </head>
      <body>
        <h1>IBRAC - Extrato por Dono</h1>
        <p class="info">
          <strong>Dono:</strong> ${donoNome} | 
          <strong>Período:</strong> ${periodoStr} | 
          <strong>Gerado em:</strong> ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>

        <div class="section">
          <h2>Resumo por Cenário</h2>
          <div class="kpis">
            <div class="kpi">
              <div class="kpi-label">Total Operações</div>
              <div class="kpi-value">${cenarioTotals.reduce((acc, c) => acc + c.operacoes, 0)}</div>
            </div>
            <div class="kpi">
              <div class="kpi-label">Kg Total</div>
              <div class="kpi-value">${formatWeight(kgGeral)}</div>
            </div>
            <div class="kpi">
              <div class="kpi-label">Resultado Geral</div>
              <div class="kpi-value ${totalGeral >= 0 ? 'positive' : 'negative'}">${formatCurrency(totalGeral)}</div>
            </div>
            <div class="kpi">
              <div class="kpi-label">A Receber</div>
              <div class="kpi-value positive">${formatCurrency(totalAReceber)}</div>
            </div>
            <div class="kpi">
              <div class="kpi-label">A Pagar</div>
              <div class="kpi-value negative">${formatCurrency(totalAPagar)}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Cenário</th>
                <th class="text-right">Operações</th>
                <th class="text-right">Kg Total</th>
                <th class="text-right">Valor Bruto</th>
                <th class="text-right">Custos</th>
                <th class="text-right">Resultado</th>
              </tr>
            </thead>
            <tbody>
              ${cenarioTotals.map(ct => `
                <tr>
                  <td>${ct.label}</td>
                  <td class="text-right">${ct.operacoes}</td>
                  <td class="text-right">${formatWeight(ct.kgTotal)}</td>
                  <td class="text-right">${formatCurrency(ct.valorTotal)}</td>
                  <td class="text-right">${formatCurrency(ct.custoTotal)}</td>
                  <td class="text-right ${ct.resultadoTotal >= 0 ? 'positive' : 'negative'}">${formatCurrency(ct.resultadoTotal)}</td>
                </tr>
              `).join('')}
              <tr class="totals-row">
                <td>TOTAL</td>
                <td class="text-right">${cenarioTotals.reduce((acc, c) => acc + c.operacoes, 0)}</td>
                <td class="text-right">${formatWeight(kgGeral)}</td>
                <td class="text-right">${formatCurrency(cenarioTotals.reduce((acc, c) => acc + c.valorTotal, 0))}</td>
                <td class="text-right">${formatCurrency(cenarioTotals.reduce((acc, c) => acc + c.custoTotal, 0))}</td>
                <td class="text-right ${totalGeral >= 0 ? 'positive' : 'negative'}">${formatCurrency(totalGeral)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        ${saidasC1Filtradas.length > 0 ? `
        <div class="section">
          <h2>Material Próprio (C1)</h2>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Operação</th>
                <th>Tipo</th>
                <th>Documento</th>
                <th class="text-right">Kg</th>
                <th class="text-right">Custo</th>
                <th class="text-right">Receita</th>
                <th class="text-right">Resultado</th>
              </tr>
            </thead>
            <tbody>
              ${saidasC1Filtradas.map((s: any) => `
                <tr>
                  <td>${format(parseISO(s.dt), 'dd/MM/yy')}</td>
                  <td>${s.operacao?.nome || '-'}</td>
                  <td>${s.tipo_saida}</td>
                  <td>${s.documento || '-'}</td>
                  <td class="text-right">${formatWeight(s.kg_saida)}</td>
                  <td class="text-right">${formatCurrency(s.custo_saida_rs)}</td>
                  <td class="text-right">${formatCurrency(s.receita_simulada_rs)}</td>
                  <td class="text-right ${(s.resultado_simulado_rs || 0) >= 0 ? 'positive' : 'negative'}">${formatCurrency(s.resultado_simulado_rs)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${saidasTerceirosFiltradas.length > 0 ? `
        <div class="section">
          <h2>Industrialização (Terceiros)</h2>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Operação</th>
                <th>Cliente</th>
                <th>Documento</th>
                <th class="text-right">Kg Devolvido</th>
                <th class="text-right">Receita Serviço</th>
              </tr>
            </thead>
            <tbody>
              ${saidasTerceirosFiltradas.map((s: any) => `
                <tr>
                  <td>${format(parseISO(s.dt), 'dd/MM/yy')}</td>
                  <td>${s.operacao?.nome || '-'}</td>
                  <td>${s.operacao?.cliente?.nome_fantasia || s.operacao?.cliente?.razao_social || '-'}</td>
                  <td>${s.documento || '-'}</td>
                  <td class="text-right">${formatWeight(s.kg_devolvido)}</td>
                  <td class="text-right positive">${formatCurrency(s.custo_servico_saida_rs)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${vendasFiltradas.length > 0 ? `
        <div class="section">
          <h2>Operação Terceiro (Intermediação)</h2>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Operação</th>
                <th>Dono</th>
                <th>NF</th>
                <th class="text-right">Kg</th>
                <th class="text-right">Valor Venda</th>
                <th class="text-right">Comissão</th>
                <th class="text-right">Repasse Dono</th>
              </tr>
            </thead>
            <tbody>
              ${vendasFiltradas.map((v: any) => `
                <tr>
                  <td>${format(parseISO(v.dt), 'dd/MM/yy')}</td>
                  <td>${v.operacao?.nome || '-'}</td>
                  <td>${v.operacao?.dono?.nome_fantasia || v.operacao?.dono?.razao_social || '-'}</td>
                  <td>${v.nf_venda || '-'}</td>
                  <td class="text-right">${formatWeight(v.kg_vendido)}</td>
                  <td class="text-right">${formatCurrency(v.valor_venda_rs)}</td>
                  <td class="text-right">${formatCurrency(v.comissao_ibrac_rs)}</td>
                  <td class="text-right positive">${formatCurrency(v.saldo_repassar_rs)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }, [cenarioTotals, saidasC1Filtradas, saidasTerceirosFiltradas, vendasFiltradas, donos, selectedDono, dataInicio, dataFim, kgGeral, totalGeral, totalAPagar, totalAReceber]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Extrato por Dono</h1>
            <p className="text-muted-foreground">Resultados separados por cenário de operação</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro de Período */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !dataInicio && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataInicio ? format(dataInicio, "dd/MM/yy") : "Início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dataInicio} onSelect={setDataInicio} initialFocus className="pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground">a</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !dataFim && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataFim ? format(dataFim, "dd/MM/yy") : "Fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dataFim} onSelect={setDataFim} initialFocus className="pointer-events-auto" />
              </PopoverContent>
            </Popover>

            <Select value={selectedDono} onValueChange={setSelectedDono}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Selecione o dono" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Donos</SelectItem>
                {donos.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{d.nome_fantasia || d.razao_social}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={exportToExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" onClick={exportToPDF}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* KPIs Gerais */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Total Operações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">
                {cenarioTotals.reduce((acc, c) => acc + c.operacoes, 0)}
              </p>
              <p className="text-sm text-muted-foreground">{formatWeight(kgGeral)}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-info">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-info" />
                Resultado Geral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${totalGeral >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(totalGeral)}
              </p>
              <p className="text-sm text-muted-foreground">Soma dos 3 cenários</p>
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

          <Card className="border-l-4 border-l-warning">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-warning" />
                Donos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-warning">{donos.length}</p>
              <p className="text-sm text-muted-foreground">Cadastrados</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribuição de Resultado por Cenário</CardTitle>
              <CardDescription>Proporção do resultado de cada cenário</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comparativo por Cenário</CardTitle>
              <CardDescription>Kg, Receita e Resultado por cenário</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value} />
                  <Tooltip formatter={(value: number, name: string) => {
                    if (name === 'kg') return [formatWeight(value), 'Kg'];
                    return [formatCurrency(value), name === 'receita' ? 'Receita' : 'Resultado'];
                  }} />
                  <Legend />
                  <Bar dataKey="receita" name="Receita" fill="hsl(210, 80%, 60%)" />
                  <Bar dataKey="resultado" name="Resultado" fill="hsl(150, 60%, 50%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Cards por Cenário */}
        <div className="grid gap-4 md:grid-cols-3">
          {cenarioTotals.map((ct) => (
            <Card key={ct.cenario} className={`${getCenarioColor(ct.cenario as CenarioOperacao)} border`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  {ct.label}
                  <Badge variant="outline">{ct.operacoes} saídas</Badge>
                </CardTitle>
                <CardDescription>{CENARIOS_CONFIG[ct.cenario as CenarioOperacao]?.descricao}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kg Total:</span>
                  <span className="font-medium">{formatWeight(ct.kgTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor Bruto:</span>
                  <span className="font-medium">{formatCurrency(ct.valorTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custos:</span>
                  <span className="font-medium text-destructive">{formatCurrency(ct.custoTotal)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Resultado:</span>
                  <span className={`font-bold ${ct.resultadoTotal >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(ct.resultadoTotal)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs com detalhes por cenário */}
        <Tabs defaultValue="proprio" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="proprio">Material Próprio</TabsTrigger>
            <TabsTrigger value="industrializacao">Industrialização</TabsTrigger>
            <TabsTrigger value="operacao_terceiro">Operação Terceiro</TabsTrigger>
          </TabsList>

          <TabsContent value="proprio">
            <Card>
              <CardHeader>
                <CardTitle>Saídas - Material Próprio (C1)</CardTitle>
                <CardDescription>IBRAC compra, beneficia e consome/vende</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Operação</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead className="text-right">Kg</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">Resultado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saidasC1Filtradas.slice(0, 10).map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell>{format(parseISO(s.dt), 'dd/MM/yy')}</TableCell>
                        <TableCell>{s.operacao?.nome || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{s.tipo_saida}</Badge>
                        </TableCell>
                        <TableCell>{s.documento || '-'}</TableCell>
                        <TableCell className="text-right">{formatWeight(s.kg_saida)}</TableCell>
                        <TableCell className="text-right text-destructive">{formatCurrency(s.custo_saida_rs)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(s.receita_simulada_rs)}</TableCell>
                        <TableCell className={`text-right font-medium ${(s.resultado_simulado_rs || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(s.resultado_simulado_rs)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {saidasC1Filtradas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Nenhuma saída registrada no período
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="industrializacao">
            <Card>
              <CardHeader>
                <CardTitle>Saídas - Industrialização (Terceiros)</CardTitle>
                <CardDescription>Cliente envia material, IBRAC presta serviço</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Operação</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead className="text-right">Kg Devolvido</TableHead>
                      <TableHead className="text-right">Receita Serviço</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saidasTerceirosFiltradas.slice(0, 10).map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell>{format(parseISO(s.dt), 'dd/MM/yy')}</TableCell>
                        <TableCell>{s.operacao?.nome || '-'}</TableCell>
                        <TableCell>{s.operacao?.cliente?.nome_fantasia || s.operacao?.cliente?.razao_social || '-'}</TableCell>
                        <TableCell>{s.documento || '-'}</TableCell>
                        <TableCell className="text-right">{formatWeight(s.kg_devolvido)}</TableCell>
                        <TableCell className="text-right text-success">{formatCurrency(s.custo_servico_saida_rs)}</TableCell>
                      </TableRow>
                    ))}
                    {saidasTerceirosFiltradas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhuma saída registrada no período
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="operacao_terceiro">
            <Card>
              <CardHeader>
                <CardTitle>Vendas - Operação Terceiro (Intermediação)</CardTitle>
                <CardDescription>IBRAC opera em nome do dono, cobra comissão</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Operação</TableHead>
                      <TableHead>Dono</TableHead>
                      <TableHead>NF</TableHead>
                      <TableHead className="text-right">Kg</TableHead>
                      <TableHead className="text-right">Valor Venda</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                      <TableHead className="text-right">Repasse Dono</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendasFiltradas.slice(0, 10).map((v: any) => (
                      <TableRow key={v.id}>
                        <TableCell>{format(parseISO(v.dt), 'dd/MM/yy')}</TableCell>
                        <TableCell>{v.operacao?.nome || '-'}</TableCell>
                        <TableCell>{v.operacao?.dono?.nome_fantasia || v.operacao?.dono?.razao_social || '-'}</TableCell>
                        <TableCell>{v.nf_venda || '-'}</TableCell>
                        <TableCell className="text-right">{formatWeight(v.kg_vendido)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(v.valor_venda_rs)}</TableCell>
                        <TableCell className="text-right text-info">{formatCurrency(v.comissao_ibrac_rs)}</TableCell>
                        <TableCell className="text-right text-success font-medium">{formatCurrency(v.saldo_repassar_rs)}</TableCell>
                      </TableRow>
                    ))}
                    {vendasFiltradas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Nenhuma venda registrada no período
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

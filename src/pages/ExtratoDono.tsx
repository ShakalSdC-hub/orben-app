import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Package, ArrowUpRight, ArrowDownRight, Factory, Users, TrendingUp, Layers } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatWeightCompact as formatWeight } from "@/lib/kpis";
import { CENARIOS_CONFIG, getCenarioColor, type CenarioOperacao } from "@/lib/cenarios-orben";
import { useState } from "react";
import { format } from "date-fns";

interface CenarioTotals {
  cenario: string;
  label: string;
  kgTotal: number;
  valorTotal: number;
  custoTotal: number;
  resultadoTotal: number;
  operacoes: number;
}

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

  // Filter vendas by selected dono
  const vendasFiltradas = selectedDono === "todos" 
    ? vendasIntermediacao 
    : vendasIntermediacao.filter((v: any) => v.operacao?.dono_economico_id === selectedDono);

  // Calculate totals by cenário
  const cenarioTotals: CenarioTotals[] = [
    {
      cenario: 'proprio',
      label: CENARIOS_CONFIG.proprio.label,
      kgTotal: saidasC1.reduce((acc: number, s: any) => acc + (s.kg_saida || 0), 0),
      valorTotal: saidasC1.reduce((acc: number, s: any) => acc + (s.receita_simulada_rs || 0), 0),
      custoTotal: saidasC1.reduce((acc: number, s: any) => acc + (s.custo_saida_rs || 0), 0),
      resultadoTotal: saidasC1.reduce((acc: number, s: any) => acc + (s.resultado_simulado_rs || 0), 0),
      operacoes: saidasC1.length,
    },
    {
      cenario: 'industrializacao',
      label: CENARIOS_CONFIG.industrializacao.label,
      kgTotal: saidasTerceiros.reduce((acc: number, s: any) => acc + (s.kg_devolvido || 0), 0),
      valorTotal: saidasTerceiros.reduce((acc: number, s: any) => acc + (s.custo_servico_saida_rs || 0), 0),
      custoTotal: 0,
      resultadoTotal: saidasTerceiros.reduce((acc: number, s: any) => acc + (s.custo_servico_saida_rs || 0), 0),
      operacoes: saidasTerceiros.length,
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
  ];

  const acertosPendentes = acertos.filter((a: any) => a.status === "pendente");
  const totalAPagar = acertosPendentes
    .filter((a: any) => a.tipo === "divida")
    .reduce((acc: number, a: any) => acc + (a.valor || 0), 0);
  const totalAReceber = acertosPendentes
    .filter((a: any) => a.tipo === "receita")
    .reduce((acc: number, a: any) => acc + (a.valor || 0), 0);

  const totalGeral = cenarioTotals.reduce((acc, c) => acc + c.resultadoTotal, 0);
  const kgGeral = cenarioTotals.reduce((acc, c) => acc + c.kgTotal, 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Extrato por Dono</h1>
            <p className="text-muted-foreground">Resultados separados por cenário de operação</p>
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
                    {saidasC1.slice(0, 10).map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell>{format(new Date(s.dt), 'dd/MM/yy')}</TableCell>
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
                    {saidasC1.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Nenhuma saída registrada
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
                    {saidasTerceiros.slice(0, 10).map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell>{format(new Date(s.dt), 'dd/MM/yy')}</TableCell>
                        <TableCell>{s.operacao?.nome || '-'}</TableCell>
                        <TableCell>{s.operacao?.cliente?.nome_fantasia || s.operacao?.cliente?.razao_social || '-'}</TableCell>
                        <TableCell>{s.documento || '-'}</TableCell>
                        <TableCell className="text-right">{formatWeight(s.kg_devolvido)}</TableCell>
                        <TableCell className="text-right text-success">{formatCurrency(s.custo_servico_saida_rs)}</TableCell>
                      </TableRow>
                    ))}
                    {saidasTerceiros.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhuma saída registrada
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
                        <TableCell>{format(new Date(v.dt), 'dd/MM/yy')}</TableCell>
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
                          Nenhuma venda registrada
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

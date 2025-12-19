import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileSpreadsheet,
  Download,
  FileInput,
  FileOutput,
  Package,
  Factory,
  DollarSign,
  Loader2,
  Calendar,
  Filter,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import { toast } from "@/hooks/use-toast";

export default function Relatorios() {
  const [dataInicio, setDataInicio] = useState(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [dataFim, setDataFim] = useState(
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [donoFiltro, setDonoFiltro] = useState<string>("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("");

  // Fetch donos
  const { data: donos } = useQuery({
    queryKey: ["donos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donos_material")
        .select("*")
        .eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  // Fetch tipos produto
  const { data: tiposProduto } = useQuery({
    queryKey: ["tipos-produto"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tipos_produto")
        .select("*")
        .eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  // Fetch entradas no período
  const { data: entradas, isLoading: loadingEntradas } = useQuery({
    queryKey: ["relatorio-entradas", dataInicio, dataFim, donoFiltro],
    queryFn: async () => {
      let query = supabase
        .from("entradas")
        .select(
          `
          *,
          fornecedor:fornecedores(razao_social),
          dono:donos_material(nome),
          tipo_produto:tipos_produto(nome)
        `
        )
        .gte("data_entrada", dataInicio)
        .lte("data_entrada", dataFim)
        .order("data_entrada", { ascending: false });

      if (donoFiltro) {
        query = query.eq("dono_id", donoFiltro);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch saídas no período
  const { data: saidas, isLoading: loadingSaidas } = useQuery({
    queryKey: ["relatorio-saidas", dataInicio, dataFim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saidas")
        .select(
          `
          *,
          cliente:clientes(razao_social),
          itens:saida_itens(
            peso_kg,
            sublote:sublotes(
              codigo,
              dono:donos_material(nome)
            )
          )
        `
        )
        .gte("data_saida", dataInicio)
        .lte("data_saida", dataFim)
        .order("data_saida", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch estoque atual por dono
  const { data: estoqueByDono, isLoading: loadingEstoque } = useQuery({
    queryKey: ["relatorio-estoque-dono", donoFiltro],
    queryFn: async () => {
      let query = supabase
        .from("sublotes")
        .select(
          `
          *,
          dono:donos_material(nome),
          tipo_produto:tipos_produto(nome),
          local:locais_estoque(nome)
        `
        )
        .eq("status", "disponivel");

      if (donoFiltro) {
        query = query.eq("dono_id", donoFiltro);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch beneficiamentos no período
  const { data: beneficiamentos, isLoading: loadingBenef } = useQuery({
    queryKey: ["relatorio-beneficiamentos", dataInicio, dataFim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamentos")
        .select(
          `
          *,
          processo:processos(nome),
          fornecedor_terceiro:fornecedores(razao_social)
        `
        )
        .gte("data_inicio", dataInicio)
        .lte("data_inicio", dataFim)
        .order("data_inicio", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const formatWeight = (kg: number) => {
    if (kg >= 1000) return `${(kg / 1000).toFixed(2)}t`;
    return `${kg.toFixed(0)}kg`;
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const exportToExcel = (data: any[], filename: string, headers: Record<string, string>) => {
    if (!data || data.length === 0) {
      toast({ title: "Sem dados para exportar", variant: "destructive" });
      return;
    }

    const formattedData = data.map((item) => {
      const row: Record<string, any> = {};
      Object.entries(headers).forEach(([key, label]) => {
        const keys = key.split(".");
        let value = item;
        for (const k of keys) {
          value = value?.[k];
        }
        row[label] = value ?? "";
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dados");
    XLSX.writeFile(wb, `${filename}_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
    toast({ title: "Relatório exportado com sucesso!" });
  };

  // Totalizadores
  const totalEntradas = entradas?.reduce((acc, e) => acc + (e.peso_liquido_kg || 0), 0) || 0;
  const valorTotalEntradas = entradas?.reduce((acc, e) => acc + (e.valor_total || 0), 0) || 0;
  const totalSaidas = saidas?.reduce((acc, s) => acc + (s.peso_total_kg || 0), 0) || 0;
  const valorTotalSaidas = saidas?.reduce((acc, s) => acc + (s.valor_total || 0), 0) || 0;
  const totalEstoque = estoqueByDono?.reduce((acc, s) => acc + (s.peso_kg || 0), 0) || 0;
  const custoTotalBenef =
    beneficiamentos?.reduce(
      (acc, b) =>
        acc +
        (b.custo_frete_ida || 0) +
        (b.custo_frete_volta || 0) +
        (b.custo_mo_ibrac || 0) +
        (b.custo_mo_terceiro || 0),
      0
    ) || 0;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
            <p className="text-muted-foreground">
              Relatórios gerenciais com exportação para Excel
            </p>
          </div>
        </div>

        {/* Filtros Globais */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data Início
                </Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Dono do Material</Label>
                <Select value={donoFiltro} onValueChange={setDonoFiltro}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {donos?.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Produto</Label>
                <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {tiposProduto?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs de Relatórios */}
        <Tabs defaultValue="entradas" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="entradas" className="flex items-center gap-2">
              <FileInput className="h-4 w-4" />
              Entradas
            </TabsTrigger>
            <TabsTrigger value="saidas" className="flex items-center gap-2">
              <FileOutput className="h-4 w-4" />
              Saídas
            </TabsTrigger>
            <TabsTrigger value="estoque" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Estoque
            </TabsTrigger>
            <TabsTrigger value="custos" className="flex items-center gap-2">
              <Factory className="h-4 w-4" />
              Custos
            </TabsTrigger>
          </TabsList>

          {/* ENTRADAS */}
          <TabsContent value="entradas">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Relatório de Entradas</CardTitle>
                  <CardDescription>
                    {format(parseISO(dataInicio), "dd/MM/yyyy")} a{" "}
                    {format(parseISO(dataFim), "dd/MM/yyyy")}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    exportToExcel(entradas || [], "entradas", {
                      codigo: "Código",
                      data_entrada: "Data",
                      "fornecedor.razao_social": "Fornecedor",
                      "dono.nome": "Dono",
                      "tipo_produto.nome": "Tipo Produto",
                      tipo_material: "Material",
                      peso_liquido_kg: "Peso (kg)",
                      valor_unitario: "Valor Unit (R$)",
                      valor_total: "Valor Total (R$)",
                      nota_fiscal: "NF",
                    })
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Excel
                </Button>
              </CardHeader>
              <CardContent>
                {/* Totalizadores */}
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  <div className="rounded-lg bg-success/10 p-4">
                    <p className="text-sm text-muted-foreground">Total Entradas</p>
                    <p className="text-2xl font-bold text-success">
                      {formatWeight(totalEntradas)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-4">
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(valorTotalEntradas)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-copper/10 p-4">
                    <p className="text-sm text-muted-foreground">Registros</p>
                    <p className="text-2xl font-bold text-copper">{entradas?.length || 0}</p>
                  </div>
                </div>

                {loadingEntradas ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Fornecedor</TableHead>
                          <TableHead>Dono</TableHead>
                          <TableHead>Material</TableHead>
                          <TableHead className="text-right">Peso</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(!entradas || entradas.length === 0) ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                              Nenhuma entrada no período
                            </TableCell>
                          </TableRow>
                        ) : (
                          entradas.map((e) => (
                            <TableRow key={e.id}>
                              <TableCell>
                                {format(new Date(e.data_entrada), "dd/MM/yy")}
                              </TableCell>
                              <TableCell className="font-mono">{e.codigo}</TableCell>
                              <TableCell>{e.fornecedor?.razao_social || "—"}</TableCell>
                              <TableCell>{e.dono?.nome || "IBRAC"}</TableCell>
                              <TableCell>{e.tipo_produto?.nome || e.tipo_material}</TableCell>
                              <TableCell className="text-right">
                                {formatWeight(e.peso_liquido_kg)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(e.valor_total)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SAÍDAS */}
          <TabsContent value="saidas">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Relatório de Saídas</CardTitle>
                  <CardDescription>
                    {format(parseISO(dataInicio), "dd/MM/yyyy")} a{" "}
                    {format(parseISO(dataFim), "dd/MM/yyyy")}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    exportToExcel(saidas || [], "saidas", {
                      codigo: "Código",
                      data_saida: "Data",
                      "cliente.razao_social": "Cliente",
                      tipo_saida: "Tipo",
                      peso_total_kg: "Peso (kg)",
                      valor_unitario: "Valor Unit (R$)",
                      valor_total: "Valor Total (R$)",
                      nota_fiscal: "NF",
                    })
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Excel
                </Button>
              </CardHeader>
              <CardContent>
                {/* Totalizadores */}
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  <div className="rounded-lg bg-destructive/10 p-4">
                    <p className="text-sm text-muted-foreground">Total Saídas</p>
                    <p className="text-2xl font-bold text-destructive">
                      {formatWeight(totalSaidas)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-4">
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(valorTotalSaidas)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-copper/10 p-4">
                    <p className="text-sm text-muted-foreground">Registros</p>
                    <p className="text-2xl font-bold text-copper">{saidas?.length || 0}</p>
                  </div>
                </div>

                {loadingSaidas ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Peso</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!saidas || saidas.length === 0) ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Nenhuma saída no período
                          </TableCell>
                        </TableRow>
                      ) : (
                        saidas.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell>
                              {format(new Date(s.data_saida), "dd/MM/yy")}
                            </TableCell>
                            <TableCell className="font-mono">{s.codigo}</TableCell>
                            <TableCell>{s.cliente?.razao_social || "—"}</TableCell>
                            <TableCell className="capitalize">{s.tipo_saida}</TableCell>
                            <TableCell className="text-right">
                              {formatWeight(s.peso_total_kg)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(s.valor_total)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ESTOQUE */}
          <TabsContent value="estoque">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Relatório de Estoque por Dono</CardTitle>
                  <CardDescription>Posição atual do estoque disponível</CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    exportToExcel(estoqueByDono || [], "estoque", {
                      codigo: "Código",
                      "dono.nome": "Dono",
                      "tipo_produto.nome": "Tipo Produto",
                      "local.nome": "Local",
                      peso_kg: "Peso (kg)",
                      custo_unitario_total: "Custo Unit (R$/kg)",
                      teor_cobre: "Teor Cu (%)",
                    })
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Excel
                </Button>
              </CardHeader>
              <CardContent>
                {/* Totalizadores */}
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  <div className="rounded-lg bg-primary/10 p-4">
                    <p className="text-sm text-muted-foreground">Peso Total</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatWeight(totalEstoque)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-copper/10 p-4">
                    <p className="text-sm text-muted-foreground">Sub-lotes</p>
                    <p className="text-2xl font-bold text-copper">
                      {estoqueByDono?.length || 0}
                    </p>
                  </div>
                  <div className="rounded-lg bg-success/10 p-4">
                    <p className="text-sm text-muted-foreground">Donos Ativos</p>
                    <p className="text-2xl font-bold text-success">
                      {new Set(estoqueByDono?.map((s) => s.dono_id || "IBRAC")).size}
                    </p>
                  </div>
                </div>

                {loadingEstoque ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Dono</TableHead>
                        <TableHead>Tipo Produto</TableHead>
                        <TableHead>Local</TableHead>
                        <TableHead className="text-right">Peso</TableHead>
                        <TableHead className="text-right">Custo/kg</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!estoqueByDono || estoqueByDono.length === 0) ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Nenhum sublote disponível
                          </TableCell>
                        </TableRow>
                      ) : (
                        estoqueByDono.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-mono">{s.codigo}</TableCell>
                            <TableCell>{s.dono?.nome || "IBRAC"}</TableCell>
                            <TableCell>{s.tipo_produto?.nome || "—"}</TableCell>
                            <TableCell>{s.local?.nome || "—"}</TableCell>
                            <TableCell className="text-right">
                              {formatWeight(s.peso_kg)}
                            </TableCell>
                            <TableCell className="text-right">
                              {s.custo_unitario_total
                                ? formatCurrency(s.custo_unitario_total)
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CUSTOS BENEFICIAMENTO */}
          <TabsContent value="custos">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Custos de Beneficiamento</CardTitle>
                  <CardDescription>
                    {format(parseISO(dataInicio), "dd/MM/yyyy")} a{" "}
                    {format(parseISO(dataFim), "dd/MM/yyyy")}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    exportToExcel(beneficiamentos || [], "beneficiamentos", {
                      codigo: "Código",
                      data_inicio: "Data Início",
                      data_fim: "Data Fim",
                      "processo.nome": "Processo",
                      tipo_beneficiamento: "Tipo",
                      peso_entrada_kg: "Peso Entrada (kg)",
                      peso_saida_kg: "Peso Saída (kg)",
                      perda_real_pct: "Perda Real (%)",
                      custo_frete_ida: "Frete Ida (R$)",
                      custo_frete_volta: "Frete Volta (R$)",
                      custo_mo_ibrac: "MO IBRAC (R$)",
                      custo_mo_terceiro: "MO Terceiro (R$)",
                    })
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Excel
                </Button>
              </CardHeader>
              <CardContent>
                {/* Totalizadores */}
                <div className="grid gap-4 md:grid-cols-4 mb-6">
                  <div className="rounded-lg bg-warning/10 p-4">
                    <p className="text-sm text-muted-foreground">Custo Total</p>
                    <p className="text-2xl font-bold text-warning">
                      {formatCurrency(custoTotalBenef)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-4">
                    <p className="text-sm text-muted-foreground">Beneficiamentos</p>
                    <p className="text-2xl font-bold text-primary">
                      {beneficiamentos?.length || 0}
                    </p>
                  </div>
                  <div className="rounded-lg bg-success/10 p-4">
                    <p className="text-sm text-muted-foreground">Peso Processado</p>
                    <p className="text-2xl font-bold text-success">
                      {formatWeight(
                        beneficiamentos?.reduce((acc, b) => acc + (b.peso_entrada_kg || 0), 0) || 0
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg bg-copper/10 p-4">
                    <p className="text-sm text-muted-foreground">Perda Média</p>
                    <p className="text-2xl font-bold text-copper">
                      {beneficiamentos?.length
                        ? (
                            beneficiamentos.reduce(
                              (acc, b) => acc + (b.perda_real_pct || 0),
                              0
                            ) / beneficiamentos.length
                          ).toFixed(2)
                        : 0}
                      %
                    </p>
                  </div>
                </div>

                {loadingBenef ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Processo</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Peso Ent.</TableHead>
                        <TableHead className="text-right">Peso Saí.</TableHead>
                        <TableHead className="text-right">Perda</TableHead>
                        <TableHead className="text-right">Custo Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!beneficiamentos || beneficiamentos.length === 0) ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground">
                            Nenhum beneficiamento no período
                          </TableCell>
                        </TableRow>
                      ) : (
                        beneficiamentos.map((b) => {
                          const custoTotal =
                            (b.custo_frete_ida || 0) +
                            (b.custo_frete_volta || 0) +
                            (b.custo_mo_ibrac || 0) +
                            (b.custo_mo_terceiro || 0);
                          return (
                            <TableRow key={b.id}>
                              <TableCell className="font-mono">{b.codigo}</TableCell>
                              <TableCell>
                                {b.data_inicio
                                  ? format(new Date(b.data_inicio), "dd/MM/yy")
                                  : "—"}
                              </TableCell>
                              <TableCell>{b.processo?.nome || "—"}</TableCell>
                              <TableCell className="capitalize">
                                {b.tipo_beneficiamento}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatWeight(b.peso_entrada_kg || 0)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatWeight(b.peso_saida_kg || 0)}
                              </TableCell>
                              <TableCell className="text-right">
                                {b.perda_real_pct?.toFixed(2)}%
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(custoTotal)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

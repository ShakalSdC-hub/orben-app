import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DollarSign, Package, ArrowUpRight, ArrowDownRight, Warehouse, 
  TrendingUp, FileText, Loader2, User, Factory
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";
import { formatCurrency, formatWeightCompact as formatWeight } from "@/lib/kpis";

const CHART_COLORS = {
  proprio: "hsl(28, 70%, 45%)",
  terceiro: "hsl(220, 70%, 50%)",
  success: "hsl(142, 60%, 40%)",
  warning: "hsl(45, 80%, 50%)",
};

export default function ExtratoDono() {
  const [selectedDono, setSelectedDono] = useState<string>("todos");

  // Donos
  const { data: donos = [] } = useQuery({
    queryKey: ["donos_material_extrato"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donos_material")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  // Entradas com tipo
  const { data: entradas = [], isLoading: loadingEntradas } = useQuery({
    queryKey: ["entradas_extrato", selectedDono],
    queryFn: async () => {
      let query = supabase
        .from("entradas")
        .select(`
          *,
          dono:donos_material!fk_entradas_dono(id, nome),
          tipo_entrada:tipos_entrada(id, nome, gera_custo),
          tipo_produto:tipos_produto(nome)
        `)
        .order("data_entrada", { ascending: false })
        .limit(200);
      
      if (selectedDono !== "todos") {
        query = query.eq("dono_id", selectedDono);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Sublotes com entradas
  const { data: sublotes = [] } = useQuery({
    queryKey: ["sublotes_extrato", selectedDono],
    queryFn: async () => {
      let query = supabase
        .from("sublotes")
        .select(`
          *,
          dono:donos_material!fk_sublotes_dono(id, nome),
          tipo_produto:tipos_produto(nome),
          entrada:entradas!fk_sublotes_entrada(
            id, 
            codigo, 
            valor_unitario,
            tipo_entrada:tipos_entrada(id, nome, gera_custo)
          ),
          local:locais_estoque(nome)
        `)
        .eq("status", "disponivel")
        .gt("peso_kg", 0);
      
      if (selectedDono !== "todos") {
        query = query.eq("dono_id", selectedDono);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Saídas
  const { data: saidas = [] } = useQuery({
    queryKey: ["saidas_extrato", selectedDono],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saidas")
        .select(`
          *,
          cliente:clientes(razao_social),
          itens:saida_itens(
            id,
            peso_kg,
            sublote:sublotes(
              id,
              codigo,
              dono_id,
              dono:donos_material!fk_sublotes_dono(id, nome),
              entrada:entradas!fk_sublotes_entrada(tipo_entrada:tipos_entrada(gera_custo))
            )
          )
        `)
        .order("data_saida", { ascending: false })
        .limit(200);
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
        .select(`*, dono:donos_material!fk_acertos_dono(id, nome)`)
        .order("created_at", { ascending: false });
      
      if (selectedDono !== "todos") {
        query = query.eq("dono_id", selectedDono);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Separar entradas por tipo (próprio vs terceiro/industrialização)
  const entradasProprias = entradas.filter((e: any) => e.tipo_entrada?.gera_custo === true);
  const entradasTerceiros = entradas.filter((e: any) => e.tipo_entrada?.gera_custo === false);

  // Separar sublotes
  const sublotesProprios = sublotes.filter((s: any) => s.entrada?.tipo_entrada?.gera_custo !== false);
  const sublotesTerceiros = sublotes.filter((s: any) => s.entrada?.tipo_entrada?.gera_custo === false);

  // Filtrar saídas por dono
  const saidasFiltradas = selectedDono === "todos" 
    ? saidas 
    : saidas.filter((s: any) => s.itens?.some((i: any) => i.sublote?.dono_id === selectedDono));

  // Calcular totais - Material Próprio
  const totalPesoProprio = sublotesProprios.reduce((acc: number, s: any) => acc + (s.peso_kg || 0), 0);
  const totalValorProprio = sublotesProprios.reduce((acc: number, s: any) => 
    acc + ((s.custo_unitario_total || 0) * (s.peso_kg || 0)), 0);
  const totalCompras = entradasProprias.reduce((acc: number, e: any) => acc + (e.valor_total || 0), 0);

  // Calcular totais - Material Terceiros (Industrialização)
  const totalPesoTerceiros = sublotesTerceiros.reduce((acc: number, s: any) => acc + (s.peso_kg || 0), 0);
  const totalValorTerceiros = sublotesTerceiros.reduce((acc: number, s: any) => 
    acc + ((s.custo_unitario_total || 0) * (s.peso_kg || 0)), 0);
  
  // Custos de beneficiamento dos materiais de terceiros (apenas MO/Benef)
  const custoBeneficiamentoTerceiros = sublotesTerceiros.reduce((acc: number, s: any) => 
    acc + ((s.custo_unitario_total || 0) * (s.peso_kg || 0)), 0);

  // Acertos
  const acertosPendentes = acertos.filter((a: any) => a.status === "pendente");
  const totalAPagar = acertosPendentes
    .filter((a: any) => a.tipo === "divida")
    .reduce((acc: number, a: any) => acc + (a.valor || 0), 0);
  const totalAReceber = acertosPendentes
    .filter((a: any) => a.tipo === "receita")
    .reduce((acc: number, a: any) => acc + (a.valor || 0), 0);

  // Dados para gráfico de composição de estoque
  const pieData = [
    { name: "Material Próprio", value: totalValorProprio, peso: totalPesoProprio },
    { name: "Material Terceiros", value: totalValorTerceiros, peso: totalPesoTerceiros },
  ].filter(d => d.value > 0 || d.peso > 0);

  const pieColors = [CHART_COLORS.proprio, CHART_COLORS.terceiro];

  // Resumo por dono
  const resumoPorDono = donos.map((dono: any) => {
    const sublotesDono = sublotes.filter((s: any) => s.dono?.id === dono.id);
    const sublotesPropriosDono = sublotesDono.filter((s: any) => s.entrada?.tipo_entrada?.gera_custo !== false);
    const sublotesTerceirosDono = sublotesDono.filter((s: any) => s.entrada?.tipo_entrada?.gera_custo === false);
    
    return {
      id: dono.id,
      nome: dono.nome,
      pesoProprio: sublotesPropriosDono.reduce((acc: number, s: any) => acc + (s.peso_kg || 0), 0),
      valorProprio: sublotesPropriosDono.reduce((acc: number, s: any) => acc + ((s.custo_unitario_total || 0) * (s.peso_kg || 0)), 0),
      pesoTerceiro: sublotesTerceirosDono.reduce((acc: number, s: any) => acc + (s.peso_kg || 0), 0),
      valorTerceiro: sublotesTerceirosDono.reduce((acc: number, s: any) => acc + ((s.custo_unitario_total || 0) * (s.peso_kg || 0)), 0),
    };
  }).filter((d: any) => d.pesoProprio > 0 || d.pesoTerceiro > 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Extrato por Dono</h1>
            <p className="text-muted-foreground">Visualize materiais próprios vs industrialização separadamente</p>
          </div>
          <Select value={selectedDono} onValueChange={setSelectedDono}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecione o dono" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Donos</SelectItem>
              {donos.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* KPIs Principais */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Material Próprio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{formatWeight(totalPesoProprio)}</p>
              <p className="text-sm text-muted-foreground">
                Valor: {formatCurrency(totalValorProprio)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-info">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Factory className="h-4 w-4 text-info" />
                Material Terceiros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-info">{formatWeight(totalPesoTerceiros)}</p>
              <p className="text-sm text-muted-foreground">
                Custo Benef: {formatCurrency(custoBeneficiamentoTerceiros)}
              </p>
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

        <Tabs defaultValue="resumo" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-none lg:flex">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="proprio">Material Próprio</TabsTrigger>
            <TabsTrigger value="terceiro">Industrialização</TabsTrigger>
            <TabsTrigger value="acertos">Acertos</TabsTrigger>
          </TabsList>

          {/* Resumo */}
          <TabsContent value="resumo" className="mt-6 space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Gráfico de composição */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Warehouse className="h-4 w-4" />
                    Composição do Estoque
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="peso"
                        >
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any, name: any, props: any) => [
                            `${formatWeight(value)} (${formatCurrency(props.payload.value)})`,
                            name
                          ]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      Sem dados de estoque
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tabela resumo por dono */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Resumo por Dono
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border max-h-[280px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Dono</TableHead>
                          <TableHead className="text-right">Próprio (kg)</TableHead>
                          <TableHead className="text-right">Terceiro (kg)</TableHead>
                          <TableHead className="text-right">Valor Próprio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resumoPorDono.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              Nenhum dado encontrado
                            </TableCell>
                          </TableRow>
                        ) : (
                          resumoPorDono.map((d: any) => (
                            <TableRow key={d.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedDono(d.id)}>
                              <TableCell className="font-medium">{d.nome}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="outline" className="text-primary">
                                  {formatWeight(d.pesoProprio)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary">
                                  {formatWeight(d.pesoTerceiro)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {formatCurrency(d.valorProprio)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cards informativos */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Material Próprio (Compra/Consignação)
                  </CardTitle>
                  <CardDescription>Materiais adquiridos que compõem o fluxo de caixa da IBRAC</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lotes em estoque:</span>
                    <span className="font-medium">{sublotesProprios.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Peso total:</span>
                    <span className="font-medium text-primary">{formatWeight(totalPesoProprio)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor em estoque:</span>
                    <span className="font-medium">{formatCurrency(totalValorProprio)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total compras:</span>
                    <span className="font-medium">{formatCurrency(totalCompras)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-info/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Factory className="h-4 w-4" />
                    Material Terceiros (Industrialização)
                  </CardTitle>
                  <CardDescription>Materiais de terceiros que NÃO compõem o fluxo de caixa</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lotes em estoque:</span>
                    <span className="font-medium">{sublotesTerceiros.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Peso total:</span>
                    <span className="font-medium text-info">{formatWeight(totalPesoTerceiros)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Custo de beneficiamento:</span>
                    <span className="font-medium">{formatCurrency(custoBeneficiamentoTerceiros)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Obs:</span>
                    <span>Apenas custos de MO/Beneficiamento são cobrados</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Material Próprio */}
          <TabsContent value="proprio" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lotes de Material Próprio em Estoque</CardTitle>
                <CardDescription>Materiais de compra ou consignação que geram custo financeiro</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Código</TableHead>
                        <TableHead>Tipo Entrada</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Dono</TableHead>
                        <TableHead>Local</TableHead>
                        <TableHead className="text-right">Peso</TableHead>
                        <TableHead className="text-right">Custo/kg</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sublotesProprios.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            Nenhum lote de material próprio
                          </TableCell>
                        </TableRow>
                      ) : (
                        sublotesProprios.map((s: any) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-mono text-primary">{s.codigo}</TableCell>
                            <TableCell>
                              <Badge variant="default" className="text-xs">
                                {s.entrada?.tipo_entrada?.nome || "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell>{s.tipo_produto?.nome || "-"}</TableCell>
                            <TableCell>{s.dono?.nome || "-"}</TableCell>
                            <TableCell>{s.local?.nome || "-"}</TableCell>
                            <TableCell className="text-right font-medium">{formatWeight(s.peso_kg)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatCurrency(s.custo_unitario_total || 0)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-primary">
                              {formatCurrency((s.custo_unitario_total || 0) * s.peso_kg)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Material Terceiros */}
          <TabsContent value="terceiro" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lotes de Industrialização em Estoque</CardTitle>
                <CardDescription>Materiais de terceiros para beneficiamento - não compõem fluxo de caixa</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Código</TableHead>
                        <TableHead>Tipo Entrada</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Dono</TableHead>
                        <TableHead>Local</TableHead>
                        <TableHead className="text-right">Peso</TableHead>
                        <TableHead className="text-right">Custo Benef/kg</TableHead>
                        <TableHead className="text-right">Total Benef</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sublotesTerceiros.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            Nenhum lote de industrialização
                          </TableCell>
                        </TableRow>
                      ) : (
                        sublotesTerceiros.map((s: any) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-mono text-info">{s.codigo}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                                {s.entrada?.tipo_entrada?.nome || "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell>{s.tipo_produto?.nome || "-"}</TableCell>
                            <TableCell>{s.dono?.nome || "-"}</TableCell>
                            <TableCell>{s.local?.nome || "-"}</TableCell>
                            <TableCell className="text-right font-medium">{formatWeight(s.peso_kg)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatCurrency(s.custo_unitario_total || 0)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-info">
                              {formatCurrency((s.custo_unitario_total || 0) * s.peso_kg)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Acertos Financeiros */}
          <TabsContent value="acertos" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Acertos Financeiros</CardTitle>
                <CardDescription>Dívidas e receitas pendentes com donos de material</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Dono</TableHead>
                        <TableHead>Referência</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {acertos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Nenhum acerto financeiro
                          </TableCell>
                        </TableRow>
                      ) : (
                        acertos.map((a: any) => (
                          <TableRow key={a.id}>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(a.data_acerto || a.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              <Badge variant={a.tipo === "divida" ? "destructive" : "default"} className="text-xs">
                                {a.tipo === "divida" ? "A Pagar" : "A Receber"}
                              </Badge>
                            </TableCell>
                            <TableCell>{a.dono?.nome || "-"}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {a.observacoes?.slice(0, 30) || a.referencia_tipo || "-"}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${a.tipo === "divida" ? "text-destructive" : "text-success"}`}>
                              {formatCurrency(a.valor)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={a.status === "pago" ? "default" : "outline"} className="text-xs">
                                {a.status === "pago" ? "Pago" : "Pendente"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

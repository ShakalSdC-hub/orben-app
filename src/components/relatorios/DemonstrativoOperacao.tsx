import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download, User, TrendingUp, TrendingDown, DollarSign, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import * as XLSX from "xlsx";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { detectarCenario, formatCenarioLabel, getCenarioColor, CenarioOperacao } from "@/lib/cenarios-orben";

interface DemonstrativoOperacaoProps {
  dataInicio: string;
  dataFim: string;
  donoFiltro?: string;
}

interface OperacaoDono {
  dono_id: string;
  dono_nome: string;
  is_ibrac: boolean;
  taxa_operacao_pct: number;
  // Entradas
  total_entradas: number;
  peso_entrada_kg: number;
  valor_compras: number;
  // Beneficiamentos
  total_beneficiamentos: number;
  custo_frete: number;
  custo_mo: number;
  custo_total_benef: number;
  lucro_perda_valor: number;
  // Saídas
  total_saidas: number;
  peso_saida_kg: number;
  receita_bruta: number;
  custos_cobrados: number;
  comissao_ibrac: number;
  repasse_dono: number;
  // Resultado
  resultado_liquido: number;
  cenario_predominante: CenarioOperacao | null;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatWeight(kg: number) {
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  return `${kg.toFixed(2)} kg`;
}

export function DemonstrativoOperacao({ dataInicio, dataFim, donoFiltro }: DemonstrativoOperacaoProps) {
  // Fetch donos
  const { data: donos = [] } = useQuery({
    queryKey: ["donos-demonstrativo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("donos_material").select("*").eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  // Fetch entradas no período
  const { data: entradas = [], isLoading: loadingEntradas } = useQuery({
    queryKey: ["demonstrativo-entradas", dataInicio, dataFim],
    queryFn: async () => {
      let query = supabase
        .from("entradas")
        .select(`*, tipo_entrada:tipos_entrada(gera_custo)`);
      
      if (dataInicio) query = query.gte("data_entrada", dataInicio);
      if (dataFim) query = query.lte("data_entrada", dataFim);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch beneficiamentos no período
  const { data: beneficiamentos = [], isLoading: loadingBenef } = useQuery({
    queryKey: ["demonstrativo-beneficiamentos", dataInicio, dataFim],
    queryFn: async () => {
      let query = supabase
        .from("beneficiamentos")
        .select(`
          *,
          itens_entrada:beneficiamento_itens_entrada(
            sublote:sublotes(
              dono_id,
              dono:donos_material!fk_sublotes_dono(id, nome, is_ibrac),
              entrada:entradas!fk_sublotes_entrada(tipo_entrada:tipos_entrada(gera_custo))
            )
          )
        `);
      
      if (dataInicio) query = query.gte("data_inicio", dataInicio);
      if (dataFim) query = query.lte("data_inicio", dataFim);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch saídas no período
  const { data: saidas = [], isLoading: loadingSaidas } = useQuery({
    queryKey: ["demonstrativo-saidas", dataInicio, dataFim],
    queryFn: async () => {
      let query = supabase
        .from("saidas")
        .select(`
          *,
          itens:saida_itens(
            sublote:sublotes(
              dono_id,
              dono:donos_material!fk_sublotes_dono(id, nome, is_ibrac, taxa_operacao_pct),
              entrada:entradas!fk_sublotes_entrada(tipo_entrada:tipos_entrada(gera_custo))
            )
          )
        `);
      
      if (dataInicio) query = query.gte("data_saida", dataInicio);
      if (dataFim) query = query.lte("data_saida", dataFim);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Processar dados por dono
  const dadosPorDono = useMemo<OperacaoDono[]>(() => {
    const resultado: Record<string, OperacaoDono> = {};

    // Inicializar com todos os donos
    donos.forEach((dono: any) => {
      resultado[dono.id] = {
        dono_id: dono.id,
        dono_nome: dono.nome,
        is_ibrac: dono.is_ibrac || false,
        taxa_operacao_pct: dono.taxa_operacao_pct || 0,
        total_entradas: 0,
        peso_entrada_kg: 0,
        valor_compras: 0,
        total_beneficiamentos: 0,
        custo_frete: 0,
        custo_mo: 0,
        custo_total_benef: 0,
        lucro_perda_valor: 0,
        total_saidas: 0,
        peso_saida_kg: 0,
        receita_bruta: 0,
        custos_cobrados: 0,
        comissao_ibrac: 0,
        repasse_dono: 0,
        resultado_liquido: 0,
        cenario_predominante: null,
      };
    });

    // Processar entradas
    entradas.forEach((entrada: any) => {
      const donoId = entrada.dono_id;
      if (donoId && resultado[donoId]) {
        resultado[donoId].total_entradas++;
        resultado[donoId].peso_entrada_kg += entrada.peso_liquido_kg || 0;
        if (entrada.tipo_entrada?.gera_custo) {
          resultado[donoId].valor_compras += entrada.valor_total || 0;
        }
      }
    });

    // Processar beneficiamentos
    beneficiamentos.forEach((benef: any) => {
      const primeiroDono = benef.itens_entrada?.[0]?.sublote?.dono;
      const donoId = primeiroDono?.id;
      if (donoId && resultado[donoId]) {
        resultado[donoId].total_beneficiamentos++;
        resultado[donoId].custo_frete += (benef.custo_frete_ida || 0) + (benef.custo_frete_volta || 0);
        resultado[donoId].custo_mo += (benef.custo_mo_terceiro || 0) + (benef.custo_mo_ibrac || 0);
        resultado[donoId].custo_total_benef += 
          (benef.custo_frete_ida || 0) + (benef.custo_frete_volta || 0) +
          (benef.custo_mo_terceiro || 0) + (benef.custo_mo_ibrac || 0);
        resultado[donoId].lucro_perda_valor += benef.lucro_perda_valor || 0;
      }
    });

    // Processar saídas
    saidas.forEach((saida: any) => {
      const primeiroDono = saida.itens?.[0]?.sublote?.dono;
      const donoId = primeiroDono?.id;
      if (donoId && resultado[donoId]) {
        resultado[donoId].total_saidas++;
        resultado[donoId].peso_saida_kg += saida.peso_total_kg || 0;
        resultado[donoId].receita_bruta += saida.valor_total || 0;
        resultado[donoId].custos_cobrados += saida.custos_cobrados || 0;
        resultado[donoId].comissao_ibrac += saida.comissao_ibrac || 0;
        resultado[donoId].repasse_dono += saida.valor_repasse_dono || 0;

        // Detectar cenário
        const geraCusto = saida.itens?.[0]?.sublote?.entrada?.tipo_entrada?.gera_custo;
        const isIbrac = primeiroDono?.is_ibrac || false;
        const cenario = detectarCenario({ geraCusto, donoId, isIbrac });
        resultado[donoId].cenario_predominante = cenario;
      }
    });

    // Calcular resultado líquido
    Object.values(resultado).forEach((dono) => {
      if (dono.is_ibrac) {
        // Para IBRAC: economia vs LME + lucro perda
        dono.resultado_liquido = dono.lucro_perda_valor + dono.comissao_ibrac + dono.custos_cobrados;
      } else {
        // Para terceiros: receita - custos - comissão
        dono.resultado_liquido = dono.receita_bruta - dono.valor_compras - dono.custo_total_benef - dono.comissao_ibrac;
      }
    });

    return Object.values(resultado)
      .filter(d => d.total_entradas > 0 || d.total_saidas > 0 || d.total_beneficiamentos > 0)
      .filter(d => !donoFiltro || d.dono_id === donoFiltro);
  }, [donos, entradas, beneficiamentos, saidas, donoFiltro]);

  // Totais
  const totais = useMemo(() => {
    return {
      peso_entrada: dadosPorDono.reduce((acc, d) => acc + d.peso_entrada_kg, 0),
      peso_saida: dadosPorDono.reduce((acc, d) => acc + d.peso_saida_kg, 0),
      valor_compras: dadosPorDono.reduce((acc, d) => acc + d.valor_compras, 0),
      custo_benef: dadosPorDono.reduce((acc, d) => acc + d.custo_total_benef, 0),
      receita_bruta: dadosPorDono.reduce((acc, d) => acc + d.receita_bruta, 0),
      lucro_perda: dadosPorDono.reduce((acc, d) => acc + d.lucro_perda_valor, 0),
      comissao_ibrac: dadosPorDono.reduce((acc, d) => acc + d.comissao_ibrac, 0),
      repasse_dono: dadosPorDono.reduce((acc, d) => acc + d.repasse_dono, 0),
      resultado: dadosPorDono.reduce((acc, d) => acc + d.resultado_liquido, 0),
    };
  }, [dadosPorDono]);

  // Export Excel
  const exportToExcel = () => {
    if (dadosPorDono.length === 0) {
      toast({ title: "Sem dados para exportar", variant: "destructive" });
      return;
    }

    const rows = dadosPorDono.map(d => ({
      "Dono": d.dono_nome,
      "Cenário": d.cenario_predominante ? formatCenarioLabel(d.cenario_predominante) : "—",
      "Entradas": d.total_entradas,
      "Peso Entrada (kg)": d.peso_entrada_kg,
      "Valor Compras (R$)": d.valor_compras,
      "Beneficiamentos": d.total_beneficiamentos,
      "Custo Benef (R$)": d.custo_total_benef,
      "Lucro Perda (R$)": d.lucro_perda_valor,
      "Saídas": d.total_saidas,
      "Peso Saída (kg)": d.peso_saida_kg,
      "Receita Bruta (R$)": d.receita_bruta,
      "Custos Cobrados (R$)": d.custos_cobrados,
      "Comissão IBRAC (R$)": d.comissao_ibrac,
      "Repasse Dono (R$)": d.repasse_dono,
      "Resultado Líquido (R$)": d.resultado_liquido,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Demonstrativo por Dono");
    XLSX.writeFile(wb, `demonstrativo_dono_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
    toast({ title: "Relatório exportado com sucesso!" });
  };

  const isLoading = loadingEntradas || loadingBenef || loadingSaidas;

  // Função para imprimir/PDF
  const printReport = () => {
    if (dadosPorDono.length === 0) {
      toast({ title: "Sem dados para imprimir", variant: "destructive" });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const tableRows = dadosPorDono.map(d => `
      <tr>
        <td>${d.dono_nome}${d.is_ibrac ? ' (IBRAC)' : ''}</td>
        <td>${d.cenario_predominante ? formatCenarioLabel(d.cenario_predominante) : '-'}</td>
        <td style="text-align: right">${formatWeight(d.peso_entrada_kg)}</td>
        <td style="text-align: right">${formatCurrency(d.valor_compras)}</td>
        <td style="text-align: right">${formatCurrency(d.receita_bruta)}</td>
        <td style="text-align: right">${formatCurrency(d.comissao_ibrac)}</td>
        <td style="text-align: right; ${d.resultado_liquido >= 0 ? 'color: green' : 'color: red'}">${formatCurrency(d.resultado_liquido)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Demonstrativo por Dono</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 6px; }
            th { background: #f5f5f5; font-weight: bold; }
            h1 { font-size: 18px; margin-bottom: 5px; }
            .periodo { color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <h1>Demonstrativo por Dono</h1>
          <p class="periodo">${dataInicio ? format(parseISO(dataInicio), "dd/MM/yyyy") : "Início"} a ${dataFim ? format(parseISO(dataFim), "dd/MM/yyyy") : "Fim"}</p>
          <table>
            <thead>
              <tr>
                <th>Dono</th>
                <th>Cenário</th>
                <th style="text-align: right">Peso Entrada</th>
                <th style="text-align: right">Compras</th>
                <th style="text-align: right">Receita</th>
                <th style="text-align: right">Comissão</th>
                <th style="text-align: right">Resultado</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
              <tr style="font-weight: bold; background: #f5f5f5;">
                <td colspan="2">TOTAL</td>
                <td style="text-align: right">${formatWeight(totais.peso_entrada)}</td>
                <td style="text-align: right">${formatCurrency(totais.valor_compras)}</td>
                <td style="text-align: right">${formatCurrency(totais.receita_bruta)}</td>
                <td style="text-align: right">${formatCurrency(totais.comissao_ibrac)}</td>
                <td style="text-align: right; ${totais.resultado >= 0 ? 'color: green' : 'color: red'}">${formatCurrency(totais.resultado)}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Demonstrativo por Dono
          </CardTitle>
          <CardDescription>
            {dataInicio && dataFim 
              ? `${format(parseISO(dataInicio), "dd/MM/yyyy")} a ${format(parseISO(dataFim), "dd/MM/yyyy")}`
              : "Todos os lançamentos"}
            {" · "}Resultado operacional por dono do material
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={printReport}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPIs principais */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-primary/10 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Receita Bruta
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totais.receita_bruta)}</p>
          </div>
          <div className="rounded-lg bg-success/10 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              Lucro Perda
            </div>
            <p className="text-2xl font-bold text-success">{formatCurrency(totais.lucro_perda)}</p>
          </div>
          <div className="rounded-lg bg-warning/10 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <FileText className="h-4 w-4" />
              Comissão IBRAC
            </div>
            <p className="text-2xl font-bold text-warning">{formatCurrency(totais.comissao_ibrac)}</p>
          </div>
          <div className={cn(
            "rounded-lg p-4",
            totais.resultado >= 0 ? "bg-success/10" : "bg-destructive/10"
          )}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              {totais.resultado >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              Resultado Total
            </div>
            <p className={cn(
              "text-2xl font-bold",
              totais.resultado >= 0 ? "text-success" : "text-destructive"
            )}>
              {formatCurrency(totais.resultado)}
            </p>
          </div>
        </div>

        {/* Tabela */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Dono</TableHead>
                  <TableHead>Cenário</TableHead>
                  <TableHead className="text-right">Peso Ent.</TableHead>
                  <TableHead className="text-right">Compras</TableHead>
                  <TableHead className="text-right">Custo Benef</TableHead>
                  <TableHead className="text-right">Lucro Perda</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead className="text-right">Repasse</TableHead>
                  <TableHead className="text-right">Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosPorDono.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      Nenhuma operação no período selecionado
                    </TableCell>
                  </TableRow>
                ) : (
                  dadosPorDono.map((row) => (
                    <TableRow key={row.dono_id} className="text-xs">
                      <TableCell className="font-medium">
                        {row.dono_nome}
                        {row.is_ibrac && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">IBRAC</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.cenario_predominante && (
                          <Badge variant="outline" className={cn("text-[10px]", getCenarioColor(row.cenario_predominante))}>
                            {formatCenarioLabel(row.cenario_predominante)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{formatWeight(row.peso_entrada_kg)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.valor_compras)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.custo_total_benef)}</TableCell>
                      <TableCell className={cn("text-right", row.lucro_perda_valor > 0 ? "text-success" : "")}>
                        {formatCurrency(row.lucro_perda_valor)}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(row.receita_bruta)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.comissao_ibrac)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.repasse_dono)}</TableCell>
                      <TableCell className={cn(
                        "text-right font-medium",
                        row.resultado_liquido >= 0 ? "text-success" : "text-destructive"
                      )}>
                        {formatCurrency(row.resultado_liquido)}
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
  );
}

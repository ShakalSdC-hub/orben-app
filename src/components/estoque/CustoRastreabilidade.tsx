import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, Truck, Users, Percent, Calculator, Package, History, Factory, FileSpreadsheet, Printer, Building2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import { formatCurrency, formatWeight } from "@/lib/kpis";

interface CustoRastreabilidadeProps {
  sublote: any;
  isOpen: boolean;
  onClose: () => void;
}

export function CustoRastreabilidade({ sublote, isOpen, onClose }: CustoRastreabilidadeProps) {
  // Buscar beneficiamento que gerou este sublote (se houver)
  const { data: beneficiamentoSaida } = useQuery({
    queryKey: ["beneficiamento-saida", sublote?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamento_itens_saida")
        .select(`
          *,
          beneficiamento:beneficiamentos(
            codigo,
            data_inicio,
            data_fim,
            peso_entrada_kg,
            peso_saida_kg,
            custo_frete_ida,
            custo_frete_volta,
            custo_mo_ibrac,
            custo_mo_terceiro,
            processo:processos(nome),
            fornecedor_terceiro:parceiros!beneficiamentos_fornecedor_terceiro_id_fkey(razao_social),
            transportadora:parceiros!beneficiamentos_transportadora_id_fkey(razao_social)
          )
        `)
        .eq("sublote_gerado_id", sublote?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!sublote?.id,
  });

  // Buscar documentos de entrada do beneficiamento
  const { data: benefEntradas } = useQuery({
    queryKey: ["beneficiamento-entradas-rastreio", beneficiamentoSaida?.beneficiamento_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamento_entradas")
        .select(`
          taxa_financeira_valor,
          taxa_financeira_pct,
          valor_documento,
          entrada:entradas(
            codigo, 
            data_entrada, 
            valor_total, 
            valor_unitario,
            parceiro:parceiros!entradas_parceiro_id_fkey(razao_social),
            dono:donos_material(nome)
          )
        `)
        .eq("beneficiamento_id", beneficiamentoSaida?.beneficiamento_id);
      if (error) throw error;
      return data;
    },
    enabled: !!beneficiamentoSaida?.beneficiamento_id,
  });

  // Buscar itens de entrada do beneficiamento (sublotes consumidos)
  const { data: itensEntrada } = useQuery({
    queryKey: ["beneficiamento-itens-rastreio", beneficiamentoSaida?.beneficiamento_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamento_itens_entrada")
        .select(`
          peso_kg,
          custo_unitario,
          sublote:sublotes(
            codigo, 
            custo_unitario_total,
            dono:donos_material(nome),
            entrada:entradas(
              codigo,
              parceiro:parceiros!entradas_parceiro_id_fkey(razao_social)
            )
          ),
          tipo_produto:tipos_produto(nome)
        `)
        .eq("beneficiamento_id", beneficiamentoSaida?.beneficiamento_id);
      if (error) throw error;
      return data;
    },
    enabled: !!beneficiamentoSaida?.beneficiamento_id,
  });

  // Buscar entrada original (se sublote é de entrada direta)
  const { data: entradaOriginal } = useQuery({
    queryKey: ["entrada-original", sublote?.entrada_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entradas")
        .select(`
          *,
          parceiro:parceiros!entradas_parceiro_id_fkey(razao_social),
          tipo_produto:tipos_produto(nome),
          dono:donos_material(nome)
        `)
        .eq("id", sublote?.entrada_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!sublote?.entrada_id && !sublote?.lote_pai_id,
  });

  if (!sublote) return null;

  const ben = beneficiamentoSaida?.beneficiamento as any;
  const custoFreteIda = ben?.custo_frete_ida || 0;
  const custoFreteVolta = ben?.custo_frete_volta || 0;
  const custoMoIbrac = ben?.custo_mo_ibrac || 0;
  const custoMoTerceiro = ben?.custo_mo_terceiro || 0;
  const custoFinanceiro = benefEntradas?.reduce((acc, doc) => acc + (doc.taxa_financeira_valor || 0), 0) || 0;
  const valorDocumentos = benefEntradas?.reduce((acc, doc) => acc + (doc.valor_documento || 0), 0) || 0;
  const custosAdicionais = custoFreteIda + custoFreteVolta + custoMoIbrac + custoMoTerceiro + custoFinanceiro;
  const custoTotalGeral = valorDocumentos + custosAdicionais;

  const isFromBeneficiamento = !!beneficiamentoSaida;

  // Funções de exportação
  const exportToExcel = () => {
    const data = [
      { "Campo": "Código do Lote", "Valor": sublote.codigo },
      { "Campo": "Peso", "Valor": `${sublote.peso_kg} kg` },
      { "Campo": "Produto", "Valor": sublote.tipo_produto?.nome || "-" },
      { "Campo": "Dono", "Valor": sublote.dono?.nome || "IBRAC" },
      { "Campo": "Custo Unitário", "Valor": sublote.custo_unitario_total || 0 },
      { "Campo": "", "Valor": "" },
    ];

    if (isFromBeneficiamento && ben) {
      data.push(
        { "Campo": "--- ORIGEM: BENEFICIAMENTO ---", "Valor": "" },
        { "Campo": "Código Beneficiamento", "Valor": ben.codigo },
        { "Campo": "Processo", "Valor": ben.processo?.nome || "-" },
        { "Campo": "Terceiro", "Valor": ben.fornecedor_terceiro?.razao_social || "IBRAC" },
        { "Campo": "Período", "Valor": `${ben.data_inicio ? format(new Date(ben.data_inicio), "dd/MM/yyyy") : "-"} → ${ben.data_fim ? format(new Date(ben.data_fim), "dd/MM/yyyy") : "-"}` },
        { "Campo": "", "Valor": "" },
        { "Campo": "--- COMPOSIÇÃO DO CUSTO ---", "Valor": "" },
        { "Campo": "Valor dos Documentos", "Valor": valorDocumentos },
        { "Campo": "Frete Ida", "Valor": custoFreteIda },
        { "Campo": "Frete Volta", "Valor": custoFreteVolta },
        { "Campo": "MO IBRAC", "Valor": custoMoIbrac },
        { "Campo": "MO Terceiro", "Valor": custoMoTerceiro },
        { "Campo": "Custo Financeiro", "Valor": custoFinanceiro },
        { "Campo": "Custos Adicionais", "Valor": custosAdicionais },
        { "Campo": "CUSTO TOTAL", "Valor": custoTotalGeral },
        { "Campo": "Peso de Saída", "Valor": `${ben.peso_saida_kg || 0} kg` },
        { "Campo": "CUSTO UNITÁRIO FINAL", "Valor": sublote.custo_unitario_total || 0 }
      );
    } else if (entradaOriginal) {
      data.push(
        { "Campo": "--- ORIGEM: ENTRADA DIRETA ---", "Valor": "" },
        { "Campo": "Código Entrada", "Valor": entradaOriginal.codigo },
        { "Campo": "Data Entrada", "Valor": format(new Date(entradaOriginal.data_entrada), "dd/MM/yyyy") },
        { "Campo": "Parceiro/Fornecedor", "Valor": entradaOriginal.parceiro?.razao_social || "-" },
        { "Campo": "Dono", "Valor": entradaOriginal.dono?.nome || "IBRAC" },
        { "Campo": "Valor Unitário", "Valor": entradaOriginal.valor_unitario || 0 },
        { "Campo": "Valor Total Documento", "Valor": entradaOriginal.valor_total || 0 }
      );
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rastreabilidade");
    XLSX.writeFile(workbook, `rastreabilidade_${sublote.codigo}_${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const printReport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let sublotesHtml = "";
    if (itensEntrada && itensEntrada.length > 0) {
      sublotesHtml = `
        <h3>Sublotes de Entrada Consumidos</h3>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Produto</th>
              <th>Dono</th>
              <th>Peso</th>
              <th>Custo Unit.</th>
            </tr>
          </thead>
          <tbody>
            ${itensEntrada.map((item: any) => `
              <tr>
                <td>${(item.sublote as any)?.codigo || "-"}</td>
                <td>${(item.tipo_produto as any)?.nome || "-"}</td>
                <td>${(item.sublote as any)?.dono?.nome || "IBRAC"}</td>
                <td style="text-align: right">${formatWeight(item.peso_kg)}</td>
                <td style="text-align: right">${formatCurrency((item.sublote as any)?.custo_unitario_total || 0)}/kg</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    }

    let documentosHtml = "";
    if (benefEntradas && benefEntradas.length > 0) {
      documentosHtml = `
        <h3>Documentos de Entrada</h3>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Parceiro</th>
              <th>Dono</th>
              <th>Valor</th>
              <th>Taxa Financeira</th>
            </tr>
          </thead>
          <tbody>
            ${benefEntradas.map((doc: any) => `
              <tr>
                <td>${(doc.entrada as any)?.codigo || "-"}</td>
                <td>${(doc.entrada as any)?.parceiro?.razao_social || "-"}</td>
                <td>${(doc.entrada as any)?.dono?.nome || "IBRAC"}</td>
                <td style="text-align: right">${formatCurrency(doc.valor_documento || 0)}</td>
                <td style="text-align: right">${formatCurrency(doc.taxa_financeira_valor || 0)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rastreabilidade de Custo - ${sublote.codigo}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
          h1 { color: #333; border-bottom: 2px solid #B87333; padding-bottom: 10px; font-size: 18px; }
          h2 { color: #B87333; font-size: 14px; margin-top: 20px; }
          h3 { color: #666; font-size: 12px; margin-top: 15px; }
          .info { color: #666; margin-bottom: 20px; font-size: 10px; }
          table { border-collapse: collapse; width: 100%; margin-top: 10px; margin-bottom: 15px; }
          th { background-color: #B87333; color: white; padding: 8px; text-align: left; font-size: 11px; }
          td { border: 1px solid #ddd; padding: 6px; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .section { border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .label { color: #666; font-size: 10px; }
          .value { font-weight: bold; }
          .highlight { background: #FDF6E9; padding: 10px; border-radius: 5px; margin-top: 10px; }
          .total { font-size: 14px; color: #B87333; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>IBRAC - Rastreabilidade de Custo</h1>
        <p class="info">Lote: ${sublote.codigo} | Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
        
        <div class="section">
          <h2>Informações do Lote</h2>
          <div class="grid">
            <div><span class="label">Código:</span><br/><span class="value">${sublote.codigo}</span></div>
            <div><span class="label">Peso:</span><br/><span class="value">${formatWeight(sublote.peso_kg)}</span></div>
            <div><span class="label">Produto:</span><br/><span class="value">${sublote.tipo_produto?.nome || "-"}</span></div>
            <div><span class="label">Dono:</span><br/><span class="value">${sublote.dono?.nome || "IBRAC"}</span></div>
          </div>
          <div class="highlight">
            <span class="label">Custo Unitário:</span><br/>
            <span class="value total">${formatCurrency(sublote.custo_unitario_total || 0)}/kg</span>
          </div>
        </div>
        
        ${isFromBeneficiamento && ben ? `
          <div class="section">
            <h2>Origem - Beneficiamento</h2>
            <div class="grid">
              <div><span class="label">Código:</span><br/><span class="value">${ben.codigo}</span></div>
              <div><span class="label">Processo:</span><br/><span class="value">${ben.processo?.nome || "-"}</span></div>
              <div><span class="label">Período:</span><br/><span class="value">${ben.data_inicio ? format(new Date(ben.data_inicio), "dd/MM/yyyy") : "-"} → ${ben.data_fim ? format(new Date(ben.data_fim), "dd/MM/yyyy") : "-"}</span></div>
              <div><span class="label">Terceiro:</span><br/><span class="value">${ben.fornecedor_terceiro?.razao_social || "IBRAC"}</span></div>
            </div>
          </div>
          
          ${sublotesHtml}
          ${documentosHtml}
          
          <div class="section">
            <h2>Composição do Custo</h2>
            <table>
              <tr><td>Valor dos Documentos</td><td style="text-align: right">${formatCurrency(valorDocumentos)}</td></tr>
              <tr><td>Frete Ida</td><td style="text-align: right">${formatCurrency(custoFreteIda)}</td></tr>
              <tr><td>Frete Volta</td><td style="text-align: right">${formatCurrency(custoFreteVolta)}</td></tr>
              <tr><td>MO IBRAC</td><td style="text-align: right">${formatCurrency(custoMoIbrac)}</td></tr>
              <tr><td>MO Terceiro</td><td style="text-align: right">${formatCurrency(custoMoTerceiro)}</td></tr>
              <tr><td>Custo Financeiro</td><td style="text-align: right">${formatCurrency(custoFinanceiro)}</td></tr>
              <tr style="border-top: 2px solid #B87333"><td><strong>Custos Adicionais</strong></td><td style="text-align: right"><strong>${formatCurrency(custosAdicionais)}</strong></td></tr>
              <tr style="background: #FDF6E9"><td><strong>CUSTO TOTAL</strong></td><td style="text-align: right"><strong class="total">${formatCurrency(custoTotalGeral)}</strong></td></tr>
            </table>
            <div class="highlight">
              <div class="grid">
                <div><span class="label">Peso de Saída:</span><br/><span class="value">${formatWeight(ben.peso_saida_kg || 0)}</span></div>
                <div><span class="label">Custo Unitário Final:</span><br/><span class="value total">${formatCurrency(sublote.custo_unitario_total || 0)}/kg</span></div>
              </div>
            </div>
          </div>
        ` : entradaOriginal ? `
          <div class="section">
            <h2>Origem - Entrada Direta</h2>
            <div class="grid">
              <div><span class="label">Documento:</span><br/><span class="value">${entradaOriginal.codigo}</span></div>
              <div><span class="label">Data:</span><br/><span class="value">${format(new Date(entradaOriginal.data_entrada), "dd/MM/yyyy")}</span></div>
              <div><span class="label">Parceiro/Fornecedor:</span><br/><span class="value">${entradaOriginal.parceiro?.razao_social || "-"}</span></div>
              <div><span class="label">Dono:</span><br/><span class="value">${entradaOriginal.dono?.nome || "IBRAC"}</span></div>
            </div>
            <div class="highlight">
              <div class="grid">
                <div><span class="label">Valor Unitário:</span><br/><span class="value">${formatCurrency(entradaOriginal.valor_unitario || 0)}/kg</span></div>
                <div><span class="label">Valor Total:</span><br/><span class="value total">${formatCurrency(entradaOriginal.valor_total || 0)}</span></div>
              </div>
            </div>
          </div>
        ` : `
          <div class="section">
            <p>Não há informações de rastreabilidade disponíveis para este lote.</p>
          </div>
        `}
        
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Rastreabilidade de Custo - {sublote.codigo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info do Sublote */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                Informações do Lote
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Código:</span>
                <p className="font-mono font-medium">{sublote.codigo}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Peso:</span>
                <p className="font-medium">{formatWeight(sublote.peso_kg)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Produto:</span>
                <p className="font-medium">{sublote.tipo_produto?.nome || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Custo Unitário:</span>
                <p className="font-bold text-primary">{formatCurrency(sublote.custo_unitario_total || 0)}/kg</p>
              </div>
              <div>
                <span className="text-muted-foreground">Dono:</span>
                <p className="font-medium flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {sublote.dono?.nome || "IBRAC"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Valor Total:</span>
                <p className="font-medium">{formatCurrency((sublote.peso_kg || 0) * (sublote.custo_unitario_total || 0))}</p>
              </div>
            </CardContent>
          </Card>

          {/* Origem - Entrada Direta */}
          {!isFromBeneficiamento && entradaOriginal && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Origem - Entrada Direta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground">Documento:</span>
                    <p className="font-mono font-medium">{entradaOriginal.codigo}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Data:</span>
                    <p>{format(new Date(entradaOriginal.data_entrada), "dd/MM/yyyy", { locale: ptBR })}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Parceiro/Fornecedor:</span>
                    <p className="font-medium">{entradaOriginal.parceiro?.razao_social || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Dono:</span>
                    <p className="font-medium">{entradaOriginal.dono?.nome || "IBRAC"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valor Unitário:</span>
                    <p className="font-medium">{formatCurrency(entradaOriginal.valor_unitario || 0)}/kg</p>
                  </div>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Valor Total do Documento</span>
                  <span className="text-primary">{formatCurrency(entradaOriginal.valor_total || 0)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Origem - Beneficiamento */}
          {isFromBeneficiamento && ben && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Factory className="h-4 w-4" />
                    Origem - Beneficiamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground">Código:</span>
                      <p className="font-mono font-medium">{ben.codigo}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Processo:</span>
                      <p>{ben.processo?.nome || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Período:</span>
                      <p>
                        {ben.data_inicio && format(new Date(ben.data_inicio), "dd/MM/yyyy")}
                        {ben.data_fim && ` → ${format(new Date(ben.data_fim), "dd/MM/yyyy")}`}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Terceiro:</span>
                      <p className="font-medium">{ben.fornecedor_terceiro?.razao_social || "IBRAC"}</p>
                    </div>
                    {ben.transportadora && (
                      <div>
                        <span className="text-muted-foreground">Transportadora:</span>
                        <p>{ben.transportadora?.razao_social}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Sublotes Consumidos */}
              {itensEntrada && itensEntrada.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Sublotes de Entrada Consumidos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead>Dono</TableHead>
                          <TableHead className="text-right">Peso</TableHead>
                          <TableHead className="text-right">Custo Unit.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itensEntrada.map((item, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono">{(item.sublote as any)?.codigo}</TableCell>
                            <TableCell>{(item.tipo_produto as any)?.nome}</TableCell>
                            <TableCell>{(item.sublote as any)?.dono?.nome || "IBRAC"}</TableCell>
                            <TableCell className="text-right">{formatWeight(item.peso_kg)}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency((item.sublote as any)?.custo_unitario_total || 0)}/kg
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Breakdown de Custos */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Composição do Custo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {/* Documentos */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Receipt className="h-3.5 w-3.5" />
                      <span className="font-medium">Valor dos Documentos</span>
                    </div>
                    {benefEntradas?.map((doc, i) => (
                      <div key={i} className="flex justify-between pl-5 text-xs">
                        <div>
                          <span className="font-mono">{(doc.entrada as any)?.codigo}</span>
                          <span className="text-muted-foreground ml-2">
                            ({(doc.entrada as any)?.parceiro?.razao_social || "-"})
                          </span>
                        </div>
                        <span>{formatCurrency(doc.valor_documento || 0)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pl-5 font-medium pt-1 border-t border-dashed">
                      <span>Subtotal</span>
                      <span>{formatCurrency(valorDocumentos)}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Frete */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Truck className="h-3.5 w-3.5" />
                      <span className="font-medium">Frete</span>
                    </div>
                    <div className="flex justify-between pl-5">
                      <span>Ida</span>
                      <span>{formatCurrency(custoFreteIda)}</span>
                    </div>
                    <div className="flex justify-between pl-5">
                      <span>Volta</span>
                      <span>{formatCurrency(custoFreteVolta)}</span>
                    </div>
                  </div>

                  {/* MO */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span className="font-medium">Mão de Obra</span>
                    </div>
                    <div className="flex justify-between pl-5">
                      <span>IBRAC</span>
                      <span>{formatCurrency(custoMoIbrac)}</span>
                    </div>
                    <div className="flex justify-between pl-5">
                      <span>Terceiro</span>
                      <span>{formatCurrency(custoMoTerceiro)}</span>
                    </div>
                  </div>

                  {/* Financeiro */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Percent className="h-3.5 w-3.5" />
                      <span className="font-medium">Custo Financeiro</span>
                    </div>
                    <div className="flex justify-between pl-5">
                      <span>Taxa sobre documentos</span>
                      <span>{formatCurrency(custoFinanceiro)}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Totais */}
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between">
                      <span>Custos Adicionais</span>
                      <span>{formatCurrency(custosAdicionais)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Custo Total</span>
                      <span className="text-primary">{formatCurrency(custoTotalGeral)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Peso de Saída</span>
                      <span>{formatWeight(ben.peso_saida_kg || 0)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg bg-background rounded-lg p-3">
                      <span>Custo Unitário Final</span>
                      <span className="text-primary">{formatCurrency(sublote.custo_unitario_total || 0)}/kg</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Sem rastreabilidade */}
          {!isFromBeneficiamento && !entradaOriginal && (
            <Card className="border-muted">
              <CardContent className="py-8 text-center text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Não há informações de rastreabilidade disponíveis para este lote.</p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-end">
          <Button variant="outline" size="sm" onClick={exportToExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={printReport}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir / PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

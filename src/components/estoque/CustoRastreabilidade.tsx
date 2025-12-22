import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, Truck, Users, Percent, Calculator, Package, ArrowRight, History, Factory } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CustoRastreabilidadeProps {
  sublote: any;
  isOpen: boolean;
  onClose: () => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatWeight(kg: number) {
  return kg >= 1000 ? `${(kg / 1000).toFixed(2)} t` : `${kg.toFixed(2)} kg`;
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
            fornecedor_terceiro:parceiros!beneficiamentos_fornecedor_terceiro_id_fkey(razao_social)
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
          entrada:entradas(codigo, data_entrada, valor_total, valor_unitario)
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
          sublote:sublotes(codigo, custo_unitario_total),
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
          tipo_produto:tipos_produto(nome)
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
                    <span className="text-muted-foreground">Fornecedor:</span>
                    <p>{entradaOriginal.parceiro?.razao_social || "-"}</p>
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
                      <p>{ben.fornecedor_terceiro?.razao_social || "IBRAC"}</p>
                    </div>
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
                          <TableHead className="text-right">Peso</TableHead>
                          <TableHead className="text-right">Custo Unit.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itensEntrada.map((item, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono">{(item.sublote as any)?.codigo}</TableCell>
                            <TableCell>{(item.tipo_produto as any)?.nome}</TableCell>
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
                        <span>{(doc.entrada as any)?.codigo}</span>
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
      </DialogContent>
    </Dialog>
  );
}

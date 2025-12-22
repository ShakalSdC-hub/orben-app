import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Receipt, Truck, Users, Percent, Calculator, Package } from "lucide-react";

interface CustoCalculoPreviewProps {
  beneficiamentoId: string;
  pesoSaidaReal: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatWeight(kg: number) {
  return kg >= 1000 ? `${(kg / 1000).toFixed(2)} t` : `${kg.toFixed(2)} kg`;
}

export function CustoCalculoPreview({ beneficiamentoId, pesoSaidaReal }: CustoCalculoPreviewProps) {
  // Buscar dados do beneficiamento
  const { data: beneficiamento } = useQuery({
    queryKey: ["beneficiamento-custos", beneficiamentoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamentos")
        .select("*")
        .eq("id", beneficiamentoId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!beneficiamentoId,
  });

  // Buscar custo financeiro dos documentos
  const { data: benefEntradas } = useQuery({
    queryKey: ["beneficiamento-entradas-custos", beneficiamentoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamento_entradas")
        .select("taxa_financeira_valor, valor_documento, entrada:entradas(codigo)")
        .eq("beneficiamento_id", beneficiamentoId);
      if (error) throw error;
      return data;
    },
    enabled: !!beneficiamentoId,
  });

  // Buscar itens de entrada com custo original
  const { data: itensEntrada } = useQuery({
    queryKey: ["beneficiamento-itens-custos", beneficiamentoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamento_itens_entrada")
        .select("peso_kg, custo_unitario, sublote:sublotes(codigo, custo_unitario_total)")
        .eq("beneficiamento_id", beneficiamentoId);
      if (error) throw error;
      return data;
    },
    enabled: !!beneficiamentoId,
  });

  if (!beneficiamento) return null;

  // Cálculos
  const custoFreteIda = beneficiamento.custo_frete_ida || 0;
  const custoFreteVolta = beneficiamento.custo_frete_volta || 0;
  const custoMoIbrac = beneficiamento.custo_mo_ibrac || 0;
  const custoMoTerceiro = beneficiamento.custo_mo_terceiro || 0;
  const custoFinanceiro = benefEntradas?.reduce((acc, doc) => acc + (doc.taxa_financeira_valor || 0), 0) || 0;
  
  const valorDocumentos = benefEntradas?.reduce((acc, doc) => acc + (doc.valor_documento || 0), 0) || 0;
  
  const custoOriginalTotal = itensEntrada?.reduce((acc, item) => {
    const custoUnit = (item.sublote as any)?.custo_unitario_total || 0;
    return acc + (custoUnit * (item.peso_kg || 0));
  }, 0) || 0;

  const custosAdicionais = custoFreteIda + custoFreteVolta + custoMoIbrac + custoMoTerceiro + custoFinanceiro;
  const custoTotalGeral = valorDocumentos + custosAdicionais;
  
  const custoUnitarioFinal = pesoSaidaReal > 0 ? custoTotalGeral / pesoSaidaReal : 0;
  const custoAdicionalPorKg = pesoSaidaReal > 0 ? custosAdicionais / pesoSaidaReal : 0;

  return (
    <Card className="bg-muted/50 border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Prévia do Cálculo de Custo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* Documentos de Entrada */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Receipt className="h-3.5 w-3.5" />
            <span className="font-medium">Valor dos Documentos</span>
          </div>
          {benefEntradas?.map((doc, i) => (
            <div key={i} className="flex justify-between pl-5 text-xs">
              <span>{(doc.entrada as any)?.codigo || `Doc ${i + 1}`}</span>
              <span>{formatCurrency(doc.valor_documento || 0)}</span>
            </div>
          ))}
          <div className="flex justify-between pl-5 font-medium border-t border-dashed pt-1">
            <span>Subtotal Documentos</span>
            <span>{formatCurrency(valorDocumentos)}</span>
          </div>
        </div>

        <Separator />

        {/* Custos de Transporte */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Truck className="h-3.5 w-3.5" />
            <span className="font-medium">Frete</span>
          </div>
          <div className="flex justify-between pl-5">
            <span>Frete Ida</span>
            <span>{formatCurrency(custoFreteIda)}</span>
          </div>
          <div className="flex justify-between pl-5">
            <span>Frete Volta</span>
            <span>{formatCurrency(custoFreteVolta)}</span>
          </div>
        </div>

        {/* Mão de Obra */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span className="font-medium">Mão de Obra</span>
          </div>
          <div className="flex justify-between pl-5">
            <span>MO IBRAC</span>
            <span>{formatCurrency(custoMoIbrac)}</span>
          </div>
          <div className="flex justify-between pl-5">
            <span>MO Terceiro</span>
            <span>{formatCurrency(custoMoTerceiro)}</span>
          </div>
        </div>

        {/* Taxa Financeira */}
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
        <div className="space-y-2 pt-1">
          <div className="flex justify-between text-muted-foreground">
            <span>Custos Adicionais</span>
            <span>{formatCurrency(custosAdicionais)}</span>
          </div>
          <div className="flex justify-between font-semibold text-base">
            <span>Custo Total</span>
            <span className="text-primary">{formatCurrency(custoTotalGeral)}</span>
          </div>
        </div>

        <Separator />

        {/* Peso e Custo Unitário */}
        <div className="space-y-2 bg-background rounded-lg p-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="h-3.5 w-3.5" />
            <span className="font-medium">Resultado Final</span>
          </div>
          <div className="flex justify-between">
            <span>Peso de Saída</span>
            <span className="font-medium">{formatWeight(pesoSaidaReal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Custo Adicional/kg</span>
            <span>{formatCurrency(custoAdicionalPorKg)}/kg</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Custo Unitário Final</span>
            <span className="text-primary">{formatCurrency(custoUnitarioFinal)}/kg</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

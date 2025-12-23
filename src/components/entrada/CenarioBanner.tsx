import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Factory, Handshake, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CenarioBannerProps {
  tipoEntrada?: { gera_custo?: boolean; nome?: string } | null;
  dono?: { nome?: string; is_ibrac?: boolean; taxa_operacao_pct?: number } | null;
}

export function CenarioBanner({ tipoEntrada, dono }: CenarioBannerProps) {
  if (!tipoEntrada) return null;

  const geraCusto = tipoEntrada.gera_custo;
  const isIbrac = dono?.is_ibrac;
  const isDono = dono && !isIbrac;

  // Detectar cenário
  let cenario: 'proprio' | 'industrializacao' | 'operacao_terceiro' | null = null;
  let titulo = "";
  let descricao = "";
  let icon = Info;
  let colorClass = "";

  if (!geraCusto) {
    // Remessa de industrialização
    cenario = 'industrializacao';
    titulo = "Industrialização";
    descricao = "Material de terceiro para beneficiamento. Os custos operacionais serão cobrados do cliente. O material NÃO entra no estoque de custos da IBRAC.";
    icon = Factory;
    colorClass = "border-info bg-info/5";
  } else if (isIbrac || !dono) {
    // Material próprio
    cenario = 'proprio';
    titulo = "Material Próprio";
    descricao = "Material da IBRAC. Todos os custos compõem o custo do lote. Resultado será avaliado pela economia vs LME.";
    icon = Package;
    colorClass = "border-success bg-success/5";
  } else if (isDono) {
    // Operação de terceiro
    cenario = 'operacao_terceiro';
    titulo = "Operação de Terceiro";
    descricao = `Material de ${dono.nome}. Custos serão abatidos do resultado e IBRAC cobra ${dono.taxa_operacao_pct || 0}% de comissão na venda.`;
    icon = Handshake;
    colorClass = "border-warning bg-warning/5";
  }

  if (!cenario) return null;

  const Icon = icon;

  return (
    <Card className={cn("border-2", colorClass)}>
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            cenario === 'proprio' && "bg-success/20",
            cenario === 'industrializacao' && "bg-info/20",
            cenario === 'operacao_terceiro' && "bg-warning/20"
          )}>
            <Icon className={cn(
              "h-5 w-5",
              cenario === 'proprio' && "text-success",
              cenario === 'industrializacao' && "text-info",
              cenario === 'operacao_terceiro' && "text-warning"
            )} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold">{titulo}</h4>
              <Badge variant="outline" className="text-[10px]">
                {cenario === 'proprio' && "Cenário 1"}
                {cenario === 'industrializacao' && "Cenário 2"}
                {cenario === 'operacao_terceiro' && "Cenário 3"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{descricao}</p>
          </div>
        </div>

        {cenario === 'operacao_terceiro' && (
          <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-muted-foreground">
              Na saída: Receita − Custos − Comissão = Repasse para {dono?.nome}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

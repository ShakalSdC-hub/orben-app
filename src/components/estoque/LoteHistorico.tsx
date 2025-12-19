import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, ChevronUp, History, MoveRight, UserRoundCog, Factory, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface LoteHistoricoProps {
  loteId: string;
  loteCodigo: string;
}

interface HistoricoItem {
  id: string;
  tipo: "local" | "dono" | "beneficiamento" | "entrada" | "saida";
  data: string;
  descricao: string;
  detalhe?: string;
  icon: React.ElementType;
  cor: string;
}

export function LoteHistorico({ loteId, loteCodigo }: LoteHistoricoProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch movimentações de local
  const { data: movimentacoes } = useQuery({
    queryKey: ["movimentacoes-lote", loteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentacoes")
        .select(`
          *,
          local_origem:locais_estoque!movimentacoes_local_origem_id_fkey(nome),
          local_destino:locais_estoque!movimentacoes_local_destino_id_fkey(nome)
        `)
        .eq("sublote_id", loteId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  // Fetch transferências de dono
  const { data: transferenciasDono } = useQuery({
    queryKey: ["transferencias-dono-lote", loteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transferencias_dono")
        .select(`
          *,
          dono_origem:donos_material!transferencias_dono_dono_origem_id_fkey(nome),
          dono_destino:donos_material!transferencias_dono_dono_destino_id_fkey(nome)
        `)
        .eq("sublote_id", loteId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  // Fetch beneficiamentos que incluem este lote
  const { data: beneficiamentosEntrada } = useQuery({
    queryKey: ["beneficiamentos-entrada-lote", loteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamento_itens_entrada")
        .select(`
          *,
          beneficiamento:beneficiamentos(
            codigo,
            data_inicio,
            data_fim,
            status,
            tipo_beneficiamento,
            processo:processos(nome)
          )
        `)
        .eq("sublote_id", loteId);
      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  // Fetch beneficiamentos que geraram este lote como saída
  const { data: beneficiamentosSaida } = useQuery({
    queryKey: ["beneficiamentos-saida-lote", loteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiamento_itens_saida")
        .select(`
          *,
          beneficiamento:beneficiamentos(
            codigo,
            data_inicio,
            data_fim,
            status,
            tipo_beneficiamento,
            processo:processos(nome)
          )
        `)
        .eq("sublote_gerado_id", loteId);
      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  // Combinar todos os históricos em uma lista unificada
  const historicoUnificado: HistoricoItem[] = [];

  // Movimentações de local
  movimentacoes?.forEach((mov) => {
    historicoUnificado.push({
      id: `mov-${mov.id}`,
      tipo: "local",
      data: mov.created_at,
      descricao: `Transferência de Local`,
      detalhe: `${mov.local_origem?.nome || "—"} → ${mov.local_destino?.nome || "—"}`,
      icon: MoveRight,
      cor: "text-blue-500",
    });
  });

  // Transferências de dono
  transferenciasDono?.forEach((trans) => {
    historicoUnificado.push({
      id: `dono-${trans.id}`,
      tipo: "dono",
      data: trans.created_at,
      descricao: `Transferência de Dono`,
      detalhe: `${trans.dono_origem?.nome || "IBRAC"} → ${trans.dono_destino?.nome || "IBRAC"}`,
      icon: UserRoundCog,
      cor: "text-purple-500",
    });
  });

  // Beneficiamentos (entrada)
  beneficiamentosEntrada?.forEach((item) => {
    if (item.beneficiamento) {
      const ben = item.beneficiamento as any;
      historicoUnificado.push({
        id: `ben-entrada-${item.id}`,
        tipo: "beneficiamento",
        data: ben.data_inicio || item.created_at,
        descricao: `Enviado p/ Beneficiamento`,
        detalhe: `${ben.codigo} - ${ben.processo?.nome || ben.tipo_beneficiamento}`,
        icon: Factory,
        cor: "text-orange-500",
      });
      if (ben.status === "finalizado" && ben.data_fim) {
        historicoUnificado.push({
          id: `ben-fim-${item.id}`,
          tipo: "beneficiamento",
          data: ben.data_fim,
          descricao: `Beneficiamento Finalizado`,
          detalhe: `${ben.codigo}`,
          icon: Factory,
          cor: "text-green-500",
        });
      }
    }
  });

  // Beneficiamentos (saída - origem do lote)
  beneficiamentosSaida?.forEach((item) => {
    if (item.beneficiamento) {
      const ben = item.beneficiamento as any;
      historicoUnificado.push({
        id: `ben-saida-${item.id}`,
        tipo: "saida",
        data: ben.data_fim || item.created_at,
        descricao: `Gerado por Beneficiamento`,
        detalhe: `Origem: ${ben.codigo}`,
        icon: ArrowRight,
        cor: "text-emerald-500",
      });
    }
  });

  // Ordenar por data (mais recente primeiro)
  historicoUnificado.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const hasHistorico = historicoUnificado.length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-xs text-muted-foreground hover:text-foreground"
        >
          <span className="flex items-center gap-1">
            <History className="h-3 w-3" />
            Histórico
            {hasHistorico && isOpen && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                {historicoUnificado.length}
              </Badge>
            )}
          </span>
          {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        {!isOpen ? null : historicoUnificado.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            Nenhuma movimentação registrada
          </p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {historicoUnificado.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2 text-xs p-2 rounded-lg bg-muted/50"
              >
                <item.icon className={cn("h-3.5 w-3.5 mt-0.5 flex-shrink-0", item.cor)} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{item.descricao}</p>
                  {item.detalhe && (
                    <p className="text-muted-foreground truncate">{item.detalhe}</p>
                  )}
                  <p className="text-muted-foreground">
                    {format(new Date(item.data), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

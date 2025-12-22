import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, ChevronUp, History, MoveRight, UserRoundCog, Factory, ArrowRight, PackagePlus, PackageMinus, Truck } from "lucide-react";
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
  tipo: "local" | "dono" | "beneficiamento_entrada" | "beneficiamento_saida" | "entrada" | "saida";
  data: string;
  descricao: string;
  detalhe?: string;
  icon: React.ElementType;
  cor: string;
}

export function LoteHistorico({ loteId, loteCodigo }: LoteHistoricoProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch sublote data para pegar entrada_id
  const { data: sublote } = useQuery({
    queryKey: ["sublote-historico", loteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sublotes")
        .select(`
          *,
          entrada:entradas(
            codigo,
            data_entrada,
            tipo_material,
            peso_liquido_kg,
            fornecedor:fornecedores(razao_social),
            parceiro:parceiros(razao_social)
          )
        `)
        .eq("id", loteId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

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

  // Fetch beneficiamentos que incluem este lote (entrada)
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

  // Fetch saídas (vendas/retornos) que incluem este lote
  const { data: saidaItens } = useQuery({
    queryKey: ["saida-itens-lote", loteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saida_itens")
        .select(`
          *,
          saida:saidas(
            codigo,
            data_saida,
            tipo_saida,
            status,
            cliente:clientes(razao_social),
            transportadora:parceiros(razao_social)
          )
        `)
        .eq("sublote_id", loteId);
      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  // Combinar todos os históricos em uma lista unificada
  const historicoUnificado: HistoricoItem[] = [];

  // Entrada (origem do material)
  if (sublote?.entrada) {
    const ent = sublote.entrada as any;
    const origem = ent.fornecedor?.razao_social || ent.parceiro?.razao_social || "—";
    historicoUnificado.push({
      id: `entrada-${sublote.entrada_id}`,
      tipo: "entrada",
      data: ent.data_entrada,
      descricao: `Entrada de Material`,
      detalhe: `${ent.codigo} - ${ent.tipo_material} (${origem})`,
      icon: PackagePlus,
      cor: "text-green-600",
    });
  }

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

  // Beneficiamentos (entrada - lote enviado para beneficiamento)
  beneficiamentosEntrada?.forEach((item) => {
    if (item.beneficiamento) {
      const ben = item.beneficiamento as any;
      historicoUnificado.push({
        id: `ben-entrada-${item.id}`,
        tipo: "beneficiamento_entrada",
        data: ben.data_inicio || item.created_at,
        descricao: `Enviado p/ Beneficiamento`,
        detalhe: `${ben.codigo} - ${ben.processo?.nome || ben.tipo_beneficiamento}`,
        icon: Factory,
        cor: "text-orange-500",
      });
      if (ben.status === "finalizado" && ben.data_fim) {
        historicoUnificado.push({
          id: `ben-fim-${item.id}`,
          tipo: "beneficiamento_entrada",
          data: ben.data_fim,
          descricao: `Beneficiamento Finalizado`,
          detalhe: `${ben.codigo}`,
          icon: Factory,
          cor: "text-green-500",
        });
      }
    }
  });

  // Beneficiamentos (saída - lote gerado por beneficiamento)
  beneficiamentosSaida?.forEach((item) => {
    if (item.beneficiamento) {
      const ben = item.beneficiamento as any;
      historicoUnificado.push({
        id: `ben-saida-${item.id}`,
        tipo: "beneficiamento_saida",
        data: ben.data_fim || item.created_at,
        descricao: `Gerado por Beneficiamento`,
        detalhe: `Origem: ${ben.codigo} - ${ben.processo?.nome || ben.tipo_beneficiamento}`,
        icon: ArrowRight,
        cor: "text-emerald-500",
      });
    }
  });

  // Saídas (vendas/retornos)
  saidaItens?.forEach((item) => {
    if (item.saida) {
      const saida = item.saida as any;
      const tipoLabel = saida.tipo_saida === 'venda' ? 'Venda' : 
                        saida.tipo_saida === 'retorno_industrializacao' ? 'Retorno Industrialização' : 
                        saida.tipo_saida;
      historicoUnificado.push({
        id: `saida-${item.id}`,
        tipo: "saida",
        data: saida.data_saida,
        descricao: `Saída - ${tipoLabel}`,
        detalhe: `${saida.codigo}${saida.cliente?.razao_social ? ` → ${saida.cliente.razao_social}` : ''}`,
        icon: saida.transportadora ? Truck : PackageMinus,
        cor: "text-red-500",
      });
    }
  });

  // Ordenar por data (mais antigo primeiro para ordem cronológica)
  historicoUnificado.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

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
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {historicoUnificado.map((item, index) => (
              <div
                key={item.id}
                className="flex items-start gap-2 text-xs p-2 rounded-lg bg-muted/50 relative"
              >
                {/* Linha conectora */}
                {index < historicoUnificado.length - 1 && (
                  <div className="absolute left-[1.1rem] top-8 w-0.5 h-[calc(100%-0.5rem)] bg-border" />
                )}
                <div className={cn("h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 bg-background border", item.cor.replace("text-", "border-"))}>
                  <item.icon className={cn("h-3 w-3", item.cor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{item.descricao}</p>
                  {item.detalhe && (
                    <p className="text-muted-foreground truncate">{item.detalhe}</p>
                  )}
                  <p className="text-muted-foreground">
                    {format(new Date(item.data), "dd/MM/yyyy", { locale: ptBR })}
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

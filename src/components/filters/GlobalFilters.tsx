import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface GlobalFiltersProps {
  showParceiro?: boolean;
  showDono?: boolean;
  selectedParceiro: string | null;
  selectedDono: string | null;
  onParceiroChange: (value: string | null) => void;
  onDonoChange: (value: string | null) => void;
}

export function GlobalFilters({
  showParceiro = true,
  showDono = true,
  selectedParceiro,
  selectedDono,
  onParceiroChange,
  onDonoChange,
}: GlobalFiltersProps) {
  // Fetch parceiros (inclui fornecedores, clientes e transportadoras)
  const { data: parceiros } = useQuery({
    queryKey: ["parceiros-filtro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parceiros")
        .select("id, razao_social, nome_fantasia, is_fornecedor, is_cliente, is_transportadora, tipo")
        .eq("ativo", true)
        .order("razao_social");
      if (error) throw error;
      return data;
    },
    enabled: showParceiro,
  });

  // Fetch donos (parceiros com tipo DONO)
  const { data: donos } = useQuery({
    queryKey: ["donos-filtro"],
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
    enabled: showDono,
  });

  return (
    <div className="flex gap-2 flex-wrap">
      {showParceiro && (
        <Select
          value={selectedParceiro || "all"}
          onValueChange={(v) => onParceiroChange(v === "all" ? null : v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Parceiro/Fornecedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Parceiros</SelectItem>
            {parceiros?.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nome_fantasia || p.razao_social}
                {p.is_fornecedor && " (F)"}
                {p.is_cliente && " (C)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showDono && (
        <Select
          value={selectedDono || "all"}
          onValueChange={(v) => onDonoChange(v === "all" ? null : v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Dono" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Donos</SelectItem>
            <SelectItem value="ibrac">IBRAC (Próprio)</SelectItem>
            {donos?.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.nome_fantasia || d.razao_social}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

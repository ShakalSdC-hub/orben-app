-- Tabela para armazenar dados consolidados por tipo de produto em cada beneficiamento
CREATE TABLE public.beneficiamento_produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiamento_id uuid NOT NULL REFERENCES beneficiamentos(id) ON DELETE CASCADE,
  tipo_produto_id uuid REFERENCES tipos_produto(id),
  peso_entrada_kg numeric NOT NULL DEFAULT 0,
  perda_padrao_pct numeric DEFAULT 0,
  perda_cobrada_pct numeric DEFAULT 0,
  peso_saida_estimado_kg numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Tabela para rastrear documentos de entrada usados em cada beneficiamento (para custo financeiro)
CREATE TABLE public.beneficiamento_entradas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiamento_id uuid NOT NULL REFERENCES beneficiamentos(id) ON DELETE CASCADE,
  entrada_id uuid REFERENCES entradas(id),
  valor_documento numeric NOT NULL DEFAULT 0,
  taxa_financeira_pct numeric DEFAULT 0,
  taxa_financeira_valor numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Adicionar tipo_produto_id na tabela de itens de entrada para rastreabilidade
ALTER TABLE beneficiamento_itens_entrada 
  ADD COLUMN IF NOT EXISTS tipo_produto_id uuid REFERENCES tipos_produto(id);

-- Enable RLS
ALTER TABLE public.beneficiamento_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiamento_entradas ENABLE ROW LEVEL SECURITY;

-- Policies para beneficiamento_produtos
CREATE POLICY "Admin and Operacao manage benef_produtos" 
ON public.beneficiamento_produtos 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operacao'::app_role));

CREATE POLICY "Authenticated roles can view benef_produtos" 
ON public.beneficiamento_produtos 
FOR SELECT 
USING ((auth.uid() IS NOT NULL) AND has_any_role(auth.uid()));

-- Policies para beneficiamento_entradas
CREATE POLICY "Admin and Operacao manage benef_entradas" 
ON public.beneficiamento_entradas 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operacao'::app_role));

CREATE POLICY "Authenticated roles can view benef_entradas" 
ON public.beneficiamento_entradas 
FOR SELECT 
USING ((auth.uid() IS NOT NULL) AND has_any_role(auth.uid()));
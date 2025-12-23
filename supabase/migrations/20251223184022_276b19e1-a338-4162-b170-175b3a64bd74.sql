-- Criar tabela simulacoes_lme para histórico de simulações
CREATE TABLE public.simulacoes_lme (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  data_simulacao DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Parâmetros de entrada
  cobre_usd_t NUMERIC NOT NULL,
  dolar_brl NUMERIC NOT NULL,
  fator_imposto NUMERIC,
  pct_lme_negociada NUMERIC,
  prazo_dias INTEGER,
  
  -- Resultados LME Vergalhão
  lme_semana_brl_kg NUMERIC,
  preco_com_imposto NUMERIC,
  preco_a_vista NUMERIC,
  preco_a_prazo NUMERIC,
  
  -- Resultados Sucata
  custo_sucata_kg NUMERIC,
  economia_pct NUMERIC,
  resultado TEXT
);

-- Enable RLS
ALTER TABLE public.simulacoes_lme ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Authenticated can view simulacoes" 
ON public.simulacoes_lme 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));

CREATE POLICY "Admin and Operacao can manage simulacoes" 
ON public.simulacoes_lme 
FOR ALL 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));
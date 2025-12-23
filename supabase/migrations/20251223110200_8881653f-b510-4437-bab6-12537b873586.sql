-- Create table for weekly LME configuration with taxes and financial costs
CREATE TABLE public.lme_semana_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ano INTEGER NOT NULL,
  semana INTEGER NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  lme_cobre_usd_t NUMERIC NOT NULL DEFAULT 0,
  dolar_brl NUMERIC NOT NULL DEFAULT 0,
  lme_base_brl_kg NUMERIC GENERATED ALWAYS AS (lme_cobre_usd_t * dolar_brl / 1000) STORED,
  icms_pct NUMERIC NOT NULL DEFAULT 0,
  pis_cofins_pct NUMERIC NOT NULL DEFAULT 0,
  taxa_financeira_pct NUMERIC NOT NULL DEFAULT 0,
  fator_total NUMERIC GENERATED ALWAYS AS (
    (1 + (icms_pct / 100)) * (1 + (pis_cofins_pct / 100)) * (1 + (taxa_financeira_pct / 100))
  ) STORED,
  lme_final_brl_kg NUMERIC GENERATED ALWAYS AS (
    (lme_cobre_usd_t * dolar_brl / 1000) * (1 + (icms_pct / 100)) * (1 + (pis_cofins_pct / 100)) * (1 + (taxa_financeira_pct / 100))
  ) STORED,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(ano, semana)
);

-- Enable RLS
ALTER TABLE public.lme_semana_config ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admin and Financeiro manage lme_semana_config"
ON public.lme_semana_config FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Authenticated roles can view lme_semana_config"
ON public.lme_semana_config FOR SELECT
USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));

-- Update trigger
CREATE TRIGGER update_lme_semana_config_updated_at
BEFORE UPDATE ON public.lme_semana_config
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert historical data based on the Excel (weeks 47 and 50)
INSERT INTO public.lme_semana_config (ano, semana, data_inicio, data_fim, lme_cobre_usd_t, dolar_brl, icms_pct, pis_cofins_pct, taxa_financeira_pct, observacoes)
VALUES 
  (2025, 47, '2025-11-17', '2025-11-23', 9100, 5.80, 7.0, 1.65, 4.3, 'Semana 47/2025 - LME base 55.57 R$/kg'),
  (2025, 50, '2025-12-08', '2025-12-14', 9200, 6.10, 7.0, 1.65, 4.3, 'Semana 50/2025 - LME base 64.17 R$/kg');
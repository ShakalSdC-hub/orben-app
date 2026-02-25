
ALTER TABLE public.vendas_intermediacao
  ADD COLUMN IF NOT EXISTS venda_pela_ibrac boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS comissao_ibrac_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pis_cofins_pct numeric DEFAULT 9.25,
  ADD COLUMN IF NOT EXISTS pis_cofins_rs numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS icms_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS icms_rs numeric DEFAULT 0;

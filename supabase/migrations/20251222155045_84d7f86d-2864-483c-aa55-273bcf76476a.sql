-- Add loss percentage per product type
ALTER TABLE public.tipos_produto 
ADD COLUMN IF NOT EXISTS perda_beneficiamento_pct numeric DEFAULT 3;

-- Add comment for clarity
COMMENT ON COLUMN public.tipos_produto.perda_beneficiamento_pct IS 'Percentual de perda padrão no beneficiamento para este tipo de produto';
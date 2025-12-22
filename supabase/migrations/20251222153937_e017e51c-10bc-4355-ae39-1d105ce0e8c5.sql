-- Remove the fornecedor_id column from entradas table (no longer used, system uses parceiro_id)
ALTER TABLE public.entradas DROP COLUMN IF EXISTS fornecedor_id;
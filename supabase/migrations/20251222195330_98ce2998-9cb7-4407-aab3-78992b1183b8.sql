-- Adicionar campo para referência LME nos beneficiamentos
ALTER TABLE public.beneficiamentos
ADD COLUMN IF NOT EXISTS lme_referencia_kg numeric DEFAULT NULL;
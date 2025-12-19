-- Add columns to store weekly averages from Excel import
ALTER TABLE public.historico_lme 
ADD COLUMN IF NOT EXISTS is_media_semanal boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS semana_numero integer;
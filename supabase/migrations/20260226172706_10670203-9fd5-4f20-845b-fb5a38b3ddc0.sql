ALTER TABLE public.compras_intermediacao 
ADD COLUMN perda_mel_pct numeric DEFAULT 0.05,
ADD COLUMN perda_mista_pct numeric DEFAULT 0.10;
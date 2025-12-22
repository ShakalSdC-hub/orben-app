-- Ajustar unicidade para permitir 1 registro diário + 1 registro de média semanal na mesma data
-- (mantém integridade e evita conflito no insert do diário quando existir a média)

ALTER TABLE public.historico_lme
DROP CONSTRAINT IF EXISTS historico_lme_data_key;

ALTER TABLE public.historico_lme
ADD CONSTRAINT historico_lme_data_is_media_key UNIQUE (data, is_media_semanal);

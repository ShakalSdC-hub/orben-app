-- Calcular e inserir média da Semana 2/2026 (06-10 Jan) baseada nos dados disponíveis da API
-- Dados disponíveis: 06/01 e 08/01 (dias úteis dessa semana)
INSERT INTO lme_semana_config (
  ano, semana, data_inicio, data_fim, 
  lme_cobre_usd_t, dolar_brl, fator_imposto,
  lme_base_brl_kg,
  icms_pct, pis_cofins_pct, taxa_financeira_pct, observacoes
)
SELECT 
  2026 as ano,
  2 as semana,
  '2026-01-06'::date as data_inicio,
  '2026-01-10'::date as data_fim,
  AVG(cobre_usd_t) as lme_cobre_usd_t,
  AVG(dolar_brl) as dolar_brl,
  0.7986 as fator_imposto,
  AVG(cobre_brl_kg) as lme_base_brl_kg,
  0 as icms_pct,
  0 as pis_cofins_pct, 
  0 as taxa_financeira_pct,
  'Média calculada dos dias úteis disponíveis (API)' as observacoes
FROM historico_lme
WHERE data >= '2026-01-06' AND data <= '2026-01-10'
  AND is_media_semanal = false
  AND cobre_usd_t IS NOT NULL
HAVING COUNT(*) > 0
ON CONFLICT (ano, semana) DO UPDATE SET
  lme_cobre_usd_t = EXCLUDED.lme_cobre_usd_t,
  dolar_brl = EXCLUDED.dolar_brl,
  lme_base_brl_kg = EXCLUDED.lme_base_brl_kg,
  updated_at = now();
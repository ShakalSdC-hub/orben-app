-- 1. Recalcular valores existentes (lme_final_brl_kg é calculado automaticamente pelo trigger)
UPDATE lme_semana_config
SET 
  lme_base_brl_kg = (lme_cobre_usd_t * dolar_brl) / 1000,
  updated_at = now();

-- 2. Inserir semanas faltantes do historico_lme (medias semanais)
-- Não incluir lme_final_brl_kg pois é gerado automaticamente pelo trigger fn_calc_lme_final_brl_kg
INSERT INTO lme_semana_config (
  ano, semana, data_inicio, data_fim, 
  lme_cobre_usd_t, dolar_brl, fator_imposto,
  lme_base_brl_kg,
  icms_pct, pis_cofins_pct, taxa_financeira_pct, observacoes
)
SELECT 
  EXTRACT(YEAR FROM h.data)::int as ano,
  h.semana_numero as semana,
  (h.data - EXTRACT(DOW FROM h.data)::int + 1)::date as data_inicio,
  (h.data - EXTRACT(DOW FROM h.data)::int + 5)::date as data_fim,
  h.cobre_usd_t as lme_cobre_usd_t,
  h.dolar_brl,
  0.7986 as fator_imposto,
  h.cobre_brl_kg as lme_base_brl_kg,
  0 as icms_pct,
  0 as pis_cofins_pct, 
  0 as taxa_financeira_pct,
  'Importado automaticamente do historico LME (media dias uteis)' as observacoes
FROM historico_lme h
WHERE h.is_media_semanal = true
  AND h.semana_numero IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM lme_semana_config c 
    WHERE c.ano = EXTRACT(YEAR FROM h.data)::int 
      AND c.semana = h.semana_numero
  );
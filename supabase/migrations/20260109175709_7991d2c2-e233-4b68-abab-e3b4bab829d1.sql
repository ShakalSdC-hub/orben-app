-- Corrigir Semana 2/2026 com valores oficiais da Shockmetais
UPDATE lme_semana_config
SET 
  lme_cobre_usd_t = 13048.70,
  dolar_brl = 5.4052,
  lme_base_brl_kg = (13048.70 * 5.4052) / 1000,
  data_inicio = '2026-01-05',
  data_fim = '2026-01-09',
  observacoes = 'Média oficial Semana 02/2026 (05-09 Jan) - Shockmetais',
  updated_at = now()
WHERE ano = 2026 AND semana = 2;
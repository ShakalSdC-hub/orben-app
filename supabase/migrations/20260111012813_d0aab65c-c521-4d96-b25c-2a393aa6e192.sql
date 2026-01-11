-- Função para sincronizar historico_lme com lme_semana_config
CREATE OR REPLACE FUNCTION sync_lme_semana_config()
RETURNS TRIGGER AS $$
DECLARE
  v_ano INT;
  v_semana INT;
  v_data_inicio DATE;
  v_data_fim DATE;
  v_fator_imposto NUMERIC := 0.7986;
BEGIN
  -- Só sincroniza se for média semanal
  IF NEW.is_media_semanal = true AND NEW.semana_numero IS NOT NULL THEN
    -- Calcular ano e semana
    v_ano := EXTRACT(ISOYEAR FROM NEW.data)::INT;
    v_semana := NEW.semana_numero;
    
    -- Calcular data_inicio (segunda-feira) e data_fim (sexta-feira) da semana
    v_data_inicio := (NEW.data - EXTRACT(DOW FROM NEW.data)::INT + 1)::DATE;
    v_data_fim := (NEW.data - EXTRACT(DOW FROM NEW.data)::INT + 5)::DATE;
    
    -- Inserir ou atualizar lme_semana_config (sem lme_final_brl_kg que é GENERATED)
    INSERT INTO lme_semana_config (
      ano,
      semana,
      data_inicio,
      data_fim,
      lme_cobre_usd_t,
      dolar_brl,
      fator_imposto,
      lme_base_brl_kg,
      icms_pct,
      pis_cofins_pct,
      taxa_financeira_pct,
      observacoes
    ) VALUES (
      v_ano,
      v_semana,
      v_data_inicio,
      v_data_fim,
      NEW.cobre_usd_t,
      NEW.dolar_brl,
      v_fator_imposto,
      NEW.cobre_brl_kg,
      0,
      0,
      0,
      'Sincronizado automaticamente do histórico LME'
    )
    ON CONFLICT (ano, semana) 
    DO UPDATE SET
      lme_cobre_usd_t = EXCLUDED.lme_cobre_usd_t,
      dolar_brl = EXCLUDED.dolar_brl,
      lme_base_brl_kg = EXCLUDED.lme_base_brl_kg,
      data_inicio = EXCLUDED.data_inicio,
      data_fim = EXCLUDED.data_fim,
      updated_at = NOW(),
      observacoes = CASE 
        WHEN lme_semana_config.observacoes LIKE '%manual%' OR lme_semana_config.observacoes LIKE '%oficial%' 
        THEN lme_semana_config.observacoes 
        ELSE 'Sincronizado automaticamente do histórico LME'
      END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para sincronização automática
DROP TRIGGER IF EXISTS trigger_sync_lme_semana_config ON historico_lme;
CREATE TRIGGER trigger_sync_lme_semana_config
  AFTER INSERT OR UPDATE ON historico_lme
  FOR EACH ROW
  EXECUTE FUNCTION sync_lme_semana_config();

-- Adicionar constraint unique para evitar duplicatas (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lme_semana_config_ano_semana_key'
  ) THEN
    ALTER TABLE lme_semana_config ADD CONSTRAINT lme_semana_config_ano_semana_key UNIQUE (ano, semana);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Sincronizar dados existentes que ainda não estão em lme_semana_config
INSERT INTO lme_semana_config (
  ano, semana, data_inicio, data_fim,
  lme_cobre_usd_t, dolar_brl, fator_imposto,
  lme_base_brl_kg,
  icms_pct, pis_cofins_pct, taxa_financeira_pct, observacoes
)
SELECT 
  EXTRACT(ISOYEAR FROM h.data)::INT as ano,
  h.semana_numero as semana,
  (h.data - EXTRACT(DOW FROM h.data)::INT + 1)::DATE as data_inicio,
  (h.data - EXTRACT(DOW FROM h.data)::INT + 5)::DATE as data_fim,
  h.cobre_usd_t as lme_cobre_usd_t,
  h.dolar_brl,
  0.7986 as fator_imposto,
  h.cobre_brl_kg as lme_base_brl_kg,
  0 as icms_pct,
  0 as pis_cofins_pct,
  0 as taxa_financeira_pct,
  'Sincronizado automaticamente do histórico LME' as observacoes
FROM historico_lme h
WHERE h.is_media_semanal = true
  AND h.semana_numero IS NOT NULL
ON CONFLICT (ano, semana) DO NOTHING;
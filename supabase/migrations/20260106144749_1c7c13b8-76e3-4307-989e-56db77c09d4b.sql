-- ============================================
-- MIGRAÇÃO: Melhorias nos Cenários 1, 2, 3, Financeiro
-- ============================================

-- ============================================
-- 1. Cenário 2 - Terceiros: Perdas no Beneficiamento
-- ============================================
ALTER TABLE beneficiamentos_terceiros 
  ADD COLUMN IF NOT EXISTS perda_mel_pct numeric(10,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS perda_mista_pct numeric(10,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kg_mel_entrada numeric(14,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kg_mista_entrada numeric(14,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS perda_total_kg numeric(14,4) DEFAULT 0;

-- ============================================
-- 2. Cenário 2 - Terceiros: Vincular Saída ao Beneficiamento
-- ============================================
ALTER TABLE saidas_terceiros 
  ADD COLUMN IF NOT EXISTS beneficiamento_id uuid REFERENCES beneficiamentos_terceiros(id);

-- ============================================
-- 3. Cenário 2 - Terceiros: Pagamento em Cobre
-- ============================================
ALTER TABLE cobrancas_servico_terceiros 
  ADD COLUMN IF NOT EXISTS tipo_pagamento text DEFAULT 'DINHEIRO',
  ADD COLUMN IF NOT EXISTS kg_cobre_recebido numeric(14,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_ref_cobre_rkg numeric(10,2) DEFAULT 0;

-- ============================================
-- 4. Cenário 3 - Intermediação: Tipo Material na Compra
-- ============================================
ALTER TABLE compras_intermediacao 
  ADD COLUMN IF NOT EXISTS tipo_material text DEFAULT 'MEL';

-- ============================================
-- 5. Cenário 3 - Intermediação: Perdas no Beneficiamento
-- ============================================
ALTER TABLE beneficiamentos_intermediacao 
  ADD COLUMN IF NOT EXISTS kg_mel_entrada numeric(14,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kg_mista_entrada numeric(14,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS perda_mel_pct numeric(10,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS perda_mista_pct numeric(10,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS perda_total_kg numeric(14,4) DEFAULT 0;

-- ============================================
-- 6. Financeiro: Fator Imposto no LME Semana
-- ============================================
ALTER TABLE lme_semana_config 
  ADD COLUMN IF NOT EXISTS fator_imposto numeric(10,6) DEFAULT 0.7986,
  ADD COLUMN IF NOT EXISTS lme_base_brl_kg numeric(14,6);

-- ============================================
-- 7. Atualizar função de cálculo do LME Final para incluir fator imposto
-- ============================================
CREATE OR REPLACE FUNCTION fn_calc_lme_final_brl_kg()
RETURNS TRIGGER AS $$
DECLARE
  v_lme_base numeric;
  v_lme_final numeric;
  v_fator_imposto numeric;
BEGIN
  -- Calcular LME base: (LME USD/t * Dólar) / 1000
  v_lme_base := (NEW.lme_cobre_usd_t * NEW.dolar_brl) / 1000;
  
  -- Usar fator imposto se definido, senão usar cálculo com taxas
  v_fator_imposto := COALESCE(NEW.fator_imposto, 0.7986);
  
  IF v_fator_imposto > 0 AND v_fator_imposto < 1 THEN
    -- Fórmula: LME base / fator_imposto (0.7986 = 1 - impostos)
    v_lme_final := v_lme_base / v_fator_imposto;
  ELSE
    -- Fórmula tradicional com taxas percentuais
    v_lme_final := v_lme_base 
      * (1 + COALESCE(NEW.icms_pct, 0) / 100) 
      * (1 + COALESCE(NEW.pis_cofins_pct, 0) / 100) 
      * (1 + COALESCE(NEW.taxa_financeira_pct, 0) / 100);
  END IF;
  
  NEW.lme_base_brl_kg := v_lme_base;
  NEW.lme_final_brl_kg := v_lme_final;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. Atualizar função de alocação C1 para incluir todos os custos
-- ============================================
CREATE OR REPLACE FUNCTION fn_allocate_beneficiamento_fifo_c1()
RETURNS TRIGGER AS $$
DECLARE
  entrada RECORD;
  kg_restante numeric;
  kg_alocar numeric;
  total_custo_pre numeric := 0;
  total_kg_alocado numeric := 0;
  custo_benef numeric := 0;
BEGIN
  -- Se não há kg_retornado, não fazer nada
  IF NEW.kg_retornado IS NULL OR NEW.kg_retornado <= 0 THEN
    RETURN NEW;
  END IF;
  
  -- Calcular custos de beneficiamento
  custo_benef := COALESCE(
    CASE WHEN NEW.mo_benef_mode = 'RKG' THEN NEW.mo_benef_val * NEW.kg_retornado ELSE NEW.mo_benef_val END, 0
  ) + COALESCE(
    CASE WHEN NEW.frete_ida_mode = 'RKG' THEN NEW.frete_ida_val * NEW.kg_retornado ELSE NEW.frete_ida_val END, 0
  ) + COALESCE(
    CASE WHEN NEW.frete_volta_mode = 'RKG' THEN NEW.frete_volta_val * NEW.kg_retornado ELSE NEW.frete_volta_val END, 0
  );
  
  NEW.custos_benef_total_rs := custo_benef;
  
  -- Buscar entradas com kg disponível (FIFO)
  kg_restante := NEW.kg_retornado;
  
  FOR entrada IN
    SELECT e.id, e.kg_liquido_disponivel, e.custo_unit_pre_rkg, e.custos_pre_total_rs, e.kg_liquido_total
    FROM entradas_c1 e
    WHERE e.operacao_id = NEW.operacao_id
      AND e.is_deleted = false
      AND e.kg_liquido_disponivel > 0
    ORDER BY e.dt_recebimento ASC, e.created_at ASC
  LOOP
    EXIT WHEN kg_restante <= 0;
    
    -- Determinar quanto alocar desta entrada
    kg_alocar := LEAST(entrada.kg_liquido_disponivel, kg_restante);
    
    -- Calcular custo proporcional desta entrada
    -- Usar custo unitário pré (inclui valor ticket + todos custos pré / kg líquido)
    total_custo_pre := total_custo_pre + (kg_alocar * COALESCE(entrada.custo_unit_pre_rkg, 0));
    total_kg_alocado := total_kg_alocado + kg_alocar;
    
    -- Registrar alocação
    INSERT INTO benef_entrada_alocacoes (beneficiamento_id, entrada_id, kg_alocado)
    VALUES (NEW.id, entrada.id, kg_alocar);
    
    -- Atualizar kg disponível na entrada
    UPDATE entradas_c1
    SET kg_liquido_disponivel = kg_liquido_disponivel - kg_alocar,
        updated_at = now()
    WHERE id = entrada.id;
    
    kg_restante := kg_restante - kg_alocar;
  END LOOP;
  
  -- Calcular custos reais totais e por kg
  NEW.custo_pre_alocado_rs := total_custo_pre;
  NEW.custo_real_total_rs := total_custo_pre + custo_benef;
  
  IF NEW.kg_retornado > 0 THEN
    NEW.custo_real_rkg := NEW.custo_real_total_rs / NEW.kg_retornado;
  ELSE
    NEW.custo_real_rkg := 0;
  END IF;
  
  NEW.kg_disponivel := NEW.kg_retornado;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. Criar função para calcular perda no beneficiamento terceiros
-- ============================================
CREATE OR REPLACE FUNCTION fn_calc_perda_benef_terceiros()
RETURNS TRIGGER AS $$
DECLARE
  perda_mel numeric := 0;
  perda_mista numeric := 0;
BEGIN
  -- Calcular perdas
  perda_mel := COALESCE(NEW.kg_mel_entrada, 0) * COALESCE(NEW.perda_mel_pct, 0);
  perda_mista := COALESCE(NEW.kg_mista_entrada, 0) * COALESCE(NEW.perda_mista_pct, 0);
  
  NEW.perda_total_kg := perda_mel + perda_mista;
  
  -- kg_retornado já é informado pelo usuário
  -- kg_disponivel_cliente é calculado para controle de devolução
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calc_perda_benef_terceiros
BEFORE INSERT OR UPDATE ON beneficiamentos_terceiros
FOR EACH ROW
EXECUTE FUNCTION fn_calc_perda_benef_terceiros();

-- ============================================
-- 10. Criar função para calcular perda no beneficiamento intermediação
-- ============================================
CREATE OR REPLACE FUNCTION fn_calc_perda_benef_interm()
RETURNS TRIGGER AS $$
DECLARE
  perda_mel numeric := 0;
  perda_mista numeric := 0;
BEGIN
  -- Calcular perdas
  perda_mel := COALESCE(NEW.kg_mel_entrada, 0) * COALESCE(NEW.perda_mel_pct, 0);
  perda_mista := COALESCE(NEW.kg_mista_entrada, 0) * COALESCE(NEW.perda_mista_pct, 0);
  
  NEW.perda_total_kg := perda_mel + perda_mista;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calc_perda_benef_interm
BEFORE INSERT OR UPDATE ON beneficiamentos_intermediacao
FOR EACH ROW
EXECUTE FUNCTION fn_calc_perda_benef_interm();
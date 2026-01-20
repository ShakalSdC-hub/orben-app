-- ============================================================
-- CORREÇÃO: Trigger FIFO C1 e campos de perda em beneficiamentos_c1
-- ============================================================

-- 1. Adicionar campos de perda na tabela beneficiamentos_c1
ALTER TABLE public.beneficiamentos_c1 
ADD COLUMN IF NOT EXISTS kg_mel_entrada numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS kg_mista_entrada numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS perda_mel_pct numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS perda_mista_pct numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS kg_perda_total numeric DEFAULT 0;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.beneficiamentos_c1.kg_mel_entrada IS 'Kg de cobre MEL que entrou no beneficiamento';
COMMENT ON COLUMN public.beneficiamentos_c1.kg_mista_entrada IS 'Kg de cobre Mista que entrou no beneficiamento';
COMMENT ON COLUMN public.beneficiamentos_c1.perda_mel_pct IS 'Percentual de perda do cobre MEL (decimal, ex: 0.03 = 3%)';
COMMENT ON COLUMN public.beneficiamentos_c1.perda_mista_pct IS 'Percentual de perda do cobre Mista (decimal, ex: 0.08 = 8%)';
COMMENT ON COLUMN public.beneficiamentos_c1.kg_perda_total IS 'Total de kg perdido no beneficiamento';

-- 2. Corrigir o trigger FIFO para calcular custos corretamente
CREATE OR REPLACE FUNCTION public.fn_allocate_beneficiamento_fifo_c1()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  restante numeric;
  v_entrada RECORD;
  alocar numeric;
  total_custo_pre_alocado numeric := 0;
  total_kg_alocado numeric := 0;
  custo_benef numeric := 0;
BEGIN
  -- Calcular custos de beneficiamento primeiro
  custo_benef := COALESCE(
    CASE WHEN NEW.mo_benef_mode = 'RKG' THEN NEW.mo_benef_val * NEW.kg_retornado ELSE NEW.mo_benef_val END, 0
  ) + COALESCE(
    CASE WHEN NEW.frete_ida_mode = 'RKG' THEN NEW.frete_ida_val * NEW.kg_retornado ELSE NEW.frete_ida_val END, 0
  ) + COALESCE(
    CASE WHEN NEW.frete_volta_mode = 'RKG' THEN NEW.frete_volta_val * NEW.kg_retornado ELSE NEW.frete_volta_val END, 0
  );
  
  -- Atualizar custos de beneficiamento no próprio registro (usando UPDATE direto)
  UPDATE public.beneficiamentos_c1
  SET custos_benef_total_rs = custo_benef
  WHERE id = NEW.id;

  restante := NEW.kg_retornado;
  
  -- Iterar entradas da operação por created_at asc (mais antigas primeiro - FIFO)
  FOR v_entrada IN 
    SELECT id, kg_liquido_disponivel, custo_unit_pre_rkg
    FROM public.entradas_c1
    WHERE operacao_id = NEW.operacao_id
      AND is_deleted = false
      AND kg_liquido_disponivel > 0
    ORDER BY created_at ASC
  LOOP
    EXIT WHEN restante <= 0;
    
    alocar := LEAST(restante, v_entrada.kg_liquido_disponivel);
    
    -- Inserir alocação
    INSERT INTO public.benef_entrada_alocacoes (beneficiamento_id, entrada_id, kg_alocado)
    VALUES (NEW.id, v_entrada.id, alocar);
    
    -- Atualizar entrada (diminuir disponível)
    UPDATE public.entradas_c1
    SET kg_liquido_disponivel = kg_liquido_disponivel - alocar
    WHERE id = v_entrada.id;
    
    -- Acumular custo PRÉ alocado
    total_custo_pre_alocado := total_custo_pre_alocado + (alocar * COALESCE(v_entrada.custo_unit_pre_rkg, 0));
    total_kg_alocado := total_kg_alocado + alocar;
    
    restante := restante - alocar;
  END LOOP;
  
  -- Se restante > 0, erro
  IF restante > 0 THEN
    RAISE EXCEPTION 'Beneficiamento maior que saldo disponível nas entradas. Faltam % kg', restante;
  END IF;
  
  -- Atualizar beneficiamento com custos calculados
  -- Custo Real = Custo Pré (material) + Custos Beneficiamento (MO + fretes)
  -- Custo Real/kg = Custo Real Total / kg_retornado
  UPDATE public.beneficiamentos_c1
  SET custo_pre_alocado_rs = total_custo_pre_alocado,
      custo_real_total_rs = total_custo_pre_alocado + custo_benef,
      custo_real_rkg = (total_custo_pre_alocado + custo_benef) / NULLIF(NEW.kg_retornado, 0),
      kg_disponivel = NEW.kg_retornado
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- 3. Função auxiliar para recalcular custos de um beneficiamento existente
CREATE OR REPLACE FUNCTION public.fn_recalc_benef_c1_custos(benef_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_benef RECORD;
  total_custo_pre numeric := 0;
  custo_benef numeric := 0;
BEGIN
  -- Buscar dados do beneficiamento
  SELECT * INTO v_benef FROM public.beneficiamentos_c1 WHERE id = benef_id;
  
  IF v_benef IS NULL THEN
    RAISE EXCEPTION 'Beneficiamento não encontrado: %', benef_id;
  END IF;
  
  -- Calcular custo pré baseado nas alocações existentes
  SELECT COALESCE(SUM(a.kg_alocado * COALESCE(e.custo_unit_pre_rkg, 0)), 0)
  INTO total_custo_pre
  FROM public.benef_entrada_alocacoes a
  JOIN public.entradas_c1 e ON e.id = a.entrada_id
  WHERE a.beneficiamento_id = benef_id;
  
  -- Calcular custos de beneficiamento
  custo_benef := COALESCE(
    CASE WHEN v_benef.mo_benef_mode = 'RKG' THEN v_benef.mo_benef_val * v_benef.kg_retornado ELSE v_benef.mo_benef_val END, 0
  ) + COALESCE(
    CASE WHEN v_benef.frete_ida_mode = 'RKG' THEN v_benef.frete_ida_val * v_benef.kg_retornado ELSE v_benef.frete_ida_val END, 0
  ) + COALESCE(
    CASE WHEN v_benef.frete_volta_mode = 'RKG' THEN v_benef.frete_volta_val * v_benef.kg_retornado ELSE v_benef.frete_volta_val END, 0
  );
  
  -- Atualizar beneficiamento
  UPDATE public.beneficiamentos_c1
  SET custo_pre_alocado_rs = total_custo_pre,
      custos_benef_total_rs = custo_benef,
      custo_real_total_rs = total_custo_pre + custo_benef,
      custo_real_rkg = (total_custo_pre + custo_benef) / NULLIF(v_benef.kg_retornado, 0)
  WHERE id = benef_id;
END;
$$;

-- 4. Recalcular custos de todos os beneficiamentos existentes
DO $$
DECLARE
  v_benef RECORD;
BEGIN
  FOR v_benef IN SELECT id FROM public.beneficiamentos_c1 WHERE is_deleted = false
  LOOP
    PERFORM public.fn_recalc_benef_c1_custos(v_benef.id);
  END LOOP;
END;
$$;
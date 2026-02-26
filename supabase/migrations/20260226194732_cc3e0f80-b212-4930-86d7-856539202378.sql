
CREATE OR REPLACE FUNCTION public.fn_allocate_venda_from_benef()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  restante numeric;
  v_benef RECORD;
  alocar numeric;
  v_custo_material numeric := 0;
  v_custos_benef numeric := 0;
  v_custos_operacao numeric := 0;
  v_comissao_ibrac numeric;
  v_saldo_repassar numeric;
  v_valor_venda numeric;
  v_total_custos_interm numeric := 0;
  v_total_kg_vendido_op numeric := 0;
BEGIN
  restante := NEW.kg_vendido;
  
  FOR v_benef IN 
    SELECT b.id, b.kg_disponivel_venda
    FROM public.beneficiamentos_intermediacao b
    WHERE b.operacao_id = NEW.operacao_id
      AND b.is_deleted = false
      AND b.kg_disponivel_venda > 0
    ORDER BY b.dt ASC, b.created_at ASC
  LOOP
    EXIT WHEN restante <= 0;
    
    alocar := LEAST(restante, v_benef.kg_disponivel_venda);
    
    INSERT INTO public.venda_benef_alocacoes (venda_id, beneficiamento_id, kg_alocado)
    VALUES (NEW.id, v_benef.id, alocar);
    
    UPDATE public.beneficiamentos_intermediacao
    SET kg_disponivel_venda = kg_disponivel_venda - alocar
    WHERE id = v_benef.id;
    
    restante := restante - alocar;
  END LOOP;
  
  IF restante > 0 THEN
    RAISE EXCEPTION 'Venda maior que vergalhão disponível. Faltam % kg', restante;
  END IF;
  
  v_valor_venda := NEW.kg_vendido * NEW.preco_venda_rkg;
  
  -- Calcular custo do material APENAS das compras onde compra_pela_ibrac = true
  SELECT COALESCE(SUM(
    vba.kg_alocado * (
      SELECT SUM(bca.kg_alocado * c.preco_compra_rkg) / NULLIF(SUM(bca.kg_alocado), 0)
      FROM public.benef_compra_alocacoes bca
      JOIN public.compras_intermediacao c ON c.id = bca.compra_id
      WHERE bca.beneficiamento_id = vba.beneficiamento_id
        AND c.compra_pela_ibrac = true
    )
  ), 0) INTO v_custo_material
  FROM public.venda_benef_alocacoes vba
  WHERE vba.venda_id = NEW.id;
  
  -- Calcular custos de beneficiamento proporcionais
  SELECT COALESCE(SUM(
    vba.kg_alocado * (COALESCE(bi.custos_benef_total_rs, 0) / NULLIF(bi.kg_retornado, 0))
  ), 0) INTO v_custos_benef
  FROM public.venda_benef_alocacoes vba
  JOIN public.beneficiamentos_intermediacao bi ON bi.id = vba.beneficiamento_id
  WHERE vba.venda_id = NEW.id;
  
  -- Calcular custos da operação proporcionais (custos_intermediacao)
  SELECT COALESCE(SUM(val), 0) INTO v_total_custos_interm
  FROM public.custos_intermediacao
  WHERE operacao_id = NEW.operacao_id
    AND is_deleted = false;
  
  -- Total kg vendido na operação (incluindo esta venda)
  SELECT COALESCE(SUM(kg_vendido), 0) INTO v_total_kg_vendido_op
  FROM public.vendas_intermediacao
  WHERE operacao_id = NEW.operacao_id
    AND is_deleted = false;
  v_total_kg_vendido_op := v_total_kg_vendido_op + NEW.kg_vendido;
  
  IF v_total_kg_vendido_op > 0 THEN
    v_custos_operacao := v_total_custos_interm * (NEW.kg_vendido / v_total_kg_vendido_op);
  ELSE
    v_custos_operacao := 0;
  END IF;
  
  -- Calcular comissão IBRAC usando campos da própria venda
  IF COALESCE(NEW.venda_pela_ibrac, false) = true THEN
    v_comissao_ibrac := v_valor_venda * (COALESCE(NEW.comissao_ibrac_pct, 0) / 100);
  ELSE
    v_comissao_ibrac := 0;
  END IF;
  
  -- Calcular saldo a repassar
  v_saldo_repassar := v_valor_venda - v_custo_material - v_custos_benef - v_custos_operacao - v_comissao_ibrac;
  
  -- Atualizar venda
  UPDATE public.vendas_intermediacao
  SET custo_material_dono_rs = v_custo_material,
      custos_operacao_alocados_rs = v_custos_benef + v_custos_operacao,
      comissao_ibrac_rs = v_comissao_ibrac,
      saldo_repassar_rs = v_saldo_repassar
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$function$;

-- Recalcular vendas existentes com a nova lógica
UPDATE public.vendas_intermediacao v
SET comissao_ibrac_rs = CASE 
      WHEN COALESCE(v.venda_pela_ibrac, false) = true 
      THEN COALESCE(v.valor_venda_rs, 0) * (COALESCE(v.comissao_ibrac_pct, 0) / 100)
      ELSE 0
    END,
    saldo_repassar_rs = COALESCE(v.valor_venda_rs, 0) 
      - COALESCE(v.custo_material_dono_rs, 0) 
      - COALESCE(v.custos_operacao_alocados_rs, 0) 
      - CASE 
          WHEN COALESCE(v.venda_pela_ibrac, false) = true 
          THEN COALESCE(v.valor_venda_rs, 0) * (COALESCE(v.comissao_ibrac_pct, 0) / 100)
          ELSE 0
        END
WHERE v.is_deleted = false;

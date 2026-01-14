-- Corrigir recursão infinita em sync_custo_servico_saidas
-- Adiciona verificação para evitar que o trigger se chame recursivamente

CREATE OR REPLACE FUNCTION public.sync_custo_servico_saidas()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_operacao_id uuid;
  v_total_receita numeric := 0;
  v_total_kg_devolvido numeric := 0;
  v_total_kg_recebido numeric := 0;
  v_total_kg_beneficiado numeric := 0;
  rec RECORD;
  v_is_recursion boolean;
BEGIN
  -- Verificar se já está em execução para evitar recursão infinita
  BEGIN
    v_is_recursion := current_setting('sync_custo_servico.in_progress', true)::boolean;
  EXCEPTION WHEN OTHERS THEN
    v_is_recursion := false;
  END;
  
  -- Se já está em execução, sair sem fazer nada
  IF v_is_recursion THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Marcar como em execução
  PERFORM set_config('sync_custo_servico.in_progress', 'true', true);
  
  -- Determinar a operacao_id
  v_operacao_id := COALESCE(NEW.operacao_id, OLD.operacao_id);
  
  -- Se não há operacao_id, sair
  IF v_operacao_id IS NULL THEN
    PERFORM set_config('sync_custo_servico.in_progress', 'false', true);
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Calcular totais de kg para cada base
  SELECT COALESCE(SUM(kg_devolvido), 0) INTO v_total_kg_devolvido
  FROM saidas_terceiros
  WHERE operacao_id = v_operacao_id AND is_deleted = false;
  
  SELECT COALESCE(SUM(kg_recebido), 0) INTO v_total_kg_recebido
  FROM entradas_terceiros
  WHERE operacao_id = v_operacao_id AND is_deleted = false;
  
  SELECT COALESCE(SUM(kg_retornado), 0) INTO v_total_kg_beneficiado
  FROM beneficiamentos_terceiros
  WHERE operacao_id = v_operacao_id AND is_deleted = false;
  
  -- Calcular total da receita de todas as cobranças da operação
  FOR rec IN 
    SELECT val, mode, base_kg_mode
    FROM cobrancas_servico_terceiros
    WHERE operacao_id = v_operacao_id AND is_deleted = false
  LOOP
    IF rec.mode = 'TOTAL' THEN
      v_total_receita := v_total_receita + COALESCE(rec.val, 0);
    ELSE
      -- mode = 'RKG'
      CASE rec.base_kg_mode
        WHEN 'DEVOLVIDO' THEN
          v_total_receita := v_total_receita + COALESCE(rec.val, 0) * v_total_kg_devolvido;
        WHEN 'RECEBIDO' THEN
          v_total_receita := v_total_receita + COALESCE(rec.val, 0) * v_total_kg_recebido;
        WHEN 'BENEFICIADO' THEN
          v_total_receita := v_total_receita + COALESCE(rec.val, 0) * v_total_kg_beneficiado;
        ELSE
          v_total_receita := v_total_receita + COALESCE(rec.val, 0) * v_total_kg_devolvido;
      END CASE;
    END IF;
  END LOOP;
  
  -- Distribuir proporcionalmente pelas saídas
  IF v_total_kg_devolvido > 0 THEN
    UPDATE saidas_terceiros
    SET custo_servico_saida_rs = (kg_devolvido / v_total_kg_devolvido) * v_total_receita
    WHERE operacao_id = v_operacao_id AND is_deleted = false;
  END IF;
  
  -- Desmarcar como em execução
  PERFORM set_config('sync_custo_servico.in_progress', 'false', true);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;
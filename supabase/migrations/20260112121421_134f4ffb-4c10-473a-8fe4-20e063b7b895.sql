-- Função para sincronizar custo_servico_saida_rs nas saídas baseado nas cobranças
CREATE OR REPLACE FUNCTION sync_custo_servico_saidas()
RETURNS TRIGGER AS $$
DECLARE
  v_operacao_id uuid;
  v_total_receita numeric := 0;
  v_total_kg_devolvido numeric := 0;
  v_total_kg_recebido numeric := 0;
  v_total_kg_beneficiado numeric := 0;
  rec RECORD;
BEGIN
  -- Determinar a operacao_id
  v_operacao_id := COALESCE(NEW.operacao_id, OLD.operacao_id);
  
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
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger se existir
DROP TRIGGER IF EXISTS trigger_sync_custo_servico ON cobrancas_servico_terceiros;

-- Criar trigger para sincronização automática
CREATE TRIGGER trigger_sync_custo_servico
AFTER INSERT OR UPDATE OR DELETE ON cobrancas_servico_terceiros
FOR EACH ROW EXECUTE FUNCTION sync_custo_servico_saidas();

-- Também criar trigger para quando saídas são modificadas (recalcular distribuição)
DROP TRIGGER IF EXISTS trigger_sync_custo_servico_saidas ON saidas_terceiros;

CREATE TRIGGER trigger_sync_custo_servico_saidas
AFTER INSERT OR UPDATE OR DELETE ON saidas_terceiros
FOR EACH ROW EXECUTE FUNCTION sync_custo_servico_saidas();
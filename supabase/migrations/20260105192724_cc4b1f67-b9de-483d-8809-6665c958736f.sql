-- Trigger para recalcular receita_simulada_rs e resultado_simulado_rs nas saidas_c1
-- quando o benchmark_vergalhao_rkg é atualizado no beneficiamento

CREATE OR REPLACE FUNCTION fn_recalc_saidas_on_benef_update()
RETURNS TRIGGER AS $$
DECLARE
  v_saida RECORD;
  v_benchmark numeric;
  v_receita numeric;
  v_custo numeric;
BEGIN
  -- Só executa se benchmark foi alterado
  IF OLD.benchmark_vergalhao_rkg IS DISTINCT FROM NEW.benchmark_vergalhao_rkg THEN
    v_benchmark := COALESCE(NEW.benchmark_vergalhao_rkg, 0);
    
    -- Atualiza todas as saídas que usam este beneficiamento via alocação
    FOR v_saida IN 
      SELECT s.id, s.kg_saida, s.custo_saida_rs
      FROM saidas_c1 s
      INNER JOIN saida_benef_alocacoes sba ON sba.saida_id = s.id
      WHERE sba.beneficiamento_id = NEW.id
        AND s.is_deleted = false
    LOOP
      v_receita := v_saida.kg_saida * v_benchmark;
      v_custo := COALESCE(v_saida.custo_saida_rs, 0);
      
      UPDATE saidas_c1
      SET 
        benchmark_vergalhao_rkg = v_benchmark,
        receita_simulada_rs = v_receita,
        resultado_simulado_rs = v_receita - v_custo,
        updated_at = now()
      WHERE id = v_saida.id;
    END LOOP;
    
    -- Se não houver alocações específicas, atualiza saídas da mesma operação proporcionalmente
    -- baseado no benchmark mais recente do beneficiamento
    UPDATE saidas_c1 s
    SET 
      benchmark_vergalhao_rkg = v_benchmark,
      receita_simulada_rs = s.kg_saida * v_benchmark,
      resultado_simulado_rs = (s.kg_saida * v_benchmark) - COALESCE(s.custo_saida_rs, 0),
      updated_at = now()
    WHERE s.operacao_id = NEW.operacao_id
      AND s.is_deleted = false
      AND NOT EXISTS (
        SELECT 1 FROM saida_benef_alocacoes sba WHERE sba.saida_id = s.id
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Drop trigger se existir e recriar
DROP TRIGGER IF EXISTS trg_recalc_saidas_on_benef_update ON beneficiamentos_c1;

CREATE TRIGGER trg_recalc_saidas_on_benef_update
AFTER UPDATE ON beneficiamentos_c1
FOR EACH ROW
EXECUTE FUNCTION fn_recalc_saidas_on_benef_update();
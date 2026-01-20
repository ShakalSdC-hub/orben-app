-- 1. Atualizar snapshots nas alocações com custo real atual do beneficiamento
UPDATE saida_benef_alocacoes sba
SET custo_real_rkg_snapshot = b.custo_real_rkg
FROM beneficiamentos_c1 b
WHERE sba.beneficiamento_id = b.id
  AND sba.custo_real_rkg_snapshot = 0
  AND b.custo_real_rkg > 0;

-- 2. Recalcular custo total das saídas baseado nas alocações
WITH custos_por_saida AS (
  SELECT 
    sba.saida_id,
    SUM(sba.kg_alocado * sba.custo_real_rkg_snapshot) as custo_total
  FROM saida_benef_alocacoes sba
  GROUP BY sba.saida_id
)
UPDATE saidas_c1 s
SET 
  custo_saida_rs = c.custo_total,
  custo_saida_rkg = c.custo_total / NULLIF(s.kg_saida, 0),
  resultado_simulado_rs = COALESCE(s.receita_simulada_rs, 0) - c.custo_total
FROM custos_por_saida c
WHERE s.id = c.saida_id;
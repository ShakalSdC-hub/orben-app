-- 1. Atualizar constraint de tipo_saida para aceitar todos os valores válidos
ALTER TABLE saidas_c1 DROP CONSTRAINT IF EXISTS saidas_c1_tipo_saida_check;
ALTER TABLE saidas_c1 ADD CONSTRAINT saidas_c1_tipo_saida_check 
  CHECK (tipo_saida IN ('CONSUMO', 'CONSUMO_INTERNO', 'VENDA', 'RETORNO_DONO', 'Retorno Industrialização', 'Retirada pelo Dono'));

-- 2. Atualizar constraint de financeiro_mode para usar PCT/TOTAL
ALTER TABLE entradas_c1 DROP CONSTRAINT IF EXISTS entradas_c1_financeiro_mode_check;
UPDATE entradas_c1 SET financeiro_mode = 'TOTAL' WHERE financeiro_mode = 'RKG';
ALTER TABLE entradas_c1 ALTER COLUMN financeiro_mode SET DEFAULT 'PCT';
ALTER TABLE entradas_c1 ADD CONSTRAINT entradas_c1_financeiro_mode_check 
  CHECK (financeiro_mode IN ('PCT', 'TOTAL'));

-- 3. Adicionar coluna benchmark_vergalhao_rkg na tabela beneficiamentos_c1
ALTER TABLE beneficiamentos_c1 
  ADD COLUMN IF NOT EXISTS benchmark_vergalhao_rkg numeric(14,6) DEFAULT 0;
-- Adicionar coluna para perda real (a perda efetiva do processo)
ALTER TABLE orcamentos_servico_terceiros 
ADD COLUMN IF NOT EXISTS perda_real_pct numeric DEFAULT 0;

-- Adicionar coluna para lucro da diferença de perda
ALTER TABLE orcamentos_servico_terceiros 
ADD COLUMN IF NOT EXISTS lucro_perda_kg numeric DEFAULT 0;

-- Adicionar coluna para perda cliente (mantendo compatibilidade com perda_pct existente)
ALTER TABLE orcamentos_servico_terceiros 
ADD COLUMN IF NOT EXISTS perda_cliente_pct numeric DEFAULT 0;

-- Copiar dados existentes da coluna perda_pct para perda_cliente_pct e perda_real_pct
UPDATE orcamentos_servico_terceiros 
SET 
  perda_cliente_pct = COALESCE(perda_pct, 0),
  perda_real_pct = COALESCE(perda_pct, 0)
WHERE perda_cliente_pct = 0 OR perda_cliente_pct IS NULL;
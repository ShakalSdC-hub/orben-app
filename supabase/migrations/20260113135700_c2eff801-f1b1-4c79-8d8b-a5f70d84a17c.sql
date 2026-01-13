-- Adicionar campos para custo financeiro e parcelas no histórico de simulações
ALTER TABLE simulacoes_lme
ADD COLUMN IF NOT EXISTS taxa_financeira_mensal numeric DEFAULT 1.80,
ADD COLUMN IF NOT EXISTS total_juros_lme numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS preco_final_prazo numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS pct_lme_sucata numeric DEFAULT 97,
ADD COLUMN IF NOT EXISTS prazo_sucata_dias integer DEFAULT 40,
ADD COLUMN IF NOT EXISTS economia_pct_new numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS resultado_new text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS parcelas_json jsonb DEFAULT '[]'::jsonb;

-- Comentários para documentação
COMMENT ON COLUMN simulacoes_lme.taxa_financeira_mensal IS 'Taxa financeira % ao mês';
COMMENT ON COLUMN simulacoes_lme.total_juros_lme IS 'Total dos juros calculados R$/kg';
COMMENT ON COLUMN simulacoes_lme.preco_final_prazo IS 'Preço final com juros R$/kg';
COMMENT ON COLUMN simulacoes_lme.pct_lme_sucata IS 'Percentual LME usado na sucata (97% mista, 102% mel)';
COMMENT ON COLUMN simulacoes_lme.prazo_sucata_dias IS 'Prazo em dias para cálculo financeiro da sucata';
COMMENT ON COLUMN simulacoes_lme.parcelas_json IS 'Detalhes das parcelas: [{numero, percentual, dias, valor, jurosPct, jurosRs, valorComFinanceiro}]';
-- Remover colunas não utilizadas

-- 1. entradas_c1: benchmark_sucata_rkg não é usado no formulário nem na exibição
ALTER TABLE entradas_c1 DROP COLUMN IF EXISTS benchmark_sucata_rkg;

-- 2. entradas_c1: kg_ticket é calculado (ticket_mel_kg + ticket_mista_kg), mas está duplicando dados
-- Manter pois é usado como cache/resumo

-- 3. acertos_financeiros: dono_id foi substituído por parceiro_id
ALTER TABLE acertos_financeiros DROP COLUMN IF EXISTS dono_id;

-- 4. acertos_financeiros: referencia_tipo e referencia_id não são usados no código
ALTER TABLE acertos_financeiros DROP COLUMN IF EXISTS referencia_tipo;
ALTER TABLE acertos_financeiros DROP COLUMN IF EXISTS referencia_id;

-- 5. simulacoes_lme: economia_pct não é usado no código
ALTER TABLE simulacoes_lme DROP COLUMN IF EXISTS economia_pct;

-- 6. simulacoes_lme: prazo_dias não é usado no código  
ALTER TABLE simulacoes_lme DROP COLUMN IF EXISTS prazo_dias;

-- 7. simulacoes_lme: custo_sucata_kg não é usado no código
ALTER TABLE simulacoes_lme DROP COLUMN IF EXISTS custo_sucata_kg;

-- 8. simulacoes_lme: resultado é texto livre sem uso estruturado
ALTER TABLE simulacoes_lme DROP COLUMN IF EXISTS resultado;

-- 9. transferencias_dono: sublote_id referencia tabela antiga removida
ALTER TABLE transferencias_dono DROP COLUMN IF EXISTS sublote_id;

-- 10. transferencias_dono: dono_origem_id e dono_destino_id devem referenciar parceiros
-- mas os campos existem então manter

-- 11. ganhos_material_ibrac: origem tem valor default mas não é usado no UI
-- Manter pois pode ser útil para classificação futura

-- 12. historico_lme: várias colunas de metais não são exibidas no sistema
-- chumbo_usd_t, estanho_usd_t, niquel_usd_t não são usados
ALTER TABLE historico_lme DROP COLUMN IF EXISTS chumbo_usd_t;
ALTER TABLE historico_lme DROP COLUMN IF EXISTS estanho_usd_t;
ALTER TABLE historico_lme DROP COLUMN IF EXISTS niquel_usd_t;

-- 13. historico_lme: zinco_usd_t não é usado
ALTER TABLE historico_lme DROP COLUMN IF EXISTS zinco_usd_t;

-- 14. lme_semana_config: fator_total é calculado e não usado diretamente
ALTER TABLE lme_semana_config DROP COLUMN IF EXISTS fator_total;

-- 15. lme_semana_config: lme_base_brl_kg é intermediário, o final é usado
ALTER TABLE lme_semana_config DROP COLUMN IF EXISTS lme_base_brl_kg;
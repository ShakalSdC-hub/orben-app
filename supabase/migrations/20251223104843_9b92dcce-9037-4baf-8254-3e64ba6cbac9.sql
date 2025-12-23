-- Preencher beneficiamento_entradas para beneficiamentos existentes
-- Vincula documentos de entrada baseado nos sublotes utilizados

INSERT INTO beneficiamento_entradas (beneficiamento_id, entrada_id, valor_documento, taxa_financeira_pct, taxa_financeira_valor)
SELECT DISTINCT 
  bie.beneficiamento_id,
  s.entrada_id,
  COALESCE(e.valor_total, 0),
  COALESCE(b.taxa_financeira_pct, 1.8),
  COALESCE(e.valor_total, 0) * (COALESCE(b.taxa_financeira_pct, 1.8) / 100)
FROM beneficiamento_itens_entrada bie
JOIN sublotes s ON s.id = bie.sublote_id
JOIN entradas e ON e.id = s.entrada_id
JOIN beneficiamentos b ON b.id = bie.beneficiamento_id
WHERE s.entrada_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM beneficiamento_entradas be 
    WHERE be.beneficiamento_id = bie.beneficiamento_id 
      AND be.entrada_id = s.entrada_id
  );
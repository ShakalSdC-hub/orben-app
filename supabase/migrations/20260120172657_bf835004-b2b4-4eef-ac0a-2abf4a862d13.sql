-- ================================================
-- CENÁRIO 2 - MELHORIAS SERVIÇO TERCEIROS
-- ================================================

-- 1. Corrigir CHECK constraint de 'tipo' na tabela cobrancas_servico_terceiros
-- Adicionar FRETE que está faltando
ALTER TABLE cobrancas_servico_terceiros 
DROP CONSTRAINT IF EXISTS cobrancas_servico_terceiros_tipo_check;

ALTER TABLE cobrancas_servico_terceiros 
ADD CONSTRAINT cobrancas_servico_terceiros_tipo_check 
CHECK (tipo IS NULL OR tipo IN ('MO', 'FRETE', 'SERVICO_ADICIONAL', 'COMISSAO', 'OUTROS'));

-- 2. Corrigir CHECK constraint de 'base_kg_mode' para incluir RECEBIDO e BENEFICIADO
ALTER TABLE cobrancas_servico_terceiros 
DROP CONSTRAINT IF EXISTS cobrancas_servico_terceiros_base_kg_mode_check;

ALTER TABLE cobrancas_servico_terceiros 
ADD CONSTRAINT cobrancas_servico_terceiros_base_kg_mode_check 
CHECK (base_kg_mode IS NULL OR base_kg_mode IN ('RETORNADO', 'DEVOLVIDO', 'RECEBIDO', 'BENEFICIADO'));

-- 3. Criar tabela de produtos para Cenário 2 (permite receber vergalhão, não só sucata)
CREATE TABLE IF NOT EXISTS produtos_terceiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  codigo text UNIQUE,
  tipo text CHECK (tipo IN ('SUCATA', 'SEMI_ACABADO', 'ACABADO')),
  perda_padrao_pct numeric(5,2) DEFAULT 5,
  ativo boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE produtos_terceiros ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (todos podem ler, admin pode modificar)
CREATE POLICY "Produtos terceiros visíveis para todos autenticados"
ON produtos_terceiros FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Apenas admin pode inserir produtos terceiros"
ON produtos_terceiros FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Apenas admin pode atualizar produtos terceiros"
ON produtos_terceiros FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Inserir produtos padrão
INSERT INTO produtos_terceiros (nome, codigo, tipo, perda_padrao_pct) VALUES
  ('Sucata Cobre Mel', 'SCM', 'SUCATA', 5),
  ('Sucata Cobre Mista', 'SCMI', 'SUCATA', 10),
  ('Sucata Cobre Isolada Mel', 'SCIM', 'SUCATA', 8),
  ('Sucata Cobre Isolada Mista', 'SCIMI', 'SUCATA', 12),
  ('Vergalhão 8mm', 'V8', 'SEMI_ACABADO', 2),
  ('Fio 1.83mm', 'F183', 'ACABADO', 1),
  ('Fio 1.45mm', 'F145', 'ACABADO', 1)
ON CONFLICT (codigo) DO NOTHING;

-- 4. Adicionar produto_id na tabela entradas_terceiros
ALTER TABLE entradas_terceiros 
ADD COLUMN IF NOT EXISTS produto_id uuid REFERENCES produtos_terceiros(id);

-- 5. Adicionar campos genéricos de perda em beneficiamentos_terceiros
-- Para suportar qualquer tipo de material (não só mel/mista)
ALTER TABLE beneficiamentos_terceiros
ADD COLUMN IF NOT EXISTS kg_entrada numeric(14,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS perda_pct numeric(5,2) DEFAULT 5,
ADD COLUMN IF NOT EXISTS perda_real_pct numeric(5,2) DEFAULT 0;

-- 6. Atualizar registros existentes para preencher kg_entrada com soma de mel+mista
UPDATE beneficiamentos_terceiros
SET kg_entrada = COALESCE(kg_mel_entrada, 0) + COALESCE(kg_mista_entrada, 0)
WHERE kg_entrada = 0 OR kg_entrada IS NULL;

-- 7. Calcular perda_real_pct para registros existentes
UPDATE beneficiamentos_terceiros
SET perda_real_pct = CASE 
  WHEN kg_entrada > 0 THEN ((kg_entrada - kg_retornado) / kg_entrada) * 100
  ELSE 0
END
WHERE perda_real_pct = 0 OR perda_real_pct IS NULL;
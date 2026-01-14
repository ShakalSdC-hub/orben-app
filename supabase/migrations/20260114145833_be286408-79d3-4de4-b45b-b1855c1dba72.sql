-- Tabela para armazenar orçamentos de serviço para terceiros
CREATE TABLE IF NOT EXISTS orcamentos_servico_terceiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  -- Dados do cliente
  nome_cliente text NOT NULL,
  material_recebido text NOT NULL,
  qtd_recebida_kg numeric NOT NULL,
  preco_compra_kg numeric NOT NULL,
  
  -- Custos operacionais
  custo_frete_kg numeric DEFAULT 0,
  custo_mo_terceira_kg numeric DEFAULT 0,
  custo_mo_interna_kg numeric DEFAULT 0,
  perda_pct numeric DEFAULT 0,
  total_custos_kg numeric NOT NULL,
  
  -- Cobrança
  cobranca_mode text DEFAULT 'valor',
  cobranca_valor numeric NOT NULL,
  custo_servico_kg numeric NOT NULL,
  
  -- Resultado
  material_retornado text,
  qtd_retornada_kg numeric NOT NULL,
  valor_final_kg_cliente numeric NOT NULL,
  margem_lucro_kg numeric,
  lucro_total numeric,
  
  is_deleted boolean DEFAULT false
);

-- Habilitar RLS
ALTER TABLE orcamentos_servico_terceiros ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Usuários autenticados podem ver orçamentos" 
  ON orcamentos_servico_terceiros FOR SELECT 
  TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem criar orçamentos" 
  ON orcamentos_servico_terceiros FOR INSERT 
  TO authenticated WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar orçamentos" 
  ON orcamentos_servico_terceiros FOR UPDATE 
  TO authenticated USING (true);

-- Índices
CREATE INDEX idx_orcamentos_terceiros_created_at ON orcamentos_servico_terceiros(created_at DESC);
CREATE INDEX idx_orcamentos_terceiros_cliente ON orcamentos_servico_terceiros(nome_cliente);
-- =====================================================
-- FASE 2: NOVAS TABELAS DO SISTEMA ORBEN
-- =====================================================

-- 1. DONOS DE MATERIAL (proprietários do material)
CREATE TABLE public.donos_material (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  documento TEXT, -- CPF/CNPJ
  telefone TEXT,
  email TEXT,
  taxa_operacao_pct NUMERIC DEFAULT 0, -- taxa cobrada pela IBRAC
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. TIPOS DE PRODUTO (catálogo com campos fiscais)
CREATE TABLE public.tipos_produto (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  codigo TEXT,
  descricao TEXT,
  icms_pct NUMERIC DEFAULT 0,
  pis_cofins_pct NUMERIC DEFAULT 0,
  ncm TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. TIPOS DE ENTRADA (classificação de entradas)
CREATE TABLE public.tipos_entrada (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  gera_custo BOOLEAN DEFAULT true,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. TIPOS DE SAÍDA (classificação de saídas)
CREATE TABLE public.tipos_saida (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  cobra_custos BOOLEAN DEFAULT true,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. PROCESSOS (operações de beneficiamento)
CREATE TABLE public.processos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  inclui_frete_ida BOOLEAN DEFAULT false,
  inclui_frete_volta BOOLEAN DEFAULT false,
  inclui_mo BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. PREÇOS MO TERCEIROS (preços por fornecedor/processo/produto)
CREATE TABLE public.precos_mo_terceiros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  processo_id UUID REFERENCES public.processos(id),
  tipo_produto_id UUID REFERENCES public.tipos_produto(id),
  preco_kg NUMERIC NOT NULL,
  vigencia_inicio DATE DEFAULT CURRENT_DATE,
  vigencia_fim DATE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. BENEFICIAMENTOS (cabeçalho)
CREATE TABLE public.beneficiamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL,
  data_inicio DATE DEFAULT CURRENT_DATE,
  data_fim DATE,
  processo_id UUID REFERENCES public.processos(id),
  fornecedor_terceiro_id UUID REFERENCES public.fornecedores(id),
  tipo_beneficiamento TEXT DEFAULT 'interno', -- interno, externo
  custo_frete_ida NUMERIC DEFAULT 0,
  custo_frete_volta NUMERIC DEFAULT 0,
  custo_mo_terceiro NUMERIC DEFAULT 0,
  custo_mo_ibrac NUMERIC DEFAULT 0,
  taxa_financeira_pct NUMERIC DEFAULT 0,
  perda_real_pct NUMERIC DEFAULT 0,
  perda_cobrada_pct NUMERIC DEFAULT 0,
  peso_entrada_kg NUMERIC DEFAULT 0,
  peso_saida_kg NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'em_andamento', -- em_andamento, finalizado, cancelado
  observacoes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. BENEFICIAMENTO ITENS ENTRADA (materiais consumidos)
CREATE TABLE public.beneficiamento_itens_entrada (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beneficiamento_id UUID REFERENCES public.beneficiamentos(id) ON DELETE CASCADE,
  sublote_id UUID REFERENCES public.sublotes(id),
  peso_kg NUMERIC NOT NULL,
  custo_unitario NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. BENEFICIAMENTO ITENS SAÍDA (produtos gerados)
CREATE TABLE public.beneficiamento_itens_saida (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beneficiamento_id UUID REFERENCES public.beneficiamentos(id) ON DELETE CASCADE,
  tipo_produto_id UUID REFERENCES public.tipos_produto(id),
  peso_kg NUMERIC NOT NULL,
  custo_unitario_calculado NUMERIC DEFAULT 0,
  local_estoque_id UUID REFERENCES public.locais_estoque(id),
  sublote_gerado_id UUID REFERENCES public.sublotes(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. TRANSFERÊNCIAS ENTRE DONOS
CREATE TABLE public.transferencias_dono (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sublote_id UUID REFERENCES public.sublotes(id),
  dono_origem_id UUID REFERENCES public.donos_material(id),
  dono_destino_id UUID REFERENCES public.donos_material(id),
  peso_kg NUMERIC NOT NULL,
  valor_acrescimo NUMERIC DEFAULT 0,
  data_transferencia DATE DEFAULT CURRENT_DATE,
  observacoes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 11. ACERTOS FINANCEIROS
CREATE TABLE public.acertos_financeiros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dono_id UUID REFERENCES public.donos_material(id),
  tipo TEXT NOT NULL, -- cobranca, repasse, compensacao
  valor NUMERIC NOT NULL,
  referencia_tipo TEXT, -- saida, beneficiamento, transferencia
  referencia_id UUID,
  data_acerto DATE DEFAULT CURRENT_DATE,
  data_pagamento DATE,
  status TEXT DEFAULT 'pendente', -- pendente, pago, cancelado
  observacoes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 12. CONFIGURAÇÕES FISCAIS
CREATE TABLE public.config_fiscal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir configuração padrão de crédito acumulado e fator imposto
INSERT INTO public.config_fiscal (nome, valor, descricao) VALUES
  ('credito_acumulado_ibrac', 0, 'Crédito de ICMS acumulado da IBRAC'),
  ('fator_imposto', 0.7986, 'Fator de conversão para cálculo do preço com imposto');

-- 13. HISTÓRICO LME (cotações diárias - armazena TODOS os metais)
CREATE TABLE public.historico_lme (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL UNIQUE,
  cobre_usd_t NUMERIC, -- Cobre em US$/tonelada
  zinco_usd_t NUMERIC, -- Zinco em US$/tonelada
  aluminio_usd_t NUMERIC, -- Alumínio em US$/tonelada
  chumbo_usd_t NUMERIC, -- Chumbo em US$/tonelada
  estanho_usd_t NUMERIC, -- Estanho em US$/tonelada
  niquel_usd_t NUMERIC, -- Níquel em US$/tonelada
  dolar_brl NUMERIC, -- Dólar em R$/US$
  cobre_brl_kg NUMERIC GENERATED ALWAYS AS ((cobre_usd_t * dolar_brl) / 1000) STORED, -- Cobre convertido para R$/kg
  aluminio_brl_kg NUMERIC GENERATED ALWAYS AS ((aluminio_usd_t * dolar_brl) / 1000) STORED, -- Alumínio convertido para R$/kg
  fonte TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 14. SIMULAÇÕES LME (histórico de simulações)
CREATE TABLE public.simulacoes_lme (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_simulacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cobre_usd_t NUMERIC NOT NULL,
  dolar_brl NUMERIC NOT NULL,
  fator_imposto NUMERIC NOT NULL,
  pct_lme_negociada NUMERIC NOT NULL,
  taxa_financeira_pct NUMERIC,
  prazo_dias INTEGER,
  lme_semana_brl_kg NUMERIC,
  preco_com_imposto NUMERIC,
  preco_a_vista NUMERIC,
  preco_a_prazo NUMERIC,
  custo_sucata_kg NUMERIC,
  resultado TEXT, -- 'sucata_vantajosa', 'vergalhao_vantajoso'
  economia_pct NUMERIC,
  observacoes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- ALTERAÇÕES EM TABELAS EXISTENTES
-- =====================================================

-- Adicionar campos na tabela ENTRADAS
ALTER TABLE public.entradas 
  ADD COLUMN IF NOT EXISTS dono_id UUID REFERENCES public.donos_material(id),
  ADD COLUMN IF NOT EXISTS tipo_entrada_id UUID REFERENCES public.tipos_entrada(id),
  ADD COLUMN IF NOT EXISTS tipo_produto_id UUID REFERENCES public.tipos_produto(id),
  ADD COLUMN IF NOT EXISTS taxa_financeira_pct NUMERIC DEFAULT 0;

-- Adicionar campos na tabela SUBLOTES
ALTER TABLE public.sublotes 
  ADD COLUMN IF NOT EXISTS dono_id UUID REFERENCES public.donos_material(id),
  ADD COLUMN IF NOT EXISTS tipo_produto_id UUID REFERENCES public.tipos_produto(id),
  ADD COLUMN IF NOT EXISTS custo_unitario_total NUMERIC DEFAULT 0;

-- Adicionar campos na tabela SAIDAS
ALTER TABLE public.saidas 
  ADD COLUMN IF NOT EXISTS tipo_saida_id UUID REFERENCES public.tipos_saida(id),
  ADD COLUMN IF NOT EXISTS custos_cobrados NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_repasse_dono NUMERIC DEFAULT 0;

-- =====================================================
-- HABILITAR RLS EM TODAS AS NOVAS TABELAS
-- =====================================================

ALTER TABLE public.donos_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_produto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_entrada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_saida ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precos_mo_terceiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiamento_itens_entrada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiamento_itens_saida ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transferencias_dono ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acertos_financeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_fiscal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_lme ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulacoes_lme ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS
-- =====================================================

-- DONOS_MATERIAL
CREATE POLICY "Authenticated users can view donos_material" ON public.donos_material
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage donos_material" ON public.donos_material
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente_geral'));

-- TIPOS_PRODUTO
CREATE POLICY "Authenticated users can view tipos_produto" ON public.tipos_produto
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage tipos_produto" ON public.tipos_produto
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente_geral'));

-- TIPOS_ENTRADA
CREATE POLICY "Authenticated users can view tipos_entrada" ON public.tipos_entrada
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage tipos_entrada" ON public.tipos_entrada
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente_geral'));

-- TIPOS_SAIDA
CREATE POLICY "Authenticated users can view tipos_saida" ON public.tipos_saida
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage tipos_saida" ON public.tipos_saida
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente_geral'));

-- PROCESSOS
CREATE POLICY "Authenticated users can view processos" ON public.processos
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage processos" ON public.processos
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente_geral'));

-- PRECOS_MO_TERCEIROS
CREATE POLICY "Authenticated users can view precos_mo_terceiros" ON public.precos_mo_terceiros
  FOR SELECT USING (true);
CREATE POLICY "Compras and admins can manage precos_mo_terceiros" ON public.precos_mo_terceiros
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente_geral') OR has_role(auth.uid(), 'compras'));

-- BENEFICIAMENTOS
CREATE POLICY "Authenticated users can view beneficiamentos" ON public.beneficiamentos
  FOR SELECT USING (true);
CREATE POLICY "PCP and admins can manage beneficiamentos" ON public.beneficiamentos
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente_geral') OR has_role(auth.uid(), 'pcp'));

-- BENEFICIAMENTO_ITENS_ENTRADA
CREATE POLICY "Authenticated users can view beneficiamento_itens_entrada" ON public.beneficiamento_itens_entrada
  FOR SELECT USING (true);
CREATE POLICY "PCP and admins can manage beneficiamento_itens_entrada" ON public.beneficiamento_itens_entrada
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente_geral') OR has_role(auth.uid(), 'pcp'));

-- BENEFICIAMENTO_ITENS_SAIDA
CREATE POLICY "Authenticated users can view beneficiamento_itens_saida" ON public.beneficiamento_itens_saida
  FOR SELECT USING (true);
CREATE POLICY "PCP and admins can manage beneficiamento_itens_saida" ON public.beneficiamento_itens_saida
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente_geral') OR has_role(auth.uid(), 'pcp'));

-- TRANSFERENCIAS_DONO
CREATE POLICY "Authenticated users can view transferencias_dono" ON public.transferencias_dono
  FOR SELECT USING (true);
CREATE POLICY "PCP and admins can manage transferencias_dono" ON public.transferencias_dono
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente_geral') OR has_role(auth.uid(), 'pcp'));

-- ACERTOS_FINANCEIROS
CREATE POLICY "Authenticated users can view acertos_financeiros" ON public.acertos_financeiros
  FOR SELECT USING (true);
CREATE POLICY "Financeiro and admins can manage acertos_financeiros" ON public.acertos_financeiros
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente_geral') OR has_role(auth.uid(), 'comercial'));

-- CONFIG_FISCAL
CREATE POLICY "Authenticated users can view config_fiscal" ON public.config_fiscal
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage config_fiscal" ON public.config_fiscal
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente_geral'));

-- HISTORICO_LME
CREATE POLICY "Authenticated users can view historico_lme" ON public.historico_lme
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage historico_lme" ON public.historico_lme
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente_geral') OR has_role(auth.uid(), 'compras'));

-- SIMULACOES_LME
CREATE POLICY "Users can view own simulacoes" ON public.simulacoes_lme
  FOR SELECT USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente_geral'));
CREATE POLICY "Authenticated users can create simulacoes" ON public.simulacoes_lme
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE TRIGGER update_donos_material_updated_at BEFORE UPDATE ON public.donos_material
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tipos_produto_updated_at BEFORE UPDATE ON public.tipos_produto
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tipos_entrada_updated_at BEFORE UPDATE ON public.tipos_entrada
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tipos_saida_updated_at BEFORE UPDATE ON public.tipos_saida
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_processos_updated_at BEFORE UPDATE ON public.processos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_precos_mo_terceiros_updated_at BEFORE UPDATE ON public.precos_mo_terceiros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_beneficiamentos_updated_at BEFORE UPDATE ON public.beneficiamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_acertos_financeiros_updated_at BEFORE UPDATE ON public.acertos_financeiros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_config_fiscal_updated_at BEFORE UPDATE ON public.config_fiscal
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_historico_lme_updated_at BEFORE UPDATE ON public.historico_lme
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Tipos de Entrada padrão
INSERT INTO public.tipos_entrada (nome, descricao, gera_custo) VALUES
  ('Compra', 'Compra direta de material', true),
  ('Remessa Industrialização', 'Material de terceiro para beneficiamento', true),
  ('Consignação', 'Material em consignação', true),
  ('Transferência', 'Transferência entre unidades', false);

-- Tipos de Saída padrão
INSERT INTO public.tipos_saida (nome, descricao, cobra_custos) VALUES
  ('Venda', 'Venda de material', false),
  ('Retorno Industrialização', 'Retorno de material beneficiado', true),
  ('Retirada pelo Dono', 'Dono retira seu material', true),
  ('Consumo Interno', 'Uso interno pela IBRAC', false);

-- Processos padrão
INSERT INTO public.processos (nome, descricao, inclui_frete_ida, inclui_frete_volta, inclui_mo) VALUES
  ('Fundição', 'Processo de fundição do material', true, true, true),
  ('Trefilação', 'Processo de trefilação', false, false, true),
  ('Laminação', 'Processo de laminação', true, true, true),
  ('Corte', 'Serviço de corte', false, false, true),
  ('Armazenagem', 'Armazenagem de material', false, false, false);

-- Tipos de Produto padrão
INSERT INTO public.tipos_produto (nome, codigo, icms_pct, pis_cofins_pct, ncm) VALUES
  ('Sucata de Cobre', 'SUC-CU', 12, 9.25, '7404.00.00'),
  ('Vergalhão de Cobre', 'VER-CU', 12, 9.25, '7407.10.00'),
  ('Fio de Cobre', 'FIO-CU', 12, 9.25, '7408.11.00'),
  ('Sucata de Alumínio', 'SUC-AL', 12, 9.25, '7602.00.00'),
  ('Vergalhão de Alumínio', 'VER-AL', 12, 9.25, '7604.10.00');

-- Dono padrão (IBRAC)
INSERT INTO public.donos_material (nome, documento, taxa_operacao_pct) VALUES
  ('IBRAC', '00.000.000/0001-00', 0);

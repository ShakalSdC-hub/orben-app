
-- =====================================================
-- FASE 1: CRIAR NOVAS TABELAS DOS 3 CENÁRIOS
-- Preservando LME/Simulador intocado
-- =====================================================

-- ===========================================
-- CENÁRIO 1: MATERIAL PRÓPRIO IBRAC
-- ===========================================

-- Tabela: operacoes (1 beneficiador por operação)
CREATE TABLE public.operacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  beneficiador_id uuid NOT NULL REFERENCES public.parceiros(id),
  status text CHECK (status IN ('ABERTA','ENCERRADA')) DEFAULT 'ABERTA',
  obs text,
  -- Defaults para auto-preencher UI
  perda_mel_default numeric(7,4) DEFAULT 0.05,
  perda_mista_default numeric(7,4) DEFAULT 0.10,
  benchmark_vergalhao_default numeric(14,6),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean DEFAULT false
);

-- Tabela: entradas_c1 (tickets de sucata + custos PRÉ)
CREATE TABLE public.entradas_c1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operacao_id uuid NOT NULL REFERENCES public.operacoes(id),
  procedencia text,
  dt_emissao date,
  dt_recebimento date,
  nf_num text,
  ticket_num text,
  ticket_mel_kg numeric(14,3) DEFAULT 0 CHECK (ticket_mel_kg >= 0),
  ticket_mista_kg numeric(14,3) DEFAULT 0 CHECK (ticket_mista_kg >= 0),
  perda_mel_pct numeric(7,4) NOT NULL CHECK (perda_mel_pct BETWEEN 0 AND 0.30),
  perda_mista_pct numeric(7,4) NOT NULL CHECK (perda_mista_pct BETWEEN 0 AND 0.30),
  valor_unit_sucata_rkg numeric(14,6) NOT NULL CHECK (valor_unit_sucata_rkg > 0),
  benchmark_sucata_rkg numeric(14,6),
  -- Custos PRÉ (cada custo: mode + valor informado)
  moagem_mode text CHECK (moagem_mode IN ('RKG','TOTAL')) DEFAULT 'RKG',
  moagem_val numeric(14,6) DEFAULT 0,
  frete_ida_moagem_mode text CHECK (frete_ida_moagem_mode IN ('RKG','TOTAL')) DEFAULT 'RKG',
  frete_ida_moagem_val numeric(14,6) DEFAULT 0,
  frete_volta_moagem_mode text CHECK (frete_volta_moagem_mode IN ('RKG','TOTAL')) DEFAULT 'RKG',
  frete_volta_moagem_val numeric(14,6) DEFAULT 0,
  financeiro_mode text CHECK (financeiro_mode IN ('RKG','TOTAL')) DEFAULT 'RKG',
  financeiro_val numeric(14,6) DEFAULT 0,
  -- Derivados (gravados para auditoria)
  kg_ticket numeric(14,3) DEFAULT 0,
  perda_total_kg numeric(14,3) DEFAULT 0,
  kg_liquido_total numeric(14,3) DEFAULT 0,
  kg_liquido_disponivel numeric(14,3) DEFAULT 0,
  valor_ticket_rs numeric(16,2) DEFAULT 0,
  custos_pre_total_rs numeric(16,2) DEFAULT 0,
  custo_unit_pre_rkg numeric(14,6) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean DEFAULT false
);

-- Tabela: beneficiamentos_c1 (retorno de vergalhão + custos do processo)
CREATE TABLE public.beneficiamentos_c1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operacao_id uuid NOT NULL REFERENCES public.operacoes(id),
  dt date NOT NULL,
  documento text,
  kg_retornado numeric(14,3) NOT NULL CHECK (kg_retornado > 0),
  -- Custos do beneficiamento (mode + valor)
  mo_benef_mode text CHECK (mo_benef_mode IN ('RKG','TOTAL')) DEFAULT 'RKG',
  mo_benef_val numeric(14,6) DEFAULT 0,
  frete_ida_mode text CHECK (frete_ida_mode IN ('RKG','TOTAL')) DEFAULT 'RKG',
  frete_ida_val numeric(14,6) DEFAULT 0,
  frete_volta_mode text CHECK (frete_volta_mode IN ('RKG','TOTAL')) DEFAULT 'RKG',
  frete_volta_val numeric(14,6) DEFAULT 0,
  -- FIFO usa saldo disponível
  kg_disponivel numeric(14,3) DEFAULT 0,
  -- Derivados (gravados)
  custos_benef_total_rs numeric(16,2) DEFAULT 0,
  custo_pre_alocado_rs numeric(16,2) DEFAULT 0,
  custo_real_total_rs numeric(16,2) DEFAULT 0,
  custo_real_rkg numeric(14,6) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean DEFAULT false
);

-- Tabela: benef_entrada_alocacoes (FIFO 1: Beneficiamento ← Entradas)
CREATE TABLE public.benef_entrada_alocacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiamento_id uuid NOT NULL REFERENCES public.beneficiamentos_c1(id) ON DELETE CASCADE,
  entrada_id uuid NOT NULL REFERENCES public.entradas_c1(id),
  kg_alocado numeric(14,3) NOT NULL CHECK (kg_alocado > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(beneficiamento_id, entrada_id)
);

-- Tabela: saidas_c1 (baixa parcial: consumo/venda simulada)
CREATE TABLE public.saidas_c1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operacao_id uuid NOT NULL REFERENCES public.operacoes(id),
  dt date NOT NULL,
  tipo_saida text NOT NULL CHECK (tipo_saida IN ('CONSUMO','VENDA')),
  kg_saida numeric(14,3) NOT NULL CHECK (kg_saida > 0),
  parceiro_destino_id uuid REFERENCES public.parceiros(id), -- obrigatório se VENDA
  benchmark_vergalhao_rkg numeric(14,6), -- obrigatório se VENDA; opcional se CONSUMO
  -- Derivados (gravados)
  custo_saida_rs numeric(16,2) DEFAULT 0,
  custo_saida_rkg numeric(14,6) DEFAULT 0,
  receita_simulada_rs numeric(16,2) DEFAULT 0,
  resultado_simulado_rs numeric(16,2) DEFAULT 0,
  documento text,
  obs text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean DEFAULT false
);

-- Tabela: saida_benef_alocacoes (FIFO 2: Saída ← Beneficiamentos)
CREATE TABLE public.saida_benef_alocacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saida_id uuid NOT NULL REFERENCES public.saidas_c1(id) ON DELETE CASCADE,
  beneficiamento_id uuid NOT NULL REFERENCES public.beneficiamentos_c1(id),
  kg_alocado numeric(14,3) NOT NULL CHECK (kg_alocado > 0),
  custo_real_rkg_snapshot numeric(14,6) NOT NULL, -- "congela" custo daquele beneficiamento
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===========================================
-- CENÁRIO 2: TERCEIROS / SERVIÇO
-- ===========================================

-- Tabela: operacoes_terceiros
CREATE TABLE public.operacoes_terceiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cliente_id uuid NOT NULL REFERENCES public.parceiros(id),
  beneficiador_id uuid NOT NULL REFERENCES public.parceiros(id),
  status text CHECK (status IN ('ABERTA','ENCERRADA')) DEFAULT 'ABERTA',
  obs text,
  -- Parâmetros comerciais
  perda_comercial_mode text CHECK (perda_comercial_mode IN ('PCT','KG')) DEFAULT 'PCT',
  perda_comercial_val numeric(14,6) NOT NULL DEFAULT 0.00,
  valor_ref_material_rkg numeric(14,6),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean DEFAULT false
);

-- Tabela: entradas_terceiros (remessa do cliente)
CREATE TABLE public.entradas_terceiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operacao_id uuid NOT NULL REFERENCES public.operacoes_terceiros(id),
  dt date NOT NULL,
  documento text,
  kg_recebido numeric(14,3) NOT NULL CHECK (kg_recebido > 0),
  valor_ref_rkg numeric(14,6),
  kg_disponivel numeric(14,3) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean DEFAULT false
);

-- Tabela: beneficiamentos_terceiros (retorno do beneficiador)
CREATE TABLE public.beneficiamentos_terceiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operacao_id uuid NOT NULL REFERENCES public.operacoes_terceiros(id),
  dt date NOT NULL,
  documento text,
  kg_retornado numeric(14,3) NOT NULL CHECK (kg_retornado > 0),
  -- Custos do SERVIÇO
  mo_terceiro_mode text CHECK (mo_terceiro_mode IN ('RKG','TOTAL')) DEFAULT 'RKG',
  mo_terceiro_val numeric(14,6) DEFAULT 0,
  mo_ibrac_mode text CHECK (mo_ibrac_mode IN ('RKG','TOTAL')) DEFAULT 'RKG',
  mo_ibrac_val numeric(14,6) DEFAULT 0,
  frete_ida_mode text CHECK (frete_ida_mode IN ('RKG','TOTAL')) DEFAULT 'RKG',
  frete_ida_val numeric(14,6) DEFAULT 0,
  frete_volta_mode text CHECK (frete_volta_mode IN ('RKG','TOTAL')) DEFAULT 'RKG',
  frete_volta_val numeric(14,6) DEFAULT 0,
  -- Derivados
  custos_servico_total_rs numeric(16,2) DEFAULT 0,
  kg_disponivel_cliente numeric(14,3) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean DEFAULT false
);

-- Tabela: benef_ent_aloc_terceiros (FIFO 1: beneficiamento ← entradas)
CREATE TABLE public.benef_ent_aloc_terceiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiamento_id uuid NOT NULL REFERENCES public.beneficiamentos_terceiros(id) ON DELETE CASCADE,
  entrada_id uuid NOT NULL REFERENCES public.entradas_terceiros(id),
  kg_alocado numeric(14,3) NOT NULL CHECK (kg_alocado > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela: saidas_terceiros (devolução ao cliente)
CREATE TABLE public.saidas_terceiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operacao_id uuid NOT NULL REFERENCES public.operacoes_terceiros(id),
  dt date NOT NULL,
  documento text,
  kg_devolvido numeric(14,3) NOT NULL CHECK (kg_devolvido > 0),
  custo_servico_saida_rs numeric(16,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean DEFAULT false
);

-- Tabela: saida_benef_aloc_terceiros (FIFO 2: saída ← beneficiamentos)
CREATE TABLE public.saida_benef_aloc_terceiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saida_id uuid NOT NULL REFERENCES public.saidas_terceiros(id) ON DELETE CASCADE,
  beneficiamento_id uuid NOT NULL REFERENCES public.beneficiamentos_terceiros(id),
  kg_alocado numeric(14,3) NOT NULL CHECK (kg_alocado > 0),
  custo_servico_rkg_snapshot numeric(14,6) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela: cobrancas_servico_terceiros (receitas do serviço)
CREATE TABLE public.cobrancas_servico_terceiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operacao_id uuid NOT NULL REFERENCES public.operacoes_terceiros(id),
  dt date NOT NULL,
  tipo text CHECK (tipo IN ('MO','SERVICO_ADICIONAL','COMISSAO','OUTRO')) DEFAULT 'MO',
  mode text CHECK (mode IN ('RKG','TOTAL')) DEFAULT 'RKG',
  val numeric(14,6) DEFAULT 0,
  base_kg_mode text CHECK (base_kg_mode IN ('RETORNADO','DEVOLVIDO')) DEFAULT 'DEVOLVIDO',
  documento text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean DEFAULT false
);

-- Tabela: ganhos_material_ibrac (ganho IBRAC por perda comercial > técnica)
CREATE TABLE public.ganhos_material_ibrac (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operacao_id uuid NOT NULL REFERENCES public.operacoes_terceiros(id),
  dt date NOT NULL,
  kg_ganho numeric(14,3) NOT NULL CHECK (kg_ganho > 0),
  valor_ref_rkg numeric(14,6),
  valor_ref_total_rs numeric(16,2) DEFAULT 0,
  origem text DEFAULT 'DIF_PERDA',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===========================================
-- CENÁRIO 3: INTERMEDIAÇÃO
-- ===========================================

-- Tabela: operacoes_intermediacao
CREATE TABLE public.operacoes_intermediacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  dono_economico_id uuid NOT NULL REFERENCES public.parceiros(id), -- ex: RENATO
  beneficiador_id uuid NOT NULL REFERENCES public.parceiros(id),
  comprador_operacional_id uuid NOT NULL REFERENCES public.parceiros(id), -- IBRAC
  status text CHECK (status IN ('ABERTA','ENCERRADA')) DEFAULT 'ABERTA',
  obs text,
  -- Comissão IBRAC
  comissao_mode text CHECK (comissao_mode IN ('PCT','TOTAL')) DEFAULT 'PCT',
  comissao_val numeric(14,6) NOT NULL DEFAULT 0.00,
  valor_ref_material_rkg numeric(14,6),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean DEFAULT false
);

-- Tabela: compras_intermediacao (ENTRADA / compra operacional)
CREATE TABLE public.compras_intermediacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operacao_id uuid NOT NULL REFERENCES public.operacoes_intermediacao(id),
  dt date NOT NULL,
  nf_compra text,
  fornecedor_compra_id uuid REFERENCES public.parceiros(id),
  kg_comprado numeric(14,3) NOT NULL CHECK (kg_comprado > 0),
  preco_compra_rkg numeric(14,6) NOT NULL CHECK (preco_compra_rkg > 0),
  valor_compra_rs numeric(16,2) DEFAULT 0,
  kg_disponivel_compra numeric(14,3) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean DEFAULT false
);

-- Tabela: custos_intermediacao (custos da operação do dono)
CREATE TABLE public.custos_intermediacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operacao_id uuid NOT NULL REFERENCES public.operacoes_intermediacao(id),
  dt date NOT NULL,
  categoria text CHECK (categoria IN ('FRETE','MO_TERCEIRO','MO_IBRAC','FINANCEIRO','OUTRO')) NOT NULL,
  mode text CHECK (mode IN ('RKG','TOTAL')) DEFAULT 'TOTAL',
  val numeric(14,6) NOT NULL DEFAULT 0,
  base_kg_mode text CHECK (base_kg_mode IN ('COMPRADO','BENEFICIADO','VENDIDO')) DEFAULT 'COMPRADO',
  documento text,
  obs text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean DEFAULT false
);

-- Tabela: beneficiamentos_intermediacao
CREATE TABLE public.beneficiamentos_intermediacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operacao_id uuid NOT NULL REFERENCES public.operacoes_intermediacao(id),
  dt date NOT NULL,
  documento text,
  kg_retornado numeric(14,3) NOT NULL CHECK (kg_retornado > 0),
  -- Custos do beneficiamento
  mo_benef_mode text CHECK (mo_benef_mode IN ('RKG','TOTAL')) DEFAULT 'TOTAL',
  mo_benef_val numeric(14,6) DEFAULT 0,
  frete_ida_mode text CHECK (frete_ida_mode IN ('RKG','TOTAL')) DEFAULT 'TOTAL',
  frete_ida_val numeric(14,6) DEFAULT 0,
  frete_volta_mode text CHECK (frete_volta_mode IN ('RKG','TOTAL')) DEFAULT 'TOTAL',
  frete_volta_val numeric(14,6) DEFAULT 0,
  custos_benef_total_rs numeric(16,2) DEFAULT 0,
  kg_disponivel_venda numeric(14,3) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean DEFAULT false
);

-- Tabela: benef_compra_alocacoes (FIFO 1: beneficiamento ← compras)
CREATE TABLE public.benef_compra_alocacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiamento_id uuid NOT NULL REFERENCES public.beneficiamentos_intermediacao(id) ON DELETE CASCADE,
  compra_id uuid NOT NULL REFERENCES public.compras_intermediacao(id),
  kg_alocado numeric(14,3) NOT NULL CHECK (kg_alocado > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela: vendas_intermediacao (SAÍDA / venda operacional)
CREATE TABLE public.vendas_intermediacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operacao_id uuid NOT NULL REFERENCES public.operacoes_intermediacao(id),
  dt date NOT NULL,
  nf_venda text,
  cliente_id uuid REFERENCES public.parceiros(id),
  kg_vendido numeric(14,3) NOT NULL CHECK (kg_vendido > 0),
  preco_venda_rkg numeric(14,6) NOT NULL CHECK (preco_venda_rkg > 0),
  valor_venda_rs numeric(16,2) DEFAULT 0,
  -- Derivados
  custo_material_dono_rs numeric(16,2) DEFAULT 0,
  custos_operacao_alocados_rs numeric(16,2) DEFAULT 0,
  comissao_ibrac_rs numeric(16,2) DEFAULT 0,
  saldo_repassar_rs numeric(16,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean DEFAULT false
);

-- Tabela: venda_benef_alocacoes (FIFO 2: venda ← beneficiamentos)
CREATE TABLE public.venda_benef_alocacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id uuid NOT NULL REFERENCES public.vendas_intermediacao(id) ON DELETE CASCADE,
  beneficiamento_id uuid NOT NULL REFERENCES public.beneficiamentos_intermediacao(id),
  kg_alocado numeric(14,3) NOT NULL CHECK (kg_alocado > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===========================================
-- HABILITAR RLS EM TODAS AS NOVAS TABELAS
-- ===========================================

ALTER TABLE public.operacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entradas_c1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiamentos_c1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benef_entrada_alocacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saidas_c1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saida_benef_alocacoes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.operacoes_terceiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entradas_terceiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiamentos_terceiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benef_ent_aloc_terceiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saidas_terceiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saida_benef_aloc_terceiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cobrancas_servico_terceiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ganhos_material_ibrac ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.operacoes_intermediacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_intermediacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custos_intermediacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiamentos_intermediacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benef_compra_alocacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas_intermediacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venda_benef_alocacoes ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- RLS POLICIES - Cenário 1
-- ===========================================

-- operacoes
CREATE POLICY "Authenticated can view operacoes" ON public.operacoes
  FOR SELECT USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()) AND is_deleted = false);
CREATE POLICY "Admin and Operacao manage operacoes" ON public.operacoes
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- entradas_c1
CREATE POLICY "Authenticated can view entradas_c1" ON public.entradas_c1
  FOR SELECT USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()) AND is_deleted = false);
CREATE POLICY "Admin and Operacao manage entradas_c1" ON public.entradas_c1
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- beneficiamentos_c1
CREATE POLICY "Authenticated can view beneficiamentos_c1" ON public.beneficiamentos_c1
  FOR SELECT USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()) AND is_deleted = false);
CREATE POLICY "Admin and Operacao manage beneficiamentos_c1" ON public.beneficiamentos_c1
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- benef_entrada_alocacoes
CREATE POLICY "Authenticated can view benef_entrada_alocacoes" ON public.benef_entrada_alocacoes
  FOR SELECT USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));
CREATE POLICY "Admin and Operacao manage benef_entrada_alocacoes" ON public.benef_entrada_alocacoes
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- saidas_c1
CREATE POLICY "Authenticated can view saidas_c1" ON public.saidas_c1
  FOR SELECT USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()) AND is_deleted = false);
CREATE POLICY "Admin and Operacao manage saidas_c1" ON public.saidas_c1
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- saida_benef_alocacoes
CREATE POLICY "Authenticated can view saida_benef_alocacoes" ON public.saida_benef_alocacoes
  FOR SELECT USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));
CREATE POLICY "Admin and Operacao manage saida_benef_alocacoes" ON public.saida_benef_alocacoes
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- ===========================================
-- RLS POLICIES - Cenário 2
-- ===========================================

-- operacoes_terceiros
CREATE POLICY "Authenticated can view operacoes_terceiros" ON public.operacoes_terceiros
  FOR SELECT USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()) AND is_deleted = false);
CREATE POLICY "Admin and Operacao manage operacoes_terceiros" ON public.operacoes_terceiros
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- entradas_terceiros
CREATE POLICY "Authenticated can view entradas_terceiros" ON public.entradas_terceiros
  FOR SELECT USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()) AND is_deleted = false);
CREATE POLICY "Admin and Operacao manage entradas_terceiros" ON public.entradas_terceiros
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- beneficiamentos_terceiros
CREATE POLICY "Authenticated can view beneficiamentos_terceiros" ON public.beneficiamentos_terceiros
  FOR SELECT USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()) AND is_deleted = false);
CREATE POLICY "Admin and Operacao manage beneficiamentos_terceiros" ON public.beneficiamentos_terceiros
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- benef_ent_aloc_terceiros
CREATE POLICY "Authenticated can view benef_ent_aloc_terceiros" ON public.benef_ent_aloc_terceiros
  FOR SELECT USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));
CREATE POLICY "Admin and Operacao manage benef_ent_aloc_terceiros" ON public.benef_ent_aloc_terceiros
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- saidas_terceiros
CREATE POLICY "Authenticated can view saidas_terceiros" ON public.saidas_terceiros
  FOR SELECT USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()) AND is_deleted = false);
CREATE POLICY "Admin and Operacao manage saidas_terceiros" ON public.saidas_terceiros
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- saida_benef_aloc_terceiros
CREATE POLICY "Authenticated can view saida_benef_aloc_terceiros" ON public.saida_benef_aloc_terceiros
  FOR SELECT USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));
CREATE POLICY "Admin and Operacao manage saida_benef_aloc_terceiros" ON public.saida_benef_aloc_terceiros
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- cobrancas_servico_terceiros
CREATE POLICY "Authenticated can view cobrancas_servico_terceiros" ON public.cobrancas_servico_terceiros
  FOR SELECT USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()) AND is_deleted = false);
CREATE POLICY "Admin and Financeiro manage cobrancas_servico_terceiros" ON public.cobrancas_servico_terceiros
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro'));

-- ganhos_material_ibrac
CREATE POLICY "Authenticated can view ganhos_material_ibrac" ON public.ganhos_material_ibrac
  FOR SELECT USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));
CREATE POLICY "Admin manage ganhos_material_ibrac" ON public.ganhos_material_ibrac
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ===========================================
-- RLS POLICIES - Cenário 3
-- ===========================================

-- operacoes_intermediacao
CREATE POLICY "Authenticated can view operacoes_intermediacao" ON public.operacoes_intermediacao
  FOR SELECT USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()) AND is_deleted = false);
CREATE POLICY "Admin and Operacao manage operacoes_intermediacao" ON public.operacoes_intermediacao
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- compras_intermediacao
CREATE POLICY "Authenticated can view compras_intermediacao" ON public.compras_intermediacao
  FOR SELECT USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()) AND is_deleted = false);
CREATE POLICY "Admin and Operacao manage compras_intermediacao" ON public.compras_intermediacao
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- custos_intermediacao
CREATE POLICY "Authenticated can view custos_intermediacao" ON public.custos_intermediacao
  FOR SELECT USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()) AND is_deleted = false);
CREATE POLICY "Admin and Financeiro manage custos_intermediacao" ON public.custos_intermediacao
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro'));

-- beneficiamentos_intermediacao
CREATE POLICY "Authenticated can view beneficiamentos_intermediacao" ON public.beneficiamentos_intermediacao
  FOR SELECT USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()) AND is_deleted = false);
CREATE POLICY "Admin and Operacao manage beneficiamentos_intermediacao" ON public.beneficiamentos_intermediacao
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- benef_compra_alocacoes
CREATE POLICY "Authenticated can view benef_compra_alocacoes" ON public.benef_compra_alocacoes
  FOR SELECT USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));
CREATE POLICY "Admin and Operacao manage benef_compra_alocacoes" ON public.benef_compra_alocacoes
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- vendas_intermediacao
CREATE POLICY "Authenticated can view vendas_intermediacao" ON public.vendas_intermediacao
  FOR SELECT USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()) AND is_deleted = false);
CREATE POLICY "Admin and Operacao manage vendas_intermediacao" ON public.vendas_intermediacao
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- venda_benef_alocacoes
CREATE POLICY "Authenticated can view venda_benef_alocacoes" ON public.venda_benef_alocacoes
  FOR SELECT USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));
CREATE POLICY "Admin and Operacao manage venda_benef_alocacoes" ON public.venda_benef_alocacoes
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- ===========================================
-- TRIGGERS updated_at
-- ===========================================

CREATE TRIGGER set_updated_at_operacoes BEFORE UPDATE ON public.operacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_entradas_c1 BEFORE UPDATE ON public.entradas_c1
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_beneficiamentos_c1 BEFORE UPDATE ON public.beneficiamentos_c1
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_saidas_c1 BEFORE UPDATE ON public.saidas_c1
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_operacoes_terceiros BEFORE UPDATE ON public.operacoes_terceiros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_entradas_terceiros BEFORE UPDATE ON public.entradas_terceiros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_beneficiamentos_terceiros BEFORE UPDATE ON public.beneficiamentos_terceiros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_saidas_terceiros BEFORE UPDATE ON public.saidas_terceiros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_cobrancas_servico_terceiros BEFORE UPDATE ON public.cobrancas_servico_terceiros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_operacoes_intermediacao BEFORE UPDATE ON public.operacoes_intermediacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_compras_intermediacao BEFORE UPDATE ON public.compras_intermediacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_custos_intermediacao BEFORE UPDATE ON public.custos_intermediacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_beneficiamentos_intermediacao BEFORE UPDATE ON public.beneficiamentos_intermediacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_vendas_intermediacao BEFORE UPDATE ON public.vendas_intermediacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- Adicionar campo tipo na tabela parceiros
-- ===========================================

ALTER TABLE public.parceiros ADD COLUMN IF NOT EXISTS tipo text CHECK (tipo IN ('CLIENTE','FORNECEDOR','BENEFICIADOR','DONO','TRANSPORTADORA','INTERNO'));

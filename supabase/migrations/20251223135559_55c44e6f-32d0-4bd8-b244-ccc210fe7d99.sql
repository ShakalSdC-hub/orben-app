-- ===========================================
-- MIGRAÇÃO: FOREIGN KEYS + ÍNDICES COMPLETOS
-- Pré-requisito: Zero órfãos (verificado)
-- Política: ON DELETE RESTRICT para integridade
-- ===========================================

-- =====================
-- 1. SUBLOTES
-- =====================

-- FK: sublotes.entrada_id -> entradas.id
ALTER TABLE public.sublotes
ADD CONSTRAINT fk_sublotes_entrada
FOREIGN KEY (entrada_id) REFERENCES public.entradas(id)
ON DELETE RESTRICT;

-- FK: sublotes.dono_id -> donos_material.id
ALTER TABLE public.sublotes
ADD CONSTRAINT fk_sublotes_dono
FOREIGN KEY (dono_id) REFERENCES public.donos_material(id)
ON DELETE RESTRICT;

-- FK: sublotes.tipo_produto_id -> tipos_produto.id
ALTER TABLE public.sublotes
ADD CONSTRAINT fk_sublotes_tipo_produto
FOREIGN KEY (tipo_produto_id) REFERENCES public.tipos_produto(id)
ON DELETE RESTRICT;

-- FK: sublotes.local_estoque_id -> locais_estoque.id
ALTER TABLE public.sublotes
ADD CONSTRAINT fk_sublotes_local_estoque
FOREIGN KEY (local_estoque_id) REFERENCES public.locais_estoque(id)
ON DELETE RESTRICT;

-- FK: sublotes.lote_pai_id -> sublotes.id (auto-referência)
ALTER TABLE public.sublotes
ADD CONSTRAINT fk_sublotes_lote_pai
FOREIGN KEY (lote_pai_id) REFERENCES public.sublotes(id)
ON DELETE RESTRICT;

-- Índices sublotes
CREATE INDEX IF NOT EXISTS idx_sublotes_dono_id ON public.sublotes(dono_id);
CREATE INDEX IF NOT EXISTS idx_sublotes_status ON public.sublotes(status);
CREATE INDEX IF NOT EXISTS idx_sublotes_entrada_id ON public.sublotes(entrada_id);
CREATE INDEX IF NOT EXISTS idx_sublotes_tipo_produto_id ON public.sublotes(tipo_produto_id);

-- =====================
-- 2. ENTRADAS
-- =====================

-- FK: entradas.dono_id -> donos_material.id
ALTER TABLE public.entradas
ADD CONSTRAINT fk_entradas_dono
FOREIGN KEY (dono_id) REFERENCES public.donos_material(id)
ON DELETE RESTRICT;

-- FK: entradas.parceiro_id -> parceiros.id
ALTER TABLE public.entradas
ADD CONSTRAINT fk_entradas_parceiro
FOREIGN KEY (parceiro_id) REFERENCES public.parceiros(id)
ON DELETE RESTRICT;

-- FK: entradas.transportadora_id -> parceiros.id
ALTER TABLE public.entradas
ADD CONSTRAINT fk_entradas_transportadora
FOREIGN KEY (transportadora_id) REFERENCES public.parceiros(id)
ON DELETE RESTRICT;

-- FK: entradas.tipo_entrada_id -> tipos_entrada.id
ALTER TABLE public.entradas
ADD CONSTRAINT fk_entradas_tipo_entrada
FOREIGN KEY (tipo_entrada_id) REFERENCES public.tipos_entrada(id)
ON DELETE RESTRICT;

-- FK: entradas.tipo_produto_id -> tipos_produto.id
ALTER TABLE public.entradas
ADD CONSTRAINT fk_entradas_tipo_produto
FOREIGN KEY (tipo_produto_id) REFERENCES public.tipos_produto(id)
ON DELETE RESTRICT;

-- FK: entradas.conferente_id -> profiles.id
ALTER TABLE public.entradas
ADD CONSTRAINT fk_entradas_conferente
FOREIGN KEY (conferente_id) REFERENCES public.profiles(id)
ON DELETE RESTRICT;

-- FK: entradas.created_by -> profiles.id
ALTER TABLE public.entradas
ADD CONSTRAINT fk_entradas_created_by
FOREIGN KEY (created_by) REFERENCES public.profiles(id)
ON DELETE RESTRICT;

-- Índice adicional
CREATE INDEX IF NOT EXISTS idx_entradas_status ON public.entradas(status);

-- =====================
-- 3. SAÍDAS
-- =====================

-- FK: saidas.cliente_id -> clientes.id
ALTER TABLE public.saidas
ADD CONSTRAINT fk_saidas_cliente
FOREIGN KEY (cliente_id) REFERENCES public.clientes(id)
ON DELETE RESTRICT;

-- FK: saidas.transportadora_id -> parceiros.id
ALTER TABLE public.saidas
ADD CONSTRAINT fk_saidas_transportadora
FOREIGN KEY (transportadora_id) REFERENCES public.parceiros(id)
ON DELETE RESTRICT;

-- FK: saidas.tipo_saida_id -> tipos_saida.id
ALTER TABLE public.saidas
ADD CONSTRAINT fk_saidas_tipo_saida
FOREIGN KEY (tipo_saida_id) REFERENCES public.tipos_saida(id)
ON DELETE RESTRICT;

-- FK: saidas.created_by -> profiles.id
ALTER TABLE public.saidas
ADD CONSTRAINT fk_saidas_created_by
FOREIGN KEY (created_by) REFERENCES public.profiles(id)
ON DELETE RESTRICT;

-- Índices saidas
CREATE INDEX IF NOT EXISTS idx_saidas_data_saida ON public.saidas(data_saida);
CREATE INDEX IF NOT EXISTS idx_saidas_cliente_id ON public.saidas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_saidas_status ON public.saidas(status);

-- =====================
-- 4. SAIDA_ITENS
-- =====================

-- FK: saida_itens.saida_id -> saidas.id
ALTER TABLE public.saida_itens
ADD CONSTRAINT fk_saida_itens_saida
FOREIGN KEY (saida_id) REFERENCES public.saidas(id)
ON DELETE CASCADE; -- CASCADE: deletar saída remove itens

-- FK: saida_itens.sublote_id -> sublotes.id
ALTER TABLE public.saida_itens
ADD CONSTRAINT fk_saida_itens_sublote
FOREIGN KEY (sublote_id) REFERENCES public.sublotes(id)
ON DELETE RESTRICT;

-- Índices
CREATE INDEX IF NOT EXISTS idx_saida_itens_saida_id ON public.saida_itens(saida_id);
CREATE INDEX IF NOT EXISTS idx_saida_itens_sublote_id ON public.saida_itens(sublote_id);

-- =====================
-- 5. BENEFICIAMENTOS
-- =====================

-- FK: beneficiamentos.processo_id -> processos.id
ALTER TABLE public.beneficiamentos
ADD CONSTRAINT fk_beneficiamentos_processo
FOREIGN KEY (processo_id) REFERENCES public.processos(id)
ON DELETE RESTRICT;

-- FK: beneficiamentos.fornecedor_terceiro_id -> parceiros.id
ALTER TABLE public.beneficiamentos
ADD CONSTRAINT fk_beneficiamentos_fornecedor
FOREIGN KEY (fornecedor_terceiro_id) REFERENCES public.parceiros(id)
ON DELETE RESTRICT;

-- FK: beneficiamentos.transportadora_id -> parceiros.id
ALTER TABLE public.beneficiamentos
ADD CONSTRAINT fk_beneficiamentos_transportadora
FOREIGN KEY (transportadora_id) REFERENCES public.parceiros(id)
ON DELETE RESTRICT;

-- FK: beneficiamentos.created_by -> profiles.id
ALTER TABLE public.beneficiamentos
ADD CONSTRAINT fk_beneficiamentos_created_by
FOREIGN KEY (created_by) REFERENCES public.profiles(id)
ON DELETE RESTRICT;

-- =====================
-- 6. BENEFICIAMENTO_ENTRADAS
-- =====================

-- FK: beneficiamento_entradas.beneficiamento_id -> beneficiamentos.id
ALTER TABLE public.beneficiamento_entradas
ADD CONSTRAINT fk_benef_entradas_beneficiamento
FOREIGN KEY (beneficiamento_id) REFERENCES public.beneficiamentos(id)
ON DELETE CASCADE;

-- FK: beneficiamento_entradas.entrada_id -> entradas.id
ALTER TABLE public.beneficiamento_entradas
ADD CONSTRAINT fk_benef_entradas_entrada
FOREIGN KEY (entrada_id) REFERENCES public.entradas(id)
ON DELETE RESTRICT;

-- Índices
CREATE INDEX IF NOT EXISTS idx_benef_entradas_beneficiamento_id ON public.beneficiamento_entradas(beneficiamento_id);

-- =====================
-- 7. BENEFICIAMENTO_ITENS_ENTRADA
-- =====================

-- FK: beneficiamento_itens_entrada.beneficiamento_id -> beneficiamentos.id
ALTER TABLE public.beneficiamento_itens_entrada
ADD CONSTRAINT fk_bie_beneficiamento
FOREIGN KEY (beneficiamento_id) REFERENCES public.beneficiamentos(id)
ON DELETE CASCADE;

-- FK: beneficiamento_itens_entrada.sublote_id -> sublotes.id
ALTER TABLE public.beneficiamento_itens_entrada
ADD CONSTRAINT fk_bie_sublote
FOREIGN KEY (sublote_id) REFERENCES public.sublotes(id)
ON DELETE RESTRICT;

-- FK: beneficiamento_itens_entrada.tipo_produto_id -> tipos_produto.id
ALTER TABLE public.beneficiamento_itens_entrada
ADD CONSTRAINT fk_bie_tipo_produto
FOREIGN KEY (tipo_produto_id) REFERENCES public.tipos_produto(id)
ON DELETE RESTRICT;

-- Índices
CREATE INDEX IF NOT EXISTS idx_bie_beneficiamento_id ON public.beneficiamento_itens_entrada(beneficiamento_id);
CREATE INDEX IF NOT EXISTS idx_bie_sublote_id ON public.beneficiamento_itens_entrada(sublote_id);

-- =====================
-- 8. BENEFICIAMENTO_ITENS_SAIDA
-- =====================

-- FK: beneficiamento_itens_saida.beneficiamento_id -> beneficiamentos.id
ALTER TABLE public.beneficiamento_itens_saida
ADD CONSTRAINT fk_bis_beneficiamento
FOREIGN KEY (beneficiamento_id) REFERENCES public.beneficiamentos(id)
ON DELETE CASCADE;

-- FK: beneficiamento_itens_saida.sublote_gerado_id -> sublotes.id
ALTER TABLE public.beneficiamento_itens_saida
ADD CONSTRAINT fk_bis_sublote_gerado
FOREIGN KEY (sublote_gerado_id) REFERENCES public.sublotes(id)
ON DELETE RESTRICT;

-- FK: beneficiamento_itens_saida.tipo_produto_id -> tipos_produto.id
ALTER TABLE public.beneficiamento_itens_saida
ADD CONSTRAINT fk_bis_tipo_produto
FOREIGN KEY (tipo_produto_id) REFERENCES public.tipos_produto(id)
ON DELETE RESTRICT;

-- FK: beneficiamento_itens_saida.local_estoque_id -> locais_estoque.id
ALTER TABLE public.beneficiamento_itens_saida
ADD CONSTRAINT fk_bis_local_estoque
FOREIGN KEY (local_estoque_id) REFERENCES public.locais_estoque(id)
ON DELETE RESTRICT;

-- Índices
CREATE INDEX IF NOT EXISTS idx_bis_beneficiamento_id ON public.beneficiamento_itens_saida(beneficiamento_id);

-- =====================
-- 9. BENEFICIAMENTO_PRODUTOS
-- =====================

-- FK: beneficiamento_produtos.beneficiamento_id -> beneficiamentos.id
ALTER TABLE public.beneficiamento_produtos
ADD CONSTRAINT fk_benef_prod_beneficiamento
FOREIGN KEY (beneficiamento_id) REFERENCES public.beneficiamentos(id)
ON DELETE CASCADE;

-- FK: beneficiamento_produtos.tipo_produto_id -> tipos_produto.id
ALTER TABLE public.beneficiamento_produtos
ADD CONSTRAINT fk_benef_prod_tipo_produto
FOREIGN KEY (tipo_produto_id) REFERENCES public.tipos_produto(id)
ON DELETE RESTRICT;

-- =====================
-- 10. ACERTOS_FINANCEIROS
-- =====================

-- FK: acertos_financeiros.dono_id -> donos_material.id
ALTER TABLE public.acertos_financeiros
ADD CONSTRAINT fk_acertos_dono
FOREIGN KEY (dono_id) REFERENCES public.donos_material(id)
ON DELETE RESTRICT;

-- FK: acertos_financeiros.parceiro_id -> parceiros.id
ALTER TABLE public.acertos_financeiros
ADD CONSTRAINT fk_acertos_parceiro
FOREIGN KEY (parceiro_id) REFERENCES public.parceiros(id)
ON DELETE RESTRICT;

-- FK: acertos_financeiros.created_by -> profiles.id
ALTER TABLE public.acertos_financeiros
ADD CONSTRAINT fk_acertos_created_by
FOREIGN KEY (created_by) REFERENCES public.profiles(id)
ON DELETE RESTRICT;

-- Índice referencia_tipo para queries polimórficas
CREATE INDEX IF NOT EXISTS idx_acertos_referencia_tipo ON public.acertos_financeiros(referencia_tipo);

-- =====================
-- 11. MOVIMENTACOES
-- =====================

-- FK: movimentacoes.sublote_id -> sublotes.id
ALTER TABLE public.movimentacoes
ADD CONSTRAINT fk_movimentacoes_sublote
FOREIGN KEY (sublote_id) REFERENCES public.sublotes(id)
ON DELETE RESTRICT;

-- FK: movimentacoes.local_origem_id -> locais_estoque.id
ALTER TABLE public.movimentacoes
ADD CONSTRAINT fk_movimentacoes_local_origem
FOREIGN KEY (local_origem_id) REFERENCES public.locais_estoque(id)
ON DELETE RESTRICT;

-- FK: movimentacoes.local_destino_id -> locais_estoque.id
ALTER TABLE public.movimentacoes
ADD CONSTRAINT fk_movimentacoes_local_destino
FOREIGN KEY (local_destino_id) REFERENCES public.locais_estoque(id)
ON DELETE RESTRICT;

-- FK: movimentacoes.created_by -> profiles.id
ALTER TABLE public.movimentacoes
ADD CONSTRAINT fk_movimentacoes_created_by
FOREIGN KEY (created_by) REFERENCES public.profiles(id)
ON DELETE RESTRICT;

-- Índices
CREATE INDEX IF NOT EXISTS idx_movimentacoes_sublote_id ON public.movimentacoes(sublote_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_created_at ON public.movimentacoes(created_at);

-- =====================
-- 12. TRANSFERENCIAS_DONO
-- =====================

-- FK: transferencias_dono.sublote_id -> sublotes.id
ALTER TABLE public.transferencias_dono
ADD CONSTRAINT fk_transf_dono_sublote
FOREIGN KEY (sublote_id) REFERENCES public.sublotes(id)
ON DELETE RESTRICT;

-- FK: transferencias_dono.dono_origem_id -> donos_material.id
ALTER TABLE public.transferencias_dono
ADD CONSTRAINT fk_transf_dono_origem
FOREIGN KEY (dono_origem_id) REFERENCES public.donos_material(id)
ON DELETE RESTRICT;

-- FK: transferencias_dono.dono_destino_id -> donos_material.id
ALTER TABLE public.transferencias_dono
ADD CONSTRAINT fk_transf_dono_destino
FOREIGN KEY (dono_destino_id) REFERENCES public.donos_material(id)
ON DELETE RESTRICT;

-- FK: transferencias_dono.created_by -> profiles.id
ALTER TABLE public.transferencias_dono
ADD CONSTRAINT fk_transf_dono_created_by
FOREIGN KEY (created_by) REFERENCES public.profiles(id)
ON DELETE RESTRICT;

-- Índice
CREATE INDEX IF NOT EXISTS idx_transf_dono_data ON public.transferencias_dono(data_transferencia);

-- =====================
-- 13. PRECOS_MO_TERCEIROS
-- =====================

-- FK: precos_mo_terceiros.fornecedor_id -> parceiros.id
ALTER TABLE public.precos_mo_terceiros
ADD CONSTRAINT fk_precos_mo_fornecedor
FOREIGN KEY (fornecedor_id) REFERENCES public.parceiros(id)
ON DELETE RESTRICT;

-- FK: precos_mo_terceiros.processo_id -> processos.id
ALTER TABLE public.precos_mo_terceiros
ADD CONSTRAINT fk_precos_mo_processo
FOREIGN KEY (processo_id) REFERENCES public.processos(id)
ON DELETE RESTRICT;

-- FK: precos_mo_terceiros.tipo_produto_id -> tipos_produto.id
ALTER TABLE public.precos_mo_terceiros
ADD CONSTRAINT fk_precos_mo_tipo_produto
FOREIGN KEY (tipo_produto_id) REFERENCES public.tipos_produto(id)
ON DELETE RESTRICT;

-- =====================
-- 14. LME_SEMANA_CONFIG
-- =====================

-- FK: lme_semana_config.created_by -> profiles.id
ALTER TABLE public.lme_semana_config
ADD CONSTRAINT fk_lme_config_created_by
FOREIGN KEY (created_by) REFERENCES public.profiles(id)
ON DELETE RESTRICT;

-- =====================
-- 15. SIMULACOES_LME
-- =====================

-- FK: simulacoes_lme.created_by -> profiles.id
ALTER TABLE public.simulacoes_lme
ADD CONSTRAINT fk_simulacoes_created_by
FOREIGN KEY (created_by) REFERENCES public.profiles(id)
ON DELETE RESTRICT;

-- =====================
-- 16. USER_ROLES
-- =====================

-- FK: user_roles.user_id -> auth.users.id
ALTER TABLE public.user_roles
ADD CONSTRAINT fk_user_roles_user
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE;
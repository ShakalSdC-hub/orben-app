-- Remover tabelas antigas (ordem inversa de dependência)

-- Primeiro remover tabelas de relacionamento/itens
DROP TABLE IF EXISTS public.saida_itens CASCADE;
DROP TABLE IF EXISTS public.beneficiamento_itens_saida CASCADE;
DROP TABLE IF EXISTS public.beneficiamento_itens_entrada CASCADE;
DROP TABLE IF EXISTS public.beneficiamento_produtos CASCADE;
DROP TABLE IF EXISTS public.beneficiamento_entradas CASCADE;

-- Remover tabelas principais de movimentação
DROP TABLE IF EXISTS public.movimentacoes CASCADE;
DROP TABLE IF EXISTS public.sublotes CASCADE;
DROP TABLE IF EXISTS public.saidas CASCADE;
DROP TABLE IF EXISTS public.beneficiamentos CASCADE;
DROP TABLE IF EXISTS public.entradas CASCADE;

-- Remover tabelas de cadastro antigas (dados já migrados para parceiros)
DROP TABLE IF EXISTS public.donos_material CASCADE;
DROP TABLE IF EXISTS public.clientes CASCADE;

-- Remover tabelas de configuração que não são mais necessárias
DROP TABLE IF EXISTS public.tipos_entrada CASCADE;
DROP TABLE IF EXISTS public.tipos_produto CASCADE;
DROP TABLE IF EXISTS public.processos CASCADE;
DROP TABLE IF EXISTS public.locais_estoque CASCADE;
DROP TABLE IF EXISTS public.precos_mo_terceiros CASCADE;

-- Remover tabela de simulações LME (será recriada se necessário)
DROP TABLE IF EXISTS public.simulacoes_lme CASCADE;
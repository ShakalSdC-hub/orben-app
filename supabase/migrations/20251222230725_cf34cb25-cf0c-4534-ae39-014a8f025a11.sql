-- Fase 1: Ajustes no Banco de Dados para Cenários ORBEN

-- 1.1. Adicionar campo is_ibrac em donos_material para identificar a empresa operadora
ALTER TABLE public.donos_material 
ADD COLUMN IF NOT EXISTS is_ibrac boolean DEFAULT false;

-- 1.2. Novos campos na tabela beneficiamentos para lucro na perda
ALTER TABLE public.beneficiamentos 
ADD COLUMN IF NOT EXISTS lucro_perda_kg numeric DEFAULT 0;

ALTER TABLE public.beneficiamentos 
ADD COLUMN IF NOT EXISTS lucro_perda_valor numeric DEFAULT 0;

-- 1.3. Novos campos na tabela saidas para controle por cenário
ALTER TABLE public.saidas 
ADD COLUMN IF NOT EXISTS comissao_ibrac numeric DEFAULT 0;

ALTER TABLE public.saidas 
ADD COLUMN IF NOT EXISTS resultado_liquido_dono numeric DEFAULT 0;

ALTER TABLE public.saidas 
ADD COLUMN IF NOT EXISTS cenario_operacao text;

-- Comentário explicativo dos cenários
COMMENT ON COLUMN public.saidas.cenario_operacao IS 'proprio = Material IBRAC, industrializacao = Remessa de terceiro, operacao_terceiro = Compra operacional com dono terceiro';
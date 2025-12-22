-- 1. Corrigir FK entradas_fornecedor_id_fkey para apontar para parceiros
ALTER TABLE public.entradas 
DROP CONSTRAINT IF EXISTS entradas_fornecedor_id_fkey;

-- Manter a coluna fornecedor_id como nullable (já não é usada, mantém compatibilidade)
-- O sistema usa parceiro_id agora

-- 2. Corrigir FK precos_mo_terceiros_fornecedor_id_fkey para apontar para parceiros
ALTER TABLE public.precos_mo_terceiros 
DROP CONSTRAINT IF EXISTS precos_mo_terceiros_fornecedor_id_fkey;

ALTER TABLE public.precos_mo_terceiros
ADD CONSTRAINT precos_mo_terceiros_fornecedor_id_fkey 
FOREIGN KEY (fornecedor_id) REFERENCES public.parceiros(id);

-- 3. Remover tabela fornecedores que está vazia e não é mais utilizada
DROP TABLE IF EXISTS public.fornecedores;
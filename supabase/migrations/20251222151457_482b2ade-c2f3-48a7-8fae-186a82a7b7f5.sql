-- Remover FK antiga que referencia fornecedores
ALTER TABLE public.beneficiamentos 
DROP CONSTRAINT IF EXISTS beneficiamentos_fornecedor_terceiro_id_fkey;

-- Criar nova FK referenciando parceiros (onde estão os fornecedores reais)
ALTER TABLE public.beneficiamentos
ADD CONSTRAINT beneficiamentos_fornecedor_terceiro_id_fkey 
FOREIGN KEY (fornecedor_terceiro_id) REFERENCES public.parceiros(id);
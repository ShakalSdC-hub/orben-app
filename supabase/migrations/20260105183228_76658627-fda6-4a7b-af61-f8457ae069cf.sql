-- Adicionar colunas de preço por tipo de sucata (MEL e Mista)
ALTER TABLE public.entradas_c1 
ADD COLUMN valor_unit_mel_rkg numeric(14,6) NULL,
ADD COLUMN valor_unit_mista_rkg numeric(14,6) NULL;

-- Migrar dados existentes: copiar valor_unit_sucata_rkg para ambos os campos
UPDATE public.entradas_c1 
SET valor_unit_mel_rkg = valor_unit_sucata_rkg,
    valor_unit_mista_rkg = valor_unit_sucata_rkg
WHERE valor_unit_sucata_rkg IS NOT NULL;
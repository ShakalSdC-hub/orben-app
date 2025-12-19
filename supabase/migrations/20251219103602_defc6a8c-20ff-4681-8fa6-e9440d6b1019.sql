-- Tabela unificada de Parceiros (clientes + fornecedores)
CREATE TABLE public.parceiros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  is_fornecedor BOOLEAN DEFAULT false,
  is_cliente BOOLEAN DEFAULT false,
  is_transportadora BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.parceiros ENABLE ROW LEVEL SECURITY;

-- Policies for parceiros
CREATE POLICY "Authenticated users can view parceiros" 
ON public.parceiros 
FOR SELECT 
USING (true);

CREATE POLICY "Comercial and admins can manage parceiros" 
ON public.parceiros 
FOR ALL 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerente_geral') OR has_role(auth.uid(), 'comercial') OR has_role(auth.uid(), 'compras'));

-- Trigger para updated_at
CREATE TRIGGER update_parceiros_updated_at
BEFORE UPDATE ON public.parceiros
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar campos de transporte nas entradas
ALTER TABLE public.entradas 
ADD COLUMN IF NOT EXISTS parceiro_id UUID REFERENCES public.parceiros(id),
ADD COLUMN IF NOT EXISTS motorista TEXT,
ADD COLUMN IF NOT EXISTS placa_veiculo TEXT,
ADD COLUMN IF NOT EXISTS transportadora_id UUID REFERENCES public.parceiros(id),
ADD COLUMN IF NOT EXISTS peso_nf_kg NUMERIC,
ADD COLUMN IF NOT EXISTS conferente_id UUID;

-- Adicionar campos de transporte nas saídas
ALTER TABLE public.saidas 
ADD COLUMN IF NOT EXISTS transportadora_id UUID REFERENCES public.parceiros(id),
ADD COLUMN IF NOT EXISTS motorista TEXT,
ADD COLUMN IF NOT EXISTS placa_veiculo TEXT;

-- Adicionar campos de transporte nos beneficiamentos
ALTER TABLE public.beneficiamentos 
ADD COLUMN IF NOT EXISTS transportadora_id UUID REFERENCES public.parceiros(id),
ADD COLUMN IF NOT EXISTS motorista TEXT,
ADD COLUMN IF NOT EXISTS placa_veiculo TEXT;

-- Tabela de tickets/volumes (sublotes com estrutura pai/filho)
-- Adicionar campo de lote pai nos sublotes
ALTER TABLE public.sublotes
ADD COLUMN IF NOT EXISTS lote_pai_id UUID REFERENCES public.sublotes(id),
ADD COLUMN IF NOT EXISTS numero_volume INTEGER DEFAULT 1;

-- Migrar dados existentes de fornecedores para parceiros
INSERT INTO public.parceiros (razao_social, nome_fantasia, cnpj, telefone, email, endereco, cidade, estado, cep, is_fornecedor, ativo, created_at, updated_at)
SELECT razao_social, nome_fantasia, cnpj, telefone, email, endereco, cidade, estado, cep, true, ativo, created_at, updated_at
FROM public.fornecedores
ON CONFLICT DO NOTHING;

-- Migrar dados existentes de clientes para parceiros
INSERT INTO public.parceiros (razao_social, nome_fantasia, cnpj, telefone, email, endereco, cidade, estado, cep, is_cliente, ativo, created_at, updated_at)
SELECT razao_social, nome_fantasia, cnpj, telefone, email, endereco, cidade, estado, cep, true, ativo, created_at, updated_at
FROM public.clientes
ON CONFLICT DO NOTHING;
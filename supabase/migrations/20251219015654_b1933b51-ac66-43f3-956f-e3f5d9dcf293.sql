
-- Enum para os perfis de usuário
CREATE TYPE public.app_role AS ENUM ('admin', 'gerente_geral', 'financeiro', 'compras', 'pcp', 'comercial', 'expedicao');

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de roles de usuário (separada para segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Tabela de fornecedores
CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT UNIQUE,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT UNIQUE,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de locais de estoque
CREATE TABLE public.locais_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('proprio', 'terceiro', 'transito', 'cliente')),
  capacidade_kg DECIMAL(12,2),
  endereco TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de entradas de material
CREATE TABLE public.entradas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo_material TEXT NOT NULL,
  peso_bruto_kg DECIMAL(12,2) NOT NULL,
  peso_liquido_kg DECIMAL(12,2) NOT NULL,
  teor_cobre DECIMAL(5,2),
  valor_unitario DECIMAL(12,4),
  valor_total DECIMAL(14,2),
  nota_fiscal TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'conferido', 'processado', 'cancelado')),
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de sub-lotes
CREATE TABLE public.sublotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  entrada_id UUID REFERENCES public.entradas(id),
  local_estoque_id UUID REFERENCES public.locais_estoque(id),
  peso_kg DECIMAL(12,2) NOT NULL,
  teor_cobre DECIMAL(5,2),
  status TEXT DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'reservado', 'processando', 'expedido')),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de saídas de material
CREATE TABLE public.saidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id),
  data_saida DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo_saida TEXT NOT NULL CHECK (tipo_saida IN ('venda', 'transferencia', 'beneficiamento', 'devolucao')),
  peso_total_kg DECIMAL(12,2) NOT NULL,
  valor_unitario DECIMAL(12,4),
  valor_total DECIMAL(14,2),
  nota_fiscal TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'expedido', 'cancelado')),
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de itens da saída (relaciona sublotes com saídas)
CREATE TABLE public.saida_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saida_id UUID REFERENCES public.saidas(id) ON DELETE CASCADE,
  sublote_id UUID REFERENCES public.sublotes(id),
  peso_kg DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de movimentações de estoque
CREATE TABLE public.movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sublote_id UUID REFERENCES public.sublotes(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'transferencia', 'ajuste')),
  local_origem_id UUID REFERENCES public.locais_estoque(id),
  local_destino_id UUID REFERENCES public.locais_estoque(id),
  peso_kg DECIMAL(12,2) NOT NULL,
  motivo TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Função para verificar role do usuário
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para obter role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Trigger para criar profile automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_locais_estoque_updated_at BEFORE UPDATE ON public.locais_estoque FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_entradas_updated_at BEFORE UPDATE ON public.entradas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sublotes_updated_at BEFORE UPDATE ON public.sublotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_saidas_updated_at BEFORE UPDATE ON public.saidas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locais_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sublotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saida_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;

-- RLS Policies para profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente_geral'));

-- RLS Policies para user_roles (apenas admins podem gerenciar)
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies para fornecedores (leitura para todos autenticados, escrita para compras/admin)
CREATE POLICY "Authenticated users can view fornecedores" ON public.fornecedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Compras and admins can manage fornecedores" ON public.fornecedores FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'gerente_geral') OR 
  public.has_role(auth.uid(), 'compras')
);

-- RLS Policies para clientes
CREATE POLICY "Authenticated users can view clientes" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Comercial and admins can manage clientes" ON public.clientes FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'gerente_geral') OR 
  public.has_role(auth.uid(), 'comercial')
);

-- RLS Policies para locais_estoque
CREATE POLICY "Authenticated users can view locais" ON public.locais_estoque FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage locais" ON public.locais_estoque FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'gerente_geral')
);

-- RLS Policies para entradas
CREATE POLICY "Authenticated users can view entradas" ON public.entradas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Compras and PCP can manage entradas" ON public.entradas FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'gerente_geral') OR 
  public.has_role(auth.uid(), 'compras') OR 
  public.has_role(auth.uid(), 'pcp')
);

-- RLS Policies para sublotes
CREATE POLICY "Authenticated users can view sublotes" ON public.sublotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "PCP and admins can manage sublotes" ON public.sublotes FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'gerente_geral') OR 
  public.has_role(auth.uid(), 'pcp')
);

-- RLS Policies para saidas
CREATE POLICY "Authenticated users can view saidas" ON public.saidas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Comercial and Expedicao can manage saidas" ON public.saidas FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'gerente_geral') OR 
  public.has_role(auth.uid(), 'comercial') OR 
  public.has_role(auth.uid(), 'expedicao')
);

-- RLS Policies para saida_itens
CREATE POLICY "Authenticated users can view saida_itens" ON public.saida_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Comercial and Expedicao can manage saida_itens" ON public.saida_itens FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'gerente_geral') OR 
  public.has_role(auth.uid(), 'comercial') OR 
  public.has_role(auth.uid(), 'expedicao')
);

-- RLS Policies para movimentacoes
CREATE POLICY "Authenticated users can view movimentacoes" ON public.movimentacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "PCP and Expedicao can create movimentacoes" ON public.movimentacoes FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'gerente_geral') OR 
  public.has_role(auth.uid(), 'pcp') OR 
  public.has_role(auth.uid(), 'expedicao')
);

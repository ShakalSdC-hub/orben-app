-- Drop all RLS policies that depend on has_role function
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Compras and admins can manage fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Comercial and admins can manage clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins can manage locais" ON public.locais_estoque;
DROP POLICY IF EXISTS "Compras and PCP can manage entradas" ON public.entradas;
DROP POLICY IF EXISTS "PCP and admins can manage sublotes" ON public.sublotes;
DROP POLICY IF EXISTS "Comercial and Expedicao can manage saidas" ON public.saidas;
DROP POLICY IF EXISTS "Comercial and Expedicao can manage saida_itens" ON public.saida_itens;
DROP POLICY IF EXISTS "PCP and Expedicao can create movimentacoes" ON public.movimentacoes;
DROP POLICY IF EXISTS "Admins can manage donos_material" ON public.donos_material;
DROP POLICY IF EXISTS "Admins can manage tipos_produto" ON public.tipos_produto;
DROP POLICY IF EXISTS "Admins can manage tipos_entrada" ON public.tipos_entrada;
DROP POLICY IF EXISTS "Admins can manage tipos_saida" ON public.tipos_saida;
DROP POLICY IF EXISTS "Admins can manage processos" ON public.processos;
DROP POLICY IF EXISTS "Compras and admins can manage precos_mo_terceiros" ON public.precos_mo_terceiros;
DROP POLICY IF EXISTS "PCP and admins can manage beneficiamentos" ON public.beneficiamentos;
DROP POLICY IF EXISTS "PCP and admins can manage beneficiamento_itens_entrada" ON public.beneficiamento_itens_entrada;
DROP POLICY IF EXISTS "PCP and admins can manage beneficiamento_itens_saida" ON public.beneficiamento_itens_saida;
DROP POLICY IF EXISTS "PCP and admins can manage transferencias_dono" ON public.transferencias_dono;
DROP POLICY IF EXISTS "Financeiro and admins can manage acertos_financeiros" ON public.acertos_financeiros;
DROP POLICY IF EXISTS "Admins can manage config_fiscal" ON public.config_fiscal;
DROP POLICY IF EXISTS "Admins can manage historico_lme" ON public.historico_lme;
DROP POLICY IF EXISTS "Users can view own simulacoes" ON public.simulacoes_lme;
DROP POLICY IF EXISTS "Comercial and admins can manage parceiros" ON public.parceiros;
DROP POLICY IF EXISTS "Only admins can view audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authorized roles can view parceiros" ON public.parceiros;
DROP POLICY IF EXISTS "Authorized roles can view donos_material" ON public.donos_material;
DROP POLICY IF EXISTS "Authorized roles can view fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Authorized roles can view clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authorized roles can view entradas" ON public.entradas;
DROP POLICY IF EXISTS "Authorized roles can view saidas" ON public.saidas;
DROP POLICY IF EXISTS "Authorized roles can view beneficiamentos" ON public.beneficiamentos;
DROP POLICY IF EXISTS "Authorized roles can view acertos_financeiros" ON public.acertos_financeiros;
DROP POLICY IF EXISTS "Authorized roles can view sublotes" ON public.sublotes;
DROP POLICY IF EXISTS "Authorized roles can view precos_mo_terceiros" ON public.precos_mo_terceiros;
DROP POLICY IF EXISTS "Authorized roles can view transferencias_dono" ON public.transferencias_dono;
DROP POLICY IF EXISTS "Admins can update movimentacoes" ON public.movimentacoes;
DROP POLICY IF EXISTS "Admins can delete movimentacoes" ON public.movimentacoes;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

-- Now drop the functions
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.get_user_role(uuid);

-- Convert role column to text, transform data, then convert to new enum
ALTER TABLE public.user_roles ALTER COLUMN role TYPE text USING role::text;

UPDATE public.user_roles SET role = 
  CASE 
    WHEN role = 'admin' THEN 'admin'
    WHEN role = 'gerente_geral' THEN 'admin'
    WHEN role = 'financeiro' THEN 'financeiro'
    ELSE 'operacao'
  END;

-- Drop old enum
DROP TYPE IF EXISTS public.app_role;
DROP TYPE IF EXISTS public.app_role_new;

-- Create new enum
CREATE TYPE public.app_role AS ENUM ('admin', 'dono', 'operacao', 'financeiro');

-- Convert column to new enum
ALTER TABLE public.user_roles ALTER COLUMN role TYPE public.app_role USING role::public.app_role;

-- Recreate helper functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

-- Recreate RLS policies with new role structure
-- Admin: full access to everything
-- Dono: view only
-- Operacao: manage entrada/beneficiamento/saida/estoque
-- Financeiro: manage financial records

-- Profiles
CREATE POLICY "Admin can view all profiles" ON public.profiles
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- User roles
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin can manage all roles" ON public.user_roles
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Audit logs - admin only
CREATE POLICY "Only admins can view audit_logs" ON public.audit_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Fornecedores - view all, manage admin/operacao
CREATE POLICY "All roles can view fornecedores" ON public.fornecedores
  FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admin and Operacao manage fornecedores" ON public.fornecedores
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- Clientes
CREATE POLICY "All roles can view clientes" ON public.clientes
  FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admin and Operacao manage clientes" ON public.clientes
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- Parceiros
CREATE POLICY "All roles can view parceiros" ON public.parceiros
  FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admin and Operacao manage parceiros" ON public.parceiros
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- Locais estoque
CREATE POLICY "All roles can view locais" ON public.locais_estoque
  FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admin manage locais" ON public.locais_estoque
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Entradas - operacao manages
CREATE POLICY "All roles can view entradas" ON public.entradas
  FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admin and Operacao manage entradas" ON public.entradas
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- Sublotes
CREATE POLICY "All roles can view sublotes" ON public.sublotes
  FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admin and Operacao manage sublotes" ON public.sublotes
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- Saidas
CREATE POLICY "All roles can view saidas" ON public.saidas
  FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admin and Operacao manage saidas" ON public.saidas
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- Saida itens
CREATE POLICY "All roles can view saida_itens" ON public.saida_itens
  FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admin and Operacao manage saida_itens" ON public.saida_itens
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- Movimentacoes
CREATE POLICY "All roles can view movimentacoes" ON public.movimentacoes
  FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admin and Operacao create movimentacoes" ON public.movimentacoes
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));
CREATE POLICY "Admin can update movimentacoes" ON public.movimentacoes
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete movimentacoes" ON public.movimentacoes
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Beneficiamentos
CREATE POLICY "All roles can view beneficiamentos" ON public.beneficiamentos
  FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admin and Operacao manage beneficiamentos" ON public.beneficiamentos
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- Beneficiamento itens entrada
CREATE POLICY "All roles can view benef_itens_entrada" ON public.beneficiamento_itens_entrada
  FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admin and Operacao manage benef_itens_entrada" ON public.beneficiamento_itens_entrada
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- Beneficiamento itens saida
CREATE POLICY "All roles can view benef_itens_saida" ON public.beneficiamento_itens_saida
  FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admin and Operacao manage benef_itens_saida" ON public.beneficiamento_itens_saida
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- Transferencias dono
CREATE POLICY "All roles can view transferencias_dono" ON public.transferencias_dono
  FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admin and Operacao manage transferencias_dono" ON public.transferencias_dono
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- Donos material - admin manages
CREATE POLICY "All roles can view donos_material" ON public.donos_material
  FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admin manage donos_material" ON public.donos_material
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Tipos produto
CREATE POLICY "All roles can view tipos_produto" ON public.tipos_produto
  FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admin manage tipos_produto" ON public.tipos_produto
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Tipos entrada
CREATE POLICY "All roles can view tipos_entrada" ON public.tipos_entrada
  FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admin manage tipos_entrada" ON public.tipos_entrada
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Tipos saida
CREATE POLICY "All roles can view tipos_saida" ON public.tipos_saida
  FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admin manage tipos_saida" ON public.tipos_saida
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Processos
CREATE POLICY "All roles can view processos" ON public.processos
  FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admin manage processos" ON public.processos
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Precos MO terceiros
CREATE POLICY "All roles can view precos_mo" ON public.precos_mo_terceiros
  FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admin manage precos_mo" ON public.precos_mo_terceiros
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Acertos financeiros - financeiro manages
CREATE POLICY "All roles can view acertos" ON public.acertos_financeiros
  FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admin and Financeiro manage acertos" ON public.acertos_financeiros
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro'));

-- Config fiscal
CREATE POLICY "All roles can view config_fiscal" ON public.config_fiscal
  FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admin manage config_fiscal" ON public.config_fiscal
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Historico LME
CREATE POLICY "All roles can view historico_lme" ON public.historico_lme
  FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admin and Operacao manage historico_lme" ON public.historico_lme
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operacao'));

-- Simulacoes LME
CREATE POLICY "Users can view own simulacoes" ON public.simulacoes_lme
  FOR SELECT USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'));
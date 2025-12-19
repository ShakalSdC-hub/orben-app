-- =============================================
-- AUDIT LOGGING SYSTEM
-- =============================================

-- Create audit_logs table for tracking access to sensitive data
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'select', 'insert', 'update', 'delete'
  table_name TEXT NOT NULL,
  record_id UUID,
  record_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs - only admins can view
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit_logs"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente_geral'::app_role));

-- System can insert audit logs
CREATE POLICY "System can insert audit_logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Create index for efficient querying
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

-- =============================================
-- SECURITY DEFINER FUNCTION TO LOG ACCESS
-- =============================================

CREATE OR REPLACE FUNCTION public.log_data_access(
  _action TEXT,
  _table_name TEXT,
  _record_id UUID DEFAULT NULL,
  _record_data JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, record_data)
  VALUES (auth.uid(), _action, _table_name, _record_id, _record_data);
END;
$$;

-- =============================================
-- IMPROVED RLS POLICIES FOR SENSITIVE TABLES
-- =============================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view parceiros" ON public.parceiros;
DROP POLICY IF EXISTS "Authenticated users can view donos_material" ON public.donos_material;
DROP POLICY IF EXISTS "Authenticated users can view fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Authenticated users can view clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can view entradas" ON public.entradas;
DROP POLICY IF EXISTS "Authenticated users can view saidas" ON public.saidas;
DROP POLICY IF EXISTS "Authenticated users can view beneficiamentos" ON public.beneficiamentos;
DROP POLICY IF EXISTS "Authenticated users can view acertos_financeiros" ON public.acertos_financeiros;
DROP POLICY IF EXISTS "Authenticated users can view sublotes" ON public.sublotes;
DROP POLICY IF EXISTS "Authenticated users can view precos_mo_terceiros" ON public.precos_mo_terceiros;
DROP POLICY IF EXISTS "Authenticated users can view transferencias_dono" ON public.transferencias_dono;

-- =============================================
-- PARCEIROS - Restrict to commercial, purchasing, and management
-- =============================================
CREATE POLICY "Authorized roles can view parceiros"
ON public.parceiros
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gerente_geral'::app_role) OR 
  has_role(auth.uid(), 'comercial'::app_role) OR 
  has_role(auth.uid(), 'compras'::app_role) OR
  has_role(auth.uid(), 'expedicao'::app_role)
);

-- =============================================
-- DONOS_MATERIAL - Restrict to PCP, finance, and management
-- =============================================
CREATE POLICY "Authorized roles can view donos_material"
ON public.donos_material
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gerente_geral'::app_role) OR 
  has_role(auth.uid(), 'financeiro'::app_role) OR
  has_role(auth.uid(), 'pcp'::app_role)
);

-- =============================================
-- FORNECEDORES - Restrict to purchasing and management
-- =============================================
CREATE POLICY "Authorized roles can view fornecedores"
ON public.fornecedores
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gerente_geral'::app_role) OR 
  has_role(auth.uid(), 'compras'::app_role) OR
  has_role(auth.uid(), 'pcp'::app_role)
);

-- =============================================
-- CLIENTES - Restrict to commercial, finance, and management
-- =============================================
CREATE POLICY "Authorized roles can view clientes"
ON public.clientes
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gerente_geral'::app_role) OR 
  has_role(auth.uid(), 'comercial'::app_role) OR
  has_role(auth.uid(), 'financeiro'::app_role)
);

-- =============================================
-- ENTRADAS - Restrict to purchasing, PCP, finance, and management
-- =============================================
CREATE POLICY "Authorized roles can view entradas"
ON public.entradas
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gerente_geral'::app_role) OR 
  has_role(auth.uid(), 'compras'::app_role) OR
  has_role(auth.uid(), 'pcp'::app_role) OR
  has_role(auth.uid(), 'financeiro'::app_role)
);

-- =============================================
-- SAIDAS - Restrict to commercial, expedition, finance, and management
-- =============================================
CREATE POLICY "Authorized roles can view saidas"
ON public.saidas
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gerente_geral'::app_role) OR 
  has_role(auth.uid(), 'comercial'::app_role) OR
  has_role(auth.uid(), 'expedicao'::app_role) OR
  has_role(auth.uid(), 'financeiro'::app_role)
);

-- =============================================
-- BENEFICIAMENTOS - Restrict to PCP, finance, and management
-- =============================================
CREATE POLICY "Authorized roles can view beneficiamentos"
ON public.beneficiamentos
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gerente_geral'::app_role) OR 
  has_role(auth.uid(), 'pcp'::app_role) OR
  has_role(auth.uid(), 'financeiro'::app_role)
);

-- =============================================
-- ACERTOS_FINANCEIROS - Restrict to finance and management only
-- =============================================
CREATE POLICY "Authorized roles can view acertos_financeiros"
ON public.acertos_financeiros
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gerente_geral'::app_role) OR 
  has_role(auth.uid(), 'financeiro'::app_role)
);

-- =============================================
-- SUBLOTES - Restrict to PCP, expedition, finance, and management
-- =============================================
CREATE POLICY "Authorized roles can view sublotes"
ON public.sublotes
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gerente_geral'::app_role) OR 
  has_role(auth.uid(), 'pcp'::app_role) OR
  has_role(auth.uid(), 'expedicao'::app_role) OR
  has_role(auth.uid(), 'financeiro'::app_role)
);

-- =============================================
-- PRECOS_MO_TERCEIROS - Restrict to purchasing, PCP, and management
-- =============================================
CREATE POLICY "Authorized roles can view precos_mo_terceiros"
ON public.precos_mo_terceiros
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gerente_geral'::app_role) OR 
  has_role(auth.uid(), 'compras'::app_role) OR
  has_role(auth.uid(), 'pcp'::app_role)
);

-- =============================================
-- TRANSFERENCIAS_DONO - Restrict to PCP, finance, and management
-- =============================================
CREATE POLICY "Authorized roles can view transferencias_dono"
ON public.transferencias_dono
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gerente_geral'::app_role) OR 
  has_role(auth.uid(), 'pcp'::app_role) OR
  has_role(auth.uid(), 'financeiro'::app_role)
);

-- =============================================
-- MOVIMENTACOES - Add UPDATE/DELETE policies for admins
-- =============================================
CREATE POLICY "Admins can update movimentacoes"
ON public.movimentacoes
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente_geral'::app_role));

CREATE POLICY "Admins can delete movimentacoes"
ON public.movimentacoes
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gerente_geral'::app_role));

-- =============================================
-- AUDIT TRIGGERS FOR SENSITIVE TABLES
-- =============================================

-- Function to log INSERT operations
CREATE OR REPLACE FUNCTION public.audit_insert_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, record_data)
  VALUES (auth.uid(), 'insert', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
  RETURN NEW;
END;
$$;

-- Function to log UPDATE operations
CREATE OR REPLACE FUNCTION public.audit_update_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, record_data)
  VALUES (auth.uid(), 'update', TG_TABLE_NAME, NEW.id, jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)));
  RETURN NEW;
END;
$$;

-- Function to log DELETE operations
CREATE OR REPLACE FUNCTION public.audit_delete_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, record_data)
  VALUES (auth.uid(), 'delete', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
  RETURN OLD;
END;
$$;

-- Add audit triggers to parceiros table
CREATE TRIGGER audit_parceiros_insert AFTER INSERT ON public.parceiros
FOR EACH ROW EXECUTE FUNCTION public.audit_insert_trigger();

CREATE TRIGGER audit_parceiros_update AFTER UPDATE ON public.parceiros
FOR EACH ROW EXECUTE FUNCTION public.audit_update_trigger();

CREATE TRIGGER audit_parceiros_delete AFTER DELETE ON public.parceiros
FOR EACH ROW EXECUTE FUNCTION public.audit_delete_trigger();

-- Add audit triggers to donos_material table
CREATE TRIGGER audit_donos_material_insert AFTER INSERT ON public.donos_material
FOR EACH ROW EXECUTE FUNCTION public.audit_insert_trigger();

CREATE TRIGGER audit_donos_material_update AFTER UPDATE ON public.donos_material
FOR EACH ROW EXECUTE FUNCTION public.audit_update_trigger();

CREATE TRIGGER audit_donos_material_delete AFTER DELETE ON public.donos_material
FOR EACH ROW EXECUTE FUNCTION public.audit_delete_trigger();

-- Add audit triggers to entradas table (financial sensitive)
CREATE TRIGGER audit_entradas_insert AFTER INSERT ON public.entradas
FOR EACH ROW EXECUTE FUNCTION public.audit_insert_trigger();

CREATE TRIGGER audit_entradas_update AFTER UPDATE ON public.entradas
FOR EACH ROW EXECUTE FUNCTION public.audit_update_trigger();

CREATE TRIGGER audit_entradas_delete AFTER DELETE ON public.entradas
FOR EACH ROW EXECUTE FUNCTION public.audit_delete_trigger();

-- Add audit triggers to saidas table (financial sensitive)
CREATE TRIGGER audit_saidas_insert AFTER INSERT ON public.saidas
FOR EACH ROW EXECUTE FUNCTION public.audit_insert_trigger();

CREATE TRIGGER audit_saidas_update AFTER UPDATE ON public.saidas
FOR EACH ROW EXECUTE FUNCTION public.audit_update_trigger();

CREATE TRIGGER audit_saidas_delete AFTER DELETE ON public.saidas
FOR EACH ROW EXECUTE FUNCTION public.audit_delete_trigger();

-- Add audit triggers to acertos_financeiros table
CREATE TRIGGER audit_acertos_financeiros_insert AFTER INSERT ON public.acertos_financeiros
FOR EACH ROW EXECUTE FUNCTION public.audit_insert_trigger();

CREATE TRIGGER audit_acertos_financeiros_update AFTER UPDATE ON public.acertos_financeiros
FOR EACH ROW EXECUTE FUNCTION public.audit_update_trigger();

CREATE TRIGGER audit_acertos_financeiros_delete AFTER DELETE ON public.acertos_financeiros
FOR EACH ROW EXECUTE FUNCTION public.audit_delete_trigger();

-- Add audit triggers to transferencias_dono table
CREATE TRIGGER audit_transferencias_dono_insert AFTER INSERT ON public.transferencias_dono
FOR EACH ROW EXECUTE FUNCTION public.audit_insert_trigger();

CREATE TRIGGER audit_transferencias_dono_update AFTER UPDATE ON public.transferencias_dono
FOR EACH ROW EXECUTE FUNCTION public.audit_update_trigger();

CREATE TRIGGER audit_transferencias_dono_delete AFTER DELETE ON public.transferencias_dono
FOR EACH ROW EXECUTE FUNCTION public.audit_delete_trigger();
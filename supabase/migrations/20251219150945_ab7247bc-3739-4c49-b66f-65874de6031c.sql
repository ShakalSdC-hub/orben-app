-- =====================================================
-- FIX ALL PUBLIC DATA EXPOSURE VULNERABILITIES
-- =====================================================

-- 1. PROFILES TABLE - Require authentication
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Admin can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

-- 2. CLIENTES TABLE - Restrict to authenticated users with roles
DROP POLICY IF EXISTS "All roles can view clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can view clientes" ON public.clientes;

-- Only admin and operacao can access clientes (the ALL policy already covers this)

-- 3. ACERTOS_FINANCEIROS TABLE - Ensure authentication required
DROP POLICY IF EXISTS "All roles can view acertos" ON public.acertos_financeiros;

CREATE POLICY "Authenticated roles can view acertos" 
ON public.acertos_financeiros 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));

-- 4. BENEFICIAMENTOS TABLE - Ensure authentication required  
DROP POLICY IF EXISTS "All roles can view beneficiamentos" ON public.beneficiamentos;

CREATE POLICY "Authenticated roles can view beneficiamentos" 
ON public.beneficiamentos 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));

-- 5. BENEFICIAMENTO_ITENS_ENTRADA - Ensure authentication required
DROP POLICY IF EXISTS "All roles can view benef_itens_entrada" ON public.beneficiamento_itens_entrada;
DROP POLICY IF EXISTS "Authenticated users can view beneficiamento_itens_entrada" ON public.beneficiamento_itens_entrada;

CREATE POLICY "Authenticated roles can view benef_itens_entrada" 
ON public.beneficiamento_itens_entrada 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));

-- 6. BENEFICIAMENTO_ITENS_SAIDA - Ensure authentication required
DROP POLICY IF EXISTS "All roles can view benef_itens_saida" ON public.beneficiamento_itens_saida;
DROP POLICY IF EXISTS "Authenticated users can view beneficiamento_itens_saida" ON public.beneficiamento_itens_saida;

CREATE POLICY "Authenticated roles can view benef_itens_saida" 
ON public.beneficiamento_itens_saida 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));

-- 7. SUBLOTES TABLE - Ensure authentication required
DROP POLICY IF EXISTS "All roles can view sublotes" ON public.sublotes;

CREATE POLICY "Authenticated roles can view sublotes" 
ON public.sublotes 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));

-- 8. SIMULACOES_LME TABLE - Fix weak protection
DROP POLICY IF EXISTS "Users can view own simulacoes" ON public.simulacoes_lme;

CREATE POLICY "Users can view own simulacoes or admin" 
ON public.simulacoes_lme 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND (auth.uid() = created_by OR has_role(auth.uid(), 'admin')));

-- 9. ENTRADAS TABLE - Ensure authentication required
DROP POLICY IF EXISTS "All roles can view entradas" ON public.entradas;

CREATE POLICY "Authenticated roles can view entradas" 
ON public.entradas 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));

-- 10. SAIDAS TABLE - Ensure authentication required
DROP POLICY IF EXISTS "All roles can view saidas" ON public.saidas;

CREATE POLICY "Authenticated roles can view saidas" 
ON public.saidas 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));

-- 11. SAIDA_ITENS TABLE - Ensure authentication required
DROP POLICY IF EXISTS "All roles can view saida_itens" ON public.saida_itens;
DROP POLICY IF EXISTS "Authenticated users can view saida_itens" ON public.saida_itens;

CREATE POLICY "Authenticated roles can view saida_itens" 
ON public.saida_itens 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));

-- 12. PARCEIROS TABLE - Ensure authentication required
DROP POLICY IF EXISTS "All roles can view parceiros" ON public.parceiros;

-- 13. FORNECEDORES TABLE - Ensure authentication required
DROP POLICY IF EXISTS "All roles can view fornecedores" ON public.fornecedores;

-- 14. DONOS_MATERIAL TABLE - Ensure authentication required
DROP POLICY IF EXISTS "All roles can view donos_material" ON public.donos_material;

CREATE POLICY "Authenticated roles can view donos_material" 
ON public.donos_material 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));

-- 15. TRANSFERENCIAS_DONO TABLE - Ensure authentication required
DROP POLICY IF EXISTS "All roles can view transferencias_dono" ON public.transferencias_dono;

CREATE POLICY "Authenticated roles can view transferencias_dono" 
ON public.transferencias_dono 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));

-- 16. MOVIMENTACOES TABLE - Ensure authentication required
DROP POLICY IF EXISTS "All roles can view movimentacoes" ON public.movimentacoes;
DROP POLICY IF EXISTS "Authenticated users can view movimentacoes" ON public.movimentacoes;

CREATE POLICY "Authenticated roles can view movimentacoes" 
ON public.movimentacoes 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));

-- 17. HISTORICO_LME TABLE - Ensure authentication required
DROP POLICY IF EXISTS "All roles can view historico_lme" ON public.historico_lme;
DROP POLICY IF EXISTS "Authenticated users can view historico_lme" ON public.historico_lme;

CREATE POLICY "Authenticated roles can view historico_lme" 
ON public.historico_lme 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));

-- 18. CONFIG_FISCAL TABLE - Ensure authentication required
DROP POLICY IF EXISTS "All roles can view config_fiscal" ON public.config_fiscal;
DROP POLICY IF EXISTS "Authenticated users can view config_fiscal" ON public.config_fiscal;

CREATE POLICY "Authenticated roles can view config_fiscal" 
ON public.config_fiscal 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));

-- 19. LOCAIS_ESTOQUE TABLE - Ensure authentication required
DROP POLICY IF EXISTS "All roles can view locais" ON public.locais_estoque;
DROP POLICY IF EXISTS "Authenticated users can view locais" ON public.locais_estoque;

CREATE POLICY "Authenticated roles can view locais" 
ON public.locais_estoque 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));

-- 20. PROCESSOS TABLE - Ensure authentication required
DROP POLICY IF EXISTS "All roles can view processos" ON public.processos;
DROP POLICY IF EXISTS "Authenticated users can view processos" ON public.processos;

CREATE POLICY "Authenticated roles can view processos" 
ON public.processos 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));

-- 21. PRECOS_MO_TERCEIROS TABLE - Ensure authentication required
DROP POLICY IF EXISTS "All roles can view precos_mo" ON public.precos_mo_terceiros;

CREATE POLICY "Authenticated roles can view precos_mo" 
ON public.precos_mo_terceiros 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));

-- 22. TIPOS_ENTRADA TABLE - Ensure authentication required
DROP POLICY IF EXISTS "All roles can view tipos_entrada" ON public.tipos_entrada;
DROP POLICY IF EXISTS "Authenticated users can view tipos_entrada" ON public.tipos_entrada;

CREATE POLICY "Authenticated roles can view tipos_entrada" 
ON public.tipos_entrada 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));

-- 23. TIPOS_PRODUTO TABLE - Ensure authentication required
DROP POLICY IF EXISTS "All roles can view tipos_produto" ON public.tipos_produto;
DROP POLICY IF EXISTS "Authenticated users can view tipos_produto" ON public.tipos_produto;

CREATE POLICY "Authenticated roles can view tipos_produto" 
ON public.tipos_produto 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));

-- 24. TIPOS_SAIDA TABLE - Ensure authentication required
DROP POLICY IF EXISTS "All roles can view tipos_saida" ON public.tipos_saida;
DROP POLICY IF EXISTS "Authenticated users can view tipos_saida" ON public.tipos_saida;

CREATE POLICY "Authenticated roles can view tipos_saida" 
ON public.tipos_saida 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));

-- 25. USER_ROLES TABLE - Already properly secured

-- 26. AUDIT_LOGS TABLE - Already properly secured

-- 27. Update log_data_access to verify user is logging their own actions
CREATE OR REPLACE FUNCTION public.log_data_access(_action text, _table_name text, _record_id uuid DEFAULT NULL::uuid, _record_data jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow authenticated users to log their own actions
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required for audit logging';
  END IF;
  
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, record_data)
  VALUES (auth.uid(), _action, _table_name, _record_id, _record_data);
END;
$function$;
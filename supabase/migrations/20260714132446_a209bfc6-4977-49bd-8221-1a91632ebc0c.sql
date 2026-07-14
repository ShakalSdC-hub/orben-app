
-- Fix audit_logs INSERT bypass
DROP POLICY IF EXISTS "System can insert audit_logs" ON public.audit_logs;
CREATE POLICY "Service role can insert audit_logs"
  ON public.audit_logs FOR INSERT
  TO service_role WITH CHECK (true);
REVOKE INSERT ON public.audit_logs FROM authenticated, anon;

-- Restrict parceiros SELECT to admin/operacao/financeiro
DROP POLICY IF EXISTS "Authenticated roles can view parceiros" ON public.parceiros;
CREATE POLICY "Admin operacao financeiro can view parceiros"
  ON public.parceiros FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'operacao'::app_role)
    OR has_role(auth.uid(), 'financeiro'::app_role)
  );

-- Fix orcamentos overly permissive policies
DROP POLICY IF EXISTS "Usuários autenticados podem ver orçamentos" ON public.orcamentos_servico_terceiros;
DROP POLICY IF EXISTS "Usuários autenticados podem criar orçamentos" ON public.orcamentos_servico_terceiros;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar orçamentos" ON public.orcamentos_servico_terceiros;

CREATE POLICY "Authenticated roles can view orcamentos"
  ON public.orcamentos_servico_terceiros FOR SELECT
  USING (auth.uid() IS NOT NULL AND has_any_role(auth.uid()));

CREATE POLICY "Admin and Operacao insert orcamentos"
  ON public.orcamentos_servico_terceiros FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operacao'::app_role));

CREATE POLICY "Admin and Operacao update orcamentos"
  ON public.orcamentos_servico_terceiros FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operacao'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operacao'::app_role));

-- Fix functions missing search_path
ALTER FUNCTION public.fn_calc_lme_final_brl_kg() SET search_path = public;
ALTER FUNCTION public.fn_calc_perda_benef_interm() SET search_path = public;
ALTER FUNCTION public.fn_calc_perda_benef_terceiros() SET search_path = public;
ALTER FUNCTION public.sync_lme_semana_config() SET search_path = public;

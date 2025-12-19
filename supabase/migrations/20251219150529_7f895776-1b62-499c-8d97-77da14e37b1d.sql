-- Fix 1: Add authentication requirement for profiles table
-- Drop the existing public SELECT policies that don't require auth
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;

-- Create new secure policies that require authentication
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Admin can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

-- Fix 2: Restrict clientes table access to admin and operacao only
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "All roles can view clientes" ON public.clientes;

-- The "Admin and Operacao manage clientes" policy already handles SELECT for admin/operacao
-- No additional policy needed as the ALL policy covers SELECT

-- Also apply same restriction to parceiros (contains similar PII)
DROP POLICY IF EXISTS "All roles can view parceiros" ON public.parceiros;

-- Apply same restriction to fornecedores (contains similar PII)
DROP POLICY IF EXISTS "All roles can view fornecedores" ON public.fornecedores;
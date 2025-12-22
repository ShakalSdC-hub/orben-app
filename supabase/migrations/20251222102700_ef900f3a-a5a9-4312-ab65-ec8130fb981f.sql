-- Fix 1: Profiles table - Ensure only authenticated users with roles can view profiles
-- Drop existing SELECT policies to recreate with proper security
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create new consolidated SELECT policy - users can view their own profile OR admins can view all
CREATE POLICY "Users can view own profile or admin all"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = id OR 
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Fix 2: Clientes table - Add SELECT policy for authenticated users with roles
-- This allows financeiro and other roles to view clients for their work
CREATE POLICY "Authenticated roles can view clientes"
ON public.clientes
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND has_any_role(auth.uid())
);

-- Fix 3: Fornecedores table - Same issue, add SELECT policy
CREATE POLICY "Authenticated roles can view fornecedores"
ON public.fornecedores
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND has_any_role(auth.uid())
);

-- Fix 4: Parceiros table - Same issue, add SELECT policy  
CREATE POLICY "Authenticated roles can view parceiros"
ON public.parceiros
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND has_any_role(auth.uid())
);
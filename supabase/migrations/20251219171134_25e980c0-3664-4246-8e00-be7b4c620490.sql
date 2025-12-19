-- Drop existing check constraint
ALTER TABLE public.sublotes DROP CONSTRAINT IF EXISTS sublotes_status_check;

-- Add new check constraint with all valid statuses
ALTER TABLE public.sublotes ADD CONSTRAINT sublotes_status_check 
CHECK (status IN ('disponivel', 'reservado', 'em_beneficiamento', 'consumido', 'vendido'));
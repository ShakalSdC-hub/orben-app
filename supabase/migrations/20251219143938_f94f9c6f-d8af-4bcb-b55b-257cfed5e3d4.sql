-- Create function to prevent duplicate sublotes by codigo
CREATE OR REPLACE FUNCTION public.prevent_duplicate_sublote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if a sublote with the same codigo already exists
  IF EXISTS (
    SELECT 1 FROM public.sublotes 
    WHERE codigo = NEW.codigo 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Já existe um sublote com o código %', NEW.codigo;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run before insert or update on sublotes
DROP TRIGGER IF EXISTS check_duplicate_sublote ON public.sublotes;
CREATE TRIGGER check_duplicate_sublote
  BEFORE INSERT OR UPDATE ON public.sublotes
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_duplicate_sublote();

-- Create unique index on sublotes.codigo as additional protection
CREATE UNIQUE INDEX IF NOT EXISTS idx_sublotes_codigo_unique ON public.sublotes(codigo);
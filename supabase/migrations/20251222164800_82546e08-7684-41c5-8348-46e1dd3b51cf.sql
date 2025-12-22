-- Criar função de validação para códigos duplicados de tipos_produto
CREATE OR REPLACE FUNCTION public.prevent_duplicate_tipo_produto_codigo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Apenas verificar se o código foi informado
  IF NEW.codigo IS NOT NULL AND NEW.codigo != '' THEN
    IF EXISTS (
      SELECT 1 FROM public.tipos_produto 
      WHERE codigo = NEW.codigo 
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Já existe um produto com o código %', NEW.codigo;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Criar trigger para verificar código duplicado
CREATE TRIGGER check_tipo_produto_codigo_duplicado
BEFORE INSERT OR UPDATE ON public.tipos_produto
FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_tipo_produto_codigo();
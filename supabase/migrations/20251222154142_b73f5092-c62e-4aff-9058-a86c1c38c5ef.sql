-- Add parceiro_id column to acertos_financeiros for tracking debt to partners (suppliers)
ALTER TABLE public.acertos_financeiros ADD COLUMN IF NOT EXISTS parceiro_id uuid REFERENCES public.parceiros(id);

-- Update the trigger to use parceiro_id for compras (entradas) instead of dono_id
CREATE OR REPLACE FUNCTION public.create_financial_record_on_entrada()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Create debt record when entrada is created with valor_total
  -- For compras (purchases), the debt is to the Parceiro (supplier), not the Dono
  IF NEW.valor_total IS NOT NULL AND NEW.valor_total > 0 THEN
    INSERT INTO public.acertos_financeiros (
      tipo,
      valor,
      dono_id,
      parceiro_id,
      referencia_tipo,
      referencia_id,
      data_acerto,
      observacoes,
      status
    ) VALUES (
      'divida',
      NEW.valor_total,
      NULL, -- Dono not used for compras
      NEW.parceiro_id, -- Use parceiro_id for debt tracking
      'entrada',
      NEW.id,
      NEW.data_entrada,
      'Compra de material - ' || NEW.codigo,
      'pendente'
    );
  END IF;
  RETURN NEW;
END;
$function$;
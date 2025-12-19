-- Create trigger function to auto-create financial records on entrada (debt)
CREATE OR REPLACE FUNCTION public.create_financial_record_on_entrada()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create debt record when entrada is created with valor_total
  IF NEW.valor_total IS NOT NULL AND NEW.valor_total > 0 THEN
    INSERT INTO public.acertos_financeiros (
      tipo,
      valor,
      dono_id,
      referencia_tipo,
      referencia_id,
      data_acerto,
      observacoes,
      status
    ) VALUES (
      'divida',
      NEW.valor_total,
      NEW.dono_id,
      'entrada',
      NEW.id,
      NEW.data_entrada,
      'Compra de material - ' || NEW.codigo,
      'pendente'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for entradas
DROP TRIGGER IF EXISTS create_financial_on_entrada ON public.entradas;
CREATE TRIGGER create_financial_on_entrada
  AFTER INSERT ON public.entradas
  FOR EACH ROW
  EXECUTE FUNCTION public.create_financial_record_on_entrada();

-- Create trigger function for saidas (revenue)
CREATE OR REPLACE FUNCTION public.create_financial_record_on_saida()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dono_id uuid;
BEGIN
  -- Get dono_id from first item's sublote
  SELECT s.dono_id INTO v_dono_id
  FROM public.saida_itens si
  JOIN public.sublotes s ON s.id = si.sublote_id
  WHERE si.saida_id = NEW.id
  LIMIT 1;

  IF NEW.tipo_saida = 'venda' AND NEW.valor_total IS NOT NULL AND NEW.valor_total > 0 THEN
    -- Create revenue record for sales
    INSERT INTO public.acertos_financeiros (
      tipo,
      valor,
      dono_id,
      referencia_tipo,
      referencia_id,
      data_acerto,
      observacoes,
      status
    ) VALUES (
      'receita',
      NEW.valor_total,
      v_dono_id,
      'saida',
      NEW.id,
      NEW.data_saida,
      'Venda de material - ' || NEW.codigo,
      'pendente'
    );
  ELSIF NEW.tipo_saida = 'retorno_industrializacao' AND NEW.custos_cobrados IS NOT NULL AND NEW.custos_cobrados > 0 THEN
    -- Create revenue only for operation costs on industrialization return
    INSERT INTO public.acertos_financeiros (
      tipo,
      valor,
      dono_id,
      referencia_tipo,
      referencia_id,
      data_acerto,
      observacoes,
      status
    ) VALUES (
      'receita',
      NEW.custos_cobrados,
      v_dono_id,
      'saida',
      NEW.id,
      NEW.data_saida,
      'Retorno industrialização (custos) - ' || NEW.codigo,
      'pendente'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for saidas
DROP TRIGGER IF EXISTS create_financial_on_saida ON public.saidas;
CREATE TRIGGER create_financial_on_saida
  AFTER INSERT ON public.saidas
  FOR EACH ROW
  EXECUTE FUNCTION public.create_financial_record_on_saida();
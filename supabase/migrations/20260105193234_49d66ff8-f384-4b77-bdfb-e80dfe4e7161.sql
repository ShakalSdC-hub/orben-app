
-- Trigger para restaurar kg_disponivel dos beneficiamentos quando saída é excluída (soft delete)
CREATE OR REPLACE FUNCTION public.fn_restore_benef_on_saida_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verifica se is_deleted mudou de false para true
  IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
    -- Restaurar kg_disponivel nos beneficiamentos alocados
    UPDATE public.beneficiamentos_c1 b
    SET kg_disponivel = kg_disponivel + a.kg_alocado
    FROM public.saida_benef_alocacoes a
    WHERE a.saida_id = NEW.id
      AND b.id = a.beneficiamento_id;
    
    -- Excluir as alocações (opcional, mas mantém consistência)
    DELETE FROM public.saida_benef_alocacoes WHERE saida_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar trigger na tabela saidas_c1
DROP TRIGGER IF EXISTS trg_restore_benef_on_saida_delete ON public.saidas_c1;
CREATE TRIGGER trg_restore_benef_on_saida_delete
  AFTER UPDATE OF is_deleted ON public.saidas_c1
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_restore_benef_on_saida_delete();

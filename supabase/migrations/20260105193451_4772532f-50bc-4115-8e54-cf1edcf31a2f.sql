
-- =====================================================
-- 1. CENÁRIO 1 - Material Próprio (C1)
-- Restaurar kg_liquido_disponivel nas entradas_c1 quando beneficiamento é excluído
-- =====================================================
CREATE OR REPLACE FUNCTION public.fn_restore_entrada_on_benef_delete_c1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
    -- Restaurar kg_liquido_disponivel nas entradas alocadas
    UPDATE public.entradas_c1 e
    SET kg_liquido_disponivel = kg_liquido_disponivel + a.kg_alocado
    FROM public.benef_entrada_alocacoes a
    WHERE a.beneficiamento_id = NEW.id
      AND e.id = a.entrada_id;
    
    -- Excluir as alocações
    DELETE FROM public.benef_entrada_alocacoes WHERE beneficiamento_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_restore_entrada_on_benef_delete_c1 ON public.beneficiamentos_c1;
CREATE TRIGGER trg_restore_entrada_on_benef_delete_c1
  AFTER UPDATE OF is_deleted ON public.beneficiamentos_c1
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_restore_entrada_on_benef_delete_c1();

-- =====================================================
-- 2. CENÁRIO 3 - Terceiros
-- Restaurar kg_disponivel nas entradas_terceiros quando beneficiamento é excluído
-- =====================================================
CREATE OR REPLACE FUNCTION public.fn_restore_entrada_on_benef_delete_terceiros()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
    -- Restaurar kg_disponivel nas entradas alocadas
    UPDATE public.entradas_terceiros e
    SET kg_disponivel = kg_disponivel + a.kg_alocado
    FROM public.benef_ent_aloc_terceiros a
    WHERE a.beneficiamento_id = NEW.id
      AND e.id = a.entrada_id;
    
    -- Excluir as alocações
    DELETE FROM public.benef_ent_aloc_terceiros WHERE beneficiamento_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_restore_entrada_on_benef_delete_terceiros ON public.beneficiamentos_terceiros;
CREATE TRIGGER trg_restore_entrada_on_benef_delete_terceiros
  AFTER UPDATE OF is_deleted ON public.beneficiamentos_terceiros
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_restore_entrada_on_benef_delete_terceiros();

-- Trigger para restaurar kg_disponivel_cliente quando saída de terceiros é excluída
CREATE OR REPLACE FUNCTION public.fn_restore_benef_on_saida_delete_terceiros()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
    UPDATE public.beneficiamentos_terceiros b
    SET kg_disponivel_cliente = kg_disponivel_cliente + a.kg_alocado
    FROM public.saida_benef_aloc_terceiros a
    WHERE a.saida_id = NEW.id
      AND b.id = a.beneficiamento_id;
    
    DELETE FROM public.saida_benef_aloc_terceiros WHERE saida_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_restore_benef_on_saida_delete_terceiros ON public.saidas_terceiros;
CREATE TRIGGER trg_restore_benef_on_saida_delete_terceiros
  AFTER UPDATE OF is_deleted ON public.saidas_terceiros
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_restore_benef_on_saida_delete_terceiros();

-- =====================================================
-- 3. CENÁRIO 2 - Intermediação
-- Restaurar kg_disponivel_compra nas compras quando beneficiamento é excluído
-- =====================================================
CREATE OR REPLACE FUNCTION public.fn_restore_compra_on_benef_delete_interm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
    -- Restaurar kg_disponivel_compra nas compras alocadas
    UPDATE public.compras_intermediacao c
    SET kg_disponivel_compra = kg_disponivel_compra + a.kg_alocado
    FROM public.benef_compra_alocacoes a
    WHERE a.beneficiamento_id = NEW.id
      AND c.id = a.compra_id;
    
    -- Excluir as alocações
    DELETE FROM public.benef_compra_alocacoes WHERE beneficiamento_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_restore_compra_on_benef_delete_interm ON public.beneficiamentos_intermediacao;
CREATE TRIGGER trg_restore_compra_on_benef_delete_interm
  AFTER UPDATE OF is_deleted ON public.beneficiamentos_intermediacao
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_restore_compra_on_benef_delete_interm();

-- Trigger para restaurar kg_disponivel_venda quando venda de intermediação é excluída
CREATE OR REPLACE FUNCTION public.fn_restore_benef_on_venda_delete_interm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
    UPDATE public.beneficiamentos_intermediacao b
    SET kg_disponivel_venda = kg_disponivel_venda + a.kg_alocado
    FROM public.venda_benef_alocacoes a
    WHERE a.venda_id = NEW.id
      AND b.id = a.beneficiamento_id;
    
    DELETE FROM public.venda_benef_alocacoes WHERE venda_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_restore_benef_on_venda_delete_interm ON public.vendas_intermediacao;
CREATE TRIGGER trg_restore_benef_on_venda_delete_interm
  AFTER UPDATE OF is_deleted ON public.vendas_intermediacao
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_restore_benef_on_venda_delete_interm();

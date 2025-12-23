
-- =====================================================
-- FASE 2: FUNÇÕES E TRIGGERS FIFO
-- =====================================================

-- ===========================================
-- CENÁRIO 1: FUNÇÕES FIFO
-- ===========================================

-- Função: Recalcular entrada (BEFORE INSERT/UPDATE)
CREATE OR REPLACE FUNCTION public.fn_recalc_entrada_c1()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_pre numeric;
  custo_moagem numeric;
  custo_frete_ida numeric;
  custo_frete_volta numeric;
  custo_financeiro numeric;
  soma_custos_pre numeric;
BEGIN
  -- Calcular kg_ticket
  NEW.kg_ticket := NEW.ticket_mel_kg + NEW.ticket_mista_kg;
  
  -- Calcular perdas
  NEW.perda_total_kg := (NEW.ticket_mel_kg * NEW.perda_mel_pct) + (NEW.ticket_mista_kg * NEW.perda_mista_pct);
  
  -- Calcular kg líquido
  NEW.kg_liquido_total := NEW.kg_ticket - NEW.perda_total_kg;
  
  -- Se nova entrada, set kg_liquido_disponivel = kg_liquido_total
  IF TG_OP = 'INSERT' THEN
    NEW.kg_liquido_disponivel := NEW.kg_liquido_total;
  END IF;
  
  -- Calcular valor do ticket
  NEW.valor_ticket_rs := NEW.kg_ticket * NEW.valor_unit_sucata_rkg;
  
  -- Base para conversão de custos PRÉ
  base_pre := NEW.kg_ticket;
  
  IF base_pre > 0 THEN
    -- Converter cada custo PRÉ conforme mode
    custo_moagem := CASE WHEN NEW.moagem_mode = 'RKG' THEN NEW.moagem_val * base_pre ELSE NEW.moagem_val END;
    custo_frete_ida := CASE WHEN NEW.frete_ida_moagem_mode = 'RKG' THEN NEW.frete_ida_moagem_val * base_pre ELSE NEW.frete_ida_moagem_val END;
    custo_frete_volta := CASE WHEN NEW.frete_volta_moagem_mode = 'RKG' THEN NEW.frete_volta_moagem_val * base_pre ELSE NEW.frete_volta_moagem_val END;
    custo_financeiro := CASE WHEN NEW.financeiro_mode = 'RKG' THEN NEW.financeiro_val * base_pre ELSE NEW.financeiro_val END;
    
    soma_custos_pre := custo_moagem + custo_frete_ida + custo_frete_volta + custo_financeiro;
  ELSE
    soma_custos_pre := 0;
  END IF;
  
  -- Custo PRÉ total inclui valor do ticket + custos
  NEW.custos_pre_total_rs := NEW.valor_ticket_rs + soma_custos_pre;
  
  -- Custo unitário PRÉ por kg líquido
  IF NEW.kg_liquido_total > 0 THEN
    NEW.custo_unit_pre_rkg := NEW.custos_pre_total_rs / NEW.kg_liquido_total;
  ELSE
    NEW.custo_unit_pre_rkg := 0;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para recalcular entrada
CREATE TRIGGER trg_recalc_entrada_c1
  BEFORE INSERT OR UPDATE ON public.entradas_c1
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_recalc_entrada_c1();

-- Função: Recalcular custos do beneficiamento (BEFORE INSERT/UPDATE)
CREATE OR REPLACE FUNCTION public.fn_recalc_beneficiamento_c1()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_benef numeric;
  custo_mo numeric;
  custo_frete_ida numeric;
  custo_frete_volta numeric;
BEGIN
  base_benef := NEW.kg_retornado;
  
  IF base_benef > 0 THEN
    custo_mo := CASE WHEN NEW.mo_benef_mode = 'RKG' THEN NEW.mo_benef_val * base_benef ELSE NEW.mo_benef_val END;
    custo_frete_ida := CASE WHEN NEW.frete_ida_mode = 'RKG' THEN NEW.frete_ida_val * base_benef ELSE NEW.frete_ida_val END;
    custo_frete_volta := CASE WHEN NEW.frete_volta_mode = 'RKG' THEN NEW.frete_volta_val * base_benef ELSE NEW.frete_volta_val END;
    
    NEW.custos_benef_total_rs := custo_mo + custo_frete_ida + custo_frete_volta;
  ELSE
    NEW.custos_benef_total_rs := 0;
  END IF;
  
  -- Se novo beneficiamento, set kg_disponivel = kg_retornado
  IF TG_OP = 'INSERT' THEN
    NEW.kg_disponivel := NEW.kg_retornado;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para recalcular beneficiamento
CREATE TRIGGER trg_recalc_beneficiamento_c1
  BEFORE INSERT OR UPDATE ON public.beneficiamentos_c1
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_recalc_beneficiamento_c1();

-- Função: FIFO 1 - Alocar beneficiamento das entradas (AFTER INSERT)
CREATE OR REPLACE FUNCTION public.fn_allocate_beneficiamento_fifo_c1()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  restante numeric;
  v_entrada RECORD;
  alocar numeric;
  total_custo_pre_alocado numeric := 0;
BEGIN
  restante := NEW.kg_retornado;
  
  -- Iterar entradas da operação por created_at asc (mais antigas primeiro)
  FOR v_entrada IN 
    SELECT id, kg_liquido_disponivel, custo_unit_pre_rkg
    FROM public.entradas_c1
    WHERE operacao_id = NEW.operacao_id
      AND is_deleted = false
      AND kg_liquido_disponivel > 0
    ORDER BY created_at ASC
  LOOP
    EXIT WHEN restante <= 0;
    
    alocar := LEAST(restante, v_entrada.kg_liquido_disponivel);
    
    -- Inserir alocação
    INSERT INTO public.benef_entrada_alocacoes (beneficiamento_id, entrada_id, kg_alocado)
    VALUES (NEW.id, v_entrada.id, alocar);
    
    -- Atualizar entrada
    UPDATE public.entradas_c1
    SET kg_liquido_disponivel = kg_liquido_disponivel - alocar
    WHERE id = v_entrada.id;
    
    -- Acumular custo PRÉ alocado
    total_custo_pre_alocado := total_custo_pre_alocado + (alocar * v_entrada.custo_unit_pre_rkg);
    
    restante := restante - alocar;
  END LOOP;
  
  -- Se restante > 0, erro
  IF restante > 0 THEN
    RAISE EXCEPTION 'Beneficiamento maior que saldo disponível nas entradas. Faltam % kg', restante;
  END IF;
  
  -- Atualizar beneficiamento com custos calculados
  UPDATE public.beneficiamentos_c1
  SET custo_pre_alocado_rs = total_custo_pre_alocado,
      custo_real_total_rs = total_custo_pre_alocado + custos_benef_total_rs,
      custo_real_rkg = (total_custo_pre_alocado + custos_benef_total_rs) / NULLIF(kg_retornado, 0)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Trigger FIFO 1
CREATE TRIGGER trg_allocate_beneficiamento_fifo_c1
  AFTER INSERT ON public.beneficiamentos_c1
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_allocate_beneficiamento_fifo_c1();

-- Função: FIFO 2 - Alocar saída dos beneficiamentos (AFTER INSERT)
CREATE OR REPLACE FUNCTION public.fn_allocate_saida_fifo_c1()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  restante numeric;
  v_benef RECORD;
  alocar numeric;
  total_custo_saida numeric := 0;
BEGIN
  -- Validar regras de negócio
  IF NEW.tipo_saida = 'VENDA' THEN
    IF NEW.parceiro_destino_id IS NULL THEN
      RAISE EXCEPTION 'Venda exige cliente (parceiro_destino_id)';
    END IF;
    IF NEW.benchmark_vergalhao_rkg IS NULL THEN
      RAISE EXCEPTION 'Venda exige benchmark de vergalhão';
    END IF;
  END IF;
  
  restante := NEW.kg_saida;
  
  -- Iterar beneficiamentos da operação por dt asc, created_at asc
  FOR v_benef IN 
    SELECT id, kg_disponivel, custo_real_rkg
    FROM public.beneficiamentos_c1
    WHERE operacao_id = NEW.operacao_id
      AND is_deleted = false
      AND kg_disponivel > 0
    ORDER BY dt ASC, created_at ASC
  LOOP
    EXIT WHEN restante <= 0;
    
    alocar := LEAST(restante, v_benef.kg_disponivel);
    
    -- Inserir alocação com snapshot do custo
    INSERT INTO public.saida_benef_alocacoes (saida_id, beneficiamento_id, kg_alocado, custo_real_rkg_snapshot)
    VALUES (NEW.id, v_benef.id, alocar, COALESCE(v_benef.custo_real_rkg, 0));
    
    -- Atualizar beneficiamento
    UPDATE public.beneficiamentos_c1
    SET kg_disponivel = kg_disponivel - alocar
    WHERE id = v_benef.id;
    
    -- Acumular custo da saída
    total_custo_saida := total_custo_saida + (alocar * COALESCE(v_benef.custo_real_rkg, 0));
    
    restante := restante - alocar;
  END LOOP;
  
  -- Se restante > 0, erro
  IF restante > 0 THEN
    RAISE EXCEPTION 'Saída maior que vergalhão disponível. Faltam % kg', restante;
  END IF;
  
  -- Calcular valores da saída
  UPDATE public.saidas_c1
  SET custo_saida_rs = total_custo_saida,
      custo_saida_rkg = total_custo_saida / NULLIF(kg_saida, 0),
      receita_simulada_rs = CASE WHEN benchmark_vergalhao_rkg IS NOT NULL THEN benchmark_vergalhao_rkg * kg_saida ELSE 0 END,
      resultado_simulado_rs = CASE WHEN benchmark_vergalhao_rkg IS NOT NULL THEN (benchmark_vergalhao_rkg * kg_saida) - total_custo_saida ELSE -total_custo_saida END
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Trigger FIFO 2
CREATE TRIGGER trg_allocate_saida_fifo_c1
  AFTER INSERT ON public.saidas_c1
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_allocate_saida_fifo_c1();

-- ===========================================
-- CENÁRIO 2: FUNÇÕES FIFO (Terceiros)
-- ===========================================

-- Função: Inicializar kg_disponivel na entrada terceiros
CREATE OR REPLACE FUNCTION public.fn_init_entrada_terceiros()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.kg_disponivel := NEW.kg_recebido;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_init_entrada_terceiros
  BEFORE INSERT ON public.entradas_terceiros
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_init_entrada_terceiros();

-- Função: Recalcular custos serviço terceiros
CREATE OR REPLACE FUNCTION public.fn_recalc_beneficiamento_terceiros()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_benef numeric;
  custo_mo_terceiro numeric;
  custo_mo_ibrac numeric;
  custo_frete_ida numeric;
  custo_frete_volta numeric;
BEGIN
  base_benef := NEW.kg_retornado;
  
  IF base_benef > 0 THEN
    custo_mo_terceiro := CASE WHEN NEW.mo_terceiro_mode = 'RKG' THEN NEW.mo_terceiro_val * base_benef ELSE NEW.mo_terceiro_val END;
    custo_mo_ibrac := CASE WHEN NEW.mo_ibrac_mode = 'RKG' THEN NEW.mo_ibrac_val * base_benef ELSE NEW.mo_ibrac_val END;
    custo_frete_ida := CASE WHEN NEW.frete_ida_mode = 'RKG' THEN NEW.frete_ida_val * base_benef ELSE NEW.frete_ida_val END;
    custo_frete_volta := CASE WHEN NEW.frete_volta_mode = 'RKG' THEN NEW.frete_volta_val * base_benef ELSE NEW.frete_volta_val END;
    
    NEW.custos_servico_total_rs := custo_mo_terceiro + custo_mo_ibrac + custo_frete_ida + custo_frete_volta;
  ELSE
    NEW.custos_servico_total_rs := 0;
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    NEW.kg_disponivel_cliente := NEW.kg_retornado;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recalc_beneficiamento_terceiros
  BEFORE INSERT OR UPDATE ON public.beneficiamentos_terceiros
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_recalc_beneficiamento_terceiros();

-- Função: FIFO 1 Terceiros
CREATE OR REPLACE FUNCTION public.fn_allocate_benef_terceiros_fifo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  restante numeric;
  v_entrada RECORD;
  alocar numeric;
BEGIN
  restante := NEW.kg_retornado;
  
  FOR v_entrada IN 
    SELECT id, kg_disponivel
    FROM public.entradas_terceiros
    WHERE operacao_id = NEW.operacao_id
      AND is_deleted = false
      AND kg_disponivel > 0
    ORDER BY created_at ASC
  LOOP
    EXIT WHEN restante <= 0;
    
    alocar := LEAST(restante, v_entrada.kg_disponivel);
    
    INSERT INTO public.benef_ent_aloc_terceiros (beneficiamento_id, entrada_id, kg_alocado)
    VALUES (NEW.id, v_entrada.id, alocar);
    
    UPDATE public.entradas_terceiros
    SET kg_disponivel = kg_disponivel - alocar
    WHERE id = v_entrada.id;
    
    restante := restante - alocar;
  END LOOP;
  
  IF restante > 0 THEN
    RAISE EXCEPTION 'Retorno maior que saldo recebido do cliente. Faltam % kg', restante;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_allocate_benef_terceiros_fifo
  AFTER INSERT ON public.beneficiamentos_terceiros
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_allocate_benef_terceiros_fifo();

-- Função: FIFO 2 Terceiros (devolução)
CREATE OR REPLACE FUNCTION public.fn_allocate_saida_terceiros_fifo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  restante numeric;
  v_benef RECORD;
  alocar numeric;
  total_custo_servico numeric := 0;
  custo_servico_rkg numeric;
BEGIN
  restante := NEW.kg_devolvido;
  
  FOR v_benef IN 
    SELECT id, kg_disponivel_cliente, kg_retornado, custos_servico_total_rs
    FROM public.beneficiamentos_terceiros
    WHERE operacao_id = NEW.operacao_id
      AND is_deleted = false
      AND kg_disponivel_cliente > 0
    ORDER BY dt ASC, created_at ASC
  LOOP
    EXIT WHEN restante <= 0;
    
    alocar := LEAST(restante, v_benef.kg_disponivel_cliente);
    custo_servico_rkg := v_benef.custos_servico_total_rs / NULLIF(v_benef.kg_retornado, 0);
    
    INSERT INTO public.saida_benef_aloc_terceiros (saida_id, beneficiamento_id, kg_alocado, custo_servico_rkg_snapshot)
    VALUES (NEW.id, v_benef.id, alocar, COALESCE(custo_servico_rkg, 0));
    
    UPDATE public.beneficiamentos_terceiros
    SET kg_disponivel_cliente = kg_disponivel_cliente - alocar
    WHERE id = v_benef.id;
    
    total_custo_servico := total_custo_servico + (alocar * COALESCE(custo_servico_rkg, 0));
    
    restante := restante - alocar;
  END LOOP;
  
  IF restante > 0 THEN
    RAISE EXCEPTION 'Devolução maior que vergalhão disponível. Faltam % kg', restante;
  END IF;
  
  UPDATE public.saidas_terceiros
  SET custo_servico_saida_rs = total_custo_servico
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_allocate_saida_terceiros_fifo
  AFTER INSERT ON public.saidas_terceiros
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_allocate_saida_terceiros_fifo();

-- ===========================================
-- CENÁRIO 3: FUNÇÕES FIFO (Intermediação)
-- ===========================================

-- Função: Recalcular compra
CREATE OR REPLACE FUNCTION public.fn_recalc_compra_intermediacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.valor_compra_rs := NEW.kg_comprado * NEW.preco_compra_rkg;
  
  IF TG_OP = 'INSERT' THEN
    NEW.kg_disponivel_compra := NEW.kg_comprado;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recalc_compra_intermediacao
  BEFORE INSERT OR UPDATE ON public.compras_intermediacao
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_recalc_compra_intermediacao();

-- Função: Recalcular beneficiamento intermediação
CREATE OR REPLACE FUNCTION public.fn_recalc_beneficiamento_intermediacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_benef numeric;
  custo_mo numeric;
  custo_frete_ida numeric;
  custo_frete_volta numeric;
BEGIN
  base_benef := NEW.kg_retornado;
  
  IF base_benef > 0 THEN
    custo_mo := CASE WHEN NEW.mo_benef_mode = 'RKG' THEN NEW.mo_benef_val * base_benef ELSE NEW.mo_benef_val END;
    custo_frete_ida := CASE WHEN NEW.frete_ida_mode = 'RKG' THEN NEW.frete_ida_val * base_benef ELSE NEW.frete_ida_val END;
    custo_frete_volta := CASE WHEN NEW.frete_volta_mode = 'RKG' THEN NEW.frete_volta_val * base_benef ELSE NEW.frete_volta_val END;
    
    NEW.custos_benef_total_rs := custo_mo + custo_frete_ida + custo_frete_volta;
  ELSE
    NEW.custos_benef_total_rs := 0;
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    NEW.kg_disponivel_venda := NEW.kg_retornado;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recalc_beneficiamento_intermediacao
  BEFORE INSERT OR UPDATE ON public.beneficiamentos_intermediacao
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_recalc_beneficiamento_intermediacao();

-- Função: FIFO 1 Intermediação (beneficiamento ← compras)
CREATE OR REPLACE FUNCTION public.fn_allocate_benef_from_compras()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  restante numeric;
  v_compra RECORD;
  alocar numeric;
BEGIN
  restante := NEW.kg_retornado;
  
  FOR v_compra IN 
    SELECT id, kg_disponivel_compra
    FROM public.compras_intermediacao
    WHERE operacao_id = NEW.operacao_id
      AND is_deleted = false
      AND kg_disponivel_compra > 0
    ORDER BY dt ASC, created_at ASC
  LOOP
    EXIT WHEN restante <= 0;
    
    alocar := LEAST(restante, v_compra.kg_disponivel_compra);
    
    INSERT INTO public.benef_compra_alocacoes (beneficiamento_id, compra_id, kg_alocado)
    VALUES (NEW.id, v_compra.id, alocar);
    
    UPDATE public.compras_intermediacao
    SET kg_disponivel_compra = kg_disponivel_compra - alocar
    WHERE id = v_compra.id;
    
    restante := restante - alocar;
  END LOOP;
  
  IF restante > 0 THEN
    RAISE EXCEPTION 'Beneficiamento maior que kg comprado disponível. Faltam % kg', restante;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_allocate_benef_from_compras
  AFTER INSERT ON public.beneficiamentos_intermediacao
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_allocate_benef_from_compras();

-- Função: Recalcular venda
CREATE OR REPLACE FUNCTION public.fn_recalc_venda_intermediacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.valor_venda_rs := NEW.kg_vendido * NEW.preco_venda_rkg;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recalc_venda_intermediacao
  BEFORE INSERT OR UPDATE ON public.vendas_intermediacao
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_recalc_venda_intermediacao();

-- Função: FIFO 2 Intermediação (venda ← beneficiamentos) + Apuração financeira
CREATE OR REPLACE FUNCTION public.fn_allocate_venda_from_benef()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  restante numeric;
  v_benef RECORD;
  alocar numeric;
  v_custo_material numeric := 0;
  v_comissao_mode text;
  v_comissao_val numeric;
  v_comissao_ibrac numeric;
  v_saldo_repassar numeric;
BEGIN
  restante := NEW.kg_vendido;
  
  FOR v_benef IN 
    SELECT b.id, b.kg_disponivel_venda
    FROM public.beneficiamentos_intermediacao b
    WHERE b.operacao_id = NEW.operacao_id
      AND b.is_deleted = false
      AND b.kg_disponivel_venda > 0
    ORDER BY b.dt ASC, b.created_at ASC
  LOOP
    EXIT WHEN restante <= 0;
    
    alocar := LEAST(restante, v_benef.kg_disponivel_venda);
    
    INSERT INTO public.venda_benef_alocacoes (venda_id, beneficiamento_id, kg_alocado)
    VALUES (NEW.id, v_benef.id, alocar);
    
    UPDATE public.beneficiamentos_intermediacao
    SET kg_disponivel_venda = kg_disponivel_venda - alocar
    WHERE id = v_benef.id;
    
    restante := restante - alocar;
  END LOOP;
  
  IF restante > 0 THEN
    RAISE EXCEPTION 'Venda maior que vergalhão disponível. Faltam % kg', restante;
  END IF;
  
  -- Calcular custo do material do dono (via alocações)
  SELECT COALESCE(SUM(
    vba.kg_alocado * (
      SELECT SUM(bca.kg_alocado * c.preco_compra_rkg) / NULLIF(SUM(bca.kg_alocado), 0)
      FROM public.benef_compra_alocacoes bca
      JOIN public.compras_intermediacao c ON c.id = bca.compra_id
      WHERE bca.beneficiamento_id = vba.beneficiamento_id
    )
  ), 0) INTO v_custo_material
  FROM public.venda_benef_alocacoes vba
  WHERE vba.venda_id = NEW.id;
  
  -- Buscar modo de comissão da operação
  SELECT comissao_mode, comissao_val INTO v_comissao_mode, v_comissao_val
  FROM public.operacoes_intermediacao
  WHERE id = NEW.operacao_id;
  
  -- Calcular comissão IBRAC
  IF v_comissao_mode = 'PCT' THEN
    v_comissao_ibrac := (NEW.kg_vendido * NEW.preco_venda_rkg) * v_comissao_val;
  ELSE
    v_comissao_ibrac := v_comissao_val;
  END IF;
  
  -- Calcular saldo a repassar
  v_saldo_repassar := (NEW.kg_vendido * NEW.preco_venda_rkg) - v_custo_material - v_comissao_ibrac;
  
  -- Atualizar venda
  UPDATE public.vendas_intermediacao
  SET custo_material_dono_rs = v_custo_material,
      comissao_ibrac_rs = v_comissao_ibrac,
      saldo_repassar_rs = v_saldo_repassar
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_allocate_venda_from_benef
  AFTER INSERT ON public.vendas_intermediacao
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_allocate_venda_from_benef();

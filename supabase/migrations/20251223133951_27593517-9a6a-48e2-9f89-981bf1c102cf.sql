-- Adicionar Foreign Keys que estão faltando nas tabelas

-- 1. entradas -> tipos_produto (já existe, mas verificando)
-- 2. entradas -> conferente -> profiles
DO $$
BEGIN
  -- entradas.conferente_id -> profiles.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'entradas_conferente_id_fkey'
  ) THEN
    ALTER TABLE public.entradas
    ADD CONSTRAINT entradas_conferente_id_fkey 
    FOREIGN KEY (conferente_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. beneficiamentos.created_by -> profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'beneficiamentos_created_by_fkey'
  ) THEN
    ALTER TABLE public.beneficiamentos
    ADD CONSTRAINT beneficiamentos_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. entradas.created_by -> profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'entradas_created_by_fkey'
  ) THEN
    ALTER TABLE public.entradas
    ADD CONSTRAINT entradas_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. saidas.created_by -> profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'saidas_created_by_fkey'
  ) THEN
    ALTER TABLE public.saidas
    ADD CONSTRAINT saidas_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 6. movimentacoes.created_by -> profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'movimentacoes_created_by_fkey'
  ) THEN
    ALTER TABLE public.movimentacoes
    ADD CONSTRAINT movimentacoes_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 7. transferencias_dono.created_by -> profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'transferencias_dono_created_by_fkey'
  ) THEN
    ALTER TABLE public.transferencias_dono
    ADD CONSTRAINT transferencias_dono_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 8. acertos_financeiros.created_by -> profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'acertos_financeiros_created_by_fkey'
  ) THEN
    ALTER TABLE public.acertos_financeiros
    ADD CONSTRAINT acertos_financeiros_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 9. lme_semana_config.created_by -> profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'lme_semana_config_created_by_fkey'
  ) THEN
    ALTER TABLE public.lme_semana_config
    ADD CONSTRAINT lme_semana_config_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 10. simulacoes_lme.created_by -> profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'simulacoes_lme_created_by_fkey'
  ) THEN
    ALTER TABLE public.simulacoes_lme
    ADD CONSTRAINT simulacoes_lme_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 11. user_roles.user_id -> auth.users (segurança)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_roles_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Criar índices para melhorar performance em colunas FK frequentemente consultadas
CREATE INDEX IF NOT EXISTS idx_sublotes_dono_id ON public.sublotes(dono_id);
CREATE INDEX IF NOT EXISTS idx_sublotes_local_estoque_id ON public.sublotes(local_estoque_id);
CREATE INDEX IF NOT EXISTS idx_sublotes_entrada_id ON public.sublotes(entrada_id);
CREATE INDEX IF NOT EXISTS idx_sublotes_tipo_produto_id ON public.sublotes(tipo_produto_id);
CREATE INDEX IF NOT EXISTS idx_sublotes_status ON public.sublotes(status);

CREATE INDEX IF NOT EXISTS idx_entradas_dono_id ON public.entradas(dono_id);
CREATE INDEX IF NOT EXISTS idx_entradas_parceiro_id ON public.entradas(parceiro_id);
CREATE INDEX IF NOT EXISTS idx_entradas_data_entrada ON public.entradas(data_entrada);

CREATE INDEX IF NOT EXISTS idx_saidas_cliente_id ON public.saidas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_saidas_data_saida ON public.saidas(data_saida);

CREATE INDEX IF NOT EXISTS idx_beneficiamentos_status ON public.beneficiamentos(status);
CREATE INDEX IF NOT EXISTS idx_beneficiamentos_data_inicio ON public.beneficiamentos(data_inicio);

CREATE INDEX IF NOT EXISTS idx_acertos_financeiros_status ON public.acertos_financeiros(status);
CREATE INDEX IF NOT EXISTS idx_acertos_financeiros_dono_id ON public.acertos_financeiros(dono_id);
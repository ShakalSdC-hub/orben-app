export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      acertos_financeiros: {
        Row: {
          created_at: string
          created_by: string | null
          data_acerto: string | null
          data_pagamento: string | null
          dono_id: string | null
          id: string
          observacoes: string | null
          parceiro_id: string | null
          referencia_id: string | null
          referencia_tipo: string | null
          status: string | null
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_acerto?: string | null
          data_pagamento?: string | null
          dono_id?: string | null
          id?: string
          observacoes?: string | null
          parceiro_id?: string | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          status?: string | null
          tipo: string
          updated_at?: string
          valor: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_acerto?: string | null
          data_pagamento?: string | null
          dono_id?: string | null
          id?: string
          observacoes?: string | null
          parceiro_id?: string | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "acertos_financeiros_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acertos_financeiros_dono_id_fkey"
            columns: ["dono_id"]
            isOneToOne: false
            referencedRelation: "donos_material"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acertos_financeiros_parceiro_id_fkey"
            columns: ["parceiro_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_acertos_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_acertos_dono"
            columns: ["dono_id"]
            isOneToOne: false
            referencedRelation: "donos_material"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_acertos_parceiro"
            columns: ["parceiro_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          record_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          record_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          record_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      benef_compra_alocacoes: {
        Row: {
          beneficiamento_id: string
          compra_id: string
          created_at: string
          id: string
          kg_alocado: number
        }
        Insert: {
          beneficiamento_id: string
          compra_id: string
          created_at?: string
          id?: string
          kg_alocado: number
        }
        Update: {
          beneficiamento_id?: string
          compra_id?: string
          created_at?: string
          id?: string
          kg_alocado?: number
        }
        Relationships: [
          {
            foreignKeyName: "benef_compra_alocacoes_beneficiamento_id_fkey"
            columns: ["beneficiamento_id"]
            isOneToOne: false
            referencedRelation: "beneficiamentos_intermediacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benef_compra_alocacoes_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras_intermediacao"
            referencedColumns: ["id"]
          },
        ]
      }
      benef_ent_aloc_terceiros: {
        Row: {
          beneficiamento_id: string
          created_at: string
          entrada_id: string
          id: string
          kg_alocado: number
        }
        Insert: {
          beneficiamento_id: string
          created_at?: string
          entrada_id: string
          id?: string
          kg_alocado: number
        }
        Update: {
          beneficiamento_id?: string
          created_at?: string
          entrada_id?: string
          id?: string
          kg_alocado?: number
        }
        Relationships: [
          {
            foreignKeyName: "benef_ent_aloc_terceiros_beneficiamento_id_fkey"
            columns: ["beneficiamento_id"]
            isOneToOne: false
            referencedRelation: "beneficiamentos_terceiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benef_ent_aloc_terceiros_entrada_id_fkey"
            columns: ["entrada_id"]
            isOneToOne: false
            referencedRelation: "entradas_terceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      benef_entrada_alocacoes: {
        Row: {
          beneficiamento_id: string
          created_at: string
          entrada_id: string
          id: string
          kg_alocado: number
        }
        Insert: {
          beneficiamento_id: string
          created_at?: string
          entrada_id: string
          id?: string
          kg_alocado: number
        }
        Update: {
          beneficiamento_id?: string
          created_at?: string
          entrada_id?: string
          id?: string
          kg_alocado?: number
        }
        Relationships: [
          {
            foreignKeyName: "benef_entrada_alocacoes_beneficiamento_id_fkey"
            columns: ["beneficiamento_id"]
            isOneToOne: false
            referencedRelation: "beneficiamentos_c1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benef_entrada_alocacoes_entrada_id_fkey"
            columns: ["entrada_id"]
            isOneToOne: false
            referencedRelation: "entradas_c1"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiamento_entradas: {
        Row: {
          beneficiamento_id: string
          created_at: string | null
          entrada_id: string | null
          id: string
          taxa_financeira_pct: number | null
          taxa_financeira_valor: number | null
          valor_documento: number
        }
        Insert: {
          beneficiamento_id: string
          created_at?: string | null
          entrada_id?: string | null
          id?: string
          taxa_financeira_pct?: number | null
          taxa_financeira_valor?: number | null
          valor_documento?: number
        }
        Update: {
          beneficiamento_id?: string
          created_at?: string | null
          entrada_id?: string | null
          id?: string
          taxa_financeira_pct?: number | null
          taxa_financeira_valor?: number | null
          valor_documento?: number
        }
        Relationships: [
          {
            foreignKeyName: "beneficiamento_entradas_beneficiamento_id_fkey"
            columns: ["beneficiamento_id"]
            isOneToOne: false
            referencedRelation: "beneficiamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiamento_entradas_entrada_id_fkey"
            columns: ["entrada_id"]
            isOneToOne: false
            referencedRelation: "entradas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_benef_entradas_beneficiamento"
            columns: ["beneficiamento_id"]
            isOneToOne: false
            referencedRelation: "beneficiamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_benef_entradas_entrada"
            columns: ["entrada_id"]
            isOneToOne: false
            referencedRelation: "entradas"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiamento_itens_entrada: {
        Row: {
          beneficiamento_id: string | null
          created_at: string
          custo_unitario: number | null
          id: string
          peso_kg: number
          sublote_id: string | null
          tipo_produto_id: string | null
        }
        Insert: {
          beneficiamento_id?: string | null
          created_at?: string
          custo_unitario?: number | null
          id?: string
          peso_kg: number
          sublote_id?: string | null
          tipo_produto_id?: string | null
        }
        Update: {
          beneficiamento_id?: string | null
          created_at?: string
          custo_unitario?: number | null
          id?: string
          peso_kg?: number
          sublote_id?: string | null
          tipo_produto_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficiamento_itens_entrada_beneficiamento_id_fkey"
            columns: ["beneficiamento_id"]
            isOneToOne: false
            referencedRelation: "beneficiamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiamento_itens_entrada_sublote_id_fkey"
            columns: ["sublote_id"]
            isOneToOne: false
            referencedRelation: "sublotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiamento_itens_entrada_tipo_produto_id_fkey"
            columns: ["tipo_produto_id"]
            isOneToOne: false
            referencedRelation: "tipos_produto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bie_beneficiamento"
            columns: ["beneficiamento_id"]
            isOneToOne: false
            referencedRelation: "beneficiamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bie_sublote"
            columns: ["sublote_id"]
            isOneToOne: false
            referencedRelation: "sublotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bie_tipo_produto"
            columns: ["tipo_produto_id"]
            isOneToOne: false
            referencedRelation: "tipos_produto"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiamento_itens_saida: {
        Row: {
          beneficiamento_id: string | null
          created_at: string
          custo_unitario_calculado: number | null
          id: string
          local_estoque_id: string | null
          peso_kg: number
          sublote_gerado_id: string | null
          tipo_produto_id: string | null
        }
        Insert: {
          beneficiamento_id?: string | null
          created_at?: string
          custo_unitario_calculado?: number | null
          id?: string
          local_estoque_id?: string | null
          peso_kg: number
          sublote_gerado_id?: string | null
          tipo_produto_id?: string | null
        }
        Update: {
          beneficiamento_id?: string | null
          created_at?: string
          custo_unitario_calculado?: number | null
          id?: string
          local_estoque_id?: string | null
          peso_kg?: number
          sublote_gerado_id?: string | null
          tipo_produto_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficiamento_itens_saida_beneficiamento_id_fkey"
            columns: ["beneficiamento_id"]
            isOneToOne: false
            referencedRelation: "beneficiamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiamento_itens_saida_local_estoque_id_fkey"
            columns: ["local_estoque_id"]
            isOneToOne: false
            referencedRelation: "locais_estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiamento_itens_saida_sublote_gerado_id_fkey"
            columns: ["sublote_gerado_id"]
            isOneToOne: false
            referencedRelation: "sublotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiamento_itens_saida_tipo_produto_id_fkey"
            columns: ["tipo_produto_id"]
            isOneToOne: false
            referencedRelation: "tipos_produto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bis_beneficiamento"
            columns: ["beneficiamento_id"]
            isOneToOne: false
            referencedRelation: "beneficiamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bis_local_estoque"
            columns: ["local_estoque_id"]
            isOneToOne: false
            referencedRelation: "locais_estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bis_sublote_gerado"
            columns: ["sublote_gerado_id"]
            isOneToOne: false
            referencedRelation: "sublotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bis_tipo_produto"
            columns: ["tipo_produto_id"]
            isOneToOne: false
            referencedRelation: "tipos_produto"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiamento_produtos: {
        Row: {
          beneficiamento_id: string
          created_at: string | null
          id: string
          perda_cobrada_pct: number | null
          perda_padrao_pct: number | null
          peso_entrada_kg: number
          peso_saida_estimado_kg: number | null
          tipo_produto_id: string | null
        }
        Insert: {
          beneficiamento_id: string
          created_at?: string | null
          id?: string
          perda_cobrada_pct?: number | null
          perda_padrao_pct?: number | null
          peso_entrada_kg?: number
          peso_saida_estimado_kg?: number | null
          tipo_produto_id?: string | null
        }
        Update: {
          beneficiamento_id?: string
          created_at?: string | null
          id?: string
          perda_cobrada_pct?: number | null
          perda_padrao_pct?: number | null
          peso_entrada_kg?: number
          peso_saida_estimado_kg?: number | null
          tipo_produto_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficiamento_produtos_beneficiamento_id_fkey"
            columns: ["beneficiamento_id"]
            isOneToOne: false
            referencedRelation: "beneficiamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiamento_produtos_tipo_produto_id_fkey"
            columns: ["tipo_produto_id"]
            isOneToOne: false
            referencedRelation: "tipos_produto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_benef_prod_beneficiamento"
            columns: ["beneficiamento_id"]
            isOneToOne: false
            referencedRelation: "beneficiamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_benef_prod_tipo_produto"
            columns: ["tipo_produto_id"]
            isOneToOne: false
            referencedRelation: "tipos_produto"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiamentos: {
        Row: {
          codigo: string
          created_at: string
          created_by: string | null
          custo_frete_ida: number | null
          custo_frete_volta: number | null
          custo_mo_ibrac: number | null
          custo_mo_terceiro: number | null
          data_fim: string | null
          data_inicio: string | null
          fornecedor_terceiro_id: string | null
          id: string
          lme_referencia_kg: number | null
          lucro_perda_kg: number | null
          lucro_perda_valor: number | null
          motorista: string | null
          observacoes: string | null
          perda_cobrada_pct: number | null
          perda_real_pct: number | null
          peso_entrada_kg: number | null
          peso_saida_kg: number | null
          placa_veiculo: string | null
          processo_id: string | null
          status: string | null
          taxa_financeira_pct: number | null
          tipo_beneficiamento: string | null
          transportadora_id: string | null
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          created_by?: string | null
          custo_frete_ida?: number | null
          custo_frete_volta?: number | null
          custo_mo_ibrac?: number | null
          custo_mo_terceiro?: number | null
          data_fim?: string | null
          data_inicio?: string | null
          fornecedor_terceiro_id?: string | null
          id?: string
          lme_referencia_kg?: number | null
          lucro_perda_kg?: number | null
          lucro_perda_valor?: number | null
          motorista?: string | null
          observacoes?: string | null
          perda_cobrada_pct?: number | null
          perda_real_pct?: number | null
          peso_entrada_kg?: number | null
          peso_saida_kg?: number | null
          placa_veiculo?: string | null
          processo_id?: string | null
          status?: string | null
          taxa_financeira_pct?: number | null
          tipo_beneficiamento?: string | null
          transportadora_id?: string | null
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          created_by?: string | null
          custo_frete_ida?: number | null
          custo_frete_volta?: number | null
          custo_mo_ibrac?: number | null
          custo_mo_terceiro?: number | null
          data_fim?: string | null
          data_inicio?: string | null
          fornecedor_terceiro_id?: string | null
          id?: string
          lme_referencia_kg?: number | null
          lucro_perda_kg?: number | null
          lucro_perda_valor?: number | null
          motorista?: string | null
          observacoes?: string | null
          perda_cobrada_pct?: number | null
          perda_real_pct?: number | null
          peso_entrada_kg?: number | null
          peso_saida_kg?: number | null
          placa_veiculo?: string | null
          processo_id?: string | null
          status?: string | null
          taxa_financeira_pct?: number | null
          tipo_beneficiamento?: string | null
          transportadora_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficiamentos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiamentos_fornecedor_terceiro_id_fkey"
            columns: ["fornecedor_terceiro_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiamentos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiamentos_transportadora_id_fkey"
            columns: ["transportadora_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_beneficiamentos_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_beneficiamentos_fornecedor"
            columns: ["fornecedor_terceiro_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_beneficiamentos_processo"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_beneficiamentos_transportadora"
            columns: ["transportadora_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiamentos_c1: {
        Row: {
          created_at: string
          custo_pre_alocado_rs: number | null
          custo_real_rkg: number | null
          custo_real_total_rs: number | null
          custos_benef_total_rs: number | null
          documento: string | null
          dt: string
          frete_ida_mode: string | null
          frete_ida_val: number | null
          frete_volta_mode: string | null
          frete_volta_val: number | null
          id: string
          is_deleted: boolean | null
          kg_disponivel: number | null
          kg_retornado: number
          mo_benef_mode: string | null
          mo_benef_val: number | null
          operacao_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custo_pre_alocado_rs?: number | null
          custo_real_rkg?: number | null
          custo_real_total_rs?: number | null
          custos_benef_total_rs?: number | null
          documento?: string | null
          dt: string
          frete_ida_mode?: string | null
          frete_ida_val?: number | null
          frete_volta_mode?: string | null
          frete_volta_val?: number | null
          id?: string
          is_deleted?: boolean | null
          kg_disponivel?: number | null
          kg_retornado: number
          mo_benef_mode?: string | null
          mo_benef_val?: number | null
          operacao_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custo_pre_alocado_rs?: number | null
          custo_real_rkg?: number | null
          custo_real_total_rs?: number | null
          custos_benef_total_rs?: number | null
          documento?: string | null
          dt?: string
          frete_ida_mode?: string | null
          frete_ida_val?: number | null
          frete_volta_mode?: string | null
          frete_volta_val?: number | null
          id?: string
          is_deleted?: boolean | null
          kg_disponivel?: number | null
          kg_retornado?: number
          mo_benef_mode?: string | null
          mo_benef_val?: number | null
          operacao_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficiamentos_c1_operacao_id_fkey"
            columns: ["operacao_id"]
            isOneToOne: false
            referencedRelation: "operacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiamentos_intermediacao: {
        Row: {
          created_at: string
          custos_benef_total_rs: number | null
          documento: string | null
          dt: string
          frete_ida_mode: string | null
          frete_ida_val: number | null
          frete_volta_mode: string | null
          frete_volta_val: number | null
          id: string
          is_deleted: boolean | null
          kg_disponivel_venda: number | null
          kg_retornado: number
          mo_benef_mode: string | null
          mo_benef_val: number | null
          operacao_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custos_benef_total_rs?: number | null
          documento?: string | null
          dt: string
          frete_ida_mode?: string | null
          frete_ida_val?: number | null
          frete_volta_mode?: string | null
          frete_volta_val?: number | null
          id?: string
          is_deleted?: boolean | null
          kg_disponivel_venda?: number | null
          kg_retornado: number
          mo_benef_mode?: string | null
          mo_benef_val?: number | null
          operacao_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custos_benef_total_rs?: number | null
          documento?: string | null
          dt?: string
          frete_ida_mode?: string | null
          frete_ida_val?: number | null
          frete_volta_mode?: string | null
          frete_volta_val?: number | null
          id?: string
          is_deleted?: boolean | null
          kg_disponivel_venda?: number | null
          kg_retornado?: number
          mo_benef_mode?: string | null
          mo_benef_val?: number | null
          operacao_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficiamentos_intermediacao_operacao_id_fkey"
            columns: ["operacao_id"]
            isOneToOne: false
            referencedRelation: "operacoes_intermediacao"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiamentos_terceiros: {
        Row: {
          created_at: string
          custos_servico_total_rs: number | null
          documento: string | null
          dt: string
          frete_ida_mode: string | null
          frete_ida_val: number | null
          frete_volta_mode: string | null
          frete_volta_val: number | null
          id: string
          is_deleted: boolean | null
          kg_disponivel_cliente: number | null
          kg_retornado: number
          mo_ibrac_mode: string | null
          mo_ibrac_val: number | null
          mo_terceiro_mode: string | null
          mo_terceiro_val: number | null
          operacao_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custos_servico_total_rs?: number | null
          documento?: string | null
          dt: string
          frete_ida_mode?: string | null
          frete_ida_val?: number | null
          frete_volta_mode?: string | null
          frete_volta_val?: number | null
          id?: string
          is_deleted?: boolean | null
          kg_disponivel_cliente?: number | null
          kg_retornado: number
          mo_ibrac_mode?: string | null
          mo_ibrac_val?: number | null
          mo_terceiro_mode?: string | null
          mo_terceiro_val?: number | null
          operacao_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custos_servico_total_rs?: number | null
          documento?: string | null
          dt?: string
          frete_ida_mode?: string | null
          frete_ida_val?: number | null
          frete_volta_mode?: string | null
          frete_volta_val?: number | null
          id?: string
          is_deleted?: boolean | null
          kg_disponivel_cliente?: number | null
          kg_retornado?: number
          mo_ibrac_mode?: string | null
          mo_ibrac_val?: number | null
          mo_terceiro_mode?: string | null
          mo_terceiro_val?: number | null
          operacao_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficiamentos_terceiros_operacao_id_fkey"
            columns: ["operacao_id"]
            isOneToOne: false
            referencedRelation: "operacoes_terceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome_fantasia: string | null
          razao_social: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome_fantasia?: string | null
          razao_social: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome_fantasia?: string | null
          razao_social?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cobrancas_servico_terceiros: {
        Row: {
          base_kg_mode: string | null
          created_at: string
          documento: string | null
          dt: string
          id: string
          is_deleted: boolean | null
          mode: string | null
          operacao_id: string
          tipo: string | null
          updated_at: string
          val: number | null
        }
        Insert: {
          base_kg_mode?: string | null
          created_at?: string
          documento?: string | null
          dt: string
          id?: string
          is_deleted?: boolean | null
          mode?: string | null
          operacao_id: string
          tipo?: string | null
          updated_at?: string
          val?: number | null
        }
        Update: {
          base_kg_mode?: string | null
          created_at?: string
          documento?: string | null
          dt?: string
          id?: string
          is_deleted?: boolean | null
          mode?: string | null
          operacao_id?: string
          tipo?: string | null
          updated_at?: string
          val?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cobrancas_servico_terceiros_operacao_id_fkey"
            columns: ["operacao_id"]
            isOneToOne: false
            referencedRelation: "operacoes_terceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_intermediacao: {
        Row: {
          created_at: string
          dt: string
          fornecedor_compra_id: string | null
          id: string
          is_deleted: boolean | null
          kg_comprado: number
          kg_disponivel_compra: number | null
          nf_compra: string | null
          operacao_id: string
          preco_compra_rkg: number
          updated_at: string
          valor_compra_rs: number | null
        }
        Insert: {
          created_at?: string
          dt: string
          fornecedor_compra_id?: string | null
          id?: string
          is_deleted?: boolean | null
          kg_comprado: number
          kg_disponivel_compra?: number | null
          nf_compra?: string | null
          operacao_id: string
          preco_compra_rkg: number
          updated_at?: string
          valor_compra_rs?: number | null
        }
        Update: {
          created_at?: string
          dt?: string
          fornecedor_compra_id?: string | null
          id?: string
          is_deleted?: boolean | null
          kg_comprado?: number
          kg_disponivel_compra?: number | null
          nf_compra?: string | null
          operacao_id?: string
          preco_compra_rkg?: number
          updated_at?: string
          valor_compra_rs?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_intermediacao_fornecedor_compra_id_fkey"
            columns: ["fornecedor_compra_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_intermediacao_operacao_id_fkey"
            columns: ["operacao_id"]
            isOneToOne: false
            referencedRelation: "operacoes_intermediacao"
            referencedColumns: ["id"]
          },
        ]
      }
      config_fiscal: {
        Row: {
          ativo: boolean | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
          valor: number
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
          valor: number
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      custos_intermediacao: {
        Row: {
          base_kg_mode: string | null
          categoria: string
          created_at: string
          documento: string | null
          dt: string
          id: string
          is_deleted: boolean | null
          mode: string | null
          obs: string | null
          operacao_id: string
          updated_at: string
          val: number
        }
        Insert: {
          base_kg_mode?: string | null
          categoria: string
          created_at?: string
          documento?: string | null
          dt: string
          id?: string
          is_deleted?: boolean | null
          mode?: string | null
          obs?: string | null
          operacao_id: string
          updated_at?: string
          val?: number
        }
        Update: {
          base_kg_mode?: string | null
          categoria?: string
          created_at?: string
          documento?: string | null
          dt?: string
          id?: string
          is_deleted?: boolean | null
          mode?: string | null
          obs?: string | null
          operacao_id?: string
          updated_at?: string
          val?: number
        }
        Relationships: [
          {
            foreignKeyName: "custos_intermediacao_operacao_id_fkey"
            columns: ["operacao_id"]
            isOneToOne: false
            referencedRelation: "operacoes_intermediacao"
            referencedColumns: ["id"]
          },
        ]
      }
      donos_material: {
        Row: {
          ativo: boolean | null
          created_at: string
          documento: string | null
          email: string | null
          id: string
          is_ibrac: boolean | null
          nome: string
          taxa_operacao_pct: number | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          documento?: string | null
          email?: string | null
          id?: string
          is_ibrac?: boolean | null
          nome: string
          taxa_operacao_pct?: number | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          documento?: string | null
          email?: string | null
          id?: string
          is_ibrac?: boolean | null
          nome?: string
          taxa_operacao_pct?: number | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      entradas: {
        Row: {
          codigo: string
          conferente_id: string | null
          created_at: string
          created_by: string | null
          data_entrada: string
          dono_id: string | null
          id: string
          motorista: string | null
          nota_fiscal: string | null
          observacoes: string | null
          parceiro_id: string | null
          peso_bruto_kg: number
          peso_liquido_kg: number
          peso_nf_kg: number | null
          placa_veiculo: string | null
          status: string | null
          taxa_financeira_pct: number | null
          teor_cobre: number | null
          tipo_entrada_id: string | null
          tipo_material: string
          tipo_produto_id: string | null
          transportadora_id: string | null
          updated_at: string
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          codigo: string
          conferente_id?: string | null
          created_at?: string
          created_by?: string | null
          data_entrada?: string
          dono_id?: string | null
          id?: string
          motorista?: string | null
          nota_fiscal?: string | null
          observacoes?: string | null
          parceiro_id?: string | null
          peso_bruto_kg: number
          peso_liquido_kg: number
          peso_nf_kg?: number | null
          placa_veiculo?: string | null
          status?: string | null
          taxa_financeira_pct?: number | null
          teor_cobre?: number | null
          tipo_entrada_id?: string | null
          tipo_material: string
          tipo_produto_id?: string | null
          transportadora_id?: string | null
          updated_at?: string
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          codigo?: string
          conferente_id?: string | null
          created_at?: string
          created_by?: string | null
          data_entrada?: string
          dono_id?: string | null
          id?: string
          motorista?: string | null
          nota_fiscal?: string | null
          observacoes?: string | null
          parceiro_id?: string | null
          peso_bruto_kg?: number
          peso_liquido_kg?: number
          peso_nf_kg?: number | null
          placa_veiculo?: string | null
          status?: string | null
          taxa_financeira_pct?: number | null
          teor_cobre?: number | null
          tipo_entrada_id?: string | null
          tipo_material?: string
          tipo_produto_id?: string | null
          transportadora_id?: string | null
          updated_at?: string
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "entradas_conferente_id_fkey"
            columns: ["conferente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entradas_dono_id_fkey"
            columns: ["dono_id"]
            isOneToOne: false
            referencedRelation: "donos_material"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entradas_parceiro_id_fkey"
            columns: ["parceiro_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entradas_tipo_entrada_id_fkey"
            columns: ["tipo_entrada_id"]
            isOneToOne: false
            referencedRelation: "tipos_entrada"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entradas_tipo_produto_id_fkey"
            columns: ["tipo_produto_id"]
            isOneToOne: false
            referencedRelation: "tipos_produto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entradas_transportadora_id_fkey"
            columns: ["transportadora_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_entradas_conferente"
            columns: ["conferente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_entradas_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_entradas_dono"
            columns: ["dono_id"]
            isOneToOne: false
            referencedRelation: "donos_material"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_entradas_parceiro"
            columns: ["parceiro_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_entradas_tipo_entrada"
            columns: ["tipo_entrada_id"]
            isOneToOne: false
            referencedRelation: "tipos_entrada"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_entradas_tipo_produto"
            columns: ["tipo_produto_id"]
            isOneToOne: false
            referencedRelation: "tipos_produto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_entradas_transportadora"
            columns: ["transportadora_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      entradas_c1: {
        Row: {
          benchmark_sucata_rkg: number | null
          created_at: string
          custo_unit_pre_rkg: number | null
          custos_pre_total_rs: number | null
          dt_emissao: string | null
          dt_recebimento: string | null
          financeiro_mode: string | null
          financeiro_val: number | null
          frete_ida_moagem_mode: string | null
          frete_ida_moagem_val: number | null
          frete_volta_moagem_mode: string | null
          frete_volta_moagem_val: number | null
          id: string
          is_deleted: boolean | null
          kg_liquido_disponivel: number | null
          kg_liquido_total: number | null
          kg_ticket: number | null
          moagem_mode: string | null
          moagem_val: number | null
          nf_num: string | null
          operacao_id: string
          perda_mel_pct: number
          perda_mista_pct: number
          perda_total_kg: number | null
          procedencia: string | null
          ticket_mel_kg: number | null
          ticket_mista_kg: number | null
          ticket_num: string | null
          updated_at: string
          valor_ticket_rs: number | null
          valor_unit_sucata_rkg: number
        }
        Insert: {
          benchmark_sucata_rkg?: number | null
          created_at?: string
          custo_unit_pre_rkg?: number | null
          custos_pre_total_rs?: number | null
          dt_emissao?: string | null
          dt_recebimento?: string | null
          financeiro_mode?: string | null
          financeiro_val?: number | null
          frete_ida_moagem_mode?: string | null
          frete_ida_moagem_val?: number | null
          frete_volta_moagem_mode?: string | null
          frete_volta_moagem_val?: number | null
          id?: string
          is_deleted?: boolean | null
          kg_liquido_disponivel?: number | null
          kg_liquido_total?: number | null
          kg_ticket?: number | null
          moagem_mode?: string | null
          moagem_val?: number | null
          nf_num?: string | null
          operacao_id: string
          perda_mel_pct: number
          perda_mista_pct: number
          perda_total_kg?: number | null
          procedencia?: string | null
          ticket_mel_kg?: number | null
          ticket_mista_kg?: number | null
          ticket_num?: string | null
          updated_at?: string
          valor_ticket_rs?: number | null
          valor_unit_sucata_rkg: number
        }
        Update: {
          benchmark_sucata_rkg?: number | null
          created_at?: string
          custo_unit_pre_rkg?: number | null
          custos_pre_total_rs?: number | null
          dt_emissao?: string | null
          dt_recebimento?: string | null
          financeiro_mode?: string | null
          financeiro_val?: number | null
          frete_ida_moagem_mode?: string | null
          frete_ida_moagem_val?: number | null
          frete_volta_moagem_mode?: string | null
          frete_volta_moagem_val?: number | null
          id?: string
          is_deleted?: boolean | null
          kg_liquido_disponivel?: number | null
          kg_liquido_total?: number | null
          kg_ticket?: number | null
          moagem_mode?: string | null
          moagem_val?: number | null
          nf_num?: string | null
          operacao_id?: string
          perda_mel_pct?: number
          perda_mista_pct?: number
          perda_total_kg?: number | null
          procedencia?: string | null
          ticket_mel_kg?: number | null
          ticket_mista_kg?: number | null
          ticket_num?: string | null
          updated_at?: string
          valor_ticket_rs?: number | null
          valor_unit_sucata_rkg?: number
        }
        Relationships: [
          {
            foreignKeyName: "entradas_c1_operacao_id_fkey"
            columns: ["operacao_id"]
            isOneToOne: false
            referencedRelation: "operacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      entradas_terceiros: {
        Row: {
          created_at: string
          documento: string | null
          dt: string
          id: string
          is_deleted: boolean | null
          kg_disponivel: number | null
          kg_recebido: number
          operacao_id: string
          updated_at: string
          valor_ref_rkg: number | null
        }
        Insert: {
          created_at?: string
          documento?: string | null
          dt: string
          id?: string
          is_deleted?: boolean | null
          kg_disponivel?: number | null
          kg_recebido: number
          operacao_id: string
          updated_at?: string
          valor_ref_rkg?: number | null
        }
        Update: {
          created_at?: string
          documento?: string | null
          dt?: string
          id?: string
          is_deleted?: boolean | null
          kg_disponivel?: number | null
          kg_recebido?: number
          operacao_id?: string
          updated_at?: string
          valor_ref_rkg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "entradas_terceiros_operacao_id_fkey"
            columns: ["operacao_id"]
            isOneToOne: false
            referencedRelation: "operacoes_terceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      ganhos_material_ibrac: {
        Row: {
          created_at: string
          dt: string
          id: string
          kg_ganho: number
          operacao_id: string
          origem: string | null
          valor_ref_rkg: number | null
          valor_ref_total_rs: number | null
        }
        Insert: {
          created_at?: string
          dt: string
          id?: string
          kg_ganho: number
          operacao_id: string
          origem?: string | null
          valor_ref_rkg?: number | null
          valor_ref_total_rs?: number | null
        }
        Update: {
          created_at?: string
          dt?: string
          id?: string
          kg_ganho?: number
          operacao_id?: string
          origem?: string | null
          valor_ref_rkg?: number | null
          valor_ref_total_rs?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ganhos_material_ibrac_operacao_id_fkey"
            columns: ["operacao_id"]
            isOneToOne: false
            referencedRelation: "operacoes_terceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_lme: {
        Row: {
          aluminio_brl_kg: number | null
          aluminio_usd_t: number | null
          chumbo_usd_t: number | null
          cobre_brl_kg: number | null
          cobre_usd_t: number | null
          created_at: string
          data: string
          dolar_brl: number | null
          estanho_usd_t: number | null
          fonte: string | null
          id: string
          is_media_semanal: boolean | null
          niquel_usd_t: number | null
          semana_numero: number | null
          updated_at: string
          zinco_usd_t: number | null
        }
        Insert: {
          aluminio_brl_kg?: number | null
          aluminio_usd_t?: number | null
          chumbo_usd_t?: number | null
          cobre_brl_kg?: number | null
          cobre_usd_t?: number | null
          created_at?: string
          data: string
          dolar_brl?: number | null
          estanho_usd_t?: number | null
          fonte?: string | null
          id?: string
          is_media_semanal?: boolean | null
          niquel_usd_t?: number | null
          semana_numero?: number | null
          updated_at?: string
          zinco_usd_t?: number | null
        }
        Update: {
          aluminio_brl_kg?: number | null
          aluminio_usd_t?: number | null
          chumbo_usd_t?: number | null
          cobre_brl_kg?: number | null
          cobre_usd_t?: number | null
          created_at?: string
          data?: string
          dolar_brl?: number | null
          estanho_usd_t?: number | null
          fonte?: string | null
          id?: string
          is_media_semanal?: boolean | null
          niquel_usd_t?: number | null
          semana_numero?: number | null
          updated_at?: string
          zinco_usd_t?: number | null
        }
        Relationships: []
      }
      lme_semana_config: {
        Row: {
          ano: number
          created_at: string
          created_by: string | null
          data_fim: string
          data_inicio: string
          dolar_brl: number
          fator_total: number | null
          icms_pct: number
          id: string
          lme_base_brl_kg: number | null
          lme_cobre_usd_t: number
          lme_final_brl_kg: number | null
          observacoes: string | null
          pis_cofins_pct: number
          semana: number
          taxa_financeira_pct: number
          updated_at: string
        }
        Insert: {
          ano: number
          created_at?: string
          created_by?: string | null
          data_fim: string
          data_inicio: string
          dolar_brl?: number
          fator_total?: number | null
          icms_pct?: number
          id?: string
          lme_base_brl_kg?: number | null
          lme_cobre_usd_t?: number
          lme_final_brl_kg?: number | null
          observacoes?: string | null
          pis_cofins_pct?: number
          semana: number
          taxa_financeira_pct?: number
          updated_at?: string
        }
        Update: {
          ano?: number
          created_at?: string
          created_by?: string | null
          data_fim?: string
          data_inicio?: string
          dolar_brl?: number
          fator_total?: number | null
          icms_pct?: number
          id?: string
          lme_base_brl_kg?: number | null
          lme_cobre_usd_t?: number
          lme_final_brl_kg?: number | null
          observacoes?: string | null
          pis_cofins_pct?: number
          semana?: number
          taxa_financeira_pct?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_lme_config_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lme_semana_config_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      locais_estoque: {
        Row: {
          ativo: boolean | null
          capacidade_kg: number | null
          created_at: string
          endereco: string | null
          id: string
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          capacidade_kg?: number | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome: string
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          capacidade_kg?: number | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      movimentacoes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          local_destino_id: string | null
          local_origem_id: string | null
          motivo: string | null
          peso_kg: number
          sublote_id: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          local_destino_id?: string | null
          local_origem_id?: string | null
          motivo?: string | null
          peso_kg: number
          sublote_id?: string | null
          tipo: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          local_destino_id?: string | null
          local_origem_id?: string | null
          motivo?: string | null
          peso_kg?: number
          sublote_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_movimentacoes_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_movimentacoes_local_destino"
            columns: ["local_destino_id"]
            isOneToOne: false
            referencedRelation: "locais_estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_movimentacoes_local_origem"
            columns: ["local_origem_id"]
            isOneToOne: false
            referencedRelation: "locais_estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_movimentacoes_sublote"
            columns: ["sublote_id"]
            isOneToOne: false
            referencedRelation: "sublotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_local_destino_id_fkey"
            columns: ["local_destino_id"]
            isOneToOne: false
            referencedRelation: "locais_estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_local_origem_id_fkey"
            columns: ["local_origem_id"]
            isOneToOne: false
            referencedRelation: "locais_estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_sublote_id_fkey"
            columns: ["sublote_id"]
            isOneToOne: false
            referencedRelation: "sublotes"
            referencedColumns: ["id"]
          },
        ]
      }
      operacoes: {
        Row: {
          benchmark_vergalhao_default: number | null
          beneficiador_id: string
          created_at: string
          id: string
          is_deleted: boolean | null
          nome: string
          obs: string | null
          perda_mel_default: number | null
          perda_mista_default: number | null
          status: string | null
          updated_at: string
        }
        Insert: {
          benchmark_vergalhao_default?: number | null
          beneficiador_id: string
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          nome: string
          obs?: string | null
          perda_mel_default?: number | null
          perda_mista_default?: number | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          benchmark_vergalhao_default?: number | null
          beneficiador_id?: string
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          nome?: string
          obs?: string | null
          perda_mel_default?: number | null
          perda_mista_default?: number | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operacoes_beneficiador_id_fkey"
            columns: ["beneficiador_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      operacoes_intermediacao: {
        Row: {
          beneficiador_id: string
          comissao_mode: string | null
          comissao_val: number
          comprador_operacional_id: string
          created_at: string
          dono_economico_id: string
          id: string
          is_deleted: boolean | null
          nome: string
          obs: string | null
          status: string | null
          updated_at: string
          valor_ref_material_rkg: number | null
        }
        Insert: {
          beneficiador_id: string
          comissao_mode?: string | null
          comissao_val?: number
          comprador_operacional_id: string
          created_at?: string
          dono_economico_id: string
          id?: string
          is_deleted?: boolean | null
          nome: string
          obs?: string | null
          status?: string | null
          updated_at?: string
          valor_ref_material_rkg?: number | null
        }
        Update: {
          beneficiador_id?: string
          comissao_mode?: string | null
          comissao_val?: number
          comprador_operacional_id?: string
          created_at?: string
          dono_economico_id?: string
          id?: string
          is_deleted?: boolean | null
          nome?: string
          obs?: string | null
          status?: string | null
          updated_at?: string
          valor_ref_material_rkg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "operacoes_intermediacao_beneficiador_id_fkey"
            columns: ["beneficiador_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacoes_intermediacao_comprador_operacional_id_fkey"
            columns: ["comprador_operacional_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacoes_intermediacao_dono_economico_id_fkey"
            columns: ["dono_economico_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      operacoes_terceiros: {
        Row: {
          beneficiador_id: string
          cliente_id: string
          created_at: string
          id: string
          is_deleted: boolean | null
          nome: string
          obs: string | null
          perda_comercial_mode: string | null
          perda_comercial_val: number
          status: string | null
          updated_at: string
          valor_ref_material_rkg: number | null
        }
        Insert: {
          beneficiador_id: string
          cliente_id: string
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          nome: string
          obs?: string | null
          perda_comercial_mode?: string | null
          perda_comercial_val?: number
          status?: string | null
          updated_at?: string
          valor_ref_material_rkg?: number | null
        }
        Update: {
          beneficiador_id?: string
          cliente_id?: string
          created_at?: string
          id?: string
          is_deleted?: boolean | null
          nome?: string
          obs?: string | null
          perda_comercial_mode?: string | null
          perda_comercial_val?: number
          status?: string | null
          updated_at?: string
          valor_ref_material_rkg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "operacoes_terceiros_beneficiador_id_fkey"
            columns: ["beneficiador_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacoes_terceiros_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      parceiros: {
        Row: {
          ativo: boolean | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          is_cliente: boolean | null
          is_fornecedor: boolean | null
          is_transportadora: boolean | null
          nome_fantasia: string | null
          razao_social: string
          telefone: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          is_cliente?: boolean | null
          is_fornecedor?: boolean | null
          is_transportadora?: boolean | null
          nome_fantasia?: string | null
          razao_social: string
          telefone?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          is_cliente?: boolean | null
          is_fornecedor?: boolean | null
          is_transportadora?: boolean | null
          nome_fantasia?: string | null
          razao_social?: string
          telefone?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      precos_mo_terceiros: {
        Row: {
          ativo: boolean | null
          created_at: string
          fornecedor_id: string | null
          id: string
          preco_kg: number
          processo_id: string | null
          tipo_produto_id: string | null
          updated_at: string
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          fornecedor_id?: string | null
          id?: string
          preco_kg: number
          processo_id?: string | null
          tipo_produto_id?: string | null
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          fornecedor_id?: string | null
          id?: string
          preco_kg?: number
          processo_id?: string | null
          tipo_produto_id?: string | null
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_precos_mo_fornecedor"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_precos_mo_processo"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_precos_mo_tipo_produto"
            columns: ["tipo_produto_id"]
            isOneToOne: false
            referencedRelation: "tipos_produto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precos_mo_terceiros_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precos_mo_terceiros_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precos_mo_terceiros_tipo_produto_id_fkey"
            columns: ["tipo_produto_id"]
            isOneToOne: false
            referencedRelation: "tipos_produto"
            referencedColumns: ["id"]
          },
        ]
      }
      processos: {
        Row: {
          ativo: boolean | null
          created_at: string
          descricao: string | null
          id: string
          inclui_frete_ida: boolean | null
          inclui_frete_volta: boolean | null
          inclui_mo: boolean | null
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          id?: string
          inclui_frete_ida?: boolean | null
          inclui_frete_volta?: boolean | null
          inclui_mo?: boolean | null
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          id?: string
          inclui_frete_ida?: boolean | null
          inclui_frete_volta?: boolean | null
          inclui_mo?: boolean | null
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      saida_benef_aloc_terceiros: {
        Row: {
          beneficiamento_id: string
          created_at: string
          custo_servico_rkg_snapshot: number
          id: string
          kg_alocado: number
          saida_id: string
        }
        Insert: {
          beneficiamento_id: string
          created_at?: string
          custo_servico_rkg_snapshot: number
          id?: string
          kg_alocado: number
          saida_id: string
        }
        Update: {
          beneficiamento_id?: string
          created_at?: string
          custo_servico_rkg_snapshot?: number
          id?: string
          kg_alocado?: number
          saida_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saida_benef_aloc_terceiros_beneficiamento_id_fkey"
            columns: ["beneficiamento_id"]
            isOneToOne: false
            referencedRelation: "beneficiamentos_terceiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saida_benef_aloc_terceiros_saida_id_fkey"
            columns: ["saida_id"]
            isOneToOne: false
            referencedRelation: "saidas_terceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      saida_benef_alocacoes: {
        Row: {
          beneficiamento_id: string
          created_at: string
          custo_real_rkg_snapshot: number
          id: string
          kg_alocado: number
          saida_id: string
        }
        Insert: {
          beneficiamento_id: string
          created_at?: string
          custo_real_rkg_snapshot: number
          id?: string
          kg_alocado: number
          saida_id: string
        }
        Update: {
          beneficiamento_id?: string
          created_at?: string
          custo_real_rkg_snapshot?: number
          id?: string
          kg_alocado?: number
          saida_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saida_benef_alocacoes_beneficiamento_id_fkey"
            columns: ["beneficiamento_id"]
            isOneToOne: false
            referencedRelation: "beneficiamentos_c1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saida_benef_alocacoes_saida_id_fkey"
            columns: ["saida_id"]
            isOneToOne: false
            referencedRelation: "saidas_c1"
            referencedColumns: ["id"]
          },
        ]
      }
      saida_itens: {
        Row: {
          created_at: string
          id: string
          peso_kg: number
          saida_id: string | null
          sublote_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          peso_kg: number
          saida_id?: string | null
          sublote_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          peso_kg?: number
          saida_id?: string | null
          sublote_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_saida_itens_saida"
            columns: ["saida_id"]
            isOneToOne: false
            referencedRelation: "saidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_saida_itens_sublote"
            columns: ["sublote_id"]
            isOneToOne: false
            referencedRelation: "sublotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saida_itens_saida_id_fkey"
            columns: ["saida_id"]
            isOneToOne: false
            referencedRelation: "saidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saida_itens_sublote_id_fkey"
            columns: ["sublote_id"]
            isOneToOne: false
            referencedRelation: "sublotes"
            referencedColumns: ["id"]
          },
        ]
      }
      saidas: {
        Row: {
          cenario_operacao: string | null
          cliente_id: string | null
          codigo: string
          comissao_ibrac: number | null
          created_at: string
          created_by: string | null
          custos_cobrados: number | null
          data_saida: string
          id: string
          motorista: string | null
          nota_fiscal: string | null
          observacoes: string | null
          peso_total_kg: number
          placa_veiculo: string | null
          resultado_liquido_dono: number | null
          status: string | null
          tipo_saida: string
          tipo_saida_id: string | null
          transportadora_id: string | null
          updated_at: string
          valor_repasse_dono: number | null
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          cenario_operacao?: string | null
          cliente_id?: string | null
          codigo: string
          comissao_ibrac?: number | null
          created_at?: string
          created_by?: string | null
          custos_cobrados?: number | null
          data_saida?: string
          id?: string
          motorista?: string | null
          nota_fiscal?: string | null
          observacoes?: string | null
          peso_total_kg: number
          placa_veiculo?: string | null
          resultado_liquido_dono?: number | null
          status?: string | null
          tipo_saida: string
          tipo_saida_id?: string | null
          transportadora_id?: string | null
          updated_at?: string
          valor_repasse_dono?: number | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          cenario_operacao?: string | null
          cliente_id?: string | null
          codigo?: string
          comissao_ibrac?: number | null
          created_at?: string
          created_by?: string | null
          custos_cobrados?: number | null
          data_saida?: string
          id?: string
          motorista?: string | null
          nota_fiscal?: string | null
          observacoes?: string | null
          peso_total_kg?: number
          placa_veiculo?: string | null
          resultado_liquido_dono?: number | null
          status?: string | null
          tipo_saida?: string
          tipo_saida_id?: string | null
          transportadora_id?: string | null
          updated_at?: string
          valor_repasse_dono?: number | null
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_saidas_cliente"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_saidas_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_saidas_tipo_saida"
            columns: ["tipo_saida_id"]
            isOneToOne: false
            referencedRelation: "tipos_saida"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_saidas_transportadora"
            columns: ["transportadora_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saidas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saidas_tipo_saida_id_fkey"
            columns: ["tipo_saida_id"]
            isOneToOne: false
            referencedRelation: "tipos_saida"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saidas_transportadora_id_fkey"
            columns: ["transportadora_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      saidas_c1: {
        Row: {
          benchmark_vergalhao_rkg: number | null
          created_at: string
          custo_saida_rkg: number | null
          custo_saida_rs: number | null
          documento: string | null
          dt: string
          id: string
          is_deleted: boolean | null
          kg_saida: number
          obs: string | null
          operacao_id: string
          parceiro_destino_id: string | null
          receita_simulada_rs: number | null
          resultado_simulado_rs: number | null
          tipo_saida: string
          updated_at: string
        }
        Insert: {
          benchmark_vergalhao_rkg?: number | null
          created_at?: string
          custo_saida_rkg?: number | null
          custo_saida_rs?: number | null
          documento?: string | null
          dt: string
          id?: string
          is_deleted?: boolean | null
          kg_saida: number
          obs?: string | null
          operacao_id: string
          parceiro_destino_id?: string | null
          receita_simulada_rs?: number | null
          resultado_simulado_rs?: number | null
          tipo_saida: string
          updated_at?: string
        }
        Update: {
          benchmark_vergalhao_rkg?: number | null
          created_at?: string
          custo_saida_rkg?: number | null
          custo_saida_rs?: number | null
          documento?: string | null
          dt?: string
          id?: string
          is_deleted?: boolean | null
          kg_saida?: number
          obs?: string | null
          operacao_id?: string
          parceiro_destino_id?: string | null
          receita_simulada_rs?: number | null
          resultado_simulado_rs?: number | null
          tipo_saida?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saidas_c1_operacao_id_fkey"
            columns: ["operacao_id"]
            isOneToOne: false
            referencedRelation: "operacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saidas_c1_parceiro_destino_id_fkey"
            columns: ["parceiro_destino_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      saidas_terceiros: {
        Row: {
          created_at: string
          custo_servico_saida_rs: number | null
          documento: string | null
          dt: string
          id: string
          is_deleted: boolean | null
          kg_devolvido: number
          operacao_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custo_servico_saida_rs?: number | null
          documento?: string | null
          dt: string
          id?: string
          is_deleted?: boolean | null
          kg_devolvido: number
          operacao_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custo_servico_saida_rs?: number | null
          documento?: string | null
          dt?: string
          id?: string
          is_deleted?: boolean | null
          kg_devolvido?: number
          operacao_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saidas_terceiros_operacao_id_fkey"
            columns: ["operacao_id"]
            isOneToOne: false
            referencedRelation: "operacoes_terceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      simulacoes_lme: {
        Row: {
          cobre_usd_t: number
          created_at: string
          created_by: string | null
          custo_sucata_kg: number | null
          data_simulacao: string
          dolar_brl: number
          economia_pct: number | null
          fator_imposto: number
          id: string
          lme_semana_brl_kg: number | null
          observacoes: string | null
          pct_lme_negociada: number
          prazo_dias: number | null
          preco_a_prazo: number | null
          preco_a_vista: number | null
          preco_com_imposto: number | null
          resultado: string | null
          taxa_financeira_pct: number | null
        }
        Insert: {
          cobre_usd_t: number
          created_at?: string
          created_by?: string | null
          custo_sucata_kg?: number | null
          data_simulacao?: string
          dolar_brl: number
          economia_pct?: number | null
          fator_imposto: number
          id?: string
          lme_semana_brl_kg?: number | null
          observacoes?: string | null
          pct_lme_negociada: number
          prazo_dias?: number | null
          preco_a_prazo?: number | null
          preco_a_vista?: number | null
          preco_com_imposto?: number | null
          resultado?: string | null
          taxa_financeira_pct?: number | null
        }
        Update: {
          cobre_usd_t?: number
          created_at?: string
          created_by?: string | null
          custo_sucata_kg?: number | null
          data_simulacao?: string
          dolar_brl?: number
          economia_pct?: number | null
          fator_imposto?: number
          id?: string
          lme_semana_brl_kg?: number | null
          observacoes?: string | null
          pct_lme_negociada?: number
          prazo_dias?: number | null
          preco_a_prazo?: number | null
          preco_a_vista?: number | null
          preco_com_imposto?: number | null
          resultado?: string | null
          taxa_financeira_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_simulacoes_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulacoes_lme_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sublotes: {
        Row: {
          codigo: string
          created_at: string
          custo_unitario_total: number | null
          dono_id: string | null
          entrada_id: string | null
          id: string
          local_estoque_id: string | null
          lote_pai_id: string | null
          numero_volume: number | null
          observacoes: string | null
          peso_kg: number
          status: string | null
          teor_cobre: number | null
          tipo_produto_id: string | null
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          custo_unitario_total?: number | null
          dono_id?: string | null
          entrada_id?: string | null
          id?: string
          local_estoque_id?: string | null
          lote_pai_id?: string | null
          numero_volume?: number | null
          observacoes?: string | null
          peso_kg: number
          status?: string | null
          teor_cobre?: number | null
          tipo_produto_id?: string | null
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          custo_unitario_total?: number | null
          dono_id?: string | null
          entrada_id?: string | null
          id?: string
          local_estoque_id?: string | null
          lote_pai_id?: string | null
          numero_volume?: number | null
          observacoes?: string | null
          peso_kg?: number
          status?: string | null
          teor_cobre?: number | null
          tipo_produto_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sublotes_dono"
            columns: ["dono_id"]
            isOneToOne: false
            referencedRelation: "donos_material"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sublotes_entrada"
            columns: ["entrada_id"]
            isOneToOne: false
            referencedRelation: "entradas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sublotes_local_estoque"
            columns: ["local_estoque_id"]
            isOneToOne: false
            referencedRelation: "locais_estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sublotes_lote_pai"
            columns: ["lote_pai_id"]
            isOneToOne: false
            referencedRelation: "sublotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sublotes_tipo_produto"
            columns: ["tipo_produto_id"]
            isOneToOne: false
            referencedRelation: "tipos_produto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sublotes_dono_id_fkey"
            columns: ["dono_id"]
            isOneToOne: false
            referencedRelation: "donos_material"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sublotes_entrada_id_fkey"
            columns: ["entrada_id"]
            isOneToOne: false
            referencedRelation: "entradas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sublotes_local_estoque_id_fkey"
            columns: ["local_estoque_id"]
            isOneToOne: false
            referencedRelation: "locais_estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sublotes_lote_pai_id_fkey"
            columns: ["lote_pai_id"]
            isOneToOne: false
            referencedRelation: "sublotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sublotes_tipo_produto_id_fkey"
            columns: ["tipo_produto_id"]
            isOneToOne: false
            referencedRelation: "tipos_produto"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_entrada: {
        Row: {
          ativo: boolean | null
          created_at: string
          descricao: string | null
          gera_custo: boolean | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          gera_custo?: boolean | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          gera_custo?: boolean | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      tipos_produto: {
        Row: {
          ativo: boolean | null
          codigo: string | null
          created_at: string
          descricao: string | null
          icms_pct: number | null
          id: string
          ncm: string | null
          nome: string
          perda_beneficiamento_pct: number | null
          pis_cofins_pct: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          icms_pct?: number | null
          id?: string
          ncm?: string | null
          nome: string
          perda_beneficiamento_pct?: number | null
          pis_cofins_pct?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          icms_pct?: number | null
          id?: string
          ncm?: string | null
          nome?: string
          perda_beneficiamento_pct?: number | null
          pis_cofins_pct?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      tipos_saida: {
        Row: {
          ativo: boolean | null
          cobra_custos: boolean | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          cobra_custos?: boolean | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          cobra_custos?: boolean | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      transferencias_dono: {
        Row: {
          created_at: string
          created_by: string | null
          data_transferencia: string | null
          dono_destino_id: string | null
          dono_origem_id: string | null
          id: string
          observacoes: string | null
          peso_kg: number
          sublote_id: string | null
          valor_acrescimo: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_transferencia?: string | null
          dono_destino_id?: string | null
          dono_origem_id?: string | null
          id?: string
          observacoes?: string | null
          peso_kg: number
          sublote_id?: string | null
          valor_acrescimo?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_transferencia?: string | null
          dono_destino_id?: string | null
          dono_origem_id?: string | null
          id?: string
          observacoes?: string | null
          peso_kg?: number
          sublote_id?: string | null
          valor_acrescimo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_transf_dono_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transf_dono_destino"
            columns: ["dono_destino_id"]
            isOneToOne: false
            referencedRelation: "donos_material"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transf_dono_origem"
            columns: ["dono_origem_id"]
            isOneToOne: false
            referencedRelation: "donos_material"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transf_dono_sublote"
            columns: ["sublote_id"]
            isOneToOne: false
            referencedRelation: "sublotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_dono_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_dono_dono_destino_id_fkey"
            columns: ["dono_destino_id"]
            isOneToOne: false
            referencedRelation: "donos_material"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_dono_dono_origem_id_fkey"
            columns: ["dono_origem_id"]
            isOneToOne: false
            referencedRelation: "donos_material"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_dono_sublote_id_fkey"
            columns: ["sublote_id"]
            isOneToOne: false
            referencedRelation: "sublotes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      venda_benef_alocacoes: {
        Row: {
          beneficiamento_id: string
          created_at: string
          id: string
          kg_alocado: number
          venda_id: string
        }
        Insert: {
          beneficiamento_id: string
          created_at?: string
          id?: string
          kg_alocado: number
          venda_id: string
        }
        Update: {
          beneficiamento_id?: string
          created_at?: string
          id?: string
          kg_alocado?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venda_benef_alocacoes_beneficiamento_id_fkey"
            columns: ["beneficiamento_id"]
            isOneToOne: false
            referencedRelation: "beneficiamentos_intermediacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venda_benef_alocacoes_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas_intermediacao"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas_intermediacao: {
        Row: {
          cliente_id: string | null
          comissao_ibrac_rs: number | null
          created_at: string
          custo_material_dono_rs: number | null
          custos_operacao_alocados_rs: number | null
          dt: string
          id: string
          is_deleted: boolean | null
          kg_vendido: number
          nf_venda: string | null
          operacao_id: string
          preco_venda_rkg: number
          saldo_repassar_rs: number | null
          updated_at: string
          valor_venda_rs: number | null
        }
        Insert: {
          cliente_id?: string | null
          comissao_ibrac_rs?: number | null
          created_at?: string
          custo_material_dono_rs?: number | null
          custos_operacao_alocados_rs?: number | null
          dt: string
          id?: string
          is_deleted?: boolean | null
          kg_vendido: number
          nf_venda?: string | null
          operacao_id: string
          preco_venda_rkg: number
          saldo_repassar_rs?: number | null
          updated_at?: string
          valor_venda_rs?: number | null
        }
        Update: {
          cliente_id?: string | null
          comissao_ibrac_rs?: number | null
          created_at?: string
          custo_material_dono_rs?: number | null
          custos_operacao_alocados_rs?: number | null
          dt?: string
          id?: string
          is_deleted?: boolean | null
          kg_vendido?: number
          nf_venda?: string | null
          operacao_id?: string
          preco_venda_rkg?: number
          saldo_repassar_rs?: number | null
          updated_at?: string
          valor_venda_rs?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_intermediacao_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_intermediacao_operacao_id_fkey"
            columns: ["operacao_id"]
            isOneToOne: false
            referencedRelation: "operacoes_intermediacao"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_audit_logs: { Args: never; Returns: undefined }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_data_access: {
        Args: {
          _action: string
          _record_data?: Json
          _record_id?: string
          _table_name: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "dono" | "operacao" | "financeiro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "dono", "operacao", "financeiro"],
    },
  },
} as const

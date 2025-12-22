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
          referencia_id?: string | null
          referencia_tipo?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "acertos_financeiros_dono_id_fkey"
            columns: ["dono_id"]
            isOneToOne: false
            referencedRelation: "donos_material"
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
      beneficiamento_itens_entrada: {
        Row: {
          beneficiamento_id: string | null
          created_at: string
          custo_unitario: number | null
          id: string
          peso_kg: number
          sublote_id: string | null
        }
        Insert: {
          beneficiamento_id?: string | null
          created_at?: string
          custo_unitario?: number | null
          id?: string
          peso_kg: number
          sublote_id?: string | null
        }
        Update: {
          beneficiamento_id?: string | null
          created_at?: string
          custo_unitario?: number | null
          id?: string
          peso_kg?: number
          sublote_id?: string | null
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
      donos_material: {
        Row: {
          ativo: boolean | null
          created_at: string
          documento: string | null
          email: string | null
          id: string
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
          fornecedor_id: string | null
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
          fornecedor_id?: string | null
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
          fornecedor_id?: string | null
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
            foreignKeyName: "entradas_dono_id_fkey"
            columns: ["dono_id"]
            isOneToOne: false
            referencedRelation: "donos_material"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entradas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
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
        ]
      }
      fornecedores: {
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
            foreignKeyName: "precos_mo_terceiros_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
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
          cliente_id: string | null
          codigo: string
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
          cliente_id?: string | null
          codigo: string
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
          cliente_id?: string | null
          codigo?: string
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
        Relationships: []
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

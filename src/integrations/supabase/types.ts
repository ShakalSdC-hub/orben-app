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
      entradas: {
        Row: {
          codigo: string
          created_at: string
          created_by: string | null
          data_entrada: string
          fornecedor_id: string | null
          id: string
          nota_fiscal: string | null
          observacoes: string | null
          peso_bruto_kg: number
          peso_liquido_kg: number
          status: string | null
          teor_cobre: number | null
          tipo_material: string
          updated_at: string
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          codigo: string
          created_at?: string
          created_by?: string | null
          data_entrada?: string
          fornecedor_id?: string | null
          id?: string
          nota_fiscal?: string | null
          observacoes?: string | null
          peso_bruto_kg: number
          peso_liquido_kg: number
          status?: string | null
          teor_cobre?: number | null
          tipo_material: string
          updated_at?: string
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          codigo?: string
          created_at?: string
          created_by?: string | null
          data_entrada?: string
          fornecedor_id?: string | null
          id?: string
          nota_fiscal?: string | null
          observacoes?: string | null
          peso_bruto_kg?: number
          peso_liquido_kg?: number
          status?: string | null
          teor_cobre?: number | null
          tipo_material?: string
          updated_at?: string
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "entradas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
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
          data_saida: string
          id: string
          nota_fiscal: string | null
          observacoes: string | null
          peso_total_kg: number
          status: string | null
          tipo_saida: string
          updated_at: string
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          cliente_id?: string | null
          codigo: string
          created_at?: string
          created_by?: string | null
          data_saida?: string
          id?: string
          nota_fiscal?: string | null
          observacoes?: string | null
          peso_total_kg: number
          status?: string | null
          tipo_saida: string
          updated_at?: string
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          cliente_id?: string | null
          codigo?: string
          created_at?: string
          created_by?: string | null
          data_saida?: string
          id?: string
          nota_fiscal?: string | null
          observacoes?: string | null
          peso_total_kg?: number
          status?: string | null
          tipo_saida?: string
          updated_at?: string
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
        ]
      }
      sublotes: {
        Row: {
          codigo: string
          created_at: string
          entrada_id: string | null
          id: string
          local_estoque_id: string | null
          observacoes: string | null
          peso_kg: number
          status: string | null
          teor_cobre: number | null
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          entrada_id?: string | null
          id?: string
          local_estoque_id?: string | null
          observacoes?: string | null
          peso_kg: number
          status?: string | null
          teor_cobre?: number | null
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          entrada_id?: string | null
          id?: string
          local_estoque_id?: string | null
          observacoes?: string | null
          peso_kg?: number
          status?: string | null
          teor_cobre?: number | null
          updated_at?: string
        }
        Relationships: [
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
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "gerente_geral"
        | "financeiro"
        | "compras"
        | "pcp"
        | "comercial"
        | "expedicao"
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
      app_role: [
        "admin",
        "gerente_geral",
        "financeiro",
        "compras",
        "pcp",
        "comercial",
        "expedicao",
      ],
    },
  },
} as const

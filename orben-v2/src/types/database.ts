export type Database = {
  public: {
    Tables: {
      parceiros: {
        Row: {
          id: string;
          razao_social: string;
          nome_fantasia: string | null;
          cnpj: string | null;
          telefone: string | null;
          email: string | null;
          endereco: string | null;
          cidade: string | null;
          estado: string | null;
          cep: string | null;
          is_fornecedor: boolean | null;
          is_cliente: boolean | null;
          is_transportadora: boolean | null;
          tipo: string | null;
          ativo: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          razao_social: string;
          nome_fantasia?: string | null;
          cnpj?: string | null;
          telefone?: string | null;
          email?: string | null;
          endereco?: string | null;
          cidade?: string | null;
          estado?: string | null;
          cep?: string | null;
          is_fornecedor?: boolean | null;
          is_cliente?: boolean | null;
          is_transportadora?: boolean | null;
          tipo?: string | null;
          ativo?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          razao_social?: string;
          nome_fantasia?: string | null;
          cnpj?: string | null;
          telefone?: string | null;
          email?: string | null;
          endereco?: string | null;
          cidade?: string | null;
          estado?: string | null;
          cep?: string | null;
          is_fornecedor?: boolean | null;
          is_cliente?: boolean | null;
          is_transportadora?: boolean | null;
          tipo?: string | null;
          ativo?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Parceiro = Database["public"]["Tables"]["parceiros"]["Row"];
export type ParceiroInsert = Database["public"]["Tables"]["parceiros"]["Insert"];

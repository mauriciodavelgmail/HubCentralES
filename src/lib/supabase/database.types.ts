// Este arquivo deve ser gerado automaticamente pelo Supabase CLI
// Para agora, criamos uma interface básica
// Após executar: supabase gen types typescript --local > src/lib/supabase/database.types.ts

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          full_name: string | null;
          role: 'administrador' | 'administracao' | 'recepcao' | 'manutencao' | 'limpeza' | 'visitante';
          department_id: string | null;
          avatar_url: string | null;
          phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      documents: {
        Row: {
          id: string;
          uuid: string;
          control_id: string;
          title: string;
          description: string | null;
          category: string;
          status: 'ativo' | 'vencendo' | 'vencido' | 'arquivado';
          responsible_id: string | null;
          responsible_name: string | null;
          file_url: string;
          file_size: number | null;
          file_type: string | null;
          validity_date: string | null;
          version: number;
          related_occurrence_id: string | null;
          related_equipment_id: string | null;
          related_purchase_id: string | null;
          tags: string[] | null;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'uuid' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['documents']['Insert']>;
      };
      occurrences: {
        Row: {
          id: string;
          occurrence_number: string;
          title: string;
          description: string;
          category: string;
          priority: 'baixa' | 'media' | 'alta' | 'critica';
          status: 'aberta' | 'em_analise' | 'em_execucao' | 'resolvida' | 'cancelada';
          location: string;
          responsible_id: string | null;
          reporter_id: string;
          solution: string | null;
          evidence_url: string | null;
          evidence_file_type: string | null;
          deadline: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: Omit<Database['public']['Tables']['occurrences']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['occurrences']['Insert']>;
      };
      events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          event_type: string;
          space_id: string;
          responsible_id: string;
          requester_id: string;
          status: string;
          start_date: string;
          start_time: string;
          end_time: string;
          capacity: number | null;
          attendance_list_created: boolean;
          approved_by: string | null;
          approved_at: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['events']['Insert']>;
      };
      supplies: {
        Row: {
          id: string;
          code: string;
          name: string;
          category: string;
          current_quantity: number;
          minimum_quantity: number;
          unit: string;
          status: string;
          description: string | null;
          supplier: string | null;
          unit_cost: number | null;
          location: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: Omit<Database['public']['Tables']['supplies']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['supplies']['Insert']>;
      };
      purchases: {
        Row: {
          id: string;
          purchase_number: string;
          supply_id: string;
          status: string;
          priority: string;
          solicitant_id: string;
          department_id: string | null;
          estimated_value: number | null;
          justification: string | null;
          purchase_document_number: string | null;
          fiscal_document_url: string | null;
          received_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: Omit<Database['public']['Tables']['purchases']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['purchases']['Insert']>;
      };
      equipments: {
        Row: {
          id: string;
          patrimonial_code: string;
          name: string;
          description: string | null;
          category: string | null;
          location: string;
          responsible_id: string | null;
          status: string;
          acquisition_date: string | null;
          next_maintenance: string | null;
          image_url: string | null;
          manufacturer: string | null;
          model: string | null;
          serial_number: string | null;
          is_low: boolean;
          low_date: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: Omit<Database['public']['Tables']['equipments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['equipments']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

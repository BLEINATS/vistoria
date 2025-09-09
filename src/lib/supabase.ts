import { createClient } from '@supabase/supabase-js';
import { Property, InspectionSummary } from '../types';

// Temporarily swapping the variables as they seem to be reversed
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_URL;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be defined in .env file');
}

// Definição do tipo para o banco de dados
export type Database = {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          address: string;
          type: string;
          description: string | null;
          facade_photo_url: string | null;
          user_id: string;
        };
        Insert: Omit<Database['public']['Tables']['properties']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['properties']['Row']>;
      };
      inspections: {
        Row: {
          id: string;
          created_at: string;
          property_id: string;
          inspection_date: string;
          summary: string | null;
          status: 'pending' | 'in-progress' | 'completed';
          inspection_type: 'entry' | 'exit';
          general_observations: string | null;
        };
        Insert: Omit<Database['public']['Tables']['inspections']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['inspections']['Row']>;
      };
      inspection_photos: {
        Row: {
          id: string;
          created_at: string;
          inspection_id: string;
          photo_url: string;
          room: string;
          ai_analysis_result: any; // Using 'any' for simplicity, can be typed later
        };
        Insert: Omit<Database['public']['Tables']['inspection_photos']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['inspection_photos']['Row']>;
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_properties_with_details: {
        Args: {};
        Returns: {
          id: string;
          created_at: string;
          name: string;
          address: string;
          type: string;
          description: string | null;
          facade_photo_url: string | null;
          user_id: string;
          inspections: {
            id: string;
            status: 'pending' | 'in-progress' | 'completed';
            inspection_type: 'entry' | 'exit';
            created_at: string;
            photoCount: number;
          }[] | null;
          profiles: {
            full_name: string;
          } | null;
        }[];
      };
      get_property_details_by_id: {
        Args: { p_id: string };
        Returns: {
          id: string;
          created_at: string;
          name: string;
          address: string;
          type: string;
          description: string | null;
          facade_photo_url: string | null;
          user_id: string;
          inspections: {
            id: string;
            status: 'pending' | 'in-progress' | 'completed';
            inspection_type: 'entry' | 'exit';
            created_at: string;
            photoCount: number;
          }[] | null;
          profiles: {
            full_name: string;
          } | null;
        }[];
      };
    };
    Enums: {
      inspection_type: 'entry' | 'exit';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Função para mapear do banco de dados para o tipo da aplicação
export const mapToProperty = (row: any, responsibleName?: string | null): Property | null => {
  // Defensive check: if row is null or has no id, it's invalid data.
  if (!row || !row.id) {
    return null;
  }

  // Defensive check: Ensure inspections is always an array. If it's null or not an array, default to [].
  const inspectionsData = Array.isArray(row.inspections) ? row.inspections : [];
  
  const inspections = inspectionsData
    // Defensive filter: ensure each inspection object is valid before mapping.
    .filter((i: any) => i && i.id && i.created_at)
    .map((i: any): InspectionSummary => ({
      id: i.id,
      status: i.status,
      inspection_type: i.inspection_type,
      photoCount: i.photoCount || 0,
      general_observations: i.general_observations,
      created_at: i.created_at,
    }));

  // Defensive check for createdAt date.
  const createdAt = row.created_at && !isNaN(new Date(row.created_at).getTime())
    ? new Date(row.created_at)
    : new Date(); // Fallback to current date if invalid

  return {
    id: row.id,
    name: row.name,
    address: row.address,
    type: row.type as Property['type'],
    description: row.description || '',
    facadePhoto: row.facade_photo_url || undefined,
    createdAt,
    inspections, // This is now guaranteed to be an array.
    user_id: row.user_id,
    responsibleName: responsibleName || 'Não informado',
  };
};

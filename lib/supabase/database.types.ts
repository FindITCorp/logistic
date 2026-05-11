export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      pools: {
        Row: {
          id: string;
          name: string;
          status: "open" | "closed" | "in_transit" | "delivered";
          open_date: string;
          close_date: string;
          current_volume_m3: number;
          max_volume_m3: number;
          current_rate_per_m3: number;
          base_market_rate: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pools"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["pools"]["Insert"]>;
      };
      shipments: {
        Row: {
          id: string;
          pool_id: string;
          user_id: string;
          description: string;
          weight_kg: number;
          volume_m3: number;
          billable_m3: number;
          rate_locked_at: number | null;
          total_amount: number | null;
          status: "pending" | "confirmed" | "in_transit" | "delivered";
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["shipments"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["shipments"]["Insert"]>;
      };
      pre_registrations: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          company: string | null;
          monthly_volume_m3: number | null;
          current_rate: number | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pre_registrations"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["pre_registrations"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          company: string | null;
          role: "client" | "operator" | "admin";
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

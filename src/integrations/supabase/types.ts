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
      alerts: {
        Row: {
          action_taken: string | null
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at: string
          id: string
          inventory_id: string | null
          message: string | null
          recipe_id: string | null
          resolved: boolean
          resolved_at: string | null
        }
        Insert: {
          action_taken?: string | null
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at?: string
          id?: string
          inventory_id?: string | null
          message?: string | null
          recipe_id?: string | null
          resolved?: boolean
          resolved_at?: string | null
        }
        Update: {
          action_taken?: string | null
          alert_type?: Database["public"]["Enums"]["alert_type"]
          created_at?: string
          id?: string
          inventory_id?: string | null
          message?: string | null
          recipe_id?: string | null
          resolved?: boolean
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_closings: {
        Row: {
          cash_register_id: string
          closed_at: string
          closed_by: string
          created_at: string
          id: string
          notes: string | null
          total_sales: number
          total_transactions: number
        }
        Insert: {
          cash_register_id: string
          closed_at?: string
          closed_by: string
          created_at?: string
          id?: string
          notes?: string | null
          total_sales?: number
          total_transactions?: number
        }
        Update: {
          cash_register_id?: string
          closed_at?: string
          closed_by?: string
          created_at?: string
          id?: string
          notes?: string | null
          total_sales?: number
          total_transactions?: number
        }
        Relationships: [
          {
            foreignKeyName: "cash_closings_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          closed_at: string | null
          created_at: string
          id: string
          is_open: boolean
          name: Database["public"]["Enums"]["cash_register_name"]
          opened_at: string
          opened_by: string
          opening_balance: number
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          id?: string
          is_open?: boolean
          name: Database["public"]["Enums"]["cash_register_name"]
          opened_at?: string
          opened_by: string
          opening_balance?: number
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          id?: string
          is_open?: boolean
          name?: Database["public"]["Enums"]["cash_register_name"]
          opened_at?: string
          opened_by?: string
          opening_balance?: number
        }
        Relationships: []
      }
      closing_details: {
        Row: {
          closing_id: string
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          total: number
          transaction_count: number
        }
        Insert: {
          closing_id: string
          id?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          total?: number
          transaction_count?: number
        }
        Update: {
          closing_id?: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          total?: number
          transaction_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "closing_details_closing_id_fkey"
            columns: ["closing_id"]
            isOneToOne: false
            referencedRelation: "cash_closings"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          created_at: string
          id: string
          name: string
          price_per_unit: number
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price_per_unit?: number
          unit?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price_per_unit?: number
          unit?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          id: string
          produced_at: string
          production_id: string
          recipe_id: string
          slices_available: number
          status: Database["public"]["Enums"]["inventory_status"]
          updated_at: string
        }
        Insert: {
          id?: string
          produced_at?: string
          production_id: string
          recipe_id: string
          slices_available?: number
          status?: Database["public"]["Enums"]["inventory_status"]
          updated_at?: string
        }
        Update: {
          id?: string
          produced_at?: string
          production_id?: string
          recipe_id?: string
          slices_available?: number
          status?: Database["public"]["Enums"]["inventory_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_production_id_fkey"
            columns: ["production_id"]
            isOneToOne: false
            referencedRelation: "productions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      productions: {
        Row: {
          created_at: string
          id: string
          operator_id: string
          produced_at: string
          recipe_id: string
          slices_generated: number
          total_cost: number
          weight_produced_g: number
        }
        Insert: {
          created_at?: string
          id?: string
          operator_id: string
          produced_at?: string
          recipe_id: string
          slices_generated: number
          total_cost?: number
          weight_produced_g: number
        }
        Update: {
          created_at?: string
          id?: string
          operator_id?: string
          produced_at?: string
          recipe_id?: string
          slices_generated?: number
          total_cost?: number
          weight_produced_g?: number
        }
        Relationships: [
          {
            foreignKeyName: "productions_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birthday: string | null
          created_at: string
          family_birthday: string | null
          family_name: string | null
          id: string
          name: string
          phone: string | null
          photo_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          birthday?: string | null
          created_at?: string
          family_birthday?: string | null
          family_name?: string | null
          id?: string
          name: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          birthday?: string | null
          created_at?: string
          family_birthday?: string | null
          family_name?: string | null
          id?: string
          name?: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          id: string
          ingredient_id: string
          quantity_used: number
          recipe_id: string
        }
        Insert: {
          id?: string
          ingredient_id: string
          quantity_used?: number
          recipe_id: string
        }
        Update: {
          id?: string
          ingredient_id?: string
          quantity_used?: number
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          active: boolean
          category: Database["public"]["Enums"]["product_category"]
          created_at: string
          direct_cost: number | null
          id: string
          min_stock: number
          name: string
          photo_url: string | null
          sale_price: number
          slice_weight_g: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          direct_cost?: number | null
          id?: string
          min_stock?: number
          name: string
          photo_url?: string | null
          sale_price?: number
          slice_weight_g?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          direct_cost?: number | null
          id?: string
          min_stock?: number
          name?: string
          photo_url?: string | null
          sale_price?: number
          slice_weight_g?: number
          updated_at?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          id: string
          inventory_id: string | null
          quantity: number
          recipe_id: string
          sale_id: string
          subtotal: number
          unit_price: number
        }
        Insert: {
          id?: string
          inventory_id?: string | null
          quantity?: number
          recipe_id: string
          sale_id: string
          subtotal?: number
          unit_price?: number
        }
        Update: {
          id?: string
          inventory_id?: string | null
          quantity?: number
          recipe_id?: string
          sale_id?: string
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cash_register_id: string | null
          channel: Database["public"]["Enums"]["sales_channel"]
          created_at: string
          id: string
          operator_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          sold_at: string
          total: number
        }
        Insert: {
          cash_register_id?: string | null
          channel?: Database["public"]["Enums"]["sales_channel"]
          created_at?: string
          id?: string
          operator_id: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          sold_at?: string
          total?: number
        }
        Update: {
          cash_register_id?: string | null
          channel?: Database["public"]["Enums"]["sales_channel"]
          created_at?: string
          id?: string
          operator_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          sold_at?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_employee: { Args: never; Returns: boolean }
      is_owner: { Args: never; Returns: boolean }
    }
    Enums: {
      alert_type: "estoque_baixo" | "validade_12h" | "desperdicio" | "outro"
      app_role: "owner" | "employee" | "client"
      cash_register_name: "caixa_1" | "caixa_2" | "delivery"
      inventory_status: "normal" | "atencao" | "critico"
      payment_method: "pix" | "credito" | "debito" | "dinheiro" | "refeicao"
      product_category:
        | "bolo"
        | "torta"
        | "salgado"
        | "bebida"
        | "doce"
        | "outro"
      sales_channel: "balcao" | "delivery" | "ifood"
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
      alert_type: ["estoque_baixo", "validade_12h", "desperdicio", "outro"],
      app_role: ["owner", "employee", "client"],
      cash_register_name: ["caixa_1", "caixa_2", "delivery"],
      inventory_status: ["normal", "atencao", "critico"],
      payment_method: ["pix", "credito", "debito", "dinheiro", "refeicao"],
      product_category: ["bolo", "torta", "salgado", "bebida", "doce", "outro"],
      sales_channel: ["balcao", "delivery", "ifood"],
    },
  },
} as const

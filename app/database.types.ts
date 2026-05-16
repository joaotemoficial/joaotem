export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      business_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      business_feature_overrides: {
        Row: {
          business_id: string
          created_at: string
          enabled: boolean | null
          feature_key: string
          limit_override: number | null
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          enabled?: boolean | null
          feature_key: string
          limit_override?: number | null
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          enabled?: boolean | null
          feature_key?: string
          limit_override?: number | null
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_feature_overrides_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_feature_overrides_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["key"]
          },
        ]
      }
      business_product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          product_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "business_products"
            referencedColumns: ["id"]
          },
        ]
      }
      business_product_option_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_product_option_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "business_products"
            referencedColumns: ["id"]
          },
        ]
      }
      business_product_option_values: {
        Row: {
          created_at: string
          group_id: string
          id: string
          price_cents: number | null
          sort_order: number
          value: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          price_cents?: number | null
          sort_order?: number
          value: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          price_cents?: number | null
          sort_order?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_product_option_values_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "business_product_option_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      business_products: {
        Row: {
          business_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          price_cents: number
          sort_order: number
          stock_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price_cents: number
          sort_order?: number
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          sort_order?: number
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_promotion_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          promotion_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          promotion_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          promotion_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_promotion_images_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "business_promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      business_promotions: {
        Row: {
          business_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          recurrence_days: number
          schedule_note: string | null
          sort_order: number
          starts_at: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          recurrence_days?: number
          schedule_note?: string | null
          sort_order?: number
          starts_at?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          recurrence_days?: number
          schedule_note?: string | null
          sort_order?: number
          starts_at?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_promotions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_reclaim_requests: {
        Row: {
          business_id: string
          created_at: string
          decision_note: string | null
          id: string
          message: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["reclaim_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          decision_note?: string | null
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["reclaim_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          decision_note?: string | null
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["reclaim_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_reclaim_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          category_id: string
          city_id: string
          cover_path: string | null
          created_at: string
          deleted_at: string | null
          handle: string
          id: string
          instagram: string | null
          logo_path: string | null
          name: string
          neighborhood_id: string
          offers_delivery: boolean
          plan_expires_at: string | null
          plan_notes: string | null
          plan_started_at: string | null
          plan_tier: Database["public"]["Enums"]["plan_tier"] | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          search_tsv: unknown
          short_description: string | null
          status: Database["public"]["Enums"]["business_status"]
          updated_at: string | null
          user_id: string
          whatsapp: string
        }
        Insert: {
          category_id: string
          city_id: string
          cover_path?: string | null
          created_at?: string
          deleted_at?: string | null
          handle: string
          id?: string
          instagram?: string | null
          logo_path?: string | null
          name: string
          neighborhood_id: string
          offers_delivery?: boolean
          plan_expires_at?: string | null
          plan_notes?: string | null
          plan_started_at?: string | null
          plan_tier?: Database["public"]["Enums"]["plan_tier"] | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          search_tsv?: unknown
          short_description?: string | null
          status?: Database["public"]["Enums"]["business_status"]
          updated_at?: string | null
          user_id: string
          whatsapp: string
        }
        Update: {
          category_id?: string
          city_id?: string
          cover_path?: string | null
          created_at?: string
          deleted_at?: string | null
          handle?: string
          id?: string
          instagram?: string | null
          logo_path?: string | null
          name?: string
          neighborhood_id?: string
          offers_delivery?: boolean
          plan_expires_at?: string | null
          plan_notes?: string | null
          plan_started_at?: string | null
          plan_tier?: Database["public"]["Enums"]["plan_tier"] | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          search_tsv?: unknown
          short_description?: string | null
          status?: Database["public"]["Enums"]["business_status"]
          updated_at?: string | null
          user_id?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "businesses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_neighborhood_id_fkey"
            columns: ["neighborhood_id"]
            isOneToOne: false
            referencedRelation: "neighborhoods"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          state: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          state: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          state?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          basico_enabled: boolean
          basico_limit: number | null
          created_at: string
          description: string | null
          enabled: boolean
          flag_type: string
          key: string
          label: string
          ouro_enabled: boolean
          ouro_limit: number | null
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          basico_enabled?: boolean
          basico_limit?: number | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          flag_type: string
          key: string
          label: string
          ouro_enabled?: boolean
          ouro_limit?: number | null
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          basico_enabled?: boolean
          basico_limit?: number | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          flag_type?: string
          key?: string
          label?: string
          ouro_enabled?: boolean
          ouro_limit?: number | null
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      neighborhoods: {
        Row: {
          city_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          city_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          city_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "neighborhoods_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_upgrade_requests: {
        Row: {
          business_id: string
          created_at: string
          granted_expires_at: string | null
          granted_starts_at: string | null
          id: string
          message: string | null
          requested_by: string
          requested_plan: Database["public"]["Enums"]["plan_tier"]
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["plan_upgrade_status"]
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          granted_expires_at?: string | null
          granted_starts_at?: string | null
          id?: string
          message?: string | null
          requested_by: string
          requested_plan: Database["public"]["Enums"]["plan_tier"]
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["plan_upgrade_status"]
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          granted_expires_at?: string | null
          granted_starts_at?: string | null
          id?: string
          message?: string | null
          requested_by?: string
          requested_plan?: Database["public"]["Enums"]["plan_tier"]
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["plan_upgrade_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_upgrade_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_business_reclaim: {
        Args: { reclaim_id: string; reviewer_id: string }
        Returns: undefined
      }
      approve_plan_upgrade_request: {
        Args: {
          p_expires_at: string
          p_notes?: string
          p_request_id: string
          p_reviewer_id: string
          p_starts_at: string
        }
        Returns: undefined
      }
      effective_plan_tier: {
        Args: {
          expires_at: string
          plan: Database["public"]["Enums"]["plan_tier"]
        }
        Returns: Database["public"]["Enums"]["plan_tier"]
      }
      is_admin: { Args: never; Returns: boolean }
      is_business_public: { Args: { b_id: string }; Returns: boolean }
      list_businesses_gold_first: {
        Args: {
          p_category_id?: string
          p_city_id?: string
          p_limit?: number
          p_neighborhood_id?: string
        }
        Returns: {
          category_id: string
          city_id: string
          cover_path: string | null
          created_at: string
          deleted_at: string | null
          handle: string
          id: string
          instagram: string | null
          logo_path: string | null
          name: string
          neighborhood_id: string
          offers_delivery: boolean
          plan_expires_at: string | null
          plan_notes: string | null
          plan_started_at: string | null
          plan_tier: Database["public"]["Enums"]["plan_tier"] | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          search_tsv: unknown
          short_description: string | null
          status: Database["public"]["Enums"]["business_status"]
          updated_at: string | null
          user_id: string
          whatsapp: string
        }[]
        SetofOptions: {
          from: "*"
          to: "businesses"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      random_featured_businesses: {
        Args: {
          p_category_id?: string
          p_city_id?: string
          p_limit?: number
          p_neighborhood_id?: string
          p_q?: string
        }
        Returns: {
          category_id: string
          city_id: string
          cover_path: string | null
          created_at: string
          deleted_at: string | null
          handle: string
          id: string
          instagram: string | null
          logo_path: string | null
          name: string
          neighborhood_id: string
          offers_delivery: boolean
          plan_expires_at: string | null
          plan_notes: string | null
          plan_started_at: string | null
          plan_tier: Database["public"]["Enums"]["plan_tier"] | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          search_tsv: unknown
          short_description: string | null
          status: Database["public"]["Enums"]["business_status"]
          updated_at: string | null
          user_id: string
          whatsapp: string
        }[]
        SetofOptions: {
          from: "*"
          to: "businesses"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      reject_plan_upgrade_request: {
        Args: { p_notes?: string; p_request_id: string; p_reviewer_id: string }
        Returns: undefined
      }
      search_businesses_ranked: {
        Args: {
          p_category_id?: string
          p_city_id?: string
          p_limit?: number
          p_neighborhood_id?: string
          p_q?: string
        }
        Returns: {
          category_id: string
          city_id: string
          cover_path: string | null
          created_at: string
          deleted_at: string | null
          handle: string
          id: string
          instagram: string | null
          logo_path: string | null
          name: string
          neighborhood_id: string
          offers_delivery: boolean
          plan_expires_at: string | null
          plan_notes: string | null
          plan_started_at: string | null
          plan_tier: Database["public"]["Enums"]["plan_tier"] | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          search_tsv: unknown
          short_description: string | null
          status: Database["public"]["Enums"]["business_status"]
          updated_at: string | null
          user_id: string
          whatsapp: string
        }[]
        SetofOptions: {
          from: "*"
          to: "businesses"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      business_status: "pending" | "approved" | "rejected" | "suspended"
      plan_tier: "basico" | "ouro"
      plan_upgrade_status: "pending" | "approved" | "rejected" | "canceled"
      reclaim_status: "pending" | "approved" | "rejected"
      user_role: "user" | "admin"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      business_status: ["pending", "approved", "rejected", "suspended"],
      plan_tier: ["basico", "ouro"],
      plan_upgrade_status: ["pending", "approved", "rejected", "canceled"],
      reclaim_status: ["pending", "approved", "rejected"],
      user_role: ["user", "admin"],
    },
  },
} as const


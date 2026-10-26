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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      meals: {
        Row: {
          cancelled_at: string | null
          credit_override: number | null
          date: string
          id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          note: string | null
          status: Database["public"]["Enums"]["meal_status"]
          subscription_month_id: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          credit_override?: number | null
          date: string
          id?: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          note?: string | null
          status?: Database["public"]["Enums"]["meal_status"]
          subscription_month_id: string
          user_id?: string
        }
        Update: {
          cancelled_at?: string | null
          credit_override?: number | null
          date?: string
          id?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          note?: string | null
          status?: Database["public"]["Enums"]["meal_status"]
          subscription_month_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meals_subscription_month_id_user_id_fkey"
            columns: ["subscription_month_id", "user_id"]
            isOneToOne: false
            referencedRelation: "subscription_months"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      off_days: {
        Row: {
          created_at: string
          date: string
          id: string
          reason: string
          subscription_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          reason?: string
          subscription_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          reason?: string
          subscription_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "off_days_subscription_id_user_id_fkey"
            columns: ["subscription_id", "user_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          paid_on: string
          subscription_month_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          paid_on: string
          subscription_month_id: string
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          paid_on?: string
          subscription_month_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_month_id_user_id_fkey"
            columns: ["subscription_month_id", "user_id"]
            isOneToOne: false
            referencedRelation: "subscription_months"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_months: {
        Row: {
          closed_at: string | null
          closing_credit: number | null
          created_at: string
          fee_snapshot: number
          id: string
          meal_types_snapshot: Database["public"]["Enums"]["meal_type"][]
          opening_credit: number
          period: string
          status: Database["public"]["Enums"]["month_status"]
          subscription_id: string
          user_id: string
          weekdays_snapshot: number[]
        }
        Insert: {
          closed_at?: string | null
          closing_credit?: number | null
          created_at?: string
          fee_snapshot: number
          id?: string
          meal_types_snapshot: Database["public"]["Enums"]["meal_type"][]
          opening_credit?: number
          period: string
          status?: Database["public"]["Enums"]["month_status"]
          subscription_id: string
          user_id?: string
          weekdays_snapshot: number[]
        }
        Update: {
          closed_at?: string | null
          closing_credit?: number | null
          created_at?: string
          fee_snapshot?: number
          id?: string
          meal_types_snapshot?: Database["public"]["Enums"]["meal_type"][]
          opening_credit?: number
          period?: string
          status?: Database["public"]["Enums"]["month_status"]
          subscription_id?: string
          user_id?: string
          weekdays_snapshot?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "subscription_months_subscription_id_user_id_fkey"
            columns: ["subscription_id", "user_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          auto_mark_delivered: boolean
          carry_forward_enabled: boolean
          created_at: string
          delivery_weekdays: number[]
          dinner_value: number | null
          end_date: string | null
          id: string
          is_active: boolean
          lunch_value: number | null
          meal_types: Database["public"]["Enums"]["meal_type"][]
          monthly_fee: number
          notice_hours: number
          start_date: string
          user_cancel_policy: Database["public"]["Enums"]["cancel_policy"]
          user_id: string
          vendor_name: string
          vendor_phone: string | null
        }
        Insert: {
          auto_mark_delivered?: boolean
          carry_forward_enabled?: boolean
          created_at?: string
          delivery_weekdays?: number[]
          dinner_value?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          lunch_value?: number | null
          meal_types?: Database["public"]["Enums"]["meal_type"][]
          monthly_fee: number
          notice_hours?: number
          start_date: string
          user_cancel_policy?: Database["public"]["Enums"]["cancel_policy"]
          user_id?: string
          vendor_name: string
          vendor_phone?: string | null
        }
        Update: {
          auto_mark_delivered?: boolean
          carry_forward_enabled?: boolean
          created_at?: string
          delivery_weekdays?: number[]
          dinner_value?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          lunch_value?: number | null
          meal_types?: Database["public"]["Enums"]["meal_type"][]
          monthly_fee?: number
          notice_hours?: number
          start_date?: string
          user_cancel_policy?: Database["public"]["Enums"]["cancel_policy"]
          user_id?: string
          vendor_name?: string
          vendor_phone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      cancel_policy: "full_credit" | "credit_with_notice" | "no_credit"
      meal_status:
        | "scheduled"
        | "delivered"
        | "vendor_cancelled"
        | "user_cancelled"
        | "no_service"
      meal_type: "lunch" | "dinner"
      month_status: "open" | "closed"
      payment_method: "cash" | "bank_transfer" | "duitnow" | "other"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      cancel_policy: ["full_credit", "credit_with_notice", "no_credit"],
      meal_status: [
        "scheduled",
        "delivered",
        "vendor_cancelled",
        "user_cancelled",
        "no_service",
      ],
      meal_type: ["lunch", "dinner"],
      month_status: ["open", "closed"],
      payment_method: ["cash", "bank_transfer", "duitnow", "other"],
    },
  },
} as const

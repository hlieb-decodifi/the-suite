export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          id: string
          state: string | null
          street_address: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          state?: string | null
          street_address?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          state?: string | null
          street_address?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          booking_id: string
          created_at: string
          date: string
          end_time: string
          id: string
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          date: string
          end_time: string
          id?: string
          start_time: string
          status: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_payments: {
        Row: {
          amount: number
          balance_amount: number
          balance_payment_method: string | null
          booking_id: string
          created_at: string
          deposit_amount: number
          id: string
          payment_method_id: string
          payment_type: string
          requires_balance_payment: boolean
          service_fee: number
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          tip_amount: number
          updated_at: string
        }
        Insert: {
          amount: number
          balance_amount?: number
          balance_payment_method?: string | null
          booking_id: string
          created_at?: string
          deposit_amount?: number
          id?: string
          payment_method_id: string
          payment_type?: string
          requires_balance_payment?: boolean
          service_fee: number
          status: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          tip_amount?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          balance_amount?: number
          balance_payment_method?: string | null
          booking_id?: string
          created_at?: string
          deposit_amount?: number
          id?: string
          payment_method_id?: string
          payment_type?: string
          requires_balance_payment?: boolean
          service_fee?: number
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          tip_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_services: {
        Row: {
          booking_id: string
          created_at: string
          duration: number
          id: string
          price: number
          service_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          duration: number
          id?: string
          price: number
          service_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          duration?: number
          id?: string
          price?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_services_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          client_id: string
          created_at: string
          id: string
          notes: string | null
          professional_profile_id: string
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          professional_profile_id: string
          status: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          professional_profile_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_professional_profile_id_fkey"
            columns: ["professional_profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_profiles: {
        Row: {
          address_id: string | null
          created_at: string
          id: string
          location: string | null
          phone_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_id?: string | null
          created_at?: string
          id?: string
          location?: string | null
          phone_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_id?: string | null
          created_at?: string
          id?: string
          location?: string | null
          phone_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_profiles_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          id: string
          stripe_customer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          stripe_customer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          stripe_customer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string
          id: string
          is_online: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_online?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_online?: boolean
          name?: string
        }
        Relationships: []
      }
      portfolio_photos: {
        Row: {
          created_at: string
          description: string | null
          filename: string
          id: string
          order_index: number
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          filename: string
          id?: string
          order_index?: number
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          filename?: string
          id?: string
          order_index?: number
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_payment_methods: {
        Row: {
          created_at: string
          id: string
          payment_method_id: string
          professional_profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_method_id: string
          professional_profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_method_id?: string
          professional_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_payment_methods_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_payment_methods_professional_profile_id_fkey"
            columns: ["professional_profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_profiles: {
        Row: {
          address_id: string | null
          appointment_requirements: string | null
          balance_payment_method: string | null
          created_at: string
          deposit_type: string | null
          deposit_value: number | null
          description: string | null
          facebook_url: string | null
          id: string
          instagram_url: string | null
          is_published: boolean | null
          is_subscribed: boolean | null
          location: string | null
          phone_number: string | null
          profession: string | null
          requires_deposit: boolean
          stripe_account_id: string | null
          stripe_connect_status: string
          stripe_connect_updated_at: string | null
          tiktok_url: string | null
          updated_at: string
          user_id: string
          working_hours: Json | null
        }
        Insert: {
          address_id?: string | null
          appointment_requirements?: string | null
          balance_payment_method?: string | null
          created_at?: string
          deposit_type?: string | null
          deposit_value?: number | null
          description?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          is_published?: boolean | null
          is_subscribed?: boolean | null
          location?: string | null
          phone_number?: string | null
          profession?: string | null
          requires_deposit?: boolean
          stripe_account_id?: string | null
          stripe_connect_status?: string
          stripe_connect_updated_at?: string | null
          tiktok_url?: string | null
          updated_at?: string
          user_id: string
          working_hours?: Json | null
        }
        Update: {
          address_id?: string | null
          appointment_requirements?: string | null
          balance_payment_method?: string | null
          created_at?: string
          deposit_type?: string | null
          deposit_value?: number | null
          description?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          is_published?: boolean | null
          is_subscribed?: boolean | null
          location?: string | null
          phone_number?: string | null
          profession?: string | null
          requires_deposit?: boolean
          stripe_account_id?: string | null
          stripe_connect_status?: string
          stripe_connect_updated_at?: string | null
          tiktok_url?: string | null
          updated_at?: string
          user_id?: string
          working_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_profiles_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          end_date: string | null
          id: string
          professional_profile_id: string
          start_date: string
          status: string
          stripe_subscription_id: string | null
          subscription_plan_id: string
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          end_date?: string | null
          id?: string
          professional_profile_id: string
          start_date?: string
          status: string
          stripe_subscription_id?: string | null
          subscription_plan_id: string
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          end_date?: string | null
          id?: string
          professional_profile_id?: string
          start_date?: string
          status?: string
          stripe_subscription_id?: string | null
          subscription_plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_subscriptions_professional_profile_id_fkey"
            columns: ["professional_profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_subscriptions_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_photos: {
        Row: {
          created_at: string
          filename: string
          id: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filename: string
          id?: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          filename?: string
          id?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          duration: number
          id: string
          name: string
          price: number
          professional_profile_id: string
          stripe_price_id: string | null
          stripe_product_id: string | null
          stripe_status: string
          stripe_sync_error: string | null
          stripe_sync_status: string
          stripe_synced_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration: number
          id?: string
          name: string
          price: number
          professional_profile_id: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          stripe_status?: string
          stripe_sync_error?: string | null
          stripe_sync_status?: string
          stripe_synced_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          name?: string
          price?: number
          professional_profile_id?: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          stripe_status?: string
          stripe_sync_error?: string | null
          stripe_sync_status?: string
          stripe_synced_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_professional_profile_id_fkey"
            columns: ["professional_profile_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          interval: string
          is_active: boolean | null
          name: string
          price: number
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          interval: string
          is_active?: boolean | null
          name: string
          price: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          interval?: string
          is_active?: boolean | null
          name?: string
          price?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          first_name: string
          id: string
          last_name: string
          role_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_name: string
          id: string
          last_name: string
          role_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          role_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_client: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      is_professional: {
        Args: { user_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const


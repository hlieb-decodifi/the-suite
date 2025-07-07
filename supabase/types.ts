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
          apartment: string | null
          city: string | null
          country: string | null
          created_at: string
          google_place_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          state: string | null
          street_address: string | null
          updated_at: string
        }
        Insert: {
          apartment?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          google_place_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          state?: string | null
          street_address?: string | null
          updated_at?: string
        }
        Update: {
          apartment?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          google_place_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          state?: string | null
          street_address?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_configs: {
        Row: {
          created_at: string
          data_type: string
          description: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          data_type: string
          description: string
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          data_type?: string
          description?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          booking_id: string
          created_at: string
          end_time: string
          id: string
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          end_time: string
          id?: string
          start_time: string
          status: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
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
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_payments: {
        Row: {
          amount: number
          authorization_expires_at: string | null
          balance_amount: number
          balance_notification_sent_at: string | null
          booking_id: string
          capture_method: string | null
          capture_scheduled_for: string | null
          captured_at: string | null
          created_at: string
          deposit_amount: number
          id: string
          payment_method_id: string
          payment_type: string
          pre_auth_placed_at: string | null
          pre_auth_scheduled_for: string | null
          refund_reason: string | null
          refund_transaction_id: string | null
          refunded_amount: number
          refunded_at: string | null
          requires_balance_payment: boolean
          service_fee: number
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          stripe_payment_method_id: string | null
          tip_amount: number
          updated_at: string
        }
        Insert: {
          amount: number
          authorization_expires_at?: string | null
          balance_amount?: number
          balance_notification_sent_at?: string | null
          booking_id: string
          capture_method?: string | null
          capture_scheduled_for?: string | null
          captured_at?: string | null
          created_at?: string
          deposit_amount?: number
          id?: string
          payment_method_id: string
          payment_type?: string
          pre_auth_placed_at?: string | null
          pre_auth_scheduled_for?: string | null
          refund_reason?: string | null
          refund_transaction_id?: string | null
          refunded_amount?: number
          refunded_at?: string | null
          requires_balance_payment?: boolean
          service_fee: number
          status: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          tip_amount?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          authorization_expires_at?: string | null
          balance_amount?: number
          balance_notification_sent_at?: string | null
          booking_id?: string
          capture_method?: string | null
          capture_scheduled_for?: string | null
          captured_at?: string | null
          created_at?: string
          deposit_amount?: number
          id?: string
          payment_method_id?: string
          payment_type?: string
          pre_auth_placed_at?: string | null
          pre_auth_scheduled_for?: string | null
          refund_reason?: string | null
          refund_transaction_id?: string | null
          refunded_amount?: number
          refunded_at?: string | null
          requires_balance_payment?: boolean
          service_fee?: number
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
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
      contact_inquiries: {
        Row: {
          admin_notes: string | null
          assigned_to: string | null
          attachments: Json | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          page_url: string | null
          phone: string | null
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
          urgency: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          assigned_to?: string | null
          attachments?: Json | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          page_url?: string | null
          phone?: string | null
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          urgency?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          assigned_to?: string | null
          attachments?: Json | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          page_url?: string | null
          phone?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          urgency?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          client_id: string
          created_at: string
          id: string
          professional_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          professional_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          professional_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
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
      email_templates: {
        Row: {
          created_at: string
          description: string | null
          html_content: string
          id: string
          is_active: boolean
          name: string
          reply_to: string | null
          sender_email: string
          sender_name: string
          subject: string
          tag: string
          to_field: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          html_content: string
          id?: string
          is_active?: boolean
          name: string
          reply_to?: string | null
          sender_email: string
          sender_name: string
          subject: string
          tag: string
          to_field: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          html_content?: string
          id?: string
          is_active?: boolean
          name?: string
          reply_to?: string | null
          sender_email?: string
          sender_name?: string
          subject?: string
          tag?: string
          to_field?: string
          updated_at?: string
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          effective_date: string | null
          id: string
          is_published: boolean
          title: string
          type: string
          updated_at: string
          version: number
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          id?: string
          is_published?: boolean
          title: string
          type: string
          updated_at?: string
          version?: number
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          id?: string
          is_published?: boolean
          title?: string
          type?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "legal_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          id: string
          message_id: string
          type: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          id?: string
          message_id: string
          type: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          message_id?: string
          type?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
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
          allow_messages: boolean
          appointment_requirements: string | null
          cancellation_24h_charge_percentage: number
          cancellation_48h_charge_percentage: number
          cancellation_policy_enabled: boolean
          created_at: string
          deposit_type: string | null
          deposit_value: number | null
          description: string | null
          facebook_url: string | null
          hide_full_address: boolean
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
          timezone: string | null
          updated_at: string
          user_id: string
          working_hours: Json | null
        }
        Insert: {
          address_id?: string | null
          allow_messages?: boolean
          appointment_requirements?: string | null
          cancellation_24h_charge_percentage?: number
          cancellation_48h_charge_percentage?: number
          cancellation_policy_enabled?: boolean
          created_at?: string
          deposit_type?: string | null
          deposit_value?: number | null
          description?: string | null
          facebook_url?: string | null
          hide_full_address?: boolean
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
          timezone?: string | null
          updated_at?: string
          user_id: string
          working_hours?: Json | null
        }
        Update: {
          address_id?: string | null
          allow_messages?: boolean
          appointment_requirements?: string | null
          cancellation_24h_charge_percentage?: number
          cancellation_48h_charge_percentage?: number
          cancellation_policy_enabled?: boolean
          created_at?: string
          deposit_type?: string | null
          deposit_value?: number | null
          description?: string | null
          facebook_url?: string | null
          hide_full_address?: boolean
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
          timezone?: string | null
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
      refunds: {
        Row: {
          appointment_id: string
          booking_payment_id: string
          client_id: string
          created_at: string
          declined_reason: string | null
          id: string
          original_amount: number
          processed_at: string | null
          professional_id: string
          professional_notes: string | null
          reason: string
          refund_amount: number | null
          requested_amount: number | null
          status: string
          stripe_refund_id: string | null
          transaction_fee: number
          updated_at: string
        }
        Insert: {
          appointment_id: string
          booking_payment_id: string
          client_id: string
          created_at?: string
          declined_reason?: string | null
          id?: string
          original_amount: number
          processed_at?: string | null
          professional_id: string
          professional_notes?: string | null
          reason: string
          refund_amount?: number | null
          requested_amount?: number | null
          status?: string
          stripe_refund_id?: string | null
          transaction_fee?: number
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          booking_payment_id?: string
          client_id?: string
          created_at?: string
          declined_reason?: string | null
          id?: string
          original_amount?: number
          processed_at?: string | null
          professional_id?: string
          professional_notes?: string | null
          reason?: string
          refund_amount?: number | null
          requested_amount?: number | null
          status?: string
          stripe_refund_id?: string | null
          transaction_fee?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments_with_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_booking_payment_id_fkey"
            columns: ["booking_payment_id"]
            isOneToOne: false
            referencedRelation: "booking_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          appointment_id: string
          client_id: string
          created_at: string
          id: string
          message: string
          professional_id: string
          score: number
          updated_at: string
        }
        Insert: {
          appointment_id: string
          client_id: string
          created_at?: string
          id?: string
          message: string
          professional_id: string
          score: number
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          client_id?: string
          created_at?: string
          id?: string
          message?: string
          professional_id?: string
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments_with_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
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
      service_limits: {
        Row: {
          created_at: string
          id: string
          max_services: number
          professional_profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_services?: number
          professional_profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_services?: number
          professional_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_limits_professional_profile_id_fkey"
            columns: ["professional_profile_id"]
            isOneToOne: true
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      appointments_with_status: {
        Row: {
          booking_id: string | null
          computed_status: string | null
          created_at: string | null
          end_time: string | null
          id: string | null
          start_time: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          booking_id?: string | null
          computed_status?: never
          created_at?: string | null
          end_time?: string | null
          id?: string | null
          start_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_id?: string | null
          computed_status?: never
          created_at?: string | null
          end_time?: string | null
          id?: string | null
          start_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_payment_schedule: {
        Args: { appointment_start_time: string; appointment_end_time: string }
        Returns: {
          pre_auth_date: string
          capture_date: string
          should_pre_auth_now: boolean
        }[]
      }
      can_create_refund: {
        Args: { p_appointment_id: string; p_client_id: string }
        Returns: boolean
      }
      can_create_review: {
        Args: { p_appointment_id: string; p_client_id: string }
        Returns: boolean
      }
      get_admin_config: {
        Args: { config_key: string; default_value?: string }
        Returns: string
      }
      get_appointment_computed_status: {
        Args: { p_start_time: string; p_end_time: string; p_status: string }
        Returns: string
      }
      get_appointment_status: {
        Args: {
          p_date: string
          p_start_time: string
          p_end_time: string
          p_status: string
        }
        Returns: string
      }
      get_professional_rating_stats: {
        Args: { p_professional_id: string }
        Returns: {
          average_rating: number
          total_reviews: number
          five_star: number
          four_star: number
          three_star: number
          two_star: number
          one_star: number
        }[]
      }
      get_service_limit: {
        Args: { prof_profile_id: string }
        Returns: number
      }
      insert_address_and_return_id: {
        Args: {
          p_country?: string
          p_state?: string
          p_city?: string
          p_street_address?: string
          p_apartment?: string
          p_latitude?: number
          p_longitude?: number
          p_google_place_id?: string
        }
        Returns: string
      }
      is_client: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      is_professional: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      set_admin_config: {
        Args: { config_key: string; config_value: string }
        Returns: boolean
      }
      update_service_limit: {
        Args: { prof_profile_id: string; new_limit: number }
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


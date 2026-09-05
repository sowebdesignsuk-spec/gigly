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
    PostgrestVersion: "14.5"
  }
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
      applications: {
        Row: {
          created_at: string
          entertainer_id: string
          gig_id: string
          id: string
          message: string | null
          proposed_fee: number | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          created_at?: string
          entertainer_id: string
          gig_id: string
          id?: string
          message?: string | null
          proposed_fee?: number | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          created_at?: string
          entertainer_id?: string
          gig_id?: string
          id?: string
          message?: string | null
          proposed_fee?: number | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_entertainer_id_fkey"
            columns: ["entertainer_id"]
            isOneToOne: false
            referencedRelation: "entertainer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      availability: {
        Row: {
          booking_id: string | null
          created_at: string
          date: string
          entertainer_id: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["availability_status"]
          time_slot: Database["public"]["Enums"]["availability_slot"]
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          date: string
          entertainer_id: string
          id?: string
          notes?: string | null
          status: Database["public"]["Enums"]["availability_status"]
          time_slot?: Database["public"]["Enums"]["availability_slot"]
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          date?: string
          entertainer_id?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["availability_status"]
          time_slot?: Database["public"]["Enums"]["availability_slot"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_entertainer_id_fkey"
            columns: ["entertainer_id"]
            isOneToOne: false
            referencedRelation: "entertainer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          agreed_fee: number
          application_id: string
          cancellation_reason: string | null
          created_at: string
          entertainer_id: string
          entertainer_notes: string | null
          gig_id: string
          id: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          venue_id: string
          venue_notes: string | null
        }
        Insert: {
          agreed_fee: number
          application_id: string
          cancellation_reason?: string | null
          created_at?: string
          entertainer_id: string
          entertainer_notes?: string | null
          gig_id: string
          id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          venue_id: string
          venue_notes?: string | null
        }
        Update: {
          agreed_fee?: number
          application_id?: string
          cancellation_reason?: string | null
          created_at?: string
          entertainer_id?: string
          entertainer_notes?: string | null
          gig_id?: string
          id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          venue_id?: string
          venue_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_entertainer_id_fkey"
            columns: ["entertainer_id"]
            isOneToOne: false
            referencedRelation: "entertainer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          booking_id: string | null
          created_at: string
          gig_id: string | null
          id: string
          last_message_at: string
          participant_1: string
          participant_2: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          gig_id?: string | null
          id?: string
          last_message_at?: string
          participant_1: string
          participant_2: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          gig_id?: string | null
          id?: string
          last_message_at?: string
          participant_1?: string
          participant_2?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_1_fkey"
            columns: ["participant_1"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_1_fkey"
            columns: ["participant_1"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_2_fkey"
            columns: ["participant_2"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_2_fkey"
            columns: ["participant_2"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      entertainer_profiles: {
        Row: {
          average_rating: number | null
          bio: string | null
          categories: string[]
          created_at: string
          event_types: string[]
          id: string
          media_links: Json
          profile_completeness: number
          response_rate: number | null
          stage_name: string
          starting_price: number | null
          total_bookings: number
          travel_radius_miles: number
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          average_rating?: number | null
          bio?: string | null
          categories?: string[]
          created_at?: string
          event_types?: string[]
          id?: string
          media_links?: Json
          profile_completeness?: number
          response_rate?: number | null
          stage_name: string
          starting_price?: number | null
          total_bookings?: number
          travel_radius_miles?: number
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          average_rating?: number | null
          bio?: string | null
          categories?: string[]
          created_at?: string
          event_types?: string[]
          id?: string
          media_links?: Json
          profile_completeness?: number
          response_rate?: number | null
          stage_name?: string
          starting_price?: number | null
          total_bookings?: number
          travel_radius_miles?: number
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "entertainer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entertainer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gigs: {
        Row: {
          application_count: number
          audience_size: string | null
          budget_max: number | null
          budget_min: number
          category: string
          created_at: string
          date: string
          description: string
          end_time: string | null
          id: string
          inclusions: string | null
          is_featured: boolean
          is_urgent: boolean
          location: unknown
          location_lat: number | null
          location_lng: number | null
          location_text: string
          requirements: string | null
          start_time: string
          title: string
          updated_at: string
          venue_id: string
          visibility: Database["public"]["Enums"]["gig_visibility"]
        }
        Insert: {
          application_count?: number
          audience_size?: string | null
          budget_max?: number | null
          budget_min: number
          category: string
          created_at?: string
          date: string
          description: string
          end_time?: string | null
          id?: string
          inclusions?: string | null
          is_featured?: boolean
          is_urgent?: boolean
          location?: unknown
          location_lat?: number | null
          location_lng?: number | null
          location_text: string
          requirements?: string | null
          start_time: string
          title: string
          updated_at?: string
          venue_id: string
          visibility?: Database["public"]["Enums"]["gig_visibility"]
        }
        Update: {
          application_count?: number
          audience_size?: string | null
          budget_max?: number | null
          budget_min?: number
          category?: string
          created_at?: string
          date?: string
          description?: string
          end_time?: string | null
          id?: string
          inclusions?: string | null
          is_featured?: boolean
          is_urgent?: boolean
          location?: unknown
          location_lat?: number | null
          location_lng?: number | null
          location_text?: string
          requirements?: string | null
          start_time?: string
          title?: string
          updated_at?: string
          venue_id?: string
          visibility?: Database["public"]["Enums"]["gig_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "gigs_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_private: {
        Row: {
          created_at: string
          email: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_private_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_private_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          location: unknown
          location_lat: number | null
          location_lng: number | null
          location_text: string | null
          onboarding_complete: boolean
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          location?: unknown
          location_lat?: number | null
          location_lng?: number | null
          location_text?: string | null
          onboarding_complete?: boolean
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          location?: unknown
          location_lat?: number | null
          location_lng?: number | null
          location_text?: string | null
          onboarding_complete?: boolean
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string | null
          booking_id: string
          created_at: string
          id: string
          is_visible: boolean
          rating: number
          reviewed_user_id: string
          reviewer_id: string
        }
        Insert: {
          body?: string | null
          booking_id: string
          created_at?: string
          id?: string
          is_visible?: boolean
          rating: number
          reviewed_user_id: string
          reviewer_id: string
        }
        Update: {
          body?: string | null
          booking_id?: string
          created_at?: string
          id?: string
          is_visible?: boolean
          rating?: number
          reviewed_user_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewed_user_id_fkey"
            columns: ["reviewed_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewed_user_id_fkey"
            columns: ["reviewed_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_content_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_content_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_profiles: {
        Row: {
          address_line_1: string
          address_line_2: string | null
          city: string
          created_at: string
          description: string | null
          entertainment_preferences: string[]
          id: string
          postcode: string
          total_gigs_posted: number
          updated_at: string
          user_id: string
          venue_name: string
          venue_photos: string[]
          venue_type: Database["public"]["Enums"]["venue_type"]
          verification_status: Database["public"]["Enums"]["verification_status"]
          website_url: string | null
        }
        Insert: {
          address_line_1: string
          address_line_2?: string | null
          city: string
          created_at?: string
          description?: string | null
          entertainment_preferences?: string[]
          id?: string
          postcode: string
          total_gigs_posted?: number
          updated_at?: string
          user_id: string
          venue_name: string
          venue_photos?: string[]
          venue_type: Database["public"]["Enums"]["venue_type"]
          verification_status?: Database["public"]["Enums"]["verification_status"]
          website_url?: string | null
        }
        Update: {
          address_line_1?: string
          address_line_2?: string | null
          city?: string
          created_at?: string
          description?: string | null
          entertainment_preferences?: string[]
          id?: string
          postcode?: string
          total_gigs_posted?: number
          updated_at?: string
          user_id?: string
          venue_name?: string
          venue_photos?: string[]
          venue_type?: Database["public"]["Enums"]["venue_type"]
          verification_status?: Database["public"]["Enums"]["verification_status"]
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          location_lat: number | null
          location_lng: number | null
          location_text: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_text?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_text?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_erase_user: { Args: { p_user_id: string }; Returns: string }
      admin_set_gig_visibility: {
        Args: {
          p_gig_id: string
          p_visibility: Database["public"]["Enums"]["gig_visibility"]
        }
        Returns: undefined
      }
      admin_set_user_status: {
        Args: {
          p_status: Database["public"]["Enums"]["account_status"]
          p_user_id: string
        }
        Returns: undefined
      }
      admin_stats: {
        Args: never
        Returns: {
          applications_new_7d: number
          applications_total: number
          bookings_total: number
          gigs_new_7d: number
          gigs_published: number
          gigs_total: number
          offers_open: number
          reviews_hidden: number
          users_entertainers: number
          users_new_7d: number
          users_suspended: number
          users_total: number
          users_venues: number
        }[]
      }
      application_parties: {
        Args: { p_application_id: string }
        Returns: {
          entertainer_user: string
          gig_id: string
          gig_title: string
          venue_user: string
        }[]
      }
      demo_create_user: {
        Args: {
          p_email: string
          p_name: string
          p_type: Database["public"]["Enums"]["account_type"]
        }
        Returns: string
      }
      demo_password: { Args: never; Returns: string }
      get_or_create_conversation: {
        Args: { p_booking_id?: string; p_gig_id?: string; p_other_user: string }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      mark_completed_bookings: { Args: never; Returns: number }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      miles_to_metres: { Args: { miles: number }; Returns: number }
      my_entertainer_id: { Args: never; Returns: string }
      my_venue_id: { Args: never; Returns: string }
      remove_demo_data: { Args: never; Returns: string }
      search_gigs: {
        Args: {
          p_budget_min?: number
          p_categories?: string[]
          p_date_from?: string
          p_date_to?: string
          p_lat?: number
          p_limit?: number
          p_lng?: number
          p_offset?: number
          p_query?: string
          p_radius_miles?: number
        }
        Returns: {
          application_count: number
          budget_max: number
          budget_min: number
          category: string
          created_at: string
          date: string
          description: string
          distance_miles: number
          end_time: string
          id: string
          is_featured: boolean
          is_urgent: boolean
          location_text: string
          start_time: string
          title: string
          venue_id: string
          venue_name: string
          venue_type: Database["public"]["Enums"]["venue_type"]
        }[]
      }
      seed_demo_data: { Args: never; Returns: string }
      unread_message_count: { Args: never; Returns: number }
    }
    Enums: {
      account_status: "active" | "suspended" | "deleted"
      account_type: "entertainer" | "venue"
      application_status:
        | "sent"
        | "viewed"
        | "shortlisted"
        | "offered"
        | "accepted"
        | "declined"
        | "withdrawn"
      availability_slot: "all_day" | "morning" | "afternoon" | "evening"
      availability_status: "available" | "unavailable" | "held" | "booked"
      booking_status:
        | "confirmed"
        | "completed"
        | "cancelled_by_venue"
        | "cancelled_by_entertainer"
        | "disputed"
      gig_visibility: "draft" | "published" | "closed" | "cancelled"
      notification_type:
        | "gig_match"
        | "application_received"
        | "application_update"
        | "booking_confirmed"
        | "booking_cancelled"
        | "message"
        | "review"
        | "system"
      user_role: "user" | "admin"
      venue_type:
        | "pub"
        | "club"
        | "hotel"
        | "restaurant"
        | "holiday_park"
        | "event_company"
        | "festival"
        | "other"
      verification_status: "unverified" | "pending" | "verified"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_status: ["active", "suspended", "deleted"],
      account_type: ["entertainer", "venue"],
      application_status: [
        "sent",
        "viewed",
        "shortlisted",
        "offered",
        "accepted",
        "declined",
        "withdrawn",
      ],
      availability_slot: ["all_day", "morning", "afternoon", "evening"],
      availability_status: ["available", "unavailable", "held", "booked"],
      booking_status: [
        "confirmed",
        "completed",
        "cancelled_by_venue",
        "cancelled_by_entertainer",
        "disputed",
      ],
      gig_visibility: ["draft", "published", "closed", "cancelled"],
      notification_type: [
        "gig_match",
        "application_received",
        "application_update",
        "booking_confirmed",
        "booking_cancelled",
        "message",
        "review",
        "system",
      ],
      user_role: ["user", "admin"],
      venue_type: [
        "pub",
        "club",
        "hotel",
        "restaurant",
        "holiday_park",
        "event_company",
        "festival",
        "other",
      ],
      verification_status: ["unverified", "pending", "verified"],
    },
  },
} as const

// ---------------------------------------------------------------------------
// Convenience aliases.
//
// Everything above this line is generated — regenerate with:
//   npx supabase gen types typescript --project-id loklokibqsazuswrcffw > src/lib/types/database.ts
// and re-append this block. Keep hand-written types out of the generated part,
// or the next regeneration silently deletes them.
// ---------------------------------------------------------------------------

export type AccountType = Enums<"account_type">;
export type UserRole = Enums<"user_role">;
export type AccountStatus = Enums<"account_status">;
export type VerificationStatus = Enums<"verification_status">;
export type VenueType = Enums<"venue_type">;
export type GigVisibility = Enums<"gig_visibility">;
export type ApplicationStatus = Enums<"application_status">;
export type BookingStatus = Enums<"booking_status">;
export type AvailabilitySlot = Enums<"availability_slot">;
export type AvailabilityStatus = Enums<"availability_status">;
export type NotificationType = Enums<"notification_type">;

export type Profile = Tables<"profiles">;
export type EntertainerProfile = Tables<"entertainer_profiles">;
export type VenueProfile = Tables<"venue_profiles">;
export type Gig = Tables<"gigs">;
export type Application = Tables<"applications">;
export type Booking = Tables<"bookings">;
export type Availability = Tables<"availability">;
export type Conversation = Tables<"conversations">;
export type Message = Tables<"messages">;
export type Review = Tables<"reviews">;
export type Notification = Tables<"notifications">;
export type ProfilePrivate = Tables<"profile_private">;
export type SiteContent = Tables<"site_content">;

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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_lockouts: {
        Row: {
          created_at: string
          email: string
          failed_attempts: number
          id: string
          locked_until: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          failed_attempts?: number
          id?: string
          locked_until: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          failed_attempts?: number
          id?: string
          locked_until?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_coach_rate_limits: {
        Row: {
          created_at: string
          id: string
          request_count: number
          reset_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_count?: number
          reset_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          request_count?: number
          reset_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          device_fingerprint: string | null
          email: string
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          device_fingerprint?: string | null
          email: string
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          device_fingerprint?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          applied_at: string | null
          company_name: string
          contact_linkedin: string | null
          contact_name: string | null
          created_at: string | null
          deleted_at: string | null
          display_order: number | null
          fit_level: number | null
          id: string
          is_deleted: boolean | null
          is_favorite: boolean | null
          job_url: string | null
          location: string | null
          match_breakdown: Json | null
          match_score: number | null
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          opportunity_tag: string | null
          previous_status: string | null
          required_skills: string[] | null
          required_years_experience: number | null
          role_title: string
          salary_range: string | null
          seniority_level: Database["public"]["Enums"]["seniority_level"] | null
          status: Database["public"]["Enums"]["opportunity_status"] | null
          tags: string[] | null
          target_company_id: string | null
          updated_at: string | null
          user_id: string
          work_model: Database["public"]["Enums"]["work_model"] | null
        }
        Insert: {
          applied_at?: string | null
          company_name: string
          contact_linkedin?: string | null
          contact_name?: string | null
          created_at?: string | null
          deleted_at?: string | null
          display_order?: number | null
          fit_level?: number | null
          id?: string
          is_deleted?: boolean | null
          is_favorite?: boolean | null
          job_url?: string | null
          location?: string | null
          match_breakdown?: Json | null
          match_score?: number | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          opportunity_tag?: string | null
          previous_status?: string | null
          required_skills?: string[] | null
          required_years_experience?: number | null
          role_title: string
          salary_range?: string | null
          seniority_level?:
            | Database["public"]["Enums"]["seniority_level"]
            | null
          status?: Database["public"]["Enums"]["opportunity_status"] | null
          tags?: string[] | null
          target_company_id?: string | null
          updated_at?: string | null
          user_id: string
          work_model?: Database["public"]["Enums"]["work_model"] | null
        }
        Update: {
          applied_at?: string | null
          company_name?: string
          contact_linkedin?: string | null
          contact_name?: string | null
          created_at?: string | null
          deleted_at?: string | null
          display_order?: number | null
          fit_level?: number | null
          id?: string
          is_deleted?: boolean | null
          is_favorite?: boolean | null
          job_url?: string | null
          location?: string | null
          match_breakdown?: Json | null
          match_score?: number | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          opportunity_tag?: string | null
          previous_status?: string | null
          required_skills?: string[] | null
          required_years_experience?: number | null
          role_title?: string
          salary_range?: string | null
          seniority_level?:
            | Database["public"]["Enums"]["seniority_level"]
            | null
          status?: Database["public"]["Enums"]["opportunity_status"] | null
          tags?: string[] | null
          target_company_id?: string | null
          updated_at?: string | null
          user_id?: string
          work_model?: Database["public"]["Enums"]["work_model"] | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "target_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      preset_companies: {
        Row: {
          careers_url: string | null
          company_name: string
          company_type: Database["public"]["Enums"]["company_type"] | null
          country: string
          id: string
          sector: string | null
        }
        Insert: {
          careers_url?: string | null
          company_name: string
          company_type?: Database["public"]["Enums"]["company_type"] | null
          country: string
          id?: string
          sector?: string | null
        }
        Update: {
          careers_url?: string | null
          company_name?: string
          company_type?: Database["public"]["Enums"]["company_type"] | null
          country?: string
          id?: string
          sector?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          country_work_preferences: Json | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          industry_experience: string[] | null
          kanban_sort_preference: string | null
          onboarding_completed: boolean | null
          preferred_company_stage: string[] | null
          preferred_countries: string[] | null
          previous_background: Database["public"]["Enums"]["app_role"] | null
          skills: string[] | null
          strength_orientation:
            | Database["public"]["Enums"]["strength_orientation"]
            | null
          target_roles: string[] | null
          theme_preference: string | null
          updated_at: string | null
          verification_frequency_days: number | null
          years_experience_product: number | null
          years_experience_total: number | null
        }
        Insert: {
          country_work_preferences?: Json | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          industry_experience?: string[] | null
          kanban_sort_preference?: string | null
          onboarding_completed?: boolean | null
          preferred_company_stage?: string[] | null
          preferred_countries?: string[] | null
          previous_background?: Database["public"]["Enums"]["app_role"] | null
          skills?: string[] | null
          strength_orientation?:
            | Database["public"]["Enums"]["strength_orientation"]
            | null
          target_roles?: string[] | null
          theme_preference?: string | null
          updated_at?: string | null
          verification_frequency_days?: number | null
          years_experience_product?: number | null
          years_experience_total?: number | null
        }
        Update: {
          country_work_preferences?: Json | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          industry_experience?: string[] | null
          kanban_sort_preference?: string | null
          onboarding_completed?: boolean | null
          preferred_company_stage?: string[] | null
          preferred_countries?: string[] | null
          previous_background?: Database["public"]["Enums"]["app_role"] | null
          skills?: string[] | null
          strength_orientation?:
            | Database["public"]["Enums"]["strength_orientation"]
            | null
          target_roles?: string[] | null
          theme_preference?: string | null
          updated_at?: string | null
          verification_frequency_days?: number | null
          years_experience_product?: number | null
          years_experience_total?: number | null
        }
        Relationships: []
      }
      target_companies: {
        Row: {
          careers_url: string | null
          company_name: string
          company_type: Database["public"]["Enums"]["company_type"] | null
          country: string
          created_at: string | null
          display_order: number | null
          id: string
          is_favorite: boolean | null
          is_preset: boolean | null
          last_checked_at: string | null
          notes: string | null
          notes_updated_at: string | null
          research_notes: string | null
          sector: string | null
          user_id: string
        }
        Insert: {
          careers_url?: string | null
          company_name: string
          company_type?: Database["public"]["Enums"]["company_type"] | null
          country: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_favorite?: boolean | null
          is_preset?: boolean | null
          last_checked_at?: string | null
          notes?: string | null
          notes_updated_at?: string | null
          research_notes?: string | null
          sector?: string | null
          user_id: string
        }
        Update: {
          careers_url?: string | null
          company_name?: string
          company_type?: Database["public"]["Enums"]["company_type"] | null
          country?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_favorite?: boolean | null
          is_preset?: boolean | null
          last_checked_at?: string | null
          notes?: string | null
          notes_updated_at?: string | null
          research_notes?: string | null
          sector?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          device_info: string | null
          id: string
          ip_address: string | null
          is_current: boolean | null
          last_active_at: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          is_current?: boolean | null
          last_active_at?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          is_current?: boolean | null
          last_active_at?: string
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_user_data: { Args: { p_target_user_id: string }; Returns: Json }
      admin_get_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          is_admin: boolean
          user_id: string
        }[]
      }
      admin_manage_role: {
        Args: { p_action: string; p_role: string; p_target_user_id: string }
        Returns: Json
      }
      admin_unlock_account: { Args: { p_email: string }; Returns: Json }
      check_ai_coach_rate_limit: {
        Args: { p_daily_limit?: number; p_user_id: string }
        Returns: boolean
      }
      create_audit_log: {
        Args: { p_action: string; p_details?: Json; p_user_id: string }
        Returns: string
      }
      get_admin_stats: { Args: never; Returns: Json }
      get_ai_coach_remaining_requests: {
        Args: { p_daily_limit?: number; p_user_id: string }
        Returns: number
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_account_locked: { Args: { p_email: string }; Returns: boolean }
      record_login_attempt: {
        Args: { p_email: string; p_ip_address?: string; p_success: boolean }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "sales"
        | "engineering"
        | "design"
        | "operations"
        | "marketing"
        | "consulting"
        | "other"
      app_role_admin: "admin" | "user"
      company_type: "tech_giant" | "scaleup" | "startup"
      opportunity_status:
        | "researching"
        | "applied"
        | "interviewing"
        | "assessment"
        | "offer"
        | "rejected"
        | "ghosted"
        | "withdrawn"
      seniority_level:
        | "entry"
        | "mid"
        | "senior"
        | "lead"
        | "principal"
        | "director"
        | "vp"
      strength_orientation: "technical" | "business" | "balanced"
      work_model: "remote" | "hybrid" | "onsite"
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
      app_role: [
        "sales",
        "engineering",
        "design",
        "operations",
        "marketing",
        "consulting",
        "other",
      ],
      app_role_admin: ["admin", "user"],
      company_type: ["tech_giant", "scaleup", "startup"],
      opportunity_status: [
        "researching",
        "applied",
        "interviewing",
        "assessment",
        "offer",
        "rejected",
        "ghosted",
        "withdrawn",
      ],
      seniority_level: [
        "entry",
        "mid",
        "senior",
        "lead",
        "principal",
        "director",
        "vp",
      ],
      strength_orientation: ["technical", "business", "balanced"],
      work_model: ["remote", "hybrid", "onsite"],
    },
  },
} as const

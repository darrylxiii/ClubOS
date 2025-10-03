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
      applications: {
        Row: {
          applied_at: string
          company_name: string
          created_at: string
          current_stage_index: number
          id: string
          job_id: string
          position: string
          stages: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string
          company_name: string
          created_at?: string
          current_stage_index?: number
          id?: string
          job_id: string
          position: string
          stages?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string
          company_name?: string
          created_at?: string
          current_stage_index?: number
          id?: string
          job_id?: string
          position?: string
          stages?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cities: {
        Row: {
          country: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          region: string | null
        }
        Insert: {
          country: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          region?: string | null
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          region?: string | null
        }
        Relationships: []
      }
      closed_pipelines: {
        Row: {
          application_id: string
          closed_at: string
          company_name: string
          created_at: string
          feedback_completed: boolean
          feedback_requested: boolean
          id: string
          outcome: string
          position: string
          user_id: string
        }
        Insert: {
          application_id: string
          closed_at?: string
          company_name: string
          created_at?: string
          feedback_completed?: boolean
          feedback_requested?: boolean
          id?: string
          outcome: string
          position: string
          user_id: string
        }
        Update: {
          application_id?: string
          closed_at?: string
          company_name?: string
          created_at?: string
          feedback_completed?: boolean
          feedback_requested?: boolean
          id?: string
          outcome?: string
          position?: string
          user_id?: string
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          created_by_type: string
          expires_at: string
          id: string
          is_active: boolean
          metadata: Json | null
          updated_at: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          created_by_type: string
          expires_at: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          updated_at?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          created_by_type?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          updated_at?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      job_pipelines: {
        Row: {
          company_name: string
          created_at: string
          id: string
          job_id: string
          position: string
          stages: Json
          updated_at: string
        }
        Insert: {
          company_name: string
          created_at?: string
          id?: string
          job_id: string
          position: string
          stages?: Json
          updated_at?: string
        }
        Update: {
          company_name?: string
          created_at?: string
          id?: string
          job_id?: string
          position?: string
          stages?: Json
          updated_at?: string
        }
        Relationships: []
      }
      match_scores: {
        Row: {
          additional_factors: Json
          calculated_at: string
          club_match_factors: Json
          club_match_score: number
          gaps: Json
          hard_stops: Json
          id: string
          job_id: string
          longer_term_actions: Json
          overall_score: number
          preferred_criteria_met: Json
          preferred_criteria_total: number
          quick_wins: Json
          required_criteria_met: Json
          required_criteria_total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_factors?: Json
          calculated_at?: string
          club_match_factors?: Json
          club_match_score?: number
          gaps?: Json
          hard_stops?: Json
          id?: string
          job_id: string
          longer_term_actions?: Json
          overall_score: number
          preferred_criteria_met?: Json
          preferred_criteria_total?: number
          quick_wins?: Json
          required_criteria_met?: Json
          required_criteria_total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_factors?: Json
          calculated_at?: string
          club_match_factors?: Json
          club_match_score?: number
          gaps?: Json
          hard_stops?: Json
          id?: string
          job_id?: string
          longer_term_actions?: Json
          overall_score?: number
          preferred_criteria_met?: Json
          preferred_criteria_total?: number
          quick_wins?: Json
          required_criteria_met?: Json
          required_criteria_total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meeting_recordings: {
        Row: {
          ai_analysis: Json | null
          analysis_status: string | null
          analyzed_at: string | null
          company_name: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          follow_up_draft: string | null
          id: string
          meeting_date: string
          meeting_type: string | null
          notes: string | null
          participants: Json | null
          position: string | null
          recording_url: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          transcript: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          analysis_status?: string | null
          analyzed_at?: string | null
          company_name?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          follow_up_draft?: string | null
          id?: string
          meeting_date: string
          meeting_type?: string | null
          notes?: string | null
          participants?: Json | null
          position?: string | null
          recording_url?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          transcript?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          analysis_status?: string | null
          analyzed_at?: string | null
          company_name?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          follow_up_draft?: string | null
          id?: string
          meeting_date?: string
          meeting_type?: string | null
          notes?: string | null
          participants?: Json | null
          position?: string | null
          recording_url?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          transcript?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pipeline_feedback: {
        Row: {
          additional_feedback: string | null
          application_id: string
          communication_rating: number | null
          company_name: string
          completed_at: string | null
          created_at: string
          id: string
          interview_experience_rating: number | null
          nps_score: number | null
          outcome: string
          position: string
          process_clarity_rating: number | null
          strategist_rating: number | null
          suggestions: string | null
          timeline_rating: number | null
          updated_at: string
          user_id: string
          what_could_improve: string | null
          what_went_well: string | null
          would_apply_again: boolean | null
        }
        Insert: {
          additional_feedback?: string | null
          application_id: string
          communication_rating?: number | null
          company_name: string
          completed_at?: string | null
          created_at?: string
          id?: string
          interview_experience_rating?: number | null
          nps_score?: number | null
          outcome: string
          position: string
          process_clarity_rating?: number | null
          strategist_rating?: number | null
          suggestions?: string | null
          timeline_rating?: number | null
          updated_at?: string
          user_id: string
          what_could_improve?: string | null
          what_went_well?: string | null
          would_apply_again?: boolean | null
        }
        Update: {
          additional_feedback?: string | null
          application_id?: string
          communication_rating?: number | null
          company_name?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          interview_experience_rating?: number | null
          nps_score?: number | null
          outcome?: string
          position?: string
          process_clarity_rating?: number | null
          strategist_rating?: number | null
          suggestions?: string | null
          timeline_rating?: number | null
          updated_at?: string
          user_id?: string
          what_could_improve?: string | null
          what_went_well?: string | null
          would_apply_again?: boolean | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          allow_stealth_cold_outreach: boolean | null
          avatar_url: string | null
          blocked_companies: Json | null
          career_preferences: string | null
          created_at: string | null
          current_salary_max: number | null
          current_salary_min: number | null
          current_title: string | null
          desired_salary_max: number | null
          desired_salary_min: number | null
          email: string | null
          email_verified: boolean | null
          employment_type_preference: string | null
          freelance_hourly_rate_max: number | null
          freelance_hourly_rate_min: number | null
          freelance_hours_per_week_max: number | null
          freelance_hours_per_week_min: number | null
          full_name: string | null
          fulltime_hours_per_week_max: number | null
          fulltime_hours_per_week_min: number | null
          github_connected: boolean | null
          github_profile_data: Json | null
          github_username: string | null
          id: string
          instagram_connected: boolean | null
          instagram_username: string | null
          linkedin_connected: boolean | null
          linkedin_profile_data: Json | null
          linkedin_url: string | null
          location: string | null
          notice_period: string | null
          phone: string | null
          phone_verified: boolean | null
          preferred_work_locations: Json | null
          privacy_settings: Json | null
          remote_work_preference: boolean | null
          resume_url: string | null
          stealth_mode_enabled: boolean | null
          stealth_mode_level: number | null
          twitter_connected: boolean | null
          twitter_username: string | null
          updated_at: string | null
        }
        Insert: {
          allow_stealth_cold_outreach?: boolean | null
          avatar_url?: string | null
          blocked_companies?: Json | null
          career_preferences?: string | null
          created_at?: string | null
          current_salary_max?: number | null
          current_salary_min?: number | null
          current_title?: string | null
          desired_salary_max?: number | null
          desired_salary_min?: number | null
          email?: string | null
          email_verified?: boolean | null
          employment_type_preference?: string | null
          freelance_hourly_rate_max?: number | null
          freelance_hourly_rate_min?: number | null
          freelance_hours_per_week_max?: number | null
          freelance_hours_per_week_min?: number | null
          full_name?: string | null
          fulltime_hours_per_week_max?: number | null
          fulltime_hours_per_week_min?: number | null
          github_connected?: boolean | null
          github_profile_data?: Json | null
          github_username?: string | null
          id: string
          instagram_connected?: boolean | null
          instagram_username?: string | null
          linkedin_connected?: boolean | null
          linkedin_profile_data?: Json | null
          linkedin_url?: string | null
          location?: string | null
          notice_period?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          preferred_work_locations?: Json | null
          privacy_settings?: Json | null
          remote_work_preference?: boolean | null
          resume_url?: string | null
          stealth_mode_enabled?: boolean | null
          stealth_mode_level?: number | null
          twitter_connected?: boolean | null
          twitter_username?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_stealth_cold_outreach?: boolean | null
          avatar_url?: string | null
          blocked_companies?: Json | null
          career_preferences?: string | null
          created_at?: string | null
          current_salary_max?: number | null
          current_salary_min?: number | null
          current_title?: string | null
          desired_salary_max?: number | null
          desired_salary_min?: number | null
          email?: string | null
          email_verified?: boolean | null
          employment_type_preference?: string | null
          freelance_hourly_rate_max?: number | null
          freelance_hourly_rate_min?: number | null
          freelance_hours_per_week_max?: number | null
          freelance_hours_per_week_min?: number | null
          full_name?: string | null
          fulltime_hours_per_week_max?: number | null
          fulltime_hours_per_week_min?: number | null
          github_connected?: boolean | null
          github_profile_data?: Json | null
          github_username?: string | null
          id?: string
          instagram_connected?: boolean | null
          instagram_username?: string | null
          linkedin_connected?: boolean | null
          linkedin_profile_data?: Json | null
          linkedin_url?: string | null
          location?: string | null
          notice_period?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          preferred_work_locations?: Json | null
          privacy_settings?: Json | null
          remote_work_preference?: boolean | null
          resume_url?: string | null
          stealth_mode_enabled?: boolean | null
          stealth_mode_level?: number | null
          twitter_connected?: boolean | null
          twitter_username?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      referral_network: {
        Row: {
          id: string
          invite_code: string | null
          joined_at: string
          referral_level: number
          referred_by: string | null
          referred_by_type: string | null
          user_id: string
        }
        Insert: {
          id?: string
          invite_code?: string | null
          joined_at?: string
          referral_level?: number
          referred_by?: string | null
          referred_by_type?: string | null
          user_id: string
        }
        Update: {
          id?: string
          invite_code?: string | null
          joined_at?: string
          referral_level?: number
          referred_by?: string | null
          referred_by_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_network_invite_code_fkey"
            columns: ["invite_code"]
            isOneToOne: false
            referencedRelation: "invite_codes"
            referencedColumns: ["code"]
          },
        ]
      }
      talent_strategists: {
        Row: {
          availability: string | null
          bio: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          instagram_url: string | null
          linkedin_url: string | null
          phone: string | null
          photo_url: string | null
          specialties: string[] | null
          title: string
          twitter_url: string | null
          updated_at: string
        }
        Insert: {
          availability?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          phone?: string | null
          photo_url?: string | null
          specialties?: string[] | null
          title: string
          twitter_url?: string | null
          updated_at?: string
        }
        Update: {
          availability?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          phone?: string | null
          photo_url?: string | null
          specialties?: string[] | null
          title?: string
          twitter_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      task_scheduling_preferences: {
        Row: {
          auto_schedule_enabled: boolean | null
          break_between_tasks_minutes: number | null
          created_at: string
          focus_time_blocks: Json | null
          id: string
          max_tasks_per_day: number | null
          preferred_task_duration_minutes: number | null
          updated_at: string
          user_id: string
          working_days: number[] | null
          working_hours_end: string | null
          working_hours_start: string | null
        }
        Insert: {
          auto_schedule_enabled?: boolean | null
          break_between_tasks_minutes?: number | null
          created_at?: string
          focus_time_blocks?: Json | null
          id?: string
          max_tasks_per_day?: number | null
          preferred_task_duration_minutes?: number | null
          updated_at?: string
          user_id: string
          working_days?: number[] | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Update: {
          auto_schedule_enabled?: boolean | null
          break_between_tasks_minutes?: number | null
          created_at?: string
          focus_time_blocks?: Json | null
          id?: string
          max_tasks_per_day?: number | null
          preferred_task_duration_minutes?: number | null
          updated_at?: string
          user_id?: string
          working_days?: number[] | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          application_id: string | null
          auto_scheduled: boolean | null
          company_name: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_duration_minutes: number | null
          id: string
          metadata: Json | null
          position: string | null
          priority: string
          scheduled_end: string | null
          scheduled_start: string | null
          status: string
          task_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          auto_scheduled?: boolean | null
          company_name?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          metadata?: Json | null
          position?: string | null
          priority?: string
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: string
          task_type: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          auto_scheduled?: boolean | null
          company_name?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          metadata?: Json | null
          position?: string | null
          priority?: string
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_talent_strategists: {
        Row: {
          availability: string | null
          bio: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          photo_url: string | null
          specialties: string[] | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          availability?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          photo_url?: string | null
          specialties?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          availability?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          photo_url?: string | null
          specialties?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_invite_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      use_invite_code: {
        Args: { _code: string; _user_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

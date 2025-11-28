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
      academies: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          tagline: string | null
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          tagline?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          tagline?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: []
      }
      achievement_analytics: {
        Row: {
          achievement_id: string
          avg_time_to_unlock_hours: number | null
          category_rank: number | null
          created_at: string
          date: string
          fastest_unlock_time_hours: number | null
          id: string
          total_attempts: number | null
          unlock_count: number | null
          updated_at: string
        }
        Insert: {
          achievement_id: string
          avg_time_to_unlock_hours?: number | null
          category_rank?: number | null
          created_at?: string
          date?: string
          fastest_unlock_time_hours?: number | null
          id?: string
          total_attempts?: number | null
          unlock_count?: number | null
          updated_at?: string
        }
        Update: {
          achievement_id?: string
          avg_time_to_unlock_hours?: number | null
          category_rank?: number | null
          created_at?: string
          date?: string
          fastest_unlock_time_hours?: number | null
          id?: string
          total_attempts?: number | null
          unlock_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_analytics_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "quantum_achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      achievement_events: {
        Row: {
          achievement_id: string | null
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          processed: boolean | null
          progress_value: number | null
          user_id: string
        }
        Insert: {
          achievement_id?: string | null
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          processed?: boolean | null
          progress_value?: number | null
          user_id: string
        }
        Update: {
          achievement_id?: string | null
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          processed?: boolean | null
          progress_value?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_events_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "quantum_achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      achievement_progress: {
        Row: {
          achievement_id: string
          id: string
          last_updated: string
          metadata: Json | null
          progress_value: number | null
          target_value: number
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          last_updated?: string
          metadata?: Json | null
          progress_value?: number | null
          target_value: number
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          last_updated?: string
          metadata?: Json | null
          progress_value?: number | null
          target_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_progress_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "quantum_achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      achievement_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          reactor_id: string
          user_achievement_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type: string
          reactor_id: string
          user_achievement_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          reactor_id?: string
          user_achievement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_reactions_user_achievement_id_fkey"
            columns: ["user_achievement_id"]
            isOneToOne: false
            referencedRelation: "user_quantum_achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_feed: {
        Row: {
          company_id: string | null
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          user_id: string | null
          visibility: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          user_id?: string | null
          visibility?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          user_id?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_feed_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_timeline: {
        Row: {
          activity_data: Json | null
          activity_type: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_member_approval_actions: {
        Row: {
          action_data: Json | null
          action_result: string | null
          action_type: string
          approved_by: string
          created_at: string | null
          error_message: string | null
          id: string
          request_id: string
        }
        Insert: {
          action_data?: Json | null
          action_result?: string | null
          action_type: string
          approved_by: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          request_id: string
        }
        Update: {
          action_data?: Json | null
          action_result?: string | null
          action_type?: string
          approved_by?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_member_approval_actions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "admin_member_approval_actions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_member_approval_actions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_member_approval_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "admin_member_approval_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_member_approval_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_action_log: {
        Row: {
          action_data: Json | null
          action_type: string
          created_at: string | null
          error_message: string | null
          id: string
          result: Json | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          result?: Json | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          result?: Json | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_action_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ai_action_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_action_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_content_suggestions: {
        Row: {
          applied: boolean | null
          content: Json
          context: Json | null
          created_at: string | null
          id: string
          suggestion_type: string
          user_id: string
        }
        Insert: {
          applied?: boolean | null
          content: Json
          context?: Json | null
          created_at?: string | null
          id?: string
          suggestion_type: string
          user_id: string
        }
        Update: {
          applied?: boolean | null
          content?: Json
          context?: Json | null
          created_at?: string | null
          id?: string
          suggestion_type?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          context: Json | null
          conversation_type: string
          created_at: string | null
          id: string
          messages: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          context?: Json | null
          conversation_type: string
          created_at?: string | null
          id?: string
          messages?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          context?: Json | null
          conversation_type?: string
          created_at?: string | null
          id?: string
          messages?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_copilot_tips: {
        Row: {
          context_page: string | null
          id: string
          is_dismissed: boolean | null
          shown_at: string | null
          tip_content: string
          tip_type: string
          user_id: string
        }
        Insert: {
          context_page?: string | null
          id?: string
          is_dismissed?: boolean | null
          shown_at?: string | null
          tip_content: string
          tip_type: string
          user_id: string
        }
        Update: {
          context_page?: string | null
          id?: string
          is_dismissed?: boolean | null
          shown_at?: string | null
          tip_content?: string
          tip_type?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_generated_content: {
        Row: {
          content_type: string
          created_at: string | null
          feedback_rating: number | null
          generated_content: string
          id: string
          metadata: Json | null
          prompt: string | null
          used: boolean | null
          user_id: string | null
        }
        Insert: {
          content_type: string
          created_at?: string | null
          feedback_rating?: number | null
          generated_content: string
          id?: string
          metadata?: Json | null
          prompt?: string | null
          used?: boolean | null
          user_id?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string | null
          feedback_rating?: number | null
          generated_content?: string
          id?: string
          metadata?: Json | null
          prompt?: string | null
          used?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_generated_content_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ai_generated_content_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generated_content_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_meeting_suggestions: {
        Row: {
          acted_upon: boolean | null
          created_at: string | null
          duration_minutes: number
          id: string
          participant_ids: string[] | null
          reason: string | null
          suggested_times: Json
          user_id: string
        }
        Insert: {
          acted_upon?: boolean | null
          created_at?: string | null
          duration_minutes: number
          id?: string
          participant_ids?: string[] | null
          reason?: string | null
          suggested_times?: Json
          user_id: string
        }
        Update: {
          acted_upon?: boolean | null
          created_at?: string | null
          duration_minutes?: number
          id?: string
          participant_ids?: string[] | null
          reason?: string | null
          suggested_times?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_meeting_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ai_meeting_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_meeting_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_memory: {
        Row: {
          content: string
          context: Json | null
          created_at: string
          expires_at: string | null
          id: string
          memory_type: string
          relevance_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          context?: Json | null
          created_at?: string
          expires_at?: string | null
          id?: string
          memory_type: string
          relevance_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          context?: Json | null
          created_at?: string
          expires_at?: string | null
          id?: string
          memory_type?: string
          relevance_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_persona_profiles: {
        Row: {
          characteristics: Json
          communication_style: Json | null
          company_id: string | null
          created_at: string
          evaluation_criteria: string[] | null
          id: string
          is_active: boolean | null
          persona_name: string
          persona_type: string
          role_id: string | null
          typical_questions: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          characteristics?: Json
          communication_style?: Json | null
          company_id?: string | null
          created_at?: string
          evaluation_criteria?: string[] | null
          id?: string
          is_active?: boolean | null
          persona_name: string
          persona_type: string
          role_id?: string | null
          typical_questions?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          characteristics?: Json
          communication_style?: Json | null
          company_id?: string | null
          created_at?: string
          evaluation_criteria?: string[] | null
          id?: string
          is_active?: boolean | null
          persona_name?: string
          persona_type?: string
          role_id?: string | null
          typical_questions?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_persona_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_persona_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_persona_profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          ip_address: string
          request_count: number | null
          updated_at: string | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          ip_address: string
          request_count?: number | null
          updated_at?: string | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          ip_address?: string
          request_count?: number | null
          updated_at?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      ai_session_feedback: {
        Row: {
          categories: string[] | null
          conversation_id: string
          created_at: string
          feedback_text: string | null
          feedback_type: string
          id: string
          message_id: string | null
          metadata: Json | null
          rating: number | null
          resolved: boolean | null
          resolved_at: string | null
          user_id: string
        }
        Insert: {
          categories?: string[] | null
          conversation_id: string
          created_at?: string
          feedback_text?: string | null
          feedback_type: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          rating?: number | null
          resolved?: boolean | null
          resolved_at?: string | null
          user_id: string
        }
        Update: {
          categories?: string[] | null
          conversation_id?: string
          created_at?: string
          feedback_text?: string | null
          feedback_type?: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          rating?: number | null
          resolved?: boolean | null
          resolved_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_session_feedback_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_session_scores: {
        Row: {
          actionability_score: number | null
          context_accuracy_score: number | null
          conversation_id: string
          created_at: string
          helpfulness_score: number | null
          id: string
          metadata: Json | null
          outcomes_achieved: string[] | null
          quality_score: number | null
          response_time_ms: number | null
          session_date: string
          tokens_used: number | null
          tools_invoked: string[] | null
          user_id: string
          user_sentiment: string | null
        }
        Insert: {
          actionability_score?: number | null
          context_accuracy_score?: number | null
          conversation_id: string
          created_at?: string
          helpfulness_score?: number | null
          id?: string
          metadata?: Json | null
          outcomes_achieved?: string[] | null
          quality_score?: number | null
          response_time_ms?: number | null
          session_date?: string
          tokens_used?: number | null
          tools_invoked?: string[] | null
          user_id: string
          user_sentiment?: string | null
        }
        Update: {
          actionability_score?: number | null
          context_accuracy_score?: number | null
          conversation_id?: string
          created_at?: string
          helpfulness_score?: number | null
          id?: string
          metadata?: Json | null
          outcomes_achieved?: string[] | null
          quality_score?: number | null
          response_time_ms?: number | null
          session_date?: string
          tokens_used?: number | null
          tools_invoked?: string[] | null
          user_id?: string
          user_sentiment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_session_scores_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_suggestions: {
        Row: {
          acted_upon: boolean | null
          action_data: Json | null
          created_at: string | null
          description: string | null
          dismissed: boolean | null
          expires_at: string | null
          id: string
          priority: string | null
          shown: boolean | null
          suggestion_type: string
          title: string
          user_id: string | null
        }
        Insert: {
          acted_upon?: boolean | null
          action_data?: Json | null
          created_at?: string | null
          description?: string | null
          dismissed?: boolean | null
          expires_at?: string | null
          id?: string
          priority?: string | null
          shown?: boolean | null
          suggestion_type: string
          title: string
          user_id?: string | null
        }
        Update: {
          acted_upon?: boolean | null
          action_data?: Json | null
          created_at?: string | null
          description?: string | null
          dismissed?: boolean | null
          expires_at?: string | null
          id?: string
          priority?: string | null
          shown?: boolean | null
          suggestion_type?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "ai_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          created_at: string
          error_message: string | null
          function_name: string
          id: string
          ip_address: string | null
          rate_limit_hit: boolean | null
          recaptcha_passed: boolean | null
          recaptcha_score: number | null
          request_payload: Json | null
          response_time_ms: number | null
          success: boolean | null
          tokens_used: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          function_name: string
          id?: string
          ip_address?: string | null
          rate_limit_hit?: boolean | null
          recaptcha_passed?: boolean | null
          recaptcha_score?: number | null
          request_payload?: Json | null
          response_time_ms?: number | null
          success?: boolean | null
          tokens_used?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          function_name?: string
          id?: string
          ip_address?: string | null
          rate_limit_hit?: boolean | null
          recaptcha_passed?: boolean | null
          recaptcha_score?: number | null
          request_payload?: Json | null
          response_time_ms?: number | null
          success?: boolean | null
          tokens_used?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_insights: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          insight_content: string
          insight_title: string
          insight_type: string
          is_read: boolean | null
          metadata: Json | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          insight_content: string
          insight_title: string
          insight_type: string
          is_read?: boolean | null
          metadata?: Json | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          insight_content?: string
          insight_title?: string
          insight_type?: string
          is_read?: boolean | null
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          rate_limit_per_hour: number
          scopes: string[]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          rate_limit_per_hour?: number
          scopes?: string[]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          rate_limit_per_hour?: number
          scopes?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limits: {
        Row: {
          api_key_id: string
          created_at: string
          hour_bucket: string
          id: string
          request_count: number
        }
        Insert: {
          api_key_id: string
          created_at?: string
          hour_bucket: string
          id?: string
          request_count?: number
        }
        Update: {
          api_key_id?: string
          created_at?: string
          hour_bucket?: string
          id?: string
          request_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_rate_limits_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_logs: {
        Row: {
          api_key_id: string
          created_at: string
          endpoint: string
          error_message: string | null
          id: string
          ip_address: unknown
          method: string
          response_time_ms: number | null
          status_code: number
          user_agent: string | null
        }
        Insert: {
          api_key_id: string
          created_at?: string
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          method: string
          response_time_ms?: number | null
          status_code: number
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string
          created_at?: string
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          method?: string
          response_time_ms?: number | null
          status_code?: number
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      appearance_presets: {
        Row: {
          category: string
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          is_active: boolean | null
          name: string
          thumbnail_url: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_active?: boolean | null
          name: string
          thumbnail_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          name?: string
          thumbnail_url?: string | null
        }
        Relationships: []
      }
      applications: {
        Row: {
          application_source:
            | Database["public"]["Enums"]["application_source_enum"]
            | null
          applied_at: string
          candidate_company: string | null
          candidate_email: string | null
          candidate_full_name: string | null
          candidate_id: string | null
          candidate_linkedin_url: string | null
          candidate_phone: string | null
          candidate_resume_url: string | null
          candidate_title: string | null
          company_name: string
          created_at: string
          current_stage_index: number
          id: string
          job_id: string
          match_factors: Json | null
          match_score: number | null
          position: string
          source_context: Json | null
          sourced_by: string | null
          stages: Json
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          application_source?:
            | Database["public"]["Enums"]["application_source_enum"]
            | null
          applied_at?: string
          candidate_company?: string | null
          candidate_email?: string | null
          candidate_full_name?: string | null
          candidate_id?: string | null
          candidate_linkedin_url?: string | null
          candidate_phone?: string | null
          candidate_resume_url?: string | null
          candidate_title?: string | null
          company_name: string
          created_at?: string
          current_stage_index?: number
          id?: string
          job_id: string
          match_factors?: Json | null
          match_score?: number | null
          position: string
          source_context?: Json | null
          sourced_by?: string | null
          stages?: Json
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          application_source?:
            | Database["public"]["Enums"]["application_source_enum"]
            | null
          applied_at?: string
          candidate_company?: string | null
          candidate_email?: string | null
          candidate_full_name?: string | null
          candidate_id?: string | null
          candidate_linkedin_url?: string | null
          candidate_phone?: string | null
          candidate_resume_url?: string | null
          candidate_title?: string | null
          company_name?: string
          created_at?: string
          current_stage_index?: number
          id?: string
          job_id?: string
          match_factors?: Json | null
          match_score?: number | null
          position?: string
          source_context?: Json | null
          sourced_by?: string | null
          stages?: Json
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "unified_candidate_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_sourced_by_fkey"
            columns: ["sourced_by"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "applications_sourced_by_fkey"
            columns: ["sourced_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_sourced_by_fkey"
            columns: ["sourced_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_applications_candidate_profiles"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_applications_candidate_profiles"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "fk_applications_candidate_profiles"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "unified_candidate_view"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_notification_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          notification_type: string
          request_type: string
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          notification_type: string
          request_type: string
          sent_at?: string | null
          status: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          notification_type?: string
          request_type?: string
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_notification_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "approval_notification_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_notification_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_analytics: {
        Row: {
          assessment_id: string
          avg_score: number | null
          avg_time_spent: number | null
          completion_rate: number | null
          created_at: string
          date: string
          id: string
          total_attempts: number
          total_completions: number
          updated_at: string
        }
        Insert: {
          assessment_id: string
          avg_score?: number | null
          avg_time_spent?: number | null
          completion_rate?: number | null
          created_at?: string
          date: string
          id?: string
          total_attempts?: number
          total_completions?: number
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          avg_score?: number | null
          avg_time_spent?: number | null
          completion_rate?: number | null
          created_at?: string
          date?: string
          id?: string
          total_attempts?: number
          total_completions?: number
          updated_at?: string
        }
        Relationships: []
      }
      assessment_assignments: {
        Row: {
          assessment_id: string
          assessment_type: string
          assigned_at: string
          assigned_by: string
          assigned_to: string
          company_id: string | null
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          job_id: string | null
          notes: string | null
          reminder_sent_at: string | null
          result_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          assessment_type: string
          assigned_at?: string
          assigned_by: string
          assigned_to: string
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          reminder_sent_at?: string | null
          result_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          assessment_type?: string
          assigned_at?: string
          assigned_by?: string
          assigned_to?: string
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          reminder_sent_at?: string | null
          result_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      assessment_results: {
        Row: {
          assessment_id: string
          assessment_name: string
          assessment_type: string
          assignment_id: string | null
          attempt_number: number | null
          completed_at: string
          created_at: string
          id: string
          is_latest: boolean | null
          results_data: Json
          score: number | null
          time_spent_seconds: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_id: string
          assessment_name: string
          assessment_type: string
          assignment_id?: string | null
          attempt_number?: number | null
          completed_at?: string
          created_at?: string
          id?: string
          is_latest?: boolean | null
          results_data?: Json
          score?: number | null
          time_spent_seconds?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_id?: string
          assessment_name?: string
          assessment_type?: string
          assignment_id?: string | null
          attempt_number?: number | null
          completed_at?: string
          created_at?: string
          id?: string
          is_latest?: boolean | null
          results_data?: Json
          score?: number | null
          time_spent_seconds?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_results_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assessment_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_templates: {
        Row: {
          category: string
          configuration: Json
          created_at: string
          created_by: string
          description: string | null
          estimated_time: number
          icon: string | null
          id: string
          is_active: boolean
          is_public: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          configuration?: Json
          created_at?: string
          created_by: string
          description?: string | null
          estimated_time?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          configuration?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          estimated_time?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          actor_role: string | null
          created_at: string | null
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          result: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          result?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          result?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_request_notifications: {
        Row: {
          audit_request_id: string | null
          id: string
          notification_type: string
          read_at: string | null
          recipient_email: string
          recipient_id: string | null
          sent_at: string | null
        }
        Insert: {
          audit_request_id?: string | null
          id?: string
          notification_type: string
          read_at?: string | null
          recipient_email: string
          recipient_id?: string | null
          sent_at?: string | null
        }
        Update: {
          audit_request_id?: string | null
          id?: string
          notification_type?: string
          read_at?: string | null
          recipient_email?: string
          recipient_id?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_request_notifications_audit_request_id_fkey"
            columns: ["audit_request_id"]
            isOneToOne: false
            referencedRelation: "audit_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_request_responses: {
        Row: {
          audit_request_id: string | null
          created_at: string | null
          document_name: string | null
          document_url: string | null
          id: string
          responded_by: string | null
          response_content: string | null
          response_type: string
        }
        Insert: {
          audit_request_id?: string | null
          created_at?: string | null
          document_name?: string | null
          document_url?: string | null
          id?: string
          responded_by?: string | null
          response_content?: string | null
          response_type: string
        }
        Update: {
          audit_request_id?: string | null
          created_at?: string | null
          document_name?: string | null
          document_url?: string | null
          id?: string
          responded_by?: string | null
          response_content?: string | null
          response_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_request_responses_audit_request_id_fkey"
            columns: ["audit_request_id"]
            isOneToOne: false
            referencedRelation: "audit_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_requests: {
        Row: {
          assigned_to: string | null
          audit_purpose: string
          audit_scope: string
          audit_type: string
          company_id: string | null
          created_at: string | null
          due_date: string | null
          id: string
          metadata: Json | null
          priority: string | null
          request_number: string
          requested_documents: string[] | null
          requester_email: string
          requester_id: string | null
          requester_name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          audit_purpose: string
          audit_scope: string
          audit_type: string
          company_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          request_number: string
          requested_documents?: string[] | null
          requester_email: string
          requester_id?: string | null
          requester_name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          audit_purpose?: string
          audit_scope?: string
          audit_type?: string
          company_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          request_number?: string
          requested_documents?: string[] | null
          requester_email?: string
          requester_id?: string | null
          requester_name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_policies: {
        Row: {
          created_at: string | null
          criticality: string
          id: string
          is_immutable: boolean | null
          last_backup_at: string | null
          metadata: Json | null
          replication_frequency: unknown
          retention_days: number
          table_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          criticality: string
          id?: string
          is_immutable?: boolean | null
          last_backup_at?: string | null
          metadata?: Json | null
          replication_frequency: unknown
          retention_days: number
          table_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          criticality?: string
          id?: string
          is_immutable?: boolean | null
          last_backup_at?: string | null
          metadata?: Json | null
          replication_frequency?: unknown
          retention_days?: number
          table_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      backup_verification_logs: {
        Row: {
          backup_id: string
          created_at: string | null
          id: string
          issues: Json | null
          tables_verified: number
          timestamp: string
          total_tables: number
          verification_duration_ms: number
          verification_status: string
        }
        Insert: {
          backup_id: string
          created_at?: string | null
          id?: string
          issues?: Json | null
          tables_verified: number
          timestamp?: string
          total_tables: number
          verification_duration_ms: number
          verification_status: string
        }
        Update: {
          backup_id?: string
          created_at?: string | null
          id?: string
          issues?: Json | null
          tables_verified?: number
          timestamp?: string
          total_tables?: number
          verification_duration_ms?: number
          verification_status?: string
        }
        Relationships: []
      }
      blind_spot_sessions: {
        Row: {
          awareness_gaps: Json | null
          coachability_indicator: number | null
          completed_at: string | null
          hidden_strengths: string[] | null
          id: string
          objective_scores: Json | null
          overall_self_awareness_score: number | null
          scenario_responses: Json
          self_ratings: Json
          started_at: string | null
          top_blind_spots: string[] | null
          user_id: string
        }
        Insert: {
          awareness_gaps?: Json | null
          coachability_indicator?: number | null
          completed_at?: string | null
          hidden_strengths?: string[] | null
          id?: string
          objective_scores?: Json | null
          overall_self_awareness_score?: number | null
          scenario_responses: Json
          self_ratings: Json
          started_at?: string | null
          top_blind_spots?: string[] | null
          user_id: string
        }
        Update: {
          awareness_gaps?: Json | null
          coachability_indicator?: number | null
          completed_at?: string | null
          hidden_strengths?: string[] | null
          id?: string
          objective_scores?: Json | null
          overall_self_awareness_score?: number | null
          scenario_responses?: Json
          self_ratings?: Json
          started_at?: string | null
          top_blind_spots?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      blocked_domains: {
        Row: {
          company_name: string
          created_at: string
          domain: string
          id: string
          reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name: string
          created_at?: string
          domain: string
          id?: string
          reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string
          created_at?: string
          domain?: string
          id?: string
          reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      booking_analytics: {
        Row: {
          avg_booking_time_minutes: number | null
          booking_link_id: string
          bookings_cancelled: number | null
          bookings_completed: number | null
          bookings_created: number | null
          conversion_rate: number | null
          created_at: string | null
          date: string
          id: string
          no_shows: number | null
          updated_at: string | null
          views: number | null
        }
        Insert: {
          avg_booking_time_minutes?: number | null
          booking_link_id: string
          bookings_cancelled?: number | null
          bookings_completed?: number | null
          bookings_created?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          date?: string
          id?: string
          no_shows?: number | null
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          avg_booking_time_minutes?: number | null
          booking_link_id?: string
          bookings_cancelled?: number | null
          bookings_completed?: number | null
          bookings_created?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          date?: string
          id?: string
          no_shows?: number | null
          updated_at?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_analytics_booking_link_id_fkey"
            columns: ["booking_link_id"]
            isOneToOne: false
            referencedRelation: "booking_links"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_availability_settings: {
        Row: {
          auto_detect_timezone: boolean
          auto_generate_links: boolean
          check_all_calendars: boolean
          created_at: string
          custom_welcome_message: string | null
          default_advance_booking_days: number
          default_available_days: number[]
          default_buffer_after: number
          default_buffer_before: number
          default_color: string
          default_end_time: string
          default_min_notice_hours: number
          default_start_time: string
          default_timezone: string
          default_video_provider: string | null
          id: string
          include_dial_in: boolean
          notify_on_booking: boolean
          primary_calendar_id: string | null
          reminder_minutes_before: number
          send_calendar_invites: boolean
          send_reminders: boolean
          show_profile_picture: boolean
          time_slot_interval: number
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_detect_timezone?: boolean
          auto_generate_links?: boolean
          check_all_calendars?: boolean
          created_at?: string
          custom_welcome_message?: string | null
          default_advance_booking_days?: number
          default_available_days?: number[]
          default_buffer_after?: number
          default_buffer_before?: number
          default_color?: string
          default_end_time?: string
          default_min_notice_hours?: number
          default_start_time?: string
          default_timezone?: string
          default_video_provider?: string | null
          id?: string
          include_dial_in?: boolean
          notify_on_booking?: boolean
          primary_calendar_id?: string | null
          reminder_minutes_before?: number
          send_calendar_invites?: boolean
          send_reminders?: boolean
          show_profile_picture?: boolean
          time_slot_interval?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_detect_timezone?: boolean
          auto_generate_links?: boolean
          check_all_calendars?: boolean
          created_at?: string
          custom_welcome_message?: string | null
          default_advance_booking_days?: number
          default_available_days?: number[]
          default_buffer_after?: number
          default_buffer_before?: number
          default_color?: string
          default_end_time?: string
          default_min_notice_hours?: number
          default_start_time?: string
          default_timezone?: string
          default_video_provider?: string | null
          id?: string
          include_dial_in?: boolean
          notify_on_booking?: boolean
          primary_calendar_id?: string | null
          reminder_minutes_before?: number
          send_calendar_invites?: boolean
          send_reminders?: boolean
          show_profile_picture?: boolean
          time_slot_interval?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_availability_settings_primary_calendar_id_fkey"
            columns: ["primary_calendar_id"]
            isOneToOne: false
            referencedRelation: "calendar_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_calendar_check_failures: {
        Row: {
          booking_id: string | null
          bypassed: boolean | null
          created_at: string | null
          error_message: string | null
          id: string
          provider: string
          timeout: boolean | null
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          bypassed?: boolean | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          provider: string
          timeout?: boolean | null
          user_id: string
        }
        Update: {
          booking_id?: string | null
          bypassed?: boolean | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          provider?: string
          timeout?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_calendar_check_failures_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_calendar_syncs: {
        Row: {
          booking_id: string
          calendar_event_id: string
          calendar_provider: string
          id: string
          last_updated: string | null
          sync_status: string | null
          synced_at: string | null
        }
        Insert: {
          booking_id: string
          calendar_event_id: string
          calendar_provider: string
          id?: string
          last_updated?: string | null
          sync_status?: string | null
          synced_at?: string | null
        }
        Update: {
          booking_id?: string
          calendar_event_id?: string
          calendar_provider?: string
          id?: string
          last_updated?: string | null
          sync_status?: string | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_calendar_syncs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_funnel_analytics: {
        Row: {
          booking_link_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          referrer: string | null
          session_id: string
          step: string
          step_duration_seconds: number | null
          timezone: string | null
          user_agent: string | null
        }
        Insert: {
          booking_link_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          referrer?: string | null
          session_id: string
          step: string
          step_duration_seconds?: number | null
          timezone?: string | null
          user_agent?: string | null
        }
        Update: {
          booking_link_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          referrer?: string | null
          session_id?: string
          step?: string
          step_duration_seconds?: number | null
          timezone?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_funnel_analytics_booking_link_id_fkey"
            columns: ["booking_link_id"]
            isOneToOne: false
            referencedRelation: "booking_links"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_links: {
        Row: {
          advance_booking_days: number | null
          allow_guest_platform_choice: boolean | null
          allow_waitlist: boolean | null
          auto_generate_meeting_link: boolean | null
          auto_record: boolean | null
          available_platforms: string[] | null
          buffer_after_minutes: number | null
          buffer_before_minutes: number | null
          color: string | null
          confirmation_message: string | null
          create_quantum_meeting: boolean | null
          created_at: string
          custom_questions: Json | null
          description: string | null
          duration_minutes: number
          enable_club_ai: boolean | null
          expires_at: string | null
          google_meet_settings: Json | null
          id: string
          is_active: boolean
          max_bookings_per_day: number | null
          max_uses: number | null
          min_notice_hours: number | null
          preferred_video_provider: string | null
          primary_calendar_id: string | null
          redirect_url: string | null
          requires_approval: boolean | null
          routing_rules: Json | null
          scheduling_type: string | null
          share_recording_with_guest: boolean | null
          single_use: boolean | null
          slug: string
          team_members: string[] | null
          title: string
          updated_at: string
          use_count: number | null
          user_id: string
          video_conferencing_provider: string | null
          video_platform: string | null
        }
        Insert: {
          advance_booking_days?: number | null
          allow_guest_platform_choice?: boolean | null
          allow_waitlist?: boolean | null
          auto_generate_meeting_link?: boolean | null
          auto_record?: boolean | null
          available_platforms?: string[] | null
          buffer_after_minutes?: number | null
          buffer_before_minutes?: number | null
          color?: string | null
          confirmation_message?: string | null
          create_quantum_meeting?: boolean | null
          created_at?: string
          custom_questions?: Json | null
          description?: string | null
          duration_minutes?: number
          enable_club_ai?: boolean | null
          expires_at?: string | null
          google_meet_settings?: Json | null
          id?: string
          is_active?: boolean
          max_bookings_per_day?: number | null
          max_uses?: number | null
          min_notice_hours?: number | null
          preferred_video_provider?: string | null
          primary_calendar_id?: string | null
          redirect_url?: string | null
          requires_approval?: boolean | null
          routing_rules?: Json | null
          scheduling_type?: string | null
          share_recording_with_guest?: boolean | null
          single_use?: boolean | null
          slug: string
          team_members?: string[] | null
          title: string
          updated_at?: string
          use_count?: number | null
          user_id: string
          video_conferencing_provider?: string | null
          video_platform?: string | null
        }
        Update: {
          advance_booking_days?: number | null
          allow_guest_platform_choice?: boolean | null
          allow_waitlist?: boolean | null
          auto_generate_meeting_link?: boolean | null
          auto_record?: boolean | null
          available_platforms?: string[] | null
          buffer_after_minutes?: number | null
          buffer_before_minutes?: number | null
          color?: string | null
          confirmation_message?: string | null
          create_quantum_meeting?: boolean | null
          created_at?: string
          custom_questions?: Json | null
          description?: string | null
          duration_minutes?: number
          enable_club_ai?: boolean | null
          expires_at?: string | null
          google_meet_settings?: Json | null
          id?: string
          is_active?: boolean
          max_bookings_per_day?: number | null
          max_uses?: number | null
          min_notice_hours?: number | null
          preferred_video_provider?: string | null
          primary_calendar_id?: string | null
          redirect_url?: string | null
          requires_approval?: boolean | null
          routing_rules?: Json | null
          scheduling_type?: string | null
          share_recording_with_guest?: boolean | null
          single_use?: boolean | null
          slug?: string
          team_members?: string[] | null
          title?: string
          updated_at?: string
          use_count?: number | null
          user_id?: string
          video_conferencing_provider?: string | null
          video_platform?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_links_primary_calendar_id_fkey"
            columns: ["primary_calendar_id"]
            isOneToOne: false
            referencedRelation: "calendar_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_reminders: {
        Row: {
          booking_id: string
          created_at: string | null
          error_message: string | null
          id: string
          reminder_type: string
          scheduled_for: string
          send_before_minutes: number | null
          sent_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          reminder_type: string
          scheduled_for: string
          send_before_minutes?: number | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          reminder_type?: string
          scheduled_for?: string
          send_before_minutes?: number | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_reminders_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_slot_analytics: {
        Row: {
          booking_link_id: string | null
          bookings_count: number | null
          conversion_rate: number | null
          created_at: string | null
          date: string
          day_of_week: number
          hour: number
          id: string
          timezone: string
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          booking_link_id?: string | null
          bookings_count?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          date: string
          day_of_week: number
          hour: number
          id?: string
          timezone: string
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          booking_link_id?: string | null
          bookings_count?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          date?: string
          day_of_week?: number
          hour?: number
          id?: string
          timezone?: string
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_slot_analytics_booking_link_id_fkey"
            columns: ["booking_link_id"]
            isOneToOne: false
            referencedRelation: "booking_links"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_waitlist: {
        Row: {
          booking_link_id: string
          created_at: string | null
          guest_email: string
          guest_name: string
          guest_phone: string | null
          id: string
          notes: string | null
          notified: boolean | null
          notified_at: string | null
          preferred_dates: Json
          preferred_time_range: string | null
        }
        Insert: {
          booking_link_id: string
          created_at?: string | null
          guest_email: string
          guest_name: string
          guest_phone?: string | null
          id?: string
          notes?: string | null
          notified?: boolean | null
          notified_at?: string | null
          preferred_dates?: Json
          preferred_time_range?: string | null
        }
        Update: {
          booking_link_id?: string
          created_at?: string | null
          guest_email?: string
          guest_name?: string
          guest_phone?: string | null
          id?: string
          notes?: string | null
          notified?: boolean | null
          notified_at?: string | null
          preferred_dates?: Json
          preferred_time_range?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_waitlist_booking_link_id_fkey"
            columns: ["booking_link_id"]
            isOneToOne: false
            referencedRelation: "booking_links"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_workflows: {
        Row: {
          booking_link_id: string
          created_at: string | null
          email_template: string | null
          id: string
          is_active: boolean | null
          sms_template: string | null
          trigger_minutes: number | null
          updated_at: string | null
          workflow_type: string
        }
        Insert: {
          booking_link_id: string
          created_at?: string | null
          email_template?: string | null
          id?: string
          is_active?: boolean | null
          sms_template?: string | null
          trigger_minutes?: number | null
          updated_at?: string | null
          workflow_type: string
        }
        Update: {
          booking_link_id?: string
          created_at?: string | null
          email_template?: string | null
          id?: string
          is_active?: boolean | null
          sms_template?: string | null
          trigger_minutes?: number | null
          updated_at?: string | null
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_workflows_booking_link_id_fkey"
            columns: ["booking_link_id"]
            isOneToOne: false
            referencedRelation: "booking_links"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          active_video_platform: string | null
          application_id: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          assigned_team_member: string | null
          attended: boolean | null
          booking_link_id: string
          calendar_event_id: string | null
          calendar_provider: string | null
          calendar_sync_status: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          candidate_id: string | null
          created_at: string
          custom_answers: Json | null
          custom_responses: Json | null
          enable_recording: boolean | null
          feedback_submitted_at: string | null
          google_meet_event_id: string | null
          google_meet_hangout_link: string | null
          guest_email: string
          guest_name: string
          guest_phone: string | null
          guest_selected_platform: string | null
          guests: Json | null
          id: string
          interview_prep_sent_at: string | null
          interview_stage_index: number | null
          interview_type: string | null
          interviewer_ids: string[] | null
          is_interview_booking: boolean | null
          job_id: string | null
          last_sync_attempt: string | null
          meeting_id: string | null
          metadata: Json | null
          no_show: boolean | null
          notes: string | null
          quantum_meeting_code: string | null
          quantum_meeting_link: string | null
          reminder_sent: boolean | null
          scheduled_end: string
          scheduled_start: string
          status: string
          sync_error_message: string | null
          synced_to_calendar: boolean | null
          timezone: string
          updated_at: string
          user_id: string
          video_meeting_id: string | null
          video_meeting_link: string | null
          video_meeting_password: string | null
        }
        Insert: {
          active_video_platform?: string | null
          application_id?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_team_member?: string | null
          attended?: boolean | null
          booking_link_id: string
          calendar_event_id?: string | null
          calendar_provider?: string | null
          calendar_sync_status?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          candidate_id?: string | null
          created_at?: string
          custom_answers?: Json | null
          custom_responses?: Json | null
          enable_recording?: boolean | null
          feedback_submitted_at?: string | null
          google_meet_event_id?: string | null
          google_meet_hangout_link?: string | null
          guest_email: string
          guest_name: string
          guest_phone?: string | null
          guest_selected_platform?: string | null
          guests?: Json | null
          id?: string
          interview_prep_sent_at?: string | null
          interview_stage_index?: number | null
          interview_type?: string | null
          interviewer_ids?: string[] | null
          is_interview_booking?: boolean | null
          job_id?: string | null
          last_sync_attempt?: string | null
          meeting_id?: string | null
          metadata?: Json | null
          no_show?: boolean | null
          notes?: string | null
          quantum_meeting_code?: string | null
          quantum_meeting_link?: string | null
          reminder_sent?: boolean | null
          scheduled_end: string
          scheduled_start: string
          status?: string
          sync_error_message?: string | null
          synced_to_calendar?: boolean | null
          timezone: string
          updated_at?: string
          user_id: string
          video_meeting_id?: string | null
          video_meeting_link?: string | null
          video_meeting_password?: string | null
        }
        Update: {
          active_video_platform?: string | null
          application_id?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_team_member?: string | null
          attended?: boolean | null
          booking_link_id?: string
          calendar_event_id?: string | null
          calendar_provider?: string | null
          calendar_sync_status?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          candidate_id?: string | null
          created_at?: string
          custom_answers?: Json | null
          custom_responses?: Json | null
          enable_recording?: boolean | null
          feedback_submitted_at?: string | null
          google_meet_event_id?: string | null
          google_meet_hangout_link?: string | null
          guest_email?: string
          guest_name?: string
          guest_phone?: string | null
          guest_selected_platform?: string | null
          guests?: Json | null
          id?: string
          interview_prep_sent_at?: string | null
          interview_stage_index?: number | null
          interview_type?: string | null
          interviewer_ids?: string[] | null
          is_interview_booking?: boolean | null
          job_id?: string | null
          last_sync_attempt?: string | null
          meeting_id?: string | null
          metadata?: Json | null
          no_show?: boolean | null
          notes?: string | null
          quantum_meeting_code?: string | null
          quantum_meeting_link?: string | null
          reminder_sent?: boolean | null
          scheduled_end?: string
          scheduled_start?: string
          status?: string
          sync_error_message?: string | null
          synced_to_calendar?: boolean | null
          timezone?: string
          updated_at?: string
          user_id?: string
          video_meeting_id?: string | null
          video_meeting_link?: string | null
          video_meeting_password?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications_with_deleted_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_booking_link_id_fkey"
            columns: ["booking_link_id"]
            isOneToOne: false
            referencedRelation: "booking_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "bookings_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "unified_candidate_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_connections: {
        Row: {
          access_token: string
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          label: string
          provider: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          label: string
          provider: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          label?: string
          provider?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      calendar_sync_log: {
        Row: {
          action: string
          booking_id: string
          calendar_event_id: string | null
          created_at: string
          error_message: string | null
          id: string
          provider: string
          success: boolean
        }
        Insert: {
          action: string
          booking_id: string
          calendar_event_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          provider: string
          success: boolean
        }
        Update: {
          action?: string
          booking_id?: string
          calendar_event_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          provider?: string
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_log_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      call_invitations: {
        Row: {
          call_type: string
          caller_id: string
          conversation_id: string
          created_at: string | null
          id: string
          responded_at: string | null
          session_id: string | null
          status: string
        }
        Insert: {
          call_type: string
          caller_id: string
          conversation_id: string
          created_at?: string | null
          id?: string
          responded_at?: string | null
          session_id?: string | null
          status?: string
        }
        Update: {
          call_type?: string
          caller_id?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          responded_at?: string | null
          session_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_invitations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_invitations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "video_call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_application_logs: {
        Row: {
          action: string
          actor_id: string | null
          candidate_profile_id: string
          created_at: string | null
          details: Json | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          candidate_profile_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          candidate_profile_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_application_logs_candidate_profile_id_fkey"
            columns: ["candidate_profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_application_logs_candidate_profile_id_fkey"
            columns: ["candidate_profile_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "candidate_application_logs_candidate_profile_id_fkey"
            columns: ["candidate_profile_id"]
            isOneToOne: false
            referencedRelation: "unified_candidate_view"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_assessment_profiles: {
        Row: {
          assessments_completed: number | null
          coachability_score: number | null
          communication_style: string | null
          culture_fit_scores: Json | null
          dimension_scores: Json | null
          hidden_strengths: string[] | null
          last_updated: string | null
          multitasking_ability: number | null
          prioritization_skill: number | null
          self_awareness_score: number | null
          stress_resilience: number | null
          top_blind_spots: string[] | null
          top_values: string[] | null
          user_id: string
          value_archetype: string | null
          value_consistency_score: number | null
        }
        Insert: {
          assessments_completed?: number | null
          coachability_score?: number | null
          communication_style?: string | null
          culture_fit_scores?: Json | null
          dimension_scores?: Json | null
          hidden_strengths?: string[] | null
          last_updated?: string | null
          multitasking_ability?: number | null
          prioritization_skill?: number | null
          self_awareness_score?: number | null
          stress_resilience?: number | null
          top_blind_spots?: string[] | null
          top_values?: string[] | null
          user_id: string
          value_archetype?: string | null
          value_consistency_score?: number | null
        }
        Update: {
          assessments_completed?: number | null
          coachability_score?: number | null
          communication_style?: string | null
          culture_fit_scores?: Json | null
          dimension_scores?: Json | null
          hidden_strengths?: string[] | null
          last_updated?: string | null
          multitasking_ability?: number | null
          prioritization_skill?: number | null
          self_awareness_score?: number | null
          stress_resilience?: number | null
          top_blind_spots?: string[] | null
          top_values?: string[] | null
          user_id?: string
          value_archetype?: string | null
          value_consistency_score?: number | null
        }
        Relationships: []
      }
      candidate_comments: {
        Row: {
          application_id: string
          comment: string
          created_at: string
          id: string
          is_internal: boolean | null
          mentioned_users: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id: string
          comment: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          mentioned_users?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string
          comment?: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          mentioned_users?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      candidate_documents: {
        Row: {
          archived: boolean | null
          archived_at: string | null
          candidate_id: string
          created_at: string | null
          document_type: string
          expiry_date: string | null
          file_name: string
          file_size_kb: number | null
          file_url: string
          id: string
          is_verified: boolean | null
          metadata: Json | null
          mime_type: string | null
          parsing_results: Json | null
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          uploaded_by_role: string | null
          verification_notes: string | null
          version_number: number | null
          visible_to_candidate: boolean | null
        }
        Insert: {
          archived?: boolean | null
          archived_at?: string | null
          candidate_id: string
          created_at?: string | null
          document_type: string
          expiry_date?: string | null
          file_name: string
          file_size_kb?: number | null
          file_url: string
          id?: string
          is_verified?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          parsing_results?: Json | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          uploaded_by_role?: string | null
          verification_notes?: string | null
          version_number?: number | null
          visible_to_candidate?: boolean | null
        }
        Update: {
          archived?: boolean | null
          archived_at?: string | null
          candidate_id?: string
          created_at?: string | null
          document_type?: string
          expiry_date?: string | null
          file_name?: string
          file_size_kb?: number | null
          file_url?: string
          id?: string
          is_verified?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          parsing_results?: Json | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          uploaded_by_role?: string | null
          verification_notes?: string | null
          version_number?: number | null
          visible_to_candidate?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_documents_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_documents_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "candidate_documents_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "unified_candidate_view"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_interactions: {
        Row: {
          ai_action_items: Json | null
          ai_key_points: Json | null
          ai_sentiment: string | null
          application_id: string | null
          candidate_id: string
          completed_at: string | null
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          interaction_direction: string | null
          interaction_type: string
          is_internal: boolean | null
          metadata: Json | null
          participants: Json | null
          scheduled_at: string | null
          summary: string | null
          tags: Json | null
          title: string | null
          updated_at: string
          visible_to_candidate: boolean | null
        }
        Insert: {
          ai_action_items?: Json | null
          ai_key_points?: Json | null
          ai_sentiment?: string | null
          application_id?: string | null
          candidate_id: string
          completed_at?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          interaction_direction?: string | null
          interaction_type: string
          is_internal?: boolean | null
          metadata?: Json | null
          participants?: Json | null
          scheduled_at?: string | null
          summary?: string | null
          tags?: Json | null
          title?: string | null
          updated_at?: string
          visible_to_candidate?: boolean | null
        }
        Update: {
          ai_action_items?: Json | null
          ai_key_points?: Json | null
          ai_sentiment?: string | null
          application_id?: string | null
          candidate_id?: string
          completed_at?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          interaction_direction?: string | null
          interaction_type?: string
          is_internal?: boolean | null
          metadata?: Json | null
          participants?: Json | null
          scheduled_at?: string | null
          summary?: string | null
          tags?: Json | null
          title?: string | null
          updated_at?: string
          visible_to_candidate?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_interactions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_interactions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications_with_deleted_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_interactions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_interactions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "candidate_interactions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "unified_candidate_view"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_interview_performance: {
        Row: {
          answer_quality: Json | null
          application_id: string | null
          areas_for_improvement: string[] | null
          candidate_id: string | null
          coaching_suggestions: string[] | null
          communication_clarity_score: number | null
          communication_conciseness_score: number | null
          communication_confidence_score: number | null
          created_at: string | null
          cultural_fit_score: number | null
          green_flags: string[] | null
          hiring_recommendation: string | null
          id: string
          key_strengths: string[] | null
          meeting_id: string | null
          overall_impression: string | null
          red_flags: string[] | null
          technical_competence_score: number | null
          updated_at: string | null
        }
        Insert: {
          answer_quality?: Json | null
          application_id?: string | null
          areas_for_improvement?: string[] | null
          candidate_id?: string | null
          coaching_suggestions?: string[] | null
          communication_clarity_score?: number | null
          communication_conciseness_score?: number | null
          communication_confidence_score?: number | null
          created_at?: string | null
          cultural_fit_score?: number | null
          green_flags?: string[] | null
          hiring_recommendation?: string | null
          id?: string
          key_strengths?: string[] | null
          meeting_id?: string | null
          overall_impression?: string | null
          red_flags?: string[] | null
          technical_competence_score?: number | null
          updated_at?: string | null
        }
        Update: {
          answer_quality?: Json | null
          application_id?: string | null
          areas_for_improvement?: string[] | null
          candidate_id?: string | null
          coaching_suggestions?: string[] | null
          communication_clarity_score?: number | null
          communication_conciseness_score?: number | null
          communication_confidence_score?: number | null
          created_at?: string | null
          cultural_fit_score?: number | null
          green_flags?: string[] | null
          hiring_recommendation?: string | null
          id?: string
          key_strengths?: string[] | null
          meeting_id?: string | null
          overall_impression?: string | null
          red_flags?: string[] | null
          technical_competence_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_interview_performance_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_interview_performance_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications_with_deleted_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_interview_performance_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_interview_performance_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "candidate_interview_performance_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "unified_candidate_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_interview_performance_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_invitations: {
        Row: {
          accepted_at: string | null
          candidate_id: string
          created_at: string | null
          created_user_id: string | null
          email: string
          expires_at: string
          id: string
          invitation_token: string
          invited_by: string
          job_context: Json | null
          message_template: string | null
          metadata: Json | null
          sent_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          candidate_id: string
          created_at?: string | null
          created_user_id?: string | null
          email: string
          expires_at: string
          id?: string
          invitation_token: string
          invited_by: string
          job_context?: Json | null
          message_template?: string | null
          metadata?: Json | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          candidate_id?: string
          created_at?: string | null
          created_user_id?: string | null
          email?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by?: string
          job_context?: Json | null
          message_template?: string | null
          metadata?: Json | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_invitations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_invitations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "candidate_invitations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "unified_candidate_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "candidate_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_merge_log: {
        Row: {
          candidate_id: string | null
          completed_at: string | null
          confidence_score: number | null
          created_at: string | null
          error_message: string | null
          id: string
          match_type: string | null
          merge_status: string
          merge_type: string
          merged_by: string | null
          merged_fields: Json | null
          profile_id: string | null
        }
        Insert: {
          candidate_id?: string | null
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          match_type?: string | null
          merge_status?: string
          merge_type: string
          merged_by?: string | null
          merged_fields?: Json | null
          profile_id?: string | null
        }
        Update: {
          candidate_id?: string | null
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          match_type?: string | null
          merge_status?: string
          merge_type?: string
          merged_by?: string | null
          merged_fields?: Json | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_merge_log_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_merge_log_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "candidate_merge_log_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "unified_candidate_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_merge_log_merged_by_fkey"
            columns: ["merged_by"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "candidate_merge_log_merged_by_fkey"
            columns: ["merged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_merge_log_merged_by_fkey"
            columns: ["merged_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_merge_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "candidate_merge_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_merge_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_notes: {
        Row: {
          candidate_id: string
          content: string
          created_at: string | null
          created_by: string
          id: string
          metadata: Json | null
          note_type: string
          pinned: boolean | null
          related_job_id: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          candidate_id: string
          content: string
          created_at?: string | null
          created_by: string
          id?: string
          metadata?: Json | null
          note_type: string
          pinned?: boolean | null
          related_job_id?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          candidate_id?: string
          content?: string
          created_at?: string | null
          created_by?: string
          id?: string
          metadata?: Json | null
          note_type?: string
          pinned?: boolean | null
          related_job_id?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_notes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_notes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "candidate_notes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "unified_candidate_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "candidate_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_notes_related_job_id_fkey"
            columns: ["related_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_profile_audit: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          bulk_action_id: string | null
          candidate_id: string
          changed_fields: string[] | null
          id: string
          ip_address: unknown
          is_bulk_action: boolean | null
          metadata: Json | null
          performed_at: string
          performed_by: string
          reason: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          bulk_action_id?: string | null
          candidate_id: string
          changed_fields?: string[] | null
          id?: string
          ip_address?: unknown
          is_bulk_action?: boolean | null
          metadata?: Json | null
          performed_at?: string
          performed_by: string
          reason?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          bulk_action_id?: string | null
          candidate_id?: string
          changed_fields?: string[] | null
          id?: string
          ip_address?: unknown
          is_bulk_action?: boolean | null
          metadata?: Json | null
          performed_at?: string
          performed_by?: string
          reason?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_profile_audit_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "candidate_profile_audit_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_profile_audit_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_profile_views: {
        Row: {
          candidate_id: string
          duration_seconds: number | null
          id: string
          job_id: string | null
          sections_viewed: Json | null
          session_id: string | null
          view_context: string | null
          view_source: string | null
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          candidate_id: string
          duration_seconds?: number | null
          id?: string
          job_id?: string | null
          sections_viewed?: Json | null
          session_id?: string | null
          view_context?: string | null
          view_source?: string | null
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          candidate_id?: string
          duration_seconds?: number | null
          id?: string
          job_id?: string | null
          sections_viewed?: Json | null
          session_id?: string | null
          view_context?: string | null
          view_source?: string | null
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_profile_views_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_profile_views_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "candidate_profile_views_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "unified_candidate_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_profile_views_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_profiles: {
        Row: {
          actively_looking: boolean | null
          admin_notes: string | null
          ai_concerns: Json | null
          ai_strengths: Json | null
          ai_summary: string | null
          application_status: string | null
          assigned_strategist_id: string | null
          available_hours_per_week: number | null
          avatar_url: string | null
          blocked_companies: Json | null
          certifications: Json | null
          company_size_preference: string | null
          created_at: string
          created_by: string | null
          current_company: string | null
          current_salary_max: number | null
          current_salary_min: number | null
          current_title: string | null
          cv_parsed_at: string | null
          data_retention_date: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_metadata: Json | null
          deletion_reason: string | null
          deletion_type: string | null
          desired_locations: Json | null
          desired_salary_max: number | null
          desired_salary_min: number | null
          education: Json | null
          email: string | null
          embedding_generated_at: string | null
          engagement_score: number | null
          enrichment_data: Json | null
          enrichment_last_run: string | null
          fit_score: number | null
          full_name: string
          gdpr_consent: boolean | null
          gdpr_consent_date: string | null
          ghost_mode_enabled: boolean | null
          github_url: string | null
          header_media_type: string | null
          header_media_url: string | null
          id: string
          industry_preference: string | null
          internal_rating: number | null
          invitation_status: string | null
          job_alert_frequency: string | null
          languages: Json | null
          last_activity_at: string | null
          last_invite_sent_at: string | null
          last_profile_update: string | null
          linkedin_profile_data: Json | null
          linkedin_url: string | null
          merged_at: string | null
          merged_from_user_id: string | null
          notice_period: string | null
          personality_insights: Json | null
          phone: string | null
          portfolio_url: string | null
          preferred_currency: string | null
          preferred_language: string | null
          profile_completeness: number | null
          profile_embedding: string | null
          public_fields: Json | null
          rejection_reason: string | null
          remote_preference: string | null
          remote_work_aspiration: boolean | null
          resume_filename: string | null
          resume_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          salary_preference_hidden: boolean | null
          skills: Json | null
          source_channel: string | null
          source_metadata: Json | null
          tags: Json | null
          updated_at: string
          user_id: string | null
          work_authorization: Json | null
          work_history: Json | null
          years_of_experience: number | null
        }
        Insert: {
          actively_looking?: boolean | null
          admin_notes?: string | null
          ai_concerns?: Json | null
          ai_strengths?: Json | null
          ai_summary?: string | null
          application_status?: string | null
          assigned_strategist_id?: string | null
          available_hours_per_week?: number | null
          avatar_url?: string | null
          blocked_companies?: Json | null
          certifications?: Json | null
          company_size_preference?: string | null
          created_at?: string
          created_by?: string | null
          current_company?: string | null
          current_salary_max?: number | null
          current_salary_min?: number | null
          current_title?: string | null
          cv_parsed_at?: string | null
          data_retention_date?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_metadata?: Json | null
          deletion_reason?: string | null
          deletion_type?: string | null
          desired_locations?: Json | null
          desired_salary_max?: number | null
          desired_salary_min?: number | null
          education?: Json | null
          email?: string | null
          embedding_generated_at?: string | null
          engagement_score?: number | null
          enrichment_data?: Json | null
          enrichment_last_run?: string | null
          fit_score?: number | null
          full_name: string
          gdpr_consent?: boolean | null
          gdpr_consent_date?: string | null
          ghost_mode_enabled?: boolean | null
          github_url?: string | null
          header_media_type?: string | null
          header_media_url?: string | null
          id?: string
          industry_preference?: string | null
          internal_rating?: number | null
          invitation_status?: string | null
          job_alert_frequency?: string | null
          languages?: Json | null
          last_activity_at?: string | null
          last_invite_sent_at?: string | null
          last_profile_update?: string | null
          linkedin_profile_data?: Json | null
          linkedin_url?: string | null
          merged_at?: string | null
          merged_from_user_id?: string | null
          notice_period?: string | null
          personality_insights?: Json | null
          phone?: string | null
          portfolio_url?: string | null
          preferred_currency?: string | null
          preferred_language?: string | null
          profile_completeness?: number | null
          profile_embedding?: string | null
          public_fields?: Json | null
          rejection_reason?: string | null
          remote_preference?: string | null
          remote_work_aspiration?: boolean | null
          resume_filename?: string | null
          resume_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          salary_preference_hidden?: boolean | null
          skills?: Json | null
          source_channel?: string | null
          source_metadata?: Json | null
          tags?: Json | null
          updated_at?: string
          user_id?: string | null
          work_authorization?: Json | null
          work_history?: Json | null
          years_of_experience?: number | null
        }
        Update: {
          actively_looking?: boolean | null
          admin_notes?: string | null
          ai_concerns?: Json | null
          ai_strengths?: Json | null
          ai_summary?: string | null
          application_status?: string | null
          assigned_strategist_id?: string | null
          available_hours_per_week?: number | null
          avatar_url?: string | null
          blocked_companies?: Json | null
          certifications?: Json | null
          company_size_preference?: string | null
          created_at?: string
          created_by?: string | null
          current_company?: string | null
          current_salary_max?: number | null
          current_salary_min?: number | null
          current_title?: string | null
          cv_parsed_at?: string | null
          data_retention_date?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_metadata?: Json | null
          deletion_reason?: string | null
          deletion_type?: string | null
          desired_locations?: Json | null
          desired_salary_max?: number | null
          desired_salary_min?: number | null
          education?: Json | null
          email?: string | null
          embedding_generated_at?: string | null
          engagement_score?: number | null
          enrichment_data?: Json | null
          enrichment_last_run?: string | null
          fit_score?: number | null
          full_name?: string
          gdpr_consent?: boolean | null
          gdpr_consent_date?: string | null
          ghost_mode_enabled?: boolean | null
          github_url?: string | null
          header_media_type?: string | null
          header_media_url?: string | null
          id?: string
          industry_preference?: string | null
          internal_rating?: number | null
          invitation_status?: string | null
          job_alert_frequency?: string | null
          languages?: Json | null
          last_activity_at?: string | null
          last_invite_sent_at?: string | null
          last_profile_update?: string | null
          linkedin_profile_data?: Json | null
          linkedin_url?: string | null
          merged_at?: string | null
          merged_from_user_id?: string | null
          notice_period?: string | null
          personality_insights?: Json | null
          phone?: string | null
          portfolio_url?: string | null
          preferred_currency?: string | null
          preferred_language?: string | null
          profile_completeness?: number | null
          profile_embedding?: string | null
          public_fields?: Json | null
          rejection_reason?: string | null
          remote_preference?: string | null
          remote_work_aspiration?: boolean | null
          resume_filename?: string | null
          resume_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          salary_preference_hidden?: boolean | null
          skills?: Json | null
          source_channel?: string | null
          source_metadata?: Json | null
          tags?: Json | null
          updated_at?: string
          user_id?: string | null
          work_authorization?: Json | null
          work_history?: Json | null
          years_of_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_profiles_assigned_strategist_id_fkey"
            columns: ["assigned_strategist_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "candidate_profiles_assigned_strategist_id_fkey"
            columns: ["assigned_strategist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_profiles_assigned_strategist_id_fkey"
            columns: ["assigned_strategist_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_profiles_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "candidate_profiles_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_profiles_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_scorecards: {
        Row: {
          application_id: string
          communication_score: number | null
          concerns: string | null
          created_at: string
          cultural_fit_score: number | null
          evaluator_id: string
          id: string
          notes: string | null
          overall_rating: number | null
          recommendation: string | null
          stage_index: number
          strengths: string | null
          technical_score: number | null
          updated_at: string
        }
        Insert: {
          application_id: string
          communication_score?: number | null
          concerns?: string | null
          created_at?: string
          cultural_fit_score?: number | null
          evaluator_id: string
          id?: string
          notes?: string | null
          overall_rating?: number | null
          recommendation?: string | null
          stage_index: number
          strengths?: string | null
          technical_score?: number | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          communication_score?: number | null
          concerns?: string | null
          created_at?: string
          cultural_fit_score?: number | null
          evaluator_id?: string
          id?: string
          notes?: string | null
          overall_rating?: number | null
          recommendation?: string | null
          stage_index?: number
          strengths?: string | null
          technical_score?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      career_context_snapshots: {
        Row: {
          active_applications: Json | null
          career_goals: Json | null
          created_at: string
          id: string
          market_position: Json | null
          network_insights: Json | null
          next_best_actions: string[] | null
          pending_tasks: Json | null
          skill_gaps: Json | null
          snapshot_date: string
          upcoming_interviews: Json | null
          urgency_flags: Json | null
          user_id: string
        }
        Insert: {
          active_applications?: Json | null
          career_goals?: Json | null
          created_at?: string
          id?: string
          market_position?: Json | null
          network_insights?: Json | null
          next_best_actions?: string[] | null
          pending_tasks?: Json | null
          skill_gaps?: Json | null
          snapshot_date?: string
          upcoming_interviews?: Json | null
          urgency_flags?: Json | null
          user_id: string
        }
        Update: {
          active_applications?: Json | null
          career_goals?: Json | null
          created_at?: string
          id?: string
          market_position?: Json | null
          network_insights?: Json | null
          next_best_actions?: string[] | null
          pending_tasks?: Json | null
          skill_gaps?: Json | null
          snapshot_date?: string
          upcoming_interviews?: Json | null
          urgency_flags?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      career_paths: {
        Row: {
          avg_years: number | null
          created_at: string | null
          from_role: string
          id: string
          required_skills: string[] | null
          salary_range_max: number | null
          salary_range_min: number | null
          to_role: string
        }
        Insert: {
          avg_years?: number | null
          created_at?: string | null
          from_role: string
          id?: string
          required_skills?: string[] | null
          salary_range_max?: number | null
          salary_range_min?: number | null
          to_role: string
        }
        Update: {
          avg_years?: number | null
          created_at?: string | null
          from_role?: string
          id?: string
          required_skills?: string[] | null
          salary_range_max?: number | null
          salary_range_min?: number | null
          to_role?: string
        }
        Relationships: []
      }
      career_trend_insights: {
        Row: {
          category: string
          confidence_score: number | null
          created_at: string
          description: string | null
          geographic_scope: string[] | null
          id: string
          impact_level: string | null
          metadata: Json | null
          relevant_industries: string[] | null
          relevant_roles: string[] | null
          source_url: string | null
          title: string
          trend_type: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          category: string
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          geographic_scope?: string[] | null
          id?: string
          impact_level?: string | null
          metadata?: Json | null
          relevant_industries?: string[] | null
          relevant_roles?: string[] | null
          source_url?: string | null
          title: string
          trend_type: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          category?: string
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          geographic_scope?: string[] | null
          id?: string
          impact_level?: string | null
          metadata?: Json | null
          relevant_industries?: string[] | null
          relevant_roles?: string[] | null
          source_url?: string | null
          title?: string
          trend_type?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      churn_analysis: {
        Row: {
          churn_feedback: string | null
          churn_reason: string | null
          churned_at: string
          created_at: string | null
          id: string
          metadata: Json | null
          plan_tier: string
          reactivation_likelihood: number | null
          retention_attempt: boolean | null
          retention_offer: string | null
          subscription_duration_days: number
          subscription_id: string
          total_revenue_euros: number
          user_id: string
        }
        Insert: {
          churn_feedback?: string | null
          churn_reason?: string | null
          churned_at?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          plan_tier: string
          reactivation_likelihood?: number | null
          retention_attempt?: boolean | null
          retention_offer?: string | null
          subscription_duration_days: number
          subscription_id: string
          total_revenue_euros: number
          user_id: string
        }
        Update: {
          churn_feedback?: string | null
          churn_reason?: string | null
          churned_at?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          plan_tier?: string
          reactivation_likelihood?: number | null
          retention_attempt?: boolean | null
          retention_offer?: string | null
          subscription_duration_days?: number
          subscription_id?: string
          total_revenue_euros?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "churn_analysis_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
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
      club_objectives: {
        Row: {
          completion_percentage: number | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          goals: string | null
          hard_deadline: string | null
          id: string
          milestone_type: string | null
          owners: string[] | null
          priority: string | null
          start_date: string | null
          status: string
          tags: Json | null
          timeline_notes: string | null
          title: string
          updated_at: string
          visibility: string | null
        }
        Insert: {
          completion_percentage?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          goals?: string | null
          hard_deadline?: string | null
          id?: string
          milestone_type?: string | null
          owners?: string[] | null
          priority?: string | null
          start_date?: string | null
          status?: string
          tags?: Json | null
          timeline_notes?: string | null
          title: string
          updated_at?: string
          visibility?: string | null
        }
        Update: {
          completion_percentage?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          goals?: string | null
          hard_deadline?: string | null
          id?: string
          milestone_type?: string | null
          owners?: string[] | null
          priority?: string | null
          start_date?: string | null
          status?: string
          tags?: Json | null
          timeline_notes?: string | null
          title?: string
          updated_at?: string
          visibility?: string | null
        }
        Relationships: []
      }
      club_sync_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          job_id: string
          notes: string | null
          requested_at: string
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          job_id: string
          notes?: string | null
          requested_at?: string
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          job_id?: string
          notes?: string | null
          requested_at?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_sync_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_sync_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "club_sync_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_sync_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_sync_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "club_sync_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_sync_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      club_tasks: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          objective_id: string | null
          priority: string | null
          status: string
          task_number: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          objective_id?: string | null
          priority?: string | null
          status?: string
          task_number: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          objective_id?: string | null
          priority?: string | null
          status?: string
          task_number?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_tasks_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "club_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborative_posts: {
        Row: {
          approved_by: string[] | null
          approvers: string[] | null
          collaborators: string[] | null
          content: string
          created_at: string | null
          creator_id: string
          id: string
          notes: Json | null
          platforms: string[]
          post_id: string | null
          scheduled_for: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          approved_by?: string[] | null
          approvers?: string[] | null
          collaborators?: string[] | null
          content: string
          created_at?: string | null
          creator_id: string
          id?: string
          notes?: Json | null
          platforms: string[]
          post_id?: string | null
          scheduled_for?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_by?: string[] | null
          approvers?: string[] | null
          collaborators?: string[] | null
          content?: string
          created_at?: string | null
          creator_id?: string
          id?: string
          notes?: Json | null
          platforms?: string[]
          post_id?: string | null
          scheduled_for?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaborative_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "unified_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          benefits: Json | null
          careers_email: string | null
          careers_page_url: string | null
          company_size: string | null
          cover_image_url: string | null
          created_at: string
          culture_highlights: Json | null
          description: string | null
          founded_year: number | null
          headquarters_location: string | null
          hiring_intent_score: number | null
          hiring_intent_updated_at: string | null
          id: string
          industry: string | null
          instagram_url: string | null
          is_active: boolean
          linkedin_url: string | null
          logo_url: string | null
          member_since: string | null
          membership_tier: string | null
          meta_description: string | null
          meta_title: string | null
          mission: string | null
          name: string
          placement_fee_percentage: number | null
          slug: string
          tagline: string | null
          tech_stack: Json | null
          twitter_url: string | null
          updated_at: string
          values: Json | null
          vision: string | null
          website_url: string | null
        }
        Insert: {
          benefits?: Json | null
          careers_email?: string | null
          careers_page_url?: string | null
          company_size?: string | null
          cover_image_url?: string | null
          created_at?: string
          culture_highlights?: Json | null
          description?: string | null
          founded_year?: number | null
          headquarters_location?: string | null
          hiring_intent_score?: number | null
          hiring_intent_updated_at?: string | null
          id?: string
          industry?: string | null
          instagram_url?: string | null
          is_active?: boolean
          linkedin_url?: string | null
          logo_url?: string | null
          member_since?: string | null
          membership_tier?: string | null
          meta_description?: string | null
          meta_title?: string | null
          mission?: string | null
          name: string
          placement_fee_percentage?: number | null
          slug: string
          tagline?: string | null
          tech_stack?: Json | null
          twitter_url?: string | null
          updated_at?: string
          values?: Json | null
          vision?: string | null
          website_url?: string | null
        }
        Update: {
          benefits?: Json | null
          careers_email?: string | null
          careers_page_url?: string | null
          company_size?: string | null
          cover_image_url?: string | null
          created_at?: string
          culture_highlights?: Json | null
          description?: string | null
          founded_year?: number | null
          headquarters_location?: string | null
          hiring_intent_score?: number | null
          hiring_intent_updated_at?: string | null
          id?: string
          industry?: string | null
          instagram_url?: string | null
          is_active?: boolean
          linkedin_url?: string | null
          logo_url?: string | null
          member_since?: string | null
          membership_tier?: string | null
          meta_description?: string | null
          meta_title?: string | null
          mission?: string | null
          name?: string
          placement_fee_percentage?: number | null
          slug?: string
          tagline?: string | null
          tech_stack?: Json | null
          twitter_url?: string | null
          updated_at?: string
          values?: Json | null
          vision?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      company_achievement_earners: {
        Row: {
          achievement_id: string
          earned_at: string
          earned_company_id: string | null
          granted_by: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          earned_company_id?: string | null
          granted_by?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          earned_company_id?: string | null
          granted_by?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_achievement_earners_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "company_achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_achievement_earners_earned_company_id_fkey"
            columns: ["earned_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_achievement_earners_earned_company_id_fkey"
            columns: ["earned_company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_achievements: {
        Row: {
          achievement_type: Database["public"]["Enums"]["company_achievement_type"]
          company_id: string
          created_at: string
          created_by: string | null
          criteria: Json | null
          description: string
          display_order: number | null
          icon: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          achievement_type?: Database["public"]["Enums"]["company_achievement_type"]
          company_id: string
          created_at?: string
          created_by?: string | null
          criteria?: Json | null
          description: string
          display_order?: number | null
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          achievement_type?: Database["public"]["Enums"]["company_achievement_type"]
          company_id?: string
          created_at?: string
          created_by?: string | null
          criteria?: Json | null
          description?: string
          display_order?: number | null
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_achievements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_achievements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_analytics: {
        Row: {
          application_completes: number | null
          application_starts: number | null
          company_id: string
          created_at: string
          date: string
          follower_count: number | null
          id: string
          job_views: number | null
          post_engagements: number | null
          post_views: number | null
          profile_views: number | null
          referral_sources: Json | null
        }
        Insert: {
          application_completes?: number | null
          application_starts?: number | null
          company_id: string
          created_at?: string
          date?: string
          follower_count?: number | null
          id?: string
          job_views?: number | null
          post_engagements?: number | null
          post_views?: number | null
          profile_views?: number | null
          referral_sources?: Json | null
        }
        Update: {
          application_completes?: number | null
          application_starts?: number | null
          company_id?: string
          created_at?: string
          date?: string
          follower_count?: number | null
          id?: string
          job_views?: number | null
          post_engagements?: number | null
          post_views?: number | null
          profile_views?: number | null
          referral_sources?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "company_analytics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_analytics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_branding: {
        Row: {
          accent_color: string | null
          company_id: string
          created_at: string
          custom_css: string | null
          favicon_url: string | null
          font_body: string | null
          font_heading: string | null
          id: string
          logo_dark_url: string | null
          logo_light_url: string | null
          primary_color: string | null
          secondary_color: string | null
          social_preview_image: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          company_id: string
          created_at?: string
          custom_css?: string | null
          favicon_url?: string | null
          font_body?: string | null
          font_heading?: string | null
          id?: string
          logo_dark_url?: string | null
          logo_light_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          social_preview_image?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          company_id?: string
          created_at?: string
          custom_css?: string | null
          favicon_url?: string | null
          font_body?: string | null
          font_heading?: string | null
          id?: string
          logo_dark_url?: string | null
          logo_light_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          social_preview_image?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_branding_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_branding_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_candidate_feedback: {
        Row: {
          application_id: string | null
          candidate_id: string | null
          company_id: string
          created_at: string | null
          culture_fit_issues: string[] | null
          feedback_text: string | null
          feedback_type: string
          id: string
          job_id: string | null
          location_mismatch: boolean | null
          metadata: Json | null
          provided_by: string
          rating: number | null
          rejection_reason: string | null
          salary_mismatch: boolean | null
          seniority_mismatch: string | null
          skills_mismatch: string[] | null
          stage_name: string | null
        }
        Insert: {
          application_id?: string | null
          candidate_id?: string | null
          company_id: string
          created_at?: string | null
          culture_fit_issues?: string[] | null
          feedback_text?: string | null
          feedback_type: string
          id?: string
          job_id?: string | null
          location_mismatch?: boolean | null
          metadata?: Json | null
          provided_by: string
          rating?: number | null
          rejection_reason?: string | null
          salary_mismatch?: boolean | null
          seniority_mismatch?: string | null
          skills_mismatch?: string[] | null
          stage_name?: string | null
        }
        Update: {
          application_id?: string | null
          candidate_id?: string | null
          company_id?: string
          created_at?: string | null
          culture_fit_issues?: string[] | null
          feedback_text?: string | null
          feedback_type?: string
          id?: string
          job_id?: string | null
          location_mismatch?: boolean | null
          metadata?: Json | null
          provided_by?: string
          rating?: number | null
          rejection_reason?: string | null
          salary_mismatch?: boolean | null
          seniority_mismatch?: string | null
          skills_mismatch?: string[] | null
          stage_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_candidate_feedback_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_candidate_feedback_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications_with_deleted_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_candidate_feedback_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_candidate_feedback_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "company_candidate_feedback_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "unified_candidate_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_candidate_feedback_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_candidate_feedback_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_candidate_feedback_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_candidate_feedback_provided_by_fkey"
            columns: ["provided_by"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "company_candidate_feedback_provided_by_fkey"
            columns: ["provided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_candidate_feedback_provided_by_fkey"
            columns: ["provided_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_departments: {
        Row: {
          color_hex: string | null
          company_id: string
          created_at: string | null
          department_type: string
          description: string | null
          display_order: number | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_department_id: string | null
          updated_at: string | null
        }
        Insert: {
          color_hex?: string | null
          company_id: string
          created_at?: string | null
          department_type?: string
          description?: string | null
          display_order?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_department_id?: string | null
          updated_at?: string | null
        }
        Update: {
          color_hex?: string | null
          company_id?: string
          created_at?: string | null
          department_type?: string
          description?: string | null
          display_order?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_department_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_departments_parent_department_id_fkey"
            columns: ["parent_department_id"]
            isOneToOne: false
            referencedRelation: "company_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      company_email_domains: {
        Row: {
          added_by: string | null
          auto_tracked: boolean | null
          company_id: string
          created_at: string | null
          domain: string
          id: string
          is_active: boolean | null
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          added_by?: string | null
          auto_tracked?: boolean | null
          company_id: string
          created_at?: string | null
          domain: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          added_by?: string | null
          auto_tracked?: boolean | null
          company_id?: string
          created_at?: string | null
          domain?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_email_domains_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "company_email_domains_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_email_domains_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_email_domains_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_email_domains_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_followers: {
        Row: {
          company_id: string
          followed_at: string
          id: string
          notification_enabled: boolean | null
          user_id: string
        }
        Insert: {
          company_id: string
          followed_at?: string
          id?: string
          notification_enabled?: boolean | null
          user_id: string
        }
        Update: {
          company_id?: string
          followed_at?: string
          id?: string
          notification_enabled?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_followers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_followers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_interactions: {
        Row: {
          attachment_urls: string[] | null
          company_id: string | null
          created_at: string | null
          deal_stage_hint: string | null
          direction: string | null
          duration_minutes: number | null
          embedding_generated_at: string | null
          external_id: string | null
          id: string
          initiated_by_stakeholder_id: string | null
          insights_extracted_at: string | null
          interaction_date: string
          interaction_embedding: string | null
          interaction_subtype: string | null
          interaction_type: string
          is_manually_entered: boolean | null
          is_test_data: boolean | null
          job_id: string | null
          key_topics: string[] | null
          mentioned_candidates: string[] | null
          mentioned_roles: string[] | null
          next_action: string | null
          our_participant_id: string | null
          processing_status: string | null
          raw_content: string | null
          retry_count: number | null
          sentiment_score: number | null
          source_metadata: Json | null
          status: string | null
          subject: string | null
          summary: string | null
          updated_at: string | null
          urgency_score: number | null
        }
        Insert: {
          attachment_urls?: string[] | null
          company_id?: string | null
          created_at?: string | null
          deal_stage_hint?: string | null
          direction?: string | null
          duration_minutes?: number | null
          embedding_generated_at?: string | null
          external_id?: string | null
          id?: string
          initiated_by_stakeholder_id?: string | null
          insights_extracted_at?: string | null
          interaction_date: string
          interaction_embedding?: string | null
          interaction_subtype?: string | null
          interaction_type: string
          is_manually_entered?: boolean | null
          is_test_data?: boolean | null
          job_id?: string | null
          key_topics?: string[] | null
          mentioned_candidates?: string[] | null
          mentioned_roles?: string[] | null
          next_action?: string | null
          our_participant_id?: string | null
          processing_status?: string | null
          raw_content?: string | null
          retry_count?: number | null
          sentiment_score?: number | null
          source_metadata?: Json | null
          status?: string | null
          subject?: string | null
          summary?: string | null
          updated_at?: string | null
          urgency_score?: number | null
        }
        Update: {
          attachment_urls?: string[] | null
          company_id?: string | null
          created_at?: string | null
          deal_stage_hint?: string | null
          direction?: string | null
          duration_minutes?: number | null
          embedding_generated_at?: string | null
          external_id?: string | null
          id?: string
          initiated_by_stakeholder_id?: string | null
          insights_extracted_at?: string | null
          interaction_date?: string
          interaction_embedding?: string | null
          interaction_subtype?: string | null
          interaction_type?: string
          is_manually_entered?: boolean | null
          is_test_data?: boolean | null
          job_id?: string | null
          key_topics?: string[] | null
          mentioned_candidates?: string[] | null
          mentioned_roles?: string[] | null
          next_action?: string | null
          our_participant_id?: string | null
          processing_status?: string | null
          raw_content?: string | null
          retry_count?: number | null
          sentiment_score?: number | null
          source_metadata?: Json | null
          status?: string | null
          subject?: string | null
          summary?: string | null
          updated_at?: string | null
          urgency_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_interactions_initiated_by_stakeholder_id_fkey"
            columns: ["initiated_by_stakeholder_id"]
            isOneToOne: false
            referencedRelation: "company_stakeholders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_interactions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_interactions_our_participant_id_fkey"
            columns: ["our_participant_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "company_interactions_our_participant_id_fkey"
            columns: ["our_participant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_interactions_our_participant_id_fkey"
            columns: ["our_participant_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          bio: string | null
          company_id: string
          created_at: string | null
          department_id: string | null
          display_order_in_dept: number | null
          employment_type: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          is_people_manager: boolean | null
          job_title: string | null
          joined_at: string | null
          linkedin_url: string | null
          location: string | null
          reports_to_member_id: string | null
          role: string
          start_date: string | null
          updated_at: string | null
          user_id: string
          visibility_in_org_chart: string | null
        }
        Insert: {
          bio?: string | null
          company_id: string
          created_at?: string | null
          department_id?: string | null
          display_order_in_dept?: number | null
          employment_type?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          is_people_manager?: boolean | null
          job_title?: string | null
          joined_at?: string | null
          linkedin_url?: string | null
          location?: string | null
          reports_to_member_id?: string | null
          role: string
          start_date?: string | null
          updated_at?: string | null
          user_id: string
          visibility_in_org_chart?: string | null
        }
        Update: {
          bio?: string | null
          company_id?: string
          created_at?: string | null
          department_id?: string | null
          display_order_in_dept?: number | null
          employment_type?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          is_people_manager?: boolean | null
          job_title?: string | null
          joined_at?: string | null
          linkedin_url?: string | null
          location?: string | null
          reports_to_member_id?: string | null
          role?: string
          start_date?: string | null
          updated_at?: string | null
          user_id?: string
          visibility_in_org_chart?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "company_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_reports_to_member_id_fkey"
            columns: ["reports_to_member_id"]
            isOneToOne: false
            referencedRelation: "company_members"
            referencedColumns: ["id"]
          },
        ]
      }
      company_news_articles: {
        Row: {
          added_by: string
          article_guid: string | null
          author: string | null
          click_count: number | null
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          is_pinned: boolean | null
          published_date: string | null
          rss_feed_id: string | null
          source_name: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          url: string
          view_count: number | null
        }
        Insert: {
          added_by: string
          article_guid?: string | null
          author?: string | null
          click_count?: number | null
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_pinned?: boolean | null
          published_date?: string | null
          rss_feed_id?: string | null
          source_name?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          url: string
          view_count?: number | null
        }
        Update: {
          added_by?: string
          article_guid?: string | null
          author?: string | null
          click_count?: number | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_pinned?: boolean | null
          published_date?: string | null
          rss_feed_id?: string | null
          source_name?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          url?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_news_articles_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "company_news_articles_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_news_articles_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_news_articles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_news_articles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_rss_feed"
            columns: ["rss_feed_id"]
            isOneToOne: false
            referencedRelation: "rss_feeds"
            referencedColumns: ["id"]
          },
        ]
      }
      company_post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "company_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      company_post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "company_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      company_post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "company_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      company_posts: {
        Row: {
          author_id: string
          company_id: string
          content: string
          created_at: string
          id: string
          is_featured: boolean | null
          is_public: boolean | null
          media_types: Json | null
          media_urls: Json | null
          post_type: string
          published_at: string | null
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          author_id: string
          company_id: string
          content: string
          created_at?: string
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          media_types?: Json | null
          media_urls?: Json | null
          post_type: string
          published_at?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          author_id?: string
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          media_types?: Json | null
          media_urls?: Json | null
          post_type?: string
          published_at?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_referrer_splits: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          referrer_id: string
          split_percentage: number
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          referrer_id: string
          split_percentage: number
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          referrer_id?: string
          split_percentage?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_referrer_splits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_referrer_splits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_referrer_splits_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "company_referrer_splits_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_referrer_splits_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_role_permissions: {
        Row: {
          company_id: string
          created_at: string
          granted: boolean
          id: string
          permission_name: string
          role: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          granted?: boolean
          id?: string
          permission_name: string
          role: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          granted?: boolean
          id?: string
          permission_name?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_company_role_permissions_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_company_role_permissions_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_company_role_permissions_permission"
            columns: ["permission_name"]
            isOneToOne: false
            referencedRelation: "partner_permissions"
            referencedColumns: ["name"]
          },
        ]
      }
      company_settings: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          pipeline_settings: Json | null
          role_settings: Json | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          pipeline_settings?: Json | null
          role_settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          pipeline_settings?: Json | null
          role_settings?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_sso_config: {
        Row: {
          allowed_domains: string[] | null
          auto_provision: boolean | null
          certificate: string | null
          client_id: string | null
          client_secret: string | null
          company_id: string
          created_at: string | null
          default_role: string | null
          entity_id: string | null
          id: string
          is_enabled: boolean | null
          metadata_url: string | null
          provider: string
          sso_url: string | null
          updated_at: string | null
        }
        Insert: {
          allowed_domains?: string[] | null
          auto_provision?: boolean | null
          certificate?: string | null
          client_id?: string | null
          client_secret?: string | null
          company_id: string
          created_at?: string | null
          default_role?: string | null
          entity_id?: string | null
          id?: string
          is_enabled?: boolean | null
          metadata_url?: string | null
          provider: string
          sso_url?: string | null
          updated_at?: string | null
        }
        Update: {
          allowed_domains?: string[] | null
          auto_provision?: boolean | null
          certificate?: string | null
          client_id?: string | null
          client_secret?: string | null
          company_id?: string
          created_at?: string | null
          default_role?: string | null
          entity_id?: string | null
          id?: string
          is_enabled?: boolean | null
          metadata_url?: string | null
          provider?: string
          sso_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_sso_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_sso_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_stakeholders: {
        Row: {
          communication_style: string | null
          company_id: string | null
          created_at: string | null
          department: string | null
          email: string | null
          engagement_score: number | null
          first_contacted_at: string | null
          full_name: string
          id: string
          is_test_data: boolean | null
          job_title: string | null
          last_contacted_at: string | null
          linkedin_url: string | null
          phone: string | null
          preferred_channel: string | null
          profile_id: string | null
          response_time_avg_hours: number | null
          role_type: string | null
          seniority_level: string | null
          sentiment_score: number | null
          timezone: string | null
          total_interactions: number | null
          updated_at: string | null
          working_hours: Json | null
        }
        Insert: {
          communication_style?: string | null
          company_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          engagement_score?: number | null
          first_contacted_at?: string | null
          full_name: string
          id?: string
          is_test_data?: boolean | null
          job_title?: string | null
          last_contacted_at?: string | null
          linkedin_url?: string | null
          phone?: string | null
          preferred_channel?: string | null
          profile_id?: string | null
          response_time_avg_hours?: number | null
          role_type?: string | null
          seniority_level?: string | null
          sentiment_score?: number | null
          timezone?: string | null
          total_interactions?: number | null
          updated_at?: string | null
          working_hours?: Json | null
        }
        Update: {
          communication_style?: string | null
          company_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          engagement_score?: number | null
          first_contacted_at?: string | null
          full_name?: string
          id?: string
          is_test_data?: boolean | null
          job_title?: string | null
          last_contacted_at?: string | null
          linkedin_url?: string | null
          phone?: string | null
          preferred_channel?: string | null
          profile_id?: string | null
          response_time_avg_hours?: number | null
          role_type?: string | null
          seniority_level?: string | null
          sentiment_score?: number | null
          timezone?: string | null
          total_interactions?: number | null
          updated_at?: string | null
          working_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "company_stakeholders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_stakeholders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_stakeholders_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "company_stakeholders_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_stakeholders_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_stories: {
        Row: {
          caption: string | null
          company_id: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          is_active: boolean | null
          media_type: string
          media_url: string
        }
        Insert: {
          caption?: string | null
          company_id: string
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          is_active?: boolean | null
          media_type: string
          media_url: string
        }
        Update: {
          caption?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          is_active?: boolean | null
          media_type?: string
          media_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_stories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_stories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_story_likes: {
        Row: {
          created_at: string
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_story_likes_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "company_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      company_story_views: {
        Row: {
          id: string
          story_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          story_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          story_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "company_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_reviews: {
        Row: {
          approved_at: string | null
          compliance_issues: Json | null
          content_id: string
          content_type: string
          created_at: string | null
          id: string
          review_notes: string | null
          review_status: string | null
          reviewed_by: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          compliance_issues?: Json | null
          content_id: string
          content_type: string
          created_at?: string | null
          id?: string
          review_notes?: string | null
          review_status?: string | null
          reviewed_by?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          compliance_issues?: Json | null
          content_id?: string
          content_type?: string
          created_at?: string | null
          id?: string
          review_notes?: string | null
          review_status?: string | null
          reviewed_by?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      consent_receipts: {
        Row: {
          application_id: string | null
          consent_text: string | null
          consent_type: string
          expires_at: string | null
          granted: boolean
          granted_at: string
          id: string
          metadata: Json | null
          recipient_id: string | null
          recipient_type: string | null
          revoked_at: string | null
          scope: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          consent_text?: string | null
          consent_type: string
          expires_at?: string | null
          granted: boolean
          granted_at?: string
          id?: string
          metadata?: Json | null
          recipient_id?: string | null
          recipient_type?: string | null
          revoked_at?: string | null
          scope: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          consent_text?: string | null
          consent_type?: string
          expires_at?: string | null
          granted?: boolean
          granted_at?: string
          id?: string
          metadata?: Json | null
          recipient_id?: string | null
          recipient_type?: string | null
          revoked_at?: string | null
          scope?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_receipts_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_receipts_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications_with_deleted_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_roles: {
        Row: {
          created_at: string | null
          id: string
          is_custom: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_custom?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_custom?: boolean | null
          name?: string
        }
        Relationships: []
      }
      content_attributions: {
        Row: {
          attribution_text: string | null
          course_id: string | null
          created_at: string | null
          id: string
          license_id: string | null
          module_id: string | null
          original_author: string | null
          original_source: string | null
          original_url: string | null
        }
        Insert: {
          attribution_text?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          license_id?: string | null
          module_id?: string | null
          original_author?: string | null
          original_source?: string | null
          original_url?: string | null
        }
        Update: {
          attribution_text?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          license_id?: string | null
          module_id?: string | null
          original_author?: string | null
          original_source?: string | null
          original_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_attributions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_attributions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "popular_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_attributions_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "content_licenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_attributions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      content_calendar: {
        Row: {
          ai_confidence_score: number | null
          ai_reasoning: string | null
          ai_suggested_time: string | null
          assigned_to: string | null
          created_at: string
          custom_captions: Json | null
          description: string | null
          id: string
          metadata: Json | null
          platforms: string[]
          post_id: string | null
          scheduled_date: string
          scheduled_time: string | null
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_confidence_score?: number | null
          ai_reasoning?: string | null
          ai_suggested_time?: string | null
          assigned_to?: string | null
          created_at?: string
          custom_captions?: Json | null
          description?: string | null
          id?: string
          metadata?: Json | null
          platforms: string[]
          post_id?: string | null
          scheduled_date: string
          scheduled_time?: string | null
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_confidence_score?: number | null
          ai_reasoning?: string | null
          ai_suggested_time?: string | null
          assigned_to?: string | null
          created_at?: string
          custom_captions?: Json | null
          description?: string | null
          id?: string
          metadata?: Json | null
          platforms?: string[]
          post_id?: string | null
          scheduled_date?: string
          scheduled_time?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_calendar_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "unified_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      content_licenses: {
        Row: {
          allows_commercial: boolean | null
          allows_modification: boolean | null
          created_at: string | null
          id: string
          license_name: string
          license_type: string
          license_url: string | null
          requires_attribution: boolean | null
        }
        Insert: {
          allows_commercial?: boolean | null
          allows_modification?: boolean | null
          created_at?: string | null
          id?: string
          license_name: string
          license_type: string
          license_url?: string | null
          requires_attribution?: boolean | null
        }
        Update: {
          allows_commercial?: boolean | null
          allows_modification?: boolean | null
          created_at?: string | null
          id?: string
          license_name?: string
          license_type?: string
          license_url?: string | null
          requires_attribution?: boolean | null
        }
        Relationships: []
      }
      content_licensing: {
        Row: {
          attribution_text: string | null
          compliance_status: string | null
          course_id: string | null
          created_at: string | null
          id: string
          last_review_date: string | null
          license_type: string
          module_id: string | null
          next_review_date: string | null
          notes: string | null
          source_url: string | null
          updated_at: string | null
          usage_rights: Json | null
        }
        Insert: {
          attribution_text?: string | null
          compliance_status?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          last_review_date?: string | null
          license_type: string
          module_id?: string | null
          next_review_date?: string | null
          notes?: string | null
          source_url?: string | null
          updated_at?: string | null
          usage_rights?: Json | null
        }
        Update: {
          attribution_text?: string | null
          compliance_status?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          last_review_date?: string | null
          license_type?: string
          module_id?: string | null
          next_review_date?: string | null
          notes?: string | null
          source_url?: string | null
          updated_at?: string | null
          usage_rights?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "content_licensing_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_licensing_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "popular_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_licensing_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      content_recommendations: {
        Row: {
          created_at: string | null
          enrolled: boolean | null
          id: string
          recommendation_reason: string | null
          recommendation_score: number | null
          recommended_id: string
          recommended_type: string
          user_id: string | null
          viewed: boolean | null
        }
        Insert: {
          created_at?: string | null
          enrolled?: boolean | null
          id?: string
          recommendation_reason?: string | null
          recommendation_score?: number | null
          recommended_id: string
          recommended_type: string
          user_id?: string | null
          viewed?: boolean | null
        }
        Update: {
          created_at?: string | null
          enrolled?: boolean | null
          id?: string
          recommendation_reason?: string | null
          recommendation_score?: number | null
          recommended_id?: string
          recommended_type?: string
          user_id?: string | null
          viewed?: boolean | null
        }
        Relationships: []
      }
      conversation_analytics: {
        Row: {
          avg_response_time_seconds: number | null
          conversation_id: string
          id: string
          last_calculated_at: string | null
          peak_activity_hours: Json | null
          sentiment_trend: Json | null
          total_messages: number | null
        }
        Insert: {
          avg_response_time_seconds?: number | null
          conversation_id: string
          id?: string
          last_calculated_at?: string | null
          peak_activity_hours?: Json | null
          sentiment_trend?: Json | null
          total_messages?: number | null
        }
        Update: {
          avg_response_time_seconds?: number | null
          conversation_id?: string
          id?: string
          last_calculated_at?: string | null
          peak_activity_hours?: Json | null
          sentiment_trend?: Json | null
          total_messages?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_analytics_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          is_muted: boolean | null
          joined_at: string
          last_read_at: string | null
          muted_until: string | null
          notifications_enabled: boolean | null
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_muted?: boolean | null
          joined_at?: string
          last_read_at?: string | null
          muted_until?: string | null
          notifications_enabled?: boolean | null
          role: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_muted?: boolean | null
          joined_at?: string
          last_read_at?: string | null
          muted_until?: string | null
          notifications_enabled?: boolean | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_stats: {
        Row: {
          avg_response_time_minutes: number | null
          candidate_messages: number | null
          conversation_id: string
          hiring_manager_messages: number | null
          id: string
          last_candidate_message_at: string | null
          last_hiring_manager_message_at: string | null
          needs_response_reminder: boolean | null
          strategist_messages: number | null
          total_messages: number | null
          updated_at: string
        }
        Insert: {
          avg_response_time_minutes?: number | null
          candidate_messages?: number | null
          conversation_id: string
          hiring_manager_messages?: number | null
          id?: string
          last_candidate_message_at?: string | null
          last_hiring_manager_message_at?: string | null
          needs_response_reminder?: boolean | null
          strategist_messages?: number | null
          total_messages?: number | null
          updated_at?: string
        }
        Update: {
          avg_response_time_minutes?: number | null
          candidate_messages?: number | null
          conversation_id?: string
          hiring_manager_messages?: number | null
          id?: string
          last_candidate_message_at?: string | null
          last_hiring_manager_message_at?: string | null
          needs_response_reminder?: boolean | null
          strategist_messages?: number | null
          total_messages?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_stats_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          application_id: string | null
          archived_at: string | null
          created_at: string
          id: string
          is_archived: boolean | null
          is_pinned: boolean | null
          last_message_at: string | null
          metadata: Json | null
          pinned_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          application_id?: string | null
          archived_at?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          last_message_at?: string | null
          metadata?: Json | null
          pinned_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          application_id?: string | null
          archived_at?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          last_message_at?: string | null
          metadata?: Json | null
          pinned_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications_with_deleted_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      cookie_consent_records: {
        Row: {
          analytics_cookies: boolean | null
          consent_version: string
          created_at: string | null
          expires_at: string | null
          functional_cookies: boolean | null
          geo_location: string | null
          granted_at: string | null
          id: string
          ip_address: string | null
          marketing_cookies: boolean | null
          necessary_cookies: boolean | null
          session_id: string | null
          third_party_cookies: boolean | null
          user_agent: string | null
          user_id: string | null
          withdrawn_at: string | null
        }
        Insert: {
          analytics_cookies?: boolean | null
          consent_version?: string
          created_at?: string | null
          expires_at?: string | null
          functional_cookies?: boolean | null
          geo_location?: string | null
          granted_at?: string | null
          id?: string
          ip_address?: string | null
          marketing_cookies?: boolean | null
          necessary_cookies?: boolean | null
          session_id?: string | null
          third_party_cookies?: boolean | null
          user_agent?: string | null
          user_id?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          analytics_cookies?: boolean | null
          consent_version?: string
          created_at?: string | null
          expires_at?: string | null
          functional_cookies?: boolean | null
          geo_location?: string | null
          granted_at?: string | null
          id?: string
          ip_address?: string | null
          marketing_cookies?: boolean | null
          necessary_cookies?: boolean | null
          session_id?: string | null
          third_party_cookies?: boolean | null
          user_agent?: string | null
          user_id?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cookie_consent_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "cookie_consent_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cookie_consent_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_progress: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string | null
          id: string
          last_accessed_at: string | null
          modules_completed: number | null
          progress_percentage: number | null
          started_at: string | null
          total_modules: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          modules_completed?: number | null
          progress_percentage?: number | null
          started_at?: string | null
          total_modules?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          modules_completed?: number | null
          progress_percentage?: number | null
          started_at?: string | null
          total_modules?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "popular_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          academy_id: string
          category: string | null
          course_image_url: string | null
          course_video_url: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty_level: string | null
          display_order: number | null
          enrolled_count: number | null
          estimated_hours: number | null
          featured_until: string | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          learning_objectives: Json | null
          learning_path_id: string | null
          prerequisites: Json | null
          published_at: string | null
          slug: string
          title: string
          trending_score: number | null
          updated_at: string | null
        }
        Insert: {
          academy_id: string
          category?: string | null
          course_image_url?: string | null
          course_video_url?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          display_order?: number | null
          enrolled_count?: number | null
          estimated_hours?: number | null
          featured_until?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          learning_objectives?: Json | null
          learning_path_id?: string | null
          prerequisites?: Json | null
          published_at?: string | null
          slug: string
          title: string
          trending_score?: number | null
          updated_at?: string | null
        }
        Update: {
          academy_id?: string
          category?: string | null
          course_image_url?: string | null
          course_video_url?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          display_order?: number | null
          enrolled_count?: number | null
          estimated_hours?: number | null
          featured_until?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          learning_objectives?: Json | null
          learning_path_id?: string | null
          prerequisites?: Json | null
          published_at?: string | null
          slug?: string
          title?: string
          trending_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      csm_activities: {
        Row: {
          activity_type: string
          attendees: Json | null
          company_id: string | null
          created_at: string | null
          csm_user_id: string | null
          duration_minutes: number | null
          follow_up_date: string | null
          id: string
          meeting_recording_url: string | null
          notes: string | null
          outcome: string | null
          subject: string
        }
        Insert: {
          activity_type: string
          attendees?: Json | null
          company_id?: string | null
          created_at?: string | null
          csm_user_id?: string | null
          duration_minutes?: number | null
          follow_up_date?: string | null
          id?: string
          meeting_recording_url?: string | null
          notes?: string | null
          outcome?: string | null
          subject: string
        }
        Update: {
          activity_type?: string
          attendees?: Json | null
          company_id?: string | null
          created_at?: string | null
          csm_user_id?: string | null
          duration_minutes?: number | null
          follow_up_date?: string | null
          id?: string
          meeting_recording_url?: string | null
          notes?: string | null
          outcome?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "csm_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csm_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csm_activities_csm_user_id_fkey"
            columns: ["csm_user_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "csm_activities_csm_user_id_fkey"
            columns: ["csm_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csm_activities_csm_user_id_fkey"
            columns: ["csm_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      csm_assignments: {
        Row: {
          account_value_tier: string | null
          assigned_at: string | null
          assigned_by: string | null
          company_id: string | null
          created_at: string | null
          csm_user_id: string
          handoff_notes: string | null
          health_score: number | null
          id: string
          is_primary: boolean | null
          next_check_in_date: string | null
          risk_level: string | null
          updated_at: string | null
        }
        Insert: {
          account_value_tier?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          company_id?: string | null
          created_at?: string | null
          csm_user_id: string
          handoff_notes?: string | null
          health_score?: number | null
          id?: string
          is_primary?: boolean | null
          next_check_in_date?: string | null
          risk_level?: string | null
          updated_at?: string | null
        }
        Update: {
          account_value_tier?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          company_id?: string | null
          created_at?: string | null
          csm_user_id?: string
          handoff_notes?: string | null
          health_score?: number | null
          id?: string
          is_primary?: boolean | null
          next_check_in_date?: string | null
          risk_level?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "csm_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "csm_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csm_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csm_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csm_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csm_assignments_csm_user_id_fkey"
            columns: ["csm_user_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "csm_assignments_csm_user_id_fkey"
            columns: ["csm_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csm_assignments_csm_user_id_fkey"
            columns: ["csm_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_acquisition: {
        Row: {
          acquisition_channel: string
          acquisition_cost_euros: number | null
          acquisition_source: string | null
          company_id: string | null
          converted_to_paid_at: string | null
          created_at: string | null
          first_touchpoint_at: string
          id: string
          metadata: Json | null
          referral_bonus_id: string | null
          user_id: string
        }
        Insert: {
          acquisition_channel: string
          acquisition_cost_euros?: number | null
          acquisition_source?: string | null
          company_id?: string | null
          converted_to_paid_at?: string | null
          created_at?: string | null
          first_touchpoint_at?: string
          id?: string
          metadata?: Json | null
          referral_bonus_id?: string | null
          user_id: string
        }
        Update: {
          acquisition_channel?: string
          acquisition_cost_euros?: number | null
          acquisition_source?: string | null
          company_id?: string | null
          converted_to_paid_at?: string | null
          created_at?: string | null
          first_touchpoint_at?: string
          id?: string
          metadata?: Json | null
          referral_bonus_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_acquisition_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_acquisition_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_acquisition_referral_bonus_id_fkey"
            columns: ["referral_bonus_id"]
            isOneToOne: false
            referencedRelation: "referral_bonuses"
            referencedColumns: ["id"]
          },
        ]
      }
      data_classification_categories: {
        Row: {
          access_logging_required: boolean | null
          category_level: string
          category_name: string
          color_code: string | null
          created_at: string | null
          description: string | null
          encryption_required: boolean | null
          id: string
          retention_period_days: number | null
          updated_at: string | null
        }
        Insert: {
          access_logging_required?: boolean | null
          category_level: string
          category_name: string
          color_code?: string | null
          created_at?: string | null
          description?: string | null
          encryption_required?: boolean | null
          id?: string
          retention_period_days?: number | null
          updated_at?: string | null
        }
        Update: {
          access_logging_required?: boolean | null
          category_level?: string
          category_name?: string
          color_code?: string | null
          created_at?: string | null
          description?: string | null
          encryption_required?: boolean | null
          id?: string
          retention_period_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      data_classification_rules: {
        Row: {
          access_restrictions: Json | null
          classification_id: string | null
          column_name: string
          created_at: string | null
          created_by: string | null
          id: string
          is_pii: boolean | null
          is_sensitive: boolean | null
          masking_rule: string | null
          notes: string | null
          requires_consent: boolean | null
          retention_days: number | null
          table_name: string
          updated_at: string | null
        }
        Insert: {
          access_restrictions?: Json | null
          classification_id?: string | null
          column_name: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_pii?: boolean | null
          is_sensitive?: boolean | null
          masking_rule?: string | null
          notes?: string | null
          requires_consent?: boolean | null
          retention_days?: number | null
          table_name: string
          updated_at?: string | null
        }
        Update: {
          access_restrictions?: Json | null
          classification_id?: string | null
          column_name?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_pii?: boolean | null
          is_sensitive?: boolean | null
          masking_rule?: string | null
          notes?: string | null
          requires_consent?: boolean | null
          retention_days?: number | null
          table_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_classification_rules_classification_id_fkey"
            columns: ["classification_id"]
            isOneToOne: false
            referencedRelation: "data_classification_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      data_consistency_logs: {
        Row: {
          auto_fixed: boolean | null
          created_at: string | null
          fix_actions: Json | null
          id: string
          issue_details: Json | null
          issues_found: number | null
          records_checked: number | null
          severity: string | null
          table_name: string
          validation_timestamp: string
          validation_type: string
        }
        Insert: {
          auto_fixed?: boolean | null
          created_at?: string | null
          fix_actions?: Json | null
          id?: string
          issue_details?: Json | null
          issues_found?: number | null
          records_checked?: number | null
          severity?: string | null
          table_name: string
          validation_timestamp?: string
          validation_type: string
        }
        Update: {
          auto_fixed?: boolean | null
          created_at?: string | null
          fix_actions?: Json | null
          id?: string
          issue_details?: Json | null
          issues_found?: number | null
          records_checked?: number | null
          severity?: string | null
          table_name?: string
          validation_timestamp?: string
          validation_type?: string
        }
        Relationships: []
      }
      data_export_requests: {
        Row: {
          completed_at: string | null
          error_message: string | null
          expires_at: string | null
          export_url: string | null
          id: string
          metadata: Json | null
          requested_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          expires_at?: string | null
          export_url?: string | null
          id?: string
          metadata?: Json | null
          requested_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          expires_at?: string | null
          export_url?: string | null
          id?: string
          metadata?: Json | null
          requested_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      data_integrity_checks: {
        Row: {
          check_type: string
          created_at: string | null
          details: Json | null
          duration_ms: number | null
          id: string
          issues_found: number | null
          status: string
          table_name: string | null
        }
        Insert: {
          check_type: string
          created_at?: string | null
          details?: Json | null
          duration_ms?: number | null
          id?: string
          issues_found?: number | null
          status: string
          table_name?: string | null
        }
        Update: {
          check_type?: string
          created_at?: string | null
          details?: Json | null
          duration_ms?: number | null
          id?: string
          issues_found?: number | null
          status?: string
          table_name?: string | null
        }
        Relationships: []
      }
      deal_loss_reasons: {
        Row: {
          competitor_name: string | null
          could_revisit: boolean | null
          created_at: string | null
          created_by: string | null
          deal_id: string
          detailed_reason: string | null
          id: string
          lost_to_internal: boolean | null
          notes: string | null
          reason_category: string
          revisit_date: string | null
        }
        Insert: {
          competitor_name?: string | null
          could_revisit?: boolean | null
          created_at?: string | null
          created_by?: string | null
          deal_id: string
          detailed_reason?: string | null
          id?: string
          lost_to_internal?: boolean | null
          notes?: string | null
          reason_category: string
          revisit_date?: string | null
        }
        Update: {
          competitor_name?: string | null
          could_revisit?: boolean | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string
          detailed_reason?: string | null
          id?: string
          lost_to_internal?: boolean | null
          notes?: string | null
          reason_category?: string
          revisit_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_loss_reasons_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_stage_conversions: {
        Row: {
          candidate_count: number | null
          conversion_timestamp: string | null
          converted: boolean
          created_at: string | null
          days_in_previous_stage: number | null
          from_stage: string
          id: string
          job_id: string | null
          to_stage: string
        }
        Insert: {
          candidate_count?: number | null
          conversion_timestamp?: string | null
          converted: boolean
          created_at?: string | null
          days_in_previous_stage?: number | null
          from_stage: string
          id?: string
          job_id?: string | null
          to_stage: string
        }
        Update: {
          candidate_count?: number | null
          conversion_timestamp?: string | null
          converted?: boolean
          created_at?: string | null
          days_in_previous_stage?: number | null
          from_stage?: string
          id?: string
          job_id?: string | null
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_stage_conversions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_stage_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          deal_id: string
          duration_days: number | null
          from_stage: string | null
          id: string
          metadata: Json | null
          notes: string | null
          to_stage: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          deal_id: string
          duration_days?: number | null
          from_stage?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          to_stage: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          deal_id?: string
          duration_days?: number | null
          from_stage?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_stage_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_stages: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_terminal: boolean | null
          name: string
          probability_weight: number
          stage_order: number
          stage_type: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_terminal?: boolean | null
          name: string
          probability_weight: number
          stage_order: number
          stage_type: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_terminal?: boolean | null
          name?: string
          probability_weight?: number
          stage_order?: number
          stage_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      deletion_requests: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          id: string
          metadata: Json | null
          reason: string | null
          requested_at: string | null
          scheduled_for: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          requested_at?: string | null
          scheduled_for: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          requested_at?: string | null
          scheduled_for?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      detected_interviews: {
        Row: {
          application_id: string | null
          auto_linked: boolean | null
          calendar_connection_id: string | null
          calendar_event_id: string
          calendar_provider: string
          candidate_id: string | null
          created_at: string
          detected_at: string
          detected_candidates: Json | null
          detected_partners: Json | null
          detected_tqc_members: Json | null
          detection_confidence: string | null
          detection_notes: string | null
          detection_source: string | null
          event_description: string | null
          event_title: string
          id: string
          interview_type: string | null
          interviewer_ids: string[] | null
          job_id: string | null
          linked_at: string | null
          linked_booking_id: string | null
          linked_by: string | null
          location: string | null
          manually_edited: boolean | null
          meeting_link: string | null
          scheduled_end: string
          scheduled_start: string
          status: string
          tqc_organizer_id: string | null
          unknown_attendees: Json | null
          updated_at: string
          user_notes: string | null
        }
        Insert: {
          application_id?: string | null
          auto_linked?: boolean | null
          calendar_connection_id?: string | null
          calendar_event_id: string
          calendar_provider: string
          candidate_id?: string | null
          created_at?: string
          detected_at?: string
          detected_candidates?: Json | null
          detected_partners?: Json | null
          detected_tqc_members?: Json | null
          detection_confidence?: string | null
          detection_notes?: string | null
          detection_source?: string | null
          event_description?: string | null
          event_title: string
          id?: string
          interview_type?: string | null
          interviewer_ids?: string[] | null
          job_id?: string | null
          linked_at?: string | null
          linked_booking_id?: string | null
          linked_by?: string | null
          location?: string | null
          manually_edited?: boolean | null
          meeting_link?: string | null
          scheduled_end: string
          scheduled_start: string
          status?: string
          tqc_organizer_id?: string | null
          unknown_attendees?: Json | null
          updated_at?: string
          user_notes?: string | null
        }
        Update: {
          application_id?: string | null
          auto_linked?: boolean | null
          calendar_connection_id?: string | null
          calendar_event_id?: string
          calendar_provider?: string
          candidate_id?: string | null
          created_at?: string
          detected_at?: string
          detected_candidates?: Json | null
          detected_partners?: Json | null
          detected_tqc_members?: Json | null
          detection_confidence?: string | null
          detection_notes?: string | null
          detection_source?: string | null
          event_description?: string | null
          event_title?: string
          id?: string
          interview_type?: string | null
          interviewer_ids?: string[] | null
          job_id?: string | null
          linked_at?: string | null
          linked_booking_id?: string | null
          linked_by?: string | null
          location?: string | null
          manually_edited?: boolean | null
          meeting_link?: string | null
          scheduled_end?: string
          scheduled_start?: string
          status?: string
          tqc_organizer_id?: string | null
          unknown_attendees?: Json | null
          updated_at?: string
          user_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detected_interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detected_interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications_with_deleted_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detected_interviews_calendar_connection_id_fkey"
            columns: ["calendar_connection_id"]
            isOneToOne: false
            referencedRelation: "calendar_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detected_interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detected_interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "detected_interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "unified_candidate_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detected_interviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detected_interviews_linked_booking_id_fkey"
            columns: ["linked_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detected_interviews_linked_by_fkey"
            columns: ["linked_by"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "detected_interviews_linked_by_fkey"
            columns: ["linked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detected_interviews_linked_by_fkey"
            columns: ["linked_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detected_interviews_tqc_organizer_id_fkey"
            columns: ["tqc_organizer_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "detected_interviews_tqc_organizer_id_fkey"
            columns: ["tqc_organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detected_interviews_tqc_organizer_id_fkey"
            columns: ["tqc_organizer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_replies: {
        Row: {
          content: string
          created_at: string | null
          discussion_id: string | null
          id: string
          is_accepted_answer: boolean | null
          is_expert_answer: boolean | null
          updated_at: string | null
          upvotes: number | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          discussion_id?: string | null
          id?: string
          is_accepted_answer?: boolean | null
          is_expert_answer?: boolean | null
          updated_at?: string | null
          upvotes?: number | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          discussion_id?: string | null
          id?: string
          is_accepted_answer?: boolean | null
          is_expert_answer?: boolean | null
          updated_at?: string | null
          upvotes?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discussion_replies_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "module_discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      dismissed_jobs: {
        Row: {
          created_at: string | null
          job_id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          job_id: string
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          job_id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dismissed_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      dj_queue: {
        Row: {
          created_at: string
          id: string
          is_playing: boolean | null
          played_at: string | null
          playlist_id: string | null
          position: number
          track_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_playing?: boolean | null
          played_at?: string | null
          playlist_id?: string | null
          position: number
          track_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_playing?: boolean | null
          played_at?: string | null
          playlist_id?: string | null
          position?: number
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dj_queue_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dj_queue_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier_shares: {
        Row: {
          allowed_domains: string[] | null
          candidate_id: string
          created_at: string
          expires_at: string
          id: string
          is_revoked: boolean
          max_views: number | null
          metadata: Json | null
          revoked_at: string | null
          revoked_by: string | null
          shared_by: string
          token: string
          updated_at: string
          view_count: number
          watermark_text: string | null
        }
        Insert: {
          allowed_domains?: string[] | null
          candidate_id: string
          created_at?: string
          expires_at: string
          id?: string
          is_revoked?: boolean
          max_views?: number | null
          metadata?: Json | null
          revoked_at?: string | null
          revoked_by?: string | null
          shared_by: string
          token: string
          updated_at?: string
          view_count?: number
          watermark_text?: string | null
        }
        Update: {
          allowed_domains?: string[] | null
          candidate_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_revoked?: boolean
          max_views?: number | null
          metadata?: Json | null
          revoked_at?: string | null
          revoked_by?: string | null
          shared_by?: string
          token?: string
          updated_at?: string
          view_count?: number
          watermark_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dossier_shares_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossier_shares_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "dossier_shares_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "unified_candidate_view"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier_views: {
        Row: {
          dossier_share_id: string
          id: string
          ip_address: unknown
          metadata: Json | null
          user_agent: string | null
          view_duration_seconds: number | null
          viewed_at: string
          viewer_company: string | null
          viewer_email: string | null
          viewer_name: string | null
        }
        Insert: {
          dossier_share_id: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
          view_duration_seconds?: number | null
          viewed_at?: string
          viewer_company?: string | null
          viewer_email?: string | null
          viewer_name?: string | null
        }
        Update: {
          dossier_share_id?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
          view_duration_seconds?: number | null
          viewed_at?: string
          viewer_company?: string | null
          viewer_email?: string | null
          viewer_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dossier_views_dossier_share_id_fkey"
            columns: ["dossier_share_id"]
            isOneToOne: false
            referencedRelation: "dossier_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      dr_compliance_audit: {
        Row: {
          audit_date: string
          audit_type: string
          auditor: string | null
          compliance_framework: string | null
          control_id: string | null
          created_at: string | null
          evidence: Json | null
          finding_details: string | null
          finding_type: string | null
          id: string
          remediation_due_date: string | null
          remediation_required: boolean | null
        }
        Insert: {
          audit_date?: string
          audit_type: string
          auditor?: string | null
          compliance_framework?: string | null
          control_id?: string | null
          created_at?: string | null
          evidence?: Json | null
          finding_details?: string | null
          finding_type?: string | null
          id?: string
          remediation_due_date?: string | null
          remediation_required?: boolean | null
        }
        Update: {
          audit_date?: string
          audit_type?: string
          auditor?: string | null
          compliance_framework?: string | null
          control_id?: string | null
          created_at?: string | null
          evidence?: Json | null
          finding_details?: string | null
          finding_type?: string | null
          id?: string
          remediation_due_date?: string | null
          remediation_required?: boolean | null
        }
        Relationships: []
      }
      dr_contacts: {
        Row: {
          availability_schedule: Json | null
          contact_name: string
          created_at: string | null
          email: string
          escalation_level: number
          id: string
          is_active: boolean | null
          phone: string | null
          role: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          availability_schedule?: Json | null
          contact_name: string
          created_at?: string | null
          email: string
          escalation_level: number
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          availability_schedule?: Json | null
          contact_name?: string
          created_at?: string | null
          email?: string
          escalation_level?: number
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      dr_drill_results: {
        Row: {
          action_items: Json | null
          created_at: string | null
          drill_id: string | null
          executed_at: string
          id: string
          issues_found: string[] | null
          lessons_learned: string[] | null
          participants_feedback: Json | null
          rpo_achieved_minutes: number | null
          rto_achieved_minutes: number | null
          success_score: number | null
        }
        Insert: {
          action_items?: Json | null
          created_at?: string | null
          drill_id?: string | null
          executed_at?: string
          id?: string
          issues_found?: string[] | null
          lessons_learned?: string[] | null
          participants_feedback?: Json | null
          rpo_achieved_minutes?: number | null
          rto_achieved_minutes?: number | null
          success_score?: number | null
        }
        Update: {
          action_items?: Json | null
          created_at?: string | null
          drill_id?: string | null
          executed_at?: string
          id?: string
          issues_found?: string[] | null
          lessons_learned?: string[] | null
          participants_feedback?: Json | null
          rpo_achieved_minutes?: number | null
          rto_achieved_minutes?: number | null
          success_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dr_drill_results_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "dr_drill_schedule"
            referencedColumns: ["id"]
          },
        ]
      }
      dr_drill_schedule: {
        Row: {
          created_at: string | null
          drill_name: string
          drill_type: string
          duration_hours: number
          id: string
          objectives: string[] | null
          participants: string[] | null
          scheduled_for: string
          status: string | null
          success_criteria: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          drill_name: string
          drill_type: string
          duration_hours?: number
          id?: string
          objectives?: string[] | null
          participants?: string[] | null
          scheduled_for: string
          status?: string | null
          success_criteria?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          drill_name?: string
          drill_type?: string
          duration_hours?: number
          id?: string
          objectives?: string[] | null
          participants?: string[] | null
          scheduled_for?: string
          status?: string | null
          success_criteria?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_attachments: {
        Row: {
          content_id: string | null
          created_at: string | null
          email_id: string
          external_id: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          is_inline: boolean | null
          mime_type: string | null
          storage_path: string | null
        }
        Insert: {
          content_id?: string | null
          created_at?: string | null
          email_id: string
          external_id?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_inline?: boolean | null
          mime_type?: string | null
          storage_path?: string | null
        }
        Update: {
          content_id?: string | null
          created_at?: string | null
          email_id?: string
          external_id?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_inline?: boolean | null
          mime_type?: string | null
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_attachments_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
        ]
      }
      email_connections: {
        Row: {
          access_token: string
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          label: string
          last_sync_at: string | null
          provider: string
          refresh_token: string | null
          scopes: Json | null
          sync_enabled: boolean | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          label: string
          last_sync_at?: string | null
          provider: string
          refresh_token?: string | null
          scopes?: Json | null
          sync_enabled?: boolean | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          label?: string
          last_sync_at?: string | null
          provider?: string
          refresh_token?: string | null
          scopes?: Json | null
          sync_enabled?: boolean | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_drafts: {
        Row: {
          ai_suggestions: Json | null
          ai_template_used: string | null
          ai_tone: string | null
          attachments: Json | null
          bcc_emails: Json | null
          body_html: string | null
          body_text: string | null
          cc_emails: Json | null
          connection_id: string | null
          created_at: string | null
          id: string
          is_scheduled: boolean | null
          reply_to_email_id: string | null
          scheduled_for: string | null
          subject: string | null
          to_emails: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_suggestions?: Json | null
          ai_template_used?: string | null
          ai_tone?: string | null
          attachments?: Json | null
          bcc_emails?: Json | null
          body_html?: string | null
          body_text?: string | null
          cc_emails?: Json | null
          connection_id?: string | null
          created_at?: string | null
          id?: string
          is_scheduled?: boolean | null
          reply_to_email_id?: string | null
          scheduled_for?: string | null
          subject?: string | null
          to_emails: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_suggestions?: Json | null
          ai_template_used?: string | null
          ai_tone?: string | null
          attachments?: Json | null
          bcc_emails?: Json | null
          body_html?: string | null
          body_text?: string | null
          cc_emails?: Json | null
          connection_id?: string | null
          created_at?: string | null
          id?: string
          is_scheduled?: boolean | null
          reply_to_email_id?: string | null
          scheduled_for?: string | null
          subject?: string | null
          to_emails?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_drafts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "email_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_drafts_reply_to_email_id_fkey"
            columns: ["reply_to_email_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
        ]
      }
      email_follow_ups: {
        Row: {
          created_at: string
          email_id: string
          follow_up_date: string
          follow_up_type: string
          id: string
          metadata: Json | null
          reminder_sent: boolean | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_id: string
          follow_up_date: string
          follow_up_type: string
          id?: string
          metadata?: Json | null
          reminder_sent?: boolean | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_id?: string
          follow_up_date?: string
          follow_up_type?: string
          id?: string
          metadata?: Json | null
          reminder_sent?: boolean | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_follow_ups_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
        ]
      }
      email_label_mappings: {
        Row: {
          created_at: string | null
          email_id: string
          id: string
          label_id: string
        }
        Insert: {
          created_at?: string | null
          email_id: string
          id?: string
          label_id: string
        }
        Update: {
          created_at?: string | null
          email_id?: string
          id?: string
          label_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_label_mappings_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_label_mappings_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "email_labels"
            referencedColumns: ["id"]
          },
        ]
      }
      email_labels: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          name: string
          sort_order: number | null
          type: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          sort_order?: number | null
          type?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_learning_queue: {
        Row: {
          body_html: string | null
          body_text: string | null
          company_id: string | null
          created_at: string | null
          from_email: string
          id: string
          interaction_id: string | null
          metadata: Json | null
          processed: boolean | null
          processed_at: string | null
          processing_error: string | null
          received_at: string | null
          subject: string | null
          to_email: string
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          company_id?: string | null
          created_at?: string | null
          from_email: string
          id?: string
          interaction_id?: string | null
          metadata?: Json | null
          processed?: boolean | null
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string | null
          subject?: string | null
          to_email: string
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          company_id?: string | null
          created_at?: string | null
          from_email?: string
          id?: string
          interaction_id?: string | null
          metadata?: Json | null
          processed?: boolean | null
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string | null
          subject?: string | null
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_learning_queue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_learning_queue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_learning_queue_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "company_interactions"
            referencedColumns: ["id"]
          },
        ]
      }
      email_meetings: {
        Row: {
          calendar_event_created: boolean | null
          created_at: string
          email_id: string
          id: string
          meeting_date: string | null
          meeting_duration_minutes: number | null
          meeting_location: string | null
          meeting_title: string | null
          metadata: Json | null
          participants: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_event_created?: boolean | null
          created_at?: string
          email_id: string
          id?: string
          meeting_date?: string | null
          meeting_duration_minutes?: number | null
          meeting_location?: string | null
          meeting_title?: string | null
          metadata?: Json | null
          participants?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_event_created?: boolean | null
          created_at?: string
          email_id?: string
          id?: string
          meeting_date?: string | null
          meeting_duration_minutes?: number | null
          meeting_location?: string | null
          meeting_title?: string | null
          metadata?: Json | null
          participants?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_meetings_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
        ]
      }
      email_relationships: {
        Row: {
          avg_response_time_hours: number | null
          avg_sentiment: string | null
          contact_email: string
          contact_name: string | null
          created_at: string
          id: string
          last_email_at: string | null
          metadata: Json | null
          relationship_strength: string | null
          total_emails: number | null
          total_received: number | null
          total_sent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_response_time_hours?: number | null
          avg_sentiment?: string | null
          contact_email: string
          contact_name?: string | null
          created_at?: string
          id?: string
          last_email_at?: string | null
          metadata?: Json | null
          relationship_strength?: string | null
          total_emails?: number | null
          total_received?: number | null
          total_sent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_response_time_hours?: number | null
          avg_sentiment?: string | null
          contact_email?: string
          contact_name?: string | null
          created_at?: string
          id?: string
          last_email_at?: string | null
          metadata?: Json | null
          relationship_strength?: string | null
          total_emails?: number | null
          total_received?: number | null
          total_sent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_sync_log: {
        Row: {
          completed_at: string | null
          connection_id: string
          emails_fetched: number | null
          errors: Json | null
          id: string
          started_at: string | null
          status: string | null
          sync_type: string | null
        }
        Insert: {
          completed_at?: string | null
          connection_id: string
          emails_fetched?: number | null
          errors?: Json | null
          id?: string
          started_at?: string | null
          status?: string | null
          sync_type?: string | null
        }
        Update: {
          completed_at?: string | null
          connection_id?: string
          emails_fetched?: number | null
          errors?: Json | null
          id?: string
          started_at?: string | null
          status?: string | null
          sync_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sync_log_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "email_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          category: string
          content_template: Json
          created_at: string | null
          description: string | null
          edge_function: string | null
          id: string
          is_enabled: boolean | null
          last_modified_at: string | null
          last_modified_by: string | null
          name: string
          subject_template: string
          template_key: string
          variables: Json | null
        }
        Insert: {
          category: string
          content_template: Json
          created_at?: string | null
          description?: string | null
          edge_function?: string | null
          id?: string
          is_enabled?: boolean | null
          last_modified_at?: string | null
          last_modified_by?: string | null
          name: string
          subject_template: string
          template_key: string
          variables?: Json | null
        }
        Update: {
          category?: string
          content_template?: Json
          created_at?: string | null
          description?: string | null
          edge_function?: string | null
          id?: string
          is_enabled?: boolean | null
          last_modified_at?: string | null
          last_modified_by?: string | null
          name?: string
          subject_template?: string
          template_key?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "email_templates_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_threads: {
        Row: {
          ai_thread_summary: string | null
          created_at: string | null
          id: string
          last_message_at: string | null
          message_count: number | null
          participant_emails: Json | null
          subject: string | null
          thread_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_thread_summary?: string | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          participant_emails?: Json | null
          subject?: string | null
          thread_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_thread_summary?: string | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          participant_emails?: Json | null
          subject?: string | null
          thread_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_verifications: {
        Row: {
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      emails: {
        Row: {
          ai_action_items: Json | null
          ai_category: string | null
          ai_priority: number | null
          ai_priority_reason: string | null
          ai_priority_score: number | null
          ai_processed_at: string | null
          ai_sentiment: string | null
          ai_summary: string | null
          archived_at: string | null
          assigned_to: string | null
          attachment_count: number | null
          bcc_emails: Json | null
          body_html: string | null
          body_text: string | null
          cc_emails: Json | null
          connection_id: string
          created_at: string | null
          deleted_at: string | null
          email_date: string
          external_id: string
          from_avatar_url: string | null
          from_email: string
          from_name: string | null
          has_attachments: boolean | null
          id: string
          inbox_type: string | null
          is_important: boolean | null
          is_read: boolean | null
          is_starred: boolean | null
          metadata: Json | null
          raw_headers: Json | null
          read_at: string | null
          received_at: string | null
          reminder_at: string | null
          reply_to: string | null
          snippet: string | null
          snoozed_until: string | null
          status: string
          subject: string
          thread_id: string | null
          to_emails: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_action_items?: Json | null
          ai_category?: string | null
          ai_priority?: number | null
          ai_priority_reason?: string | null
          ai_priority_score?: number | null
          ai_processed_at?: string | null
          ai_sentiment?: string | null
          ai_summary?: string | null
          archived_at?: string | null
          assigned_to?: string | null
          attachment_count?: number | null
          bcc_emails?: Json | null
          body_html?: string | null
          body_text?: string | null
          cc_emails?: Json | null
          connection_id: string
          created_at?: string | null
          deleted_at?: string | null
          email_date: string
          external_id: string
          from_avatar_url?: string | null
          from_email: string
          from_name?: string | null
          has_attachments?: boolean | null
          id?: string
          inbox_type?: string | null
          is_important?: boolean | null
          is_read?: boolean | null
          is_starred?: boolean | null
          metadata?: Json | null
          raw_headers?: Json | null
          read_at?: string | null
          received_at?: string | null
          reminder_at?: string | null
          reply_to?: string | null
          snippet?: string | null
          snoozed_until?: string | null
          status?: string
          subject: string
          thread_id?: string | null
          to_emails: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_action_items?: Json | null
          ai_category?: string | null
          ai_priority?: number | null
          ai_priority_reason?: string | null
          ai_priority_score?: number | null
          ai_processed_at?: string | null
          ai_sentiment?: string | null
          ai_summary?: string | null
          archived_at?: string | null
          assigned_to?: string | null
          attachment_count?: number | null
          bcc_emails?: Json | null
          body_html?: string | null
          body_text?: string | null
          cc_emails?: Json | null
          connection_id?: string
          created_at?: string | null
          deleted_at?: string | null
          email_date?: string
          external_id?: string
          from_avatar_url?: string | null
          from_email?: string
          from_name?: string | null
          has_attachments?: boolean | null
          id?: string
          inbox_type?: string | null
          is_important?: boolean | null
          is_read?: boolean | null
          is_starred?: boolean | null
          metadata?: Json | null
          raw_headers?: Json | null
          read_at?: string | null
          received_at?: string | null
          reminder_at?: string | null
          reply_to?: string | null
          snippet?: string | null
          snoozed_until?: string | null
          status?: string
          subject?: string
          thread_id?: string | null
          to_emails?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emails_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "email_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_relationships: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          relationship_type: string
          source_id: string
          source_type: string
          strength: number | null
          target_id: string
          target_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          relationship_type: string
          source_id: string
          source_type: string
          strength?: number | null
          target_id: string
          target_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          relationship_type?: string
          source_id?: string
          source_type?: string
          strength?: number | null
          target_id?: string
          target_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          component_name: string | null
          created_at: string | null
          error_message: string
          error_stack: string | null
          error_type: string
          id: string
          metadata: Json | null
          page_url: string | null
          resolved: boolean | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          component_name?: string | null
          created_at?: string | null
          error_message: string
          error_stack?: string | null
          error_type: string
          id?: string
          metadata?: Json | null
          page_url?: string | null
          resolved?: boolean | null
          severity: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          component_name?: string | null
          created_at?: string | null
          error_message?: string
          error_stack?: string | null
          error_type?: string
          id?: string
          metadata?: Json | null
          page_url?: string | null
          resolved?: boolean | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      expert_availability: {
        Row: {
          day_of_week: number
          end_time: string
          expert_id: string | null
          id: string
          is_active: boolean | null
          start_time: string
        }
        Insert: {
          day_of_week: number
          end_time: string
          expert_id?: string | null
          id?: string
          is_active?: boolean | null
          start_time: string
        }
        Update: {
          day_of_week?: number
          end_time?: string
          expert_id?: string | null
          id?: string
          is_active?: boolean | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "expert_availability_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "expert_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_profiles: {
        Row: {
          avg_rating: number | null
          badge_level: string | null
          bio: string | null
          created_at: string | null
          credentials: Json | null
          expertise_areas: Json | null
          id: string
          is_verified: boolean | null
          social_links: Json | null
          total_learners: number | null
          total_modules: number | null
          updated_at: string | null
          user_id: string
          verification_date: string | null
        }
        Insert: {
          avg_rating?: number | null
          badge_level?: string | null
          bio?: string | null
          created_at?: string | null
          credentials?: Json | null
          expertise_areas?: Json | null
          id?: string
          is_verified?: boolean | null
          social_links?: Json | null
          total_learners?: number | null
          total_modules?: number | null
          updated_at?: string | null
          user_id: string
          verification_date?: string | null
        }
        Update: {
          avg_rating?: number | null
          badge_level?: string | null
          bio?: string | null
          created_at?: string | null
          credentials?: Json | null
          expertise_areas?: Json | null
          id?: string
          is_verified?: boolean | null
          social_links?: Json | null
          total_learners?: number | null
          total_modules?: number | null
          updated_at?: string | null
          user_id?: string
          verification_date?: string | null
        }
        Relationships: []
      }
      expert_sessions: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          expert_id: string | null
          id: string
          learner_id: string | null
          meeting_link: string | null
          module_id: string | null
          notes: string | null
          scheduled_at: string
          session_type: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number | null
          expert_id?: string | null
          id?: string
          learner_id?: string | null
          meeting_link?: string | null
          module_id?: string | null
          notes?: string | null
          scheduled_at: string
          session_type?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number | null
          expert_id?: string | null
          id?: string
          learner_id?: string | null
          meeting_link?: string | null
          module_id?: string | null
          notes?: string | null
          scheduled_at?: string
          session_type?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expert_sessions_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "expert_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expert_sessions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      external_health_checks: {
        Row: {
          check_source: string
          check_timestamp: string
          created_at: string | null
          endpoint_type: string
          endpoint_url: string
          error_message: string | null
          geographic_region: string | null
          id: string
          is_healthy: boolean
          response_time_ms: number | null
          status_code: number | null
        }
        Insert: {
          check_source: string
          check_timestamp?: string
          created_at?: string | null
          endpoint_type: string
          endpoint_url: string
          error_message?: string | null
          geographic_region?: string | null
          id?: string
          is_healthy: boolean
          response_time_ms?: number | null
          status_code?: number | null
        }
        Update: {
          check_source?: string
          check_timestamp?: string
          created_at?: string | null
          endpoint_type?: string
          endpoint_url?: string
          error_message?: string | null
          geographic_region?: string | null
          id?: string
          is_healthy?: boolean
          response_time_ms?: number | null
          status_code?: number | null
        }
        Relationships: []
      }
      financial_forecasts: {
        Row: {
          actual_revenue: number | null
          confidence_level: string | null
          created_at: string | null
          forecast_month: string
          id: string
          metadata: Json | null
          predicted_placement_revenue: number | null
          predicted_subscription_revenue: number | null
          updated_at: string | null
          variance_percentage: number | null
        }
        Insert: {
          actual_revenue?: number | null
          confidence_level?: string | null
          created_at?: string | null
          forecast_month: string
          id?: string
          metadata?: Json | null
          predicted_placement_revenue?: number | null
          predicted_subscription_revenue?: number | null
          updated_at?: string | null
          variance_percentage?: number | null
        }
        Update: {
          actual_revenue?: number | null
          confidence_level?: string | null
          created_at?: string | null
          forecast_month?: string
          id?: string
          metadata?: Json | null
          predicted_placement_revenue?: number | null
          predicted_subscription_revenue?: number | null
          updated_at?: string | null
          variance_percentage?: number | null
        }
        Relationships: []
      }
      financial_settings: {
        Row: {
          bank_account_iban: string | null
          bank_account_swift: string | null
          bank_name: string | null
          company_id: string | null
          company_registration_number: string | null
          created_at: string | null
          currency_code: string | null
          default_payment_terms_days: number | null
          default_placement_fee_percentage: number | null
          enable_stripe_payments: boolean | null
          id: string
          invoice_footer_notes: string | null
          invoice_prefix: string | null
          next_invoice_number: number | null
          stripe_account_id: string | null
          tax_rate: number | null
          updated_at: string | null
          vat_number: string | null
        }
        Insert: {
          bank_account_iban?: string | null
          bank_account_swift?: string | null
          bank_name?: string | null
          company_id?: string | null
          company_registration_number?: string | null
          created_at?: string | null
          currency_code?: string | null
          default_payment_terms_days?: number | null
          default_placement_fee_percentage?: number | null
          enable_stripe_payments?: boolean | null
          id?: string
          invoice_footer_notes?: string | null
          invoice_prefix?: string | null
          next_invoice_number?: number | null
          stripe_account_id?: string | null
          tax_rate?: number | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Update: {
          bank_account_iban?: string | null
          bank_account_swift?: string | null
          bank_name?: string | null
          company_id?: string | null
          company_registration_number?: string | null
          created_at?: string | null
          currency_code?: string | null
          default_payment_terms_days?: number | null
          default_placement_fee_percentage?: number | null
          enable_stripe_payments?: boolean | null
          id?: string
          invoice_footer_notes?: string | null
          invoice_prefix?: string | null
          next_invoice_number?: number | null
          stripe_account_id?: string | null
          tax_rate?: number | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_analytics: {
        Row: {
          action: string
          created_at: string
          id: string
          session_id: string
          source_channel: string | null
          step_name: string
          step_number: number
          time_on_step_seconds: number | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          session_id: string
          source_channel?: string | null
          step_name: string
          step_number: number
          time_on_step_seconds?: number | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          session_id?: string
          source_channel?: string | null
          step_name?: string
          step_number?: number
          time_on_step_seconds?: number | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      funnel_config: {
        Row: {
          created_at: string
          custom_questions: Json
          custom_steps: Json
          id: string
          is_active: boolean
          live_stats: Json
          social_proof_items: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_questions?: Json
          custom_steps?: Json
          id?: string
          is_active?: boolean
          live_stats?: Json
          social_proof_items?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_questions?: Json
          custom_steps?: Json
          id?: string
          is_active?: boolean
          live_stats?: Json
          social_proof_items?: Json
          updated_at?: string
        }
        Relationships: []
      }
      hashtags: {
        Row: {
          category: string | null
          created_at: string
          id: string
          last_used_at: string | null
          metadata: Json | null
          platform: string
          tag: string
          trending_score: number | null
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          last_used_at?: string | null
          metadata?: Json | null
          platform: string
          tag: string
          trending_score?: number | null
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          last_used_at?: string | null
          metadata?: Json | null
          platform?: string
          tag?: string
          trending_score?: number | null
          usage_count?: number | null
        }
        Relationships: []
      }
      hiring_manager_profiles: {
        Row: {
          common_questions: Json | null
          communication_style: string | null
          company_id: string | null
          created_at: string | null
          cultural_priorities: Json | null
          decision_patterns: Json | null
          email: string | null
          focus_areas: string[] | null
          full_name: string | null
          id: string
          interview_style: string | null
          last_analyzed_at: string | null
          meetings_analyzed: number | null
          question_difficulty_level: string | null
          typical_interview_duration_mins: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          common_questions?: Json | null
          communication_style?: string | null
          company_id?: string | null
          created_at?: string | null
          cultural_priorities?: Json | null
          decision_patterns?: Json | null
          email?: string | null
          focus_areas?: string[] | null
          full_name?: string | null
          id?: string
          interview_style?: string | null
          last_analyzed_at?: string | null
          meetings_analyzed?: number | null
          question_difficulty_level?: string | null
          typical_interview_duration_mins?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          common_questions?: Json | null
          communication_style?: string | null
          company_id?: string | null
          created_at?: string | null
          cultural_priorities?: Json | null
          decision_patterns?: Json | null
          email?: string | null
          focus_areas?: string[] | null
          full_name?: string | null
          id?: string
          interview_style?: string | null
          last_analyzed_at?: string | null
          meetings_analyzed?: number | null
          question_difficulty_level?: string | null
          typical_interview_duration_mins?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hiring_manager_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hiring_manager_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_logs: {
        Row: {
          acknowledged_at: string | null
          actual_rpo_minutes: number | null
          actual_rto_minutes: number | null
          affected_services: string[] | null
          affected_users_count: number | null
          assigned_to: string | null
          closed_at: string | null
          created_at: string | null
          description: string | null
          detected_at: string
          detected_by: string | null
          id: string
          incident_id: string
          metadata: Json | null
          postmortem_url: string | null
          resolution_notes: string | null
          resolved_at: string | null
          root_cause: string | null
          severity: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          actual_rpo_minutes?: number | null
          actual_rto_minutes?: number | null
          affected_services?: string[] | null
          affected_users_count?: number | null
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string | null
          description?: string | null
          detected_at?: string
          detected_by?: string | null
          id?: string
          incident_id: string
          metadata?: Json | null
          postmortem_url?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          severity: string
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          actual_rpo_minutes?: number | null
          actual_rto_minutes?: number | null
          affected_services?: string[] | null
          affected_users_count?: number | null
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string | null
          description?: string | null
          detected_at?: string
          detected_by?: string | null
          id?: string
          incident_id?: string
          metadata?: Json | null
          postmortem_url?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_logs_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "incident_logs_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_logs_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_response_actions: {
        Row: {
          action_details: Json | null
          action_type: string
          automated: boolean | null
          created_at: string | null
          id: string
          incident_id: string | null
          performed_at: string
          performed_by: string | null
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          automated?: boolean | null
          created_at?: string | null
          id?: string
          incident_id?: string | null
          performed_at?: string
          performed_by?: string | null
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          automated?: boolean | null
          created_at?: string | null
          id?: string
          incident_id?: string | null
          performed_at?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_response_actions_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incident_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      incubator_actions: {
        Row: {
          action_type: string
          ai_response: string | null
          created_at: string | null
          edit_delta: Json | null
          id: string
          payload: Json | null
          prompt_text: string | null
          response_action: string | null
          session_id: string
          timestamp_ms: number
          tokens_used: number | null
          tool_used: string | null
        }
        Insert: {
          action_type: string
          ai_response?: string | null
          created_at?: string | null
          edit_delta?: Json | null
          id?: string
          payload?: Json | null
          prompt_text?: string | null
          response_action?: string | null
          session_id: string
          timestamp_ms: number
          tokens_used?: number | null
          tool_used?: string | null
        }
        Update: {
          action_type?: string
          ai_response?: string | null
          created_at?: string | null
          edit_delta?: Json | null
          id?: string
          payload?: Json | null
          prompt_text?: string | null
          response_action?: string | null
          session_id?: string
          timestamp_ms?: number
          tokens_used?: number | null
          tool_used?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incubator_actions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "incubator_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      incubator_scoring_evidence: {
        Row: {
          created_at: string | null
          evidence_snippets: Json | null
          id: string
          llm_rationale: string | null
          normalized_score: number | null
          raw_score: number | null
          rubric_component: string
          session_id: string
        }
        Insert: {
          created_at?: string | null
          evidence_snippets?: Json | null
          id?: string
          llm_rationale?: string | null
          normalized_score?: number | null
          raw_score?: number | null
          rubric_component: string
          session_id: string
        }
        Update: {
          created_at?: string | null
          evidence_snippets?: Json | null
          id?: string
          llm_rationale?: string | null
          normalized_score?: number | null
          raw_score?: number | null
          rubric_component?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incubator_scoring_evidence_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "incubator_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      incubator_sessions: {
        Row: {
          ai_collab_score: number | null
          assessment_result_id: string | null
          brief_completed_at: string | null
          build_completed_at: string | null
          capability_vector: Json | null
          communication_score: number | null
          created_at: string | null
          final_plan: Json | null
          frame_completed_at: string | null
          frame_customer: string | null
          frame_problem: string | null
          frame_success_metric: string | null
          id: string
          normalized_score: number | null
          plan_quality_score: number | null
          scenario_difficulty: number | null
          scenario_seed: Json
          started_at: string | null
          submitted_at: string | null
          total_score: number | null
          updated_at: string | null
          user_id: string
          voice_rationale_transcript: string | null
          voice_rationale_url: string | null
          word_count: number | null
        }
        Insert: {
          ai_collab_score?: number | null
          assessment_result_id?: string | null
          brief_completed_at?: string | null
          build_completed_at?: string | null
          capability_vector?: Json | null
          communication_score?: number | null
          created_at?: string | null
          final_plan?: Json | null
          frame_completed_at?: string | null
          frame_customer?: string | null
          frame_problem?: string | null
          frame_success_metric?: string | null
          id?: string
          normalized_score?: number | null
          plan_quality_score?: number | null
          scenario_difficulty?: number | null
          scenario_seed: Json
          started_at?: string | null
          submitted_at?: string | null
          total_score?: number | null
          updated_at?: string | null
          user_id: string
          voice_rationale_transcript?: string | null
          voice_rationale_url?: string | null
          word_count?: number | null
        }
        Update: {
          ai_collab_score?: number | null
          assessment_result_id?: string | null
          brief_completed_at?: string | null
          build_completed_at?: string | null
          capability_vector?: Json | null
          communication_score?: number | null
          created_at?: string | null
          final_plan?: Json | null
          frame_completed_at?: string | null
          frame_customer?: string | null
          frame_problem?: string | null
          frame_success_metric?: string | null
          id?: string
          normalized_score?: number | null
          plan_quality_score?: number | null
          scenario_difficulty?: number | null
          scenario_seed?: Json
          started_at?: string | null
          submitted_at?: string | null
          total_score?: number | null
          updated_at?: string | null
          user_id?: string
          voice_rationale_transcript?: string | null
          voice_rationale_url?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "incubator_sessions_assessment_result_id_fkey"
            columns: ["assessment_result_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_processing_errors: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          error_details: Json | null
          error_message: string
          function_name: string
          id: string
          last_retry_at: string | null
          resolved: boolean | null
          resolved_at: string | null
          retry_count: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          error_details?: Json | null
          error_message: string
          function_name: string
          id?: string
          last_retry_at?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          retry_count?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          error_details?: Json | null
          error_message?: string
          function_name?: string
          id?: string
          last_retry_at?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          retry_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      intelligence_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          entity_id: string
          entity_type: string
          error_message: string | null
          id: string
          priority: number | null
          processed_at: string | null
          processing_type: string
          status: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          error_message?: string | null
          id?: string
          priority?: number | null
          processed_at?: string | null
          processing_type: string
          status?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          id?: string
          priority?: number | null
          processed_at?: string | null
          processing_type?: string
          status?: string | null
        }
        Relationships: []
      }
      interaction_insights: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          evidence_quotes: string[] | null
          extracted_budget: number | null
          extracted_date: string | null
          extracted_headcount: number | null
          id: string
          insight_text: string
          insight_type: string | null
          interaction_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          evidence_quotes?: string[] | null
          extracted_budget?: number | null
          extracted_date?: string | null
          extracted_headcount?: number | null
          id?: string
          insight_text: string
          insight_type?: string | null
          interaction_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          evidence_quotes?: string[] | null
          extracted_budget?: number | null
          extracted_date?: string | null
          extracted_headcount?: number | null
          id?: string
          insight_text?: string
          insight_type?: string | null
          interaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interaction_insights_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "company_interactions"
            referencedColumns: ["id"]
          },
        ]
      }
      interaction_messages: {
        Row: {
          contains_question: boolean | null
          created_at: string | null
          id: string
          interaction_id: string | null
          message_content: string
          message_index: number | null
          message_timestamp: string
          sender_name: string
          sender_stakeholder_id: string | null
          sentiment_score: number | null
          urgency_markers: string[] | null
        }
        Insert: {
          contains_question?: boolean | null
          created_at?: string | null
          id?: string
          interaction_id?: string | null
          message_content: string
          message_index?: number | null
          message_timestamp: string
          sender_name: string
          sender_stakeholder_id?: string | null
          sentiment_score?: number | null
          urgency_markers?: string[] | null
        }
        Update: {
          contains_question?: boolean | null
          created_at?: string | null
          id?: string
          interaction_id?: string | null
          message_content?: string
          message_index?: number | null
          message_timestamp?: string
          sender_name?: string
          sender_stakeholder_id?: string | null
          sentiment_score?: number | null
          urgency_markers?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "interaction_messages_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "company_interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interaction_messages_sender_stakeholder_id_fkey"
            columns: ["sender_stakeholder_id"]
            isOneToOne: false
            referencedRelation: "company_stakeholders"
            referencedColumns: ["id"]
          },
        ]
      }
      interaction_ml_features: {
        Row: {
          computed_at: string | null
          entity_id: string
          entity_type: string | null
          features: Json
          id: string
          period_end: string
          period_start: string
        }
        Insert: {
          computed_at?: string | null
          entity_id: string
          entity_type?: string | null
          features: Json
          id?: string
          period_end: string
          period_start: string
        }
        Update: {
          computed_at?: string | null
          entity_id?: string
          entity_type?: string | null
          features?: Json
          id?: string
          period_end?: string
          period_start?: string
        }
        Relationships: []
      }
      interaction_participants: {
        Row: {
          created_at: string | null
          engagement_score: number | null
          id: string
          interaction_id: string | null
          mentioned_only: boolean | null
          participation_type: string | null
          stakeholder_id: string | null
        }
        Insert: {
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          interaction_id?: string | null
          mentioned_only?: boolean | null
          participation_type?: string | null
          stakeholder_id?: string | null
        }
        Update: {
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          interaction_id?: string | null
          mentioned_only?: boolean | null
          participation_type?: string | null
          stakeholder_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interaction_participants_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "company_interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interaction_participants_stakeholder_id_fkey"
            columns: ["stakeholder_id"]
            isOneToOne: false
            referencedRelation: "company_stakeholders"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_feedback: {
        Row: {
          application_id: string
          booking_id: string
          communication_score: number | null
          concerns: string[] | null
          culture_fit_score: number | null
          detailed_notes: string | null
          id: string
          interview_stage_index: number
          interviewer_id: string
          is_final: boolean | null
          key_observations: string[] | null
          overall_rating: number | null
          questions_asked: Json | null
          recommendation: string
          red_flags: string[] | null
          standout_moments: string[] | null
          strengths: string[] | null
          submitted_at: string | null
          technical_score: number | null
          updated_at: string | null
        }
        Insert: {
          application_id: string
          booking_id: string
          communication_score?: number | null
          concerns?: string[] | null
          culture_fit_score?: number | null
          detailed_notes?: string | null
          id?: string
          interview_stage_index: number
          interviewer_id: string
          is_final?: boolean | null
          key_observations?: string[] | null
          overall_rating?: number | null
          questions_asked?: Json | null
          recommendation: string
          red_flags?: string[] | null
          standout_moments?: string[] | null
          strengths?: string[] | null
          submitted_at?: string | null
          technical_score?: number | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          booking_id?: string
          communication_score?: number | null
          concerns?: string[] | null
          culture_fit_score?: number | null
          detailed_notes?: string | null
          id?: string
          interview_stage_index?: number
          interviewer_id?: string
          is_final?: boolean | null
          key_observations?: string[] | null
          overall_rating?: number | null
          questions_asked?: Json | null
          recommendation?: string
          red_flags?: string[] | null
          standout_moments?: string[] | null
          strengths?: string[] | null
          submitted_at?: string | null
          technical_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_feedback_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_feedback_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications_with_deleted_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_feedback_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_feedback_interviewer_id_fkey"
            columns: ["interviewer_id"]
            isOneToOne: false
            referencedRelation: "company_members"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_intelligence: {
        Row: {
          candidate_id: string | null
          communication_clarity_score: number | null
          confidence_score: number | null
          created_at: string | null
          culture_fit_score: number | null
          follow_up_suggestions: string[] | null
          id: string
          last_updated_at: string | null
          meeting_id: string
          overall_score: number | null
          positive_signals: Json | null
          red_flags: Json | null
          technical_depth_score: number | null
          topic_coverage: Json | null
        }
        Insert: {
          candidate_id?: string | null
          communication_clarity_score?: number | null
          confidence_score?: number | null
          created_at?: string | null
          culture_fit_score?: number | null
          follow_up_suggestions?: string[] | null
          id?: string
          last_updated_at?: string | null
          meeting_id: string
          overall_score?: number | null
          positive_signals?: Json | null
          red_flags?: Json | null
          technical_depth_score?: number | null
          topic_coverage?: Json | null
        }
        Update: {
          candidate_id?: string | null
          communication_clarity_score?: number | null
          confidence_score?: number | null
          created_at?: string | null
          culture_fit_score?: number | null
          follow_up_suggestions?: string[] | null
          id?: string
          last_updated_at?: string | null
          meeting_id?: string
          overall_score?: number | null
          positive_signals?: Json | null
          red_flags?: Json | null
          technical_depth_score?: number | null
          topic_coverage?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_intelligence_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_intelligence_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "interview_intelligence_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "unified_candidate_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_intelligence_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_prep_briefs: {
        Row: {
          candidate_id: string | null
          candidate_summary: string | null
          company_name: string | null
          conversation_starters: string[] | null
          created_at: string | null
          cv_gaps: string[] | null
          generated_at: string | null
          generated_by: string | null
          id: string
          key_strengths: string[] | null
          meeting_id: string
          potential_concerns: string[] | null
          role_title: string | null
          suggested_questions: Json | null
          technical_topics: string[] | null
        }
        Insert: {
          candidate_id?: string | null
          candidate_summary?: string | null
          company_name?: string | null
          conversation_starters?: string[] | null
          created_at?: string | null
          cv_gaps?: string[] | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          key_strengths?: string[] | null
          meeting_id: string
          potential_concerns?: string[] | null
          role_title?: string | null
          suggested_questions?: Json | null
          technical_topics?: string[] | null
        }
        Update: {
          candidate_id?: string | null
          candidate_summary?: string | null
          company_name?: string | null
          conversation_starters?: string[] | null
          created_at?: string | null
          cv_gaps?: string[] | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          key_strengths?: string[] | null
          meeting_id?: string
          potential_concerns?: string[] | null
          role_title?: string | null
          suggested_questions?: Json | null
          technical_topics?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_prep_briefs_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_prep_briefs_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "interview_prep_briefs_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "unified_candidate_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_prep_briefs_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_prep_materials: {
        Row: {
          company_id: string | null
          content: string
          created_at: string | null
          id: string
          material_type: string
          role_type: string | null
        }
        Insert: {
          company_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          material_type: string
          role_type?: string | null
        }
        Update: {
          company_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          material_type?: string
          role_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_prep_materials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_prep_materials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_question_patterns: {
        Row: {
          bad_answer_examples: Json | null
          company_id: string | null
          created_at: string | null
          embedding: string | null
          extracted_from_meeting_id: string | null
          frequency: number | null
          good_answer_examples: Json | null
          id: string
          interviewer_name: string | null
          job_id: string | null
          question_category: string | null
          question_text: string
          updated_at: string | null
        }
        Insert: {
          bad_answer_examples?: Json | null
          company_id?: string | null
          created_at?: string | null
          embedding?: string | null
          extracted_from_meeting_id?: string | null
          frequency?: number | null
          good_answer_examples?: Json | null
          id?: string
          interviewer_name?: string | null
          job_id?: string | null
          question_category?: string | null
          question_text: string
          updated_at?: string | null
        }
        Update: {
          bad_answer_examples?: Json | null
          company_id?: string | null
          created_at?: string | null
          embedding?: string | null
          extracted_from_meeting_id?: string | null
          frequency?: number | null
          good_answer_examples?: Json | null
          id?: string
          interviewer_name?: string | null
          job_id?: string | null
          question_category?: string | null
          question_text?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_question_patterns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_question_patterns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_question_patterns_extracted_from_meeting_id_fkey"
            columns: ["extracted_from_meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_question_patterns_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_reports: {
        Row: {
          candidate_id: string | null
          communication_assessment: string | null
          comparison_notes: string | null
          created_at: string | null
          cultural_fit_assessment: string | null
          executive_summary: string | null
          generated_at: string | null
          generated_by: string | null
          highlights: Json | null
          id: string
          key_strengths: string[] | null
          key_weaknesses: string[] | null
          meeting_id: string
          percentile_rank: number | null
          recommendation: string | null
          recommendation_confidence: number | null
          recommendation_reasoning: string | null
          technical_assessment: string | null
        }
        Insert: {
          candidate_id?: string | null
          communication_assessment?: string | null
          comparison_notes?: string | null
          created_at?: string | null
          cultural_fit_assessment?: string | null
          executive_summary?: string | null
          generated_at?: string | null
          generated_by?: string | null
          highlights?: Json | null
          id?: string
          key_strengths?: string[] | null
          key_weaknesses?: string[] | null
          meeting_id: string
          percentile_rank?: number | null
          recommendation?: string | null
          recommendation_confidence?: number | null
          recommendation_reasoning?: string | null
          technical_assessment?: string | null
        }
        Update: {
          candidate_id?: string | null
          communication_assessment?: string | null
          comparison_notes?: string | null
          created_at?: string | null
          cultural_fit_assessment?: string | null
          executive_summary?: string | null
          generated_at?: string | null
          generated_by?: string | null
          highlights?: Json | null
          id?: string
          key_strengths?: string[] | null
          key_weaknesses?: string[] | null
          meeting_id?: string
          percentile_rank?: number | null
          recommendation?: string | null
          recommendation_confidence?: number | null
          recommendation_reasoning?: string | null
          technical_assessment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_reports_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_reports_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "interview_reports_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "unified_candidate_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_reports_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_stage_templates: {
        Row: {
          auto_schedule_enabled: boolean | null
          company_id: string
          created_at: string | null
          default_description_template: string | null
          default_duration_minutes: number | null
          default_title_template: string | null
          evaluation_criteria: Json | null
          feedback_deadline_hours: number | null
          id: string
          interview_guide_url: string | null
          interview_type: string | null
          max_interviewers: number | null
          min_interviewers: number | null
          name: string
          optional_interviewer_roles: string[] | null
          prep_materials_urls: string[] | null
          require_feedback: boolean | null
          required_interviewer_roles: string[] | null
          send_prep_materials: boolean | null
          stage_order: number
          updated_at: string | null
        }
        Insert: {
          auto_schedule_enabled?: boolean | null
          company_id: string
          created_at?: string | null
          default_description_template?: string | null
          default_duration_minutes?: number | null
          default_title_template?: string | null
          evaluation_criteria?: Json | null
          feedback_deadline_hours?: number | null
          id?: string
          interview_guide_url?: string | null
          interview_type?: string | null
          max_interviewers?: number | null
          min_interviewers?: number | null
          name: string
          optional_interviewer_roles?: string[] | null
          prep_materials_urls?: string[] | null
          require_feedback?: boolean | null
          required_interviewer_roles?: string[] | null
          send_prep_materials?: boolean | null
          stage_order: number
          updated_at?: string | null
        }
        Update: {
          auto_schedule_enabled?: boolean | null
          company_id?: string
          created_at?: string | null
          default_description_template?: string | null
          default_duration_minutes?: number | null
          default_title_template?: string | null
          evaluation_criteria?: Json | null
          feedback_deadline_hours?: number | null
          id?: string
          interview_guide_url?: string | null
          interview_type?: string | null
          max_interviewers?: number | null
          min_interviewers?: number | null
          name?: string
          optional_interviewer_roles?: string[] | null
          prep_materials_urls?: string[] | null
          require_feedback?: boolean | null
          required_interviewer_roles?: string[] | null
          send_prep_materials?: boolean | null
          stage_order?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_stage_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_stage_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          application_id: string
          created_at: string
          created_by: string
          id: string
          interview_type: string
          interviewers: string[] | null
          job_id: string
          location: string | null
          meeting_link: string | null
          notes: string | null
          scheduled_end: string
          scheduled_start: string
          stage_index: number
          status: string
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          created_by: string
          id?: string
          interview_type: string
          interviewers?: string[] | null
          job_id: string
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          scheduled_end: string
          scheduled_start: string
          stage_index: number
          status?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          created_by?: string
          id?: string
          interview_type?: string
          interviewers?: string[] | null
          job_id?: string
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          scheduled_end?: string
          scheduled_start?: string
          stage_index?: number
          status?: string
          updated_at?: string
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
      invoice_line_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          invoice_id: string | null
          line_total: number
          placement_fee_id: string | null
          quantity: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          invoice_id?: string | null
          line_total: number
          placement_fee_id?: string | null
          quantity?: number | null
          unit_price: number
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string | null
          line_total?: number
          placement_fee_id?: string | null
          quantity?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "partner_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_placement_fee_id_fkey"
            columns: ["placement_fee_id"]
            isOneToOne: false
            referencedRelation: "placement_fees"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_due: number
          amount_paid: number
          billing_reason: string | null
          created_at: string | null
          currency: string
          due_date: string | null
          hosted_invoice_url: string | null
          id: string
          invoice_pdf_url: string | null
          metadata: Json | null
          paid_at: string | null
          status: string
          stripe_invoice_id: string
          stripe_payment_intent_id: string | null
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount_due: number
          amount_paid: number
          billing_reason?: string | null
          created_at?: string | null
          currency?: string
          due_date?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf_url?: string | null
          metadata?: Json | null
          paid_at?: string | null
          status: string
          stripe_invoice_id: string
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          billing_reason?: string | null
          created_at?: string | null
          currency?: string
          due_date?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf_url?: string | null
          metadata?: Json | null
          paid_at?: string | null
          status?: string
          stripe_invoice_id?: string
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      job_analytics: {
        Row: {
          application_completes: number | null
          application_starts: number | null
          avg_time_on_page: number | null
          created_at: string
          date: string
          id: string
          job_id: string
          referral_sources: Json | null
          saves: number | null
          shares: number | null
          unique_views: number | null
          views: number | null
        }
        Insert: {
          application_completes?: number | null
          application_starts?: number | null
          avg_time_on_page?: number | null
          created_at?: string
          date?: string
          id?: string
          job_id: string
          referral_sources?: Json | null
          saves?: number | null
          shares?: number | null
          unique_views?: number | null
          views?: number | null
        }
        Update: {
          application_completes?: number | null
          application_starts?: number | null
          avg_time_on_page?: number | null
          created_at?: string
          date?: string
          id?: string
          job_id?: string
          referral_sources?: Json | null
          saves?: number | null
          shares?: number | null
          unique_views?: number | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_analytics_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
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
      job_team_assignments: {
        Row: {
          assigned_by: string | null
          assignment_metadata: Json | null
          assignment_reason: string | null
          assignment_type: string | null
          can_advance_candidates: boolean | null
          can_decline_candidates: boolean | null
          can_make_offers: boolean | null
          can_schedule_interviews: boolean | null
          can_view_candidates: boolean | null
          company_member_id: string | null
          created_at: string | null
          external_user_id: string | null
          id: string
          interview_stages: number[] | null
          is_primary_contact: boolean | null
          job_id: string
          job_role: string
          notification_preferences: Json | null
          updated_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          assignment_metadata?: Json | null
          assignment_reason?: string | null
          assignment_type?: string | null
          can_advance_candidates?: boolean | null
          can_decline_candidates?: boolean | null
          can_make_offers?: boolean | null
          can_schedule_interviews?: boolean | null
          can_view_candidates?: boolean | null
          company_member_id?: string | null
          created_at?: string | null
          external_user_id?: string | null
          id?: string
          interview_stages?: number[] | null
          is_primary_contact?: boolean | null
          job_id: string
          job_role: string
          notification_preferences?: Json | null
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          assignment_metadata?: Json | null
          assignment_reason?: string | null
          assignment_type?: string | null
          can_advance_candidates?: boolean | null
          can_decline_candidates?: boolean | null
          can_make_offers?: boolean | null
          can_schedule_interviews?: boolean | null
          can_view_candidates?: boolean | null
          company_member_id?: string | null
          created_at?: string | null
          external_user_id?: string | null
          id?: string
          interview_stages?: number[] | null
          is_primary_contact?: boolean | null
          job_id?: string
          job_role?: string
          notification_preferences?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_team_assignments_company_member_id_fkey"
            columns: ["company_member_id"]
            isOneToOne: false
            referencedRelation: "company_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_team_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_tools: {
        Row: {
          created_at: string | null
          id: string
          is_required: boolean | null
          job_id: string
          proficiency_level: string | null
          tool_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          job_id: string
          proficiency_level?: string | null
          tool_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          job_id?: string
          proficiency_level?: string | null
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_tools_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_tools_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools_and_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          benefits: Json | null
          closed_at: string | null
          club_sync_activated_at: string | null
          club_sync_status:
            | Database["public"]["Enums"]["club_sync_status_enum"]
            | null
          company_id: string
          company_name: string | null
          created_at: string | null
          created_by: string
          currency: string
          deal_health_score: number | null
          deal_probability: number | null
          deal_stage: string | null
          deal_value_override: number | null
          description: string | null
          embedding_generated_at: string | null
          employment_type: string | null
          expected_close_date: string | null
          id: string
          is_lost: boolean | null
          job_description_url: string | null
          job_embedding: string | null
          last_activity_date: string | null
          location: string | null
          loss_reason_id: string | null
          pipeline_stages: Json | null
          published_at: string | null
          requirements: Json | null
          responsibilities: Json | null
          salary_max: number | null
          salary_min: number | null
          status: string | null
          supporting_documents: Json | null
          tags: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          benefits?: Json | null
          closed_at?: string | null
          club_sync_activated_at?: string | null
          club_sync_status?:
            | Database["public"]["Enums"]["club_sync_status_enum"]
            | null
          company_id: string
          company_name?: string | null
          created_at?: string | null
          created_by: string
          currency?: string
          deal_health_score?: number | null
          deal_probability?: number | null
          deal_stage?: string | null
          deal_value_override?: number | null
          description?: string | null
          embedding_generated_at?: string | null
          employment_type?: string | null
          expected_close_date?: string | null
          id?: string
          is_lost?: boolean | null
          job_description_url?: string | null
          job_embedding?: string | null
          last_activity_date?: string | null
          location?: string | null
          loss_reason_id?: string | null
          pipeline_stages?: Json | null
          published_at?: string | null
          requirements?: Json | null
          responsibilities?: Json | null
          salary_max?: number | null
          salary_min?: number | null
          status?: string | null
          supporting_documents?: Json | null
          tags?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          benefits?: Json | null
          closed_at?: string | null
          club_sync_activated_at?: string | null
          club_sync_status?:
            | Database["public"]["Enums"]["club_sync_status_enum"]
            | null
          company_id?: string
          company_name?: string | null
          created_at?: string | null
          created_by?: string
          currency?: string
          deal_health_score?: number | null
          deal_probability?: number | null
          deal_stage?: string | null
          deal_value_override?: number | null
          description?: string | null
          embedding_generated_at?: string | null
          employment_type?: string | null
          expected_close_date?: string | null
          id?: string
          is_lost?: boolean | null
          job_description_url?: string | null
          job_embedding?: string | null
          last_activity_date?: string | null
          location?: string | null
          loss_reason_id?: string | null
          pipeline_stages?: Json | null
          published_at?: string | null
          requirements?: Json | null
          responsibilities?: Json | null
          salary_max?: number | null
          salary_min?: number | null
          status?: string | null
          supporting_documents?: Json | null
          tags?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_loss_reason_id_fkey"
            columns: ["loss_reason_id"]
            isOneToOne: false
            referencedRelation: "deal_loss_reasons"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_article_feedback: {
        Row: {
          article_id: string | null
          created_at: string | null
          feedback_text: string | null
          id: string
          session_id: string | null
          user_id: string | null
          was_helpful: boolean
        }
        Insert: {
          article_id?: string | null
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          session_id?: string | null
          user_id?: string | null
          was_helpful: boolean
        }
        Update: {
          article_id?: string | null
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          session_id?: string | null
          user_id?: string | null
          was_helpful?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "kb_article_feedback_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_article_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "kb_article_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_article_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_articles: {
        Row: {
          author_id: string | null
          category: string
          content: string
          content_embedding: string | null
          created_at: string | null
          embedding_generated_at: string | null
          excerpt: string | null
          featured: boolean | null
          helpful_count: number | null
          id: string
          last_reviewed_at: string | null
          last_reviewed_by: string | null
          not_helpful_count: number | null
          published_at: string | null
          related_articles: string[] | null
          search_keywords: string[] | null
          slug: string
          status: string | null
          title: string
          updated_at: string | null
          view_count: number | null
          visibility: string | null
        }
        Insert: {
          author_id?: string | null
          category: string
          content: string
          content_embedding?: string | null
          created_at?: string | null
          embedding_generated_at?: string | null
          excerpt?: string | null
          featured?: boolean | null
          helpful_count?: number | null
          id?: string
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          not_helpful_count?: number | null
          published_at?: string | null
          related_articles?: string[] | null
          search_keywords?: string[] | null
          slug: string
          status?: string | null
          title: string
          updated_at?: string | null
          view_count?: number | null
          visibility?: string | null
        }
        Update: {
          author_id?: string | null
          category?: string
          content?: string
          content_embedding?: string | null
          created_at?: string | null
          embedding_generated_at?: string | null
          excerpt?: string | null
          featured?: boolean | null
          helpful_count?: number | null
          id?: string
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          not_helpful_count?: number | null
          published_at?: string | null
          related_articles?: string[] | null
          search_keywords?: string[] | null
          slug?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "knowledge_base_articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_articles_last_reviewed_by_fkey"
            columns: ["last_reviewed_by"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "knowledge_base_articles_last_reviewed_by_fkey"
            columns: ["last_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_articles_last_reviewed_by_fkey"
            columns: ["last_reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      language_config: {
        Row: {
          added_at: string | null
          added_by: string | null
          code: string
          flag_emoji: string
          font_family: string | null
          is_active: boolean | null
          is_rtl: boolean | null
          name: string
          native_name: string
          updated_at: string | null
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          code: string
          flag_emoji: string
          font_family?: string | null
          is_active?: boolean | null
          is_rtl?: boolean | null
          name: string
          native_name: string
          updated_at?: string | null
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          code?: string
          flag_emoji?: string
          font_family?: string | null
          is_active?: boolean | null
          is_rtl?: boolean | null
          name?: string
          native_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      learner_preferences: {
        Row: {
          created_at: string | null
          daily_learning_minutes: number | null
          id: string
          interests: Json | null
          learning_goals: Json | null
          learning_pace: string | null
          notification_preferences: Json | null
          preferred_content_types: Json | null
          preferred_difficulty: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          daily_learning_minutes?: number | null
          id?: string
          interests?: Json | null
          learning_goals?: Json | null
          learning_pace?: string | null
          notification_preferences?: Json | null
          preferred_content_types?: Json | null
          preferred_difficulty?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          daily_learning_minutes?: number | null
          id?: string
          interests?: Json | null
          learning_goals?: Json | null
          learning_pace?: string | null
          notification_preferences?: Json | null
          preferred_content_types?: Json | null
          preferred_difficulty?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      learner_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          mastered_at: string | null
          mastery_score: number | null
          module_id: string
          notes: string | null
          progress_percentage: number | null
          quiz_score: number | null
          quiz_scores: Json | null
          status: string | null
          time_spent_minutes: number | null
          updated_at: string | null
          user_id: string
          video_completed_at: string | null
          video_last_position_seconds: number | null
          video_watch_time_seconds: number | null
          video_watched_percentage: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          mastered_at?: string | null
          mastery_score?: number | null
          module_id: string
          notes?: string | null
          progress_percentage?: number | null
          quiz_score?: number | null
          quiz_scores?: Json | null
          status?: string | null
          time_spent_minutes?: number | null
          updated_at?: string | null
          user_id: string
          video_completed_at?: string | null
          video_last_position_seconds?: number | null
          video_watch_time_seconds?: number | null
          video_watched_percentage?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          mastered_at?: string | null
          mastery_score?: number | null
          module_id?: string
          notes?: string | null
          progress_percentage?: number | null
          quiz_score?: number | null
          quiz_scores?: Json | null
          status?: string | null
          time_spent_minutes?: number | null
          updated_at?: string | null
          user_id?: string
          video_completed_at?: string | null
          video_last_position_seconds?: number | null
          video_watch_time_seconds?: number | null
          video_watched_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "learner_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_analytics: {
        Row: {
          courses_completed: number | null
          courses_enrolled: number | null
          date: string | null
          engagement_score: number | null
          id: string
          modules_completed: number | null
          quiz_attempts: number | null
          quiz_success_rate: number | null
          streak_days: number | null
          time_spent_minutes: number | null
          user_id: string | null
        }
        Insert: {
          courses_completed?: number | null
          courses_enrolled?: number | null
          date?: string | null
          engagement_score?: number | null
          id?: string
          modules_completed?: number | null
          quiz_attempts?: number | null
          quiz_success_rate?: number | null
          streak_days?: number | null
          time_spent_minutes?: number | null
          user_id?: string | null
        }
        Update: {
          courses_completed?: number | null
          courses_enrolled?: number | null
          date?: string | null
          engagement_score?: number | null
          id?: string
          modules_completed?: number | null
          quiz_attempts?: number | null
          quiz_success_rate?: number | null
          streak_days?: number | null
          time_spent_minutes?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      learning_badges: {
        Row: {
          badge_description: string | null
          badge_icon: string | null
          badge_name: string
          created_at: string | null
          criteria: Json
          id: string
          points: number | null
        }
        Insert: {
          badge_description?: string | null
          badge_icon?: string | null
          badge_name: string
          created_at?: string | null
          criteria: Json
          id?: string
          points?: number | null
        }
        Update: {
          badge_description?: string | null
          badge_icon?: string | null
          badge_name?: string
          created_at?: string | null
          criteria?: Json
          id?: string
          points?: number | null
        }
        Relationships: []
      }
      learning_paths: {
        Row: {
          academy_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty_level: string | null
          display_order: number | null
          estimated_hours: number | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          academy_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          display_order?: number | null
          estimated_hours?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          academy_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          display_order?: number | null
          estimated_hours?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_paths_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_agreement_signatures: {
        Row: {
          agreement_id: string | null
          id: string
          ip_address: unknown
          signature_data: Json | null
          signature_method: string
          signed_at: string | null
          signer_company: string | null
          signer_email: string
          signer_id: string | null
          signer_name: string
          signer_title: string | null
        }
        Insert: {
          agreement_id?: string | null
          id?: string
          ip_address?: unknown
          signature_data?: Json | null
          signature_method: string
          signed_at?: string | null
          signer_company?: string | null
          signer_email: string
          signer_id?: string | null
          signer_name: string
          signer_title?: string | null
        }
        Update: {
          agreement_id?: string | null
          id?: string
          ip_address?: unknown
          signature_data?: Json | null
          signature_method?: string
          signed_at?: string | null
          signer_company?: string | null
          signer_email?: string
          signer_id?: string | null
          signer_name?: string
          signer_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_agreement_signatures_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "legal_agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_agreement_templates: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          requires_signature: boolean | null
          template_name: string
          template_type: string
          updated_at: string | null
          variables: Json | null
          version: string
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          requires_signature?: boolean | null
          template_name: string
          template_type: string
          updated_at?: string | null
          variables?: Json | null
          version: string
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          requires_signature?: boolean | null
          template_name?: string
          template_type?: string
          updated_at?: string | null
          variables?: Json | null
          version?: string
        }
        Relationships: []
      }
      legal_agreements: {
        Row: {
          agreement_name: string
          agreement_type: string
          auto_renew: boolean | null
          company_id: string | null
          content: string
          created_at: string | null
          created_by: string | null
          effective_date: string | null
          expiration_date: string | null
          id: string
          metadata: Json | null
          status: string
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          agreement_name: string
          agreement_type: string
          auto_renew?: boolean | null
          company_id?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          effective_date?: string | null
          expiration_date?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          agreement_name?: string
          agreement_type?: string
          auto_renew?: boolean | null
          company_id?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          effective_date?: string | null
          expiration_date?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_agreements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_agreements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_agreements_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "legal_agreement_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      linkedin_imports: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          import_status: string | null
          import_type: string
          imported_data: Json
          sections_imported: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          import_status?: string | null
          import_type: string
          imported_data: Json
          sections_imported?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          import_status?: string | null
          import_type?: string
          imported_data?: Json
          sections_imported?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      linkedin_job_imports: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          import_details: Json | null
          imported_by: string
          jobs_failed: number
          jobs_imported: number
          status: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          import_details?: Json | null
          imported_by: string
          jobs_failed?: number
          jobs_imported?: number
          status: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          import_details?: Json | null
          imported_by?: string
          jobs_failed?: number
          jobs_imported?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "linkedin_job_imports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linkedin_job_imports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      live_channel_messages: {
        Row: {
          attachments: Json | null
          channel_id: string | null
          content: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          reply_to_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          attachments?: Json | null
          channel_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          reply_to_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          attachments?: Json | null
          channel_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          reply_to_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_channel_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "live_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_channel_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "live_channel_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      live_channel_participants: {
        Row: {
          channel_id: string | null
          id: string
          is_deafened: boolean | null
          is_hand_raised: boolean | null
          is_muted: boolean | null
          is_screen_sharing: boolean | null
          is_speaking: boolean | null
          is_video_on: boolean | null
          joined_at: string | null
          last_activity_at: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          channel_id?: string | null
          id?: string
          is_deafened?: boolean | null
          is_hand_raised?: boolean | null
          is_muted?: boolean | null
          is_screen_sharing?: boolean | null
          is_speaking?: boolean | null
          is_video_on?: boolean | null
          joined_at?: string | null
          last_activity_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          channel_id?: string | null
          id?: string
          is_deafened?: boolean | null
          is_hand_raised?: boolean | null
          is_muted?: boolean | null
          is_screen_sharing?: boolean | null
          is_speaking?: boolean | null
          is_video_on?: boolean | null
          joined_at?: string | null
          last_activity_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_channel_participants_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "live_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      live_channel_recordings: {
        Row: {
          ai_action_items: Json | null
          ai_decisions: Json | null
          ai_insights: Json | null
          ai_summary: string | null
          channel_id: string | null
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          file_size_bytes: number | null
          id: string
          participants: Json | null
          processing_status: string | null
          started_at: string | null
          started_by: string | null
          storage_path: string | null
          transcript: Json | null
        }
        Insert: {
          ai_action_items?: Json | null
          ai_decisions?: Json | null
          ai_insights?: Json | null
          ai_summary?: string | null
          channel_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          file_size_bytes?: number | null
          id?: string
          participants?: Json | null
          processing_status?: string | null
          started_at?: string | null
          started_by?: string | null
          storage_path?: string | null
          transcript?: Json | null
        }
        Update: {
          ai_action_items?: Json | null
          ai_decisions?: Json | null
          ai_insights?: Json | null
          ai_summary?: string | null
          channel_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          file_size_bytes?: number | null
          id?: string
          participants?: Json | null
          processing_status?: string | null
          started_at?: string | null
          started_by?: string | null
          storage_path?: string | null
          transcript?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "live_channel_recordings_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "live_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      live_channels: {
        Row: {
          auto_record: boolean | null
          auto_transcribe: boolean | null
          category: string | null
          channel_type: string
          created_at: string | null
          description: string | null
          id: string
          is_locked: boolean | null
          name: string
          permissions: Json | null
          position: number | null
          server_id: string | null
          updated_at: string | null
          user_limit: number | null
        }
        Insert: {
          auto_record?: boolean | null
          auto_transcribe?: boolean | null
          category?: string | null
          channel_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_locked?: boolean | null
          name: string
          permissions?: Json | null
          position?: number | null
          server_id?: string | null
          updated_at?: string | null
          user_limit?: number | null
        }
        Update: {
          auto_record?: boolean | null
          auto_transcribe?: boolean | null
          category?: string | null
          channel_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_locked?: boolean | null
          name?: string
          permissions?: Json | null
          position?: number | null
          server_id?: string | null
          updated_at?: string | null
          user_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "live_channels_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "live_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      live_server_members: {
        Row: {
          id: string
          joined_at: string | null
          nickname: string | null
          role: string | null
          server_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          joined_at?: string | null
          nickname?: string | null
          role?: string | null
          server_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          joined_at?: string | null
          nickname?: string | null
          role?: string | null
          server_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_server_members_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "live_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      live_servers: {
        Row: {
          banner_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          icon_url: string | null
          id: string
          is_default: boolean | null
          name: string
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          banner_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          banner_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      live_session_listeners: {
        Row: {
          id: string
          ip_address: string | null
          is_active: boolean | null
          joined_at: string
          left_at: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          joined_at?: string
          left_at?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          joined_at?: string
          left_at?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_session_listeners_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          created_at: string | null
          current_queue_item_id: string | null
          current_track_id: string | null
          dj_id: string
          ended_at: string | null
          id: string
          is_active: boolean | null
          listener_count: number | null
          started_at: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_queue_item_id?: string | null
          current_track_id?: string | null
          dj_id: string
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          listener_count?: number | null
          started_at?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_queue_item_id?: string | null
          current_track_id?: string | null
          dj_id?: string
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          listener_count?: number | null
          started_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_current_queue_item_id_fkey"
            columns: ["current_queue_item_id"]
            isOneToOne: false
            referencedRelation: "dj_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_current_track_id_fkey"
            columns: ["current_track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      market_intelligence: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          geography: string | null
          id: string
          industry: string | null
          metric_category: string
          metric_type: string
          metric_value: Json
          sample_size: number | null
          time_period: string | null
          valid_until: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          geography?: string | null
          id?: string
          industry?: string | null
          metric_category: string
          metric_type: string
          metric_value: Json
          sample_size?: number | null
          time_period?: string | null
          valid_until?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          geography?: string | null
          id?: string
          industry?: string | null
          metric_category?: string
          metric_type?: string
          metric_value?: Json
          sample_size?: number | null
          time_period?: string | null
          valid_until?: string | null
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
      meeting_analytics: {
        Row: {
          chat_messages_count: number | null
          created_at: string | null
          engagement_score: number | null
          id: string
          meeting_id: string
          metadata: Json | null
          polls_count: number | null
          reactions_count: number | null
          recording_duration_minutes: number | null
          screen_shares_count: number | null
          total_duration_minutes: number | null
          total_participants: number | null
          updated_at: string | null
        }
        Insert: {
          chat_messages_count?: number | null
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          meeting_id: string
          metadata?: Json | null
          polls_count?: number | null
          reactions_count?: number | null
          recording_duration_minutes?: number | null
          screen_shares_count?: number | null
          total_duration_minutes?: number | null
          total_participants?: number | null
          updated_at?: string | null
        }
        Update: {
          chat_messages_count?: number | null
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          meeting_id?: string
          metadata?: Json | null
          polls_count?: number | null
          reactions_count?: number | null
          recording_duration_minutes?: number | null
          screen_shares_count?: number | null
          total_duration_minutes?: number | null
          total_participants?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_analytics_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_bot_sessions: {
        Row: {
          bot_id: string | null
          connection_status: string | null
          id: string
          joined_at: string | null
          left_at: string | null
          meeting_id: string | null
          metadata: Json | null
          recording_url: string | null
          session_token: string
          transcript_url: string | null
        }
        Insert: {
          bot_id?: string | null
          connection_status?: string | null
          id?: string
          joined_at?: string | null
          left_at?: string | null
          meeting_id?: string | null
          metadata?: Json | null
          recording_url?: string | null
          session_token: string
          transcript_url?: string | null
        }
        Update: {
          bot_id?: string | null
          connection_status?: string | null
          id?: string
          joined_at?: string | null
          left_at?: string | null
          meeting_id?: string | null
          metadata?: Json | null
          recording_url?: string | null
          session_token?: string
          transcript_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_bot_sessions_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "meeting_bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_bot_sessions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_bots: {
        Row: {
          avatar_url: string | null
          bot_type: string
          capabilities: Json | null
          created_at: string | null
          display_name: string
          id: string
          status: string | null
        }
        Insert: {
          avatar_url?: string | null
          bot_type?: string
          capabilities?: Json | null
          created_at?: string | null
          display_name?: string
          id?: string
          status?: string | null
        }
        Update: {
          avatar_url?: string | null
          bot_type?: string
          capabilities?: Json | null
          created_at?: string | null
          display_name?: string
          id?: string
          status?: string | null
        }
        Relationships: []
      }
      meeting_insights: {
        Row: {
          action_items: Json | null
          analysis_status: string | null
          bot_session_id: string | null
          created_at: string | null
          decisions: Json | null
          full_transcript: string | null
          id: string
          key_points: Json | null
          meeting_id: string | null
          participants_summary: Json | null
          processing_time_ms: number | null
          questions_asked: Json | null
          sentiment_analysis: Json | null
          summary: string | null
          topics: Json | null
          updated_at: string | null
        }
        Insert: {
          action_items?: Json | null
          analysis_status?: string | null
          bot_session_id?: string | null
          created_at?: string | null
          decisions?: Json | null
          full_transcript?: string | null
          id?: string
          key_points?: Json | null
          meeting_id?: string | null
          participants_summary?: Json | null
          processing_time_ms?: number | null
          questions_asked?: Json | null
          sentiment_analysis?: Json | null
          summary?: string | null
          topics?: Json | null
          updated_at?: string | null
        }
        Update: {
          action_items?: Json | null
          analysis_status?: string | null
          bot_session_id?: string | null
          created_at?: string | null
          decisions?: Json | null
          full_transcript?: string | null
          id?: string
          key_points?: Json | null
          meeting_id?: string | null
          participants_summary?: Json | null
          processing_time_ms?: number | null
          questions_asked?: Json | null
          sentiment_analysis?: Json | null
          summary?: string | null
          topics?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_insights_bot_session_id_fkey"
            columns: ["bot_session_id"]
            isOneToOne: false
            referencedRelation: "meeting_bot_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_insights_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_intelligence_processing: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          meeting_id: string | null
          processing_type: string
          result_data: Json | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          meeting_id?: string | null
          processing_type: string
          result_data?: Json | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          meeting_id?: string | null
          processing_type?: string
          result_data?: Json | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_intelligence_processing_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          id: string
          invitation_method: string | null
          invited_at: string | null
          invitee_email: string | null
          invitee_user_id: string | null
          inviter_id: string | null
          meeting_id: string
          responded_at: string | null
          response_message: string | null
          sent_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invitation_method?: string | null
          invited_at?: string | null
          invitee_email?: string | null
          invitee_user_id?: string | null
          inviter_id?: string | null
          meeting_id: string
          responded_at?: string | null
          response_message?: string | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invitation_method?: string | null
          invited_at?: string | null
          invitee_email?: string | null
          invitee_user_id?: string | null
          inviter_id?: string | null
          meeting_id?: string
          responded_at?: string | null
          response_message?: string | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_invitations_invitee_user_id_fkey"
            columns: ["invitee_user_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_invitations_invitee_user_id_fkey"
            columns: ["invitee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_invitations_invitee_user_id_fkey"
            columns: ["invitee_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_invitations_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_join_logs: {
        Row: {
          guest_email: string | null
          id: string
          join_method: string | null
          join_source: string | null
          joined_at: string | null
          meeting_id: string | null
          time_to_join_seconds: number | null
          user_id: string | null
        }
        Insert: {
          guest_email?: string | null
          id?: string
          join_method?: string | null
          join_source?: string | null
          joined_at?: string | null
          meeting_id?: string | null
          time_to_join_seconds?: number | null
          user_id?: string | null
        }
        Update: {
          guest_email?: string | null
          id?: string
          join_method?: string | null
          join_source?: string | null
          joined_at?: string | null
          meeting_id?: string | null
          time_to_join_seconds?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_join_logs_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_join_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "meeting_join_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_join_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_join_requests: {
        Row: {
          created_at: string
          guest_email: string | null
          guest_name: string
          id: string
          meeting_id: string
          request_status: string
          requested_at: string
          responded_at: string | null
          responded_by: string | null
          session_token: string
        }
        Insert: {
          created_at?: string
          guest_email?: string | null
          guest_name: string
          id?: string
          meeting_id: string
          request_status?: string
          requested_at?: string
          responded_at?: string | null
          responded_by?: string | null
          session_token: string
        }
        Update: {
          created_at?: string
          guest_email?: string | null
          guest_name?: string
          id?: string
          meeting_id?: string
          request_status?: string
          requested_at?: string
          responded_at?: string | null
          responded_by?: string | null
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_join_requests_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_notification_analytics: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          id: string
          meeting_invitation_id: string
          notification_type: string
          opened_at: string | null
          responded_at: string | null
          response_action: string | null
          response_time_seconds: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          meeting_invitation_id: string
          notification_type: string
          opened_at?: string | null
          responded_at?: string | null
          response_action?: string | null
          response_time_seconds?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          meeting_invitation_id?: string
          notification_type?: string
          opened_at?: string | null
          responded_at?: string | null
          response_action?: string | null
          response_time_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_notification_analytics_meeting_invitation_id_fkey"
            columns: ["meeting_invitation_id"]
            isOneToOne: false
            referencedRelation: "meeting_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_notification_queue: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          meeting_invitation_id: string
          metadata: Json | null
          notification_type: string
          sent_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          meeting_invitation_id: string
          metadata?: Json | null
          notification_type: string
          sent_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          meeting_invitation_id?: string
          metadata?: Json | null
          notification_type?: string
          sent_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_notification_queue_meeting_invitation_id_fkey"
            columns: ["meeting_invitation_id"]
            isOneToOne: false
            referencedRelation: "meeting_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          created_at: string | null
          guest_email: string | null
          guest_name: string | null
          id: string
          joined_at: string | null
          last_seen: string | null
          left_at: string | null
          meeting_id: string
          permissions: Json | null
          role: string
          session_token: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          joined_at?: string | null
          last_seen?: string | null
          left_at?: string | null
          meeting_id: string
          permissions?: Json | null
          role?: string
          session_token?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          joined_at?: string | null
          last_seen?: string | null
          left_at?: string | null
          meeting_id?: string
          permissions?: Json | null
          role?: string
          session_token?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_polls: {
        Row: {
          booking_link_id: string
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          proposed_times: Json
          selected_time: string | null
          status: string | null
          title: string
          votes: Json | null
        }
        Insert: {
          booking_link_id: string
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          proposed_times?: Json
          selected_time?: string | null
          status?: string | null
          title: string
          votes?: Json | null
        }
        Update: {
          booking_link_id?: string
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          proposed_times?: Json
          selected_time?: string | null
          status?: string | null
          title?: string
          votes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_polls_booking_link_id_fkey"
            columns: ["booking_link_id"]
            isOneToOne: false
            referencedRelation: "booking_links"
            referencedColumns: ["id"]
          },
        ]
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
      meeting_summaries: {
        Row: {
          action_items: Json | null
          generated_at: string | null
          highlights: Json | null
          id: string
          key_points: Json | null
          meeting_id: string
          summary: string | null
        }
        Insert: {
          action_items?: Json | null
          generated_at?: string | null
          highlights?: Json | null
          id?: string
          key_points?: Json | null
          meeting_id: string
          summary?: string | null
        }
        Update: {
          action_items?: Json | null
          generated_at?: string | null
          highlights?: Json | null
          id?: string
          key_points?: Json | null
          meeting_id?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_summaries_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_templates: {
        Row: {
          created_at: string | null
          description: string | null
          duration_minutes: number
          id: string
          is_public: boolean | null
          name: string
          settings: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_public?: boolean | null
          name: string
          settings?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_public?: boolean | null
          name?: string
          settings?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      meeting_transcripts: {
        Row: {
          bot_session_id: string | null
          confidence: number | null
          created_at: string | null
          id: string
          is_final: boolean | null
          language: string | null
          meeting_id: string | null
          participant_id: string | null
          participant_name: string | null
          text: string
          timestamp_ms: number
        }
        Insert: {
          bot_session_id?: string | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          is_final?: boolean | null
          language?: string | null
          meeting_id?: string | null
          participant_id?: string | null
          participant_name?: string | null
          text: string
          timestamp_ms: number
        }
        Update: {
          bot_session_id?: string | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          is_final?: boolean | null
          language?: string | null
          meeting_id?: string | null
          participant_id?: string | null
          participant_name?: string | null
          text?: string
          timestamp_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "meeting_transcripts_bot_session_id_fkey"
            columns: ["bot_session_id"]
            isOneToOne: false
            referencedRelation: "meeting_bot_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_transcripts_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          access_type: string
          agenda: string | null
          ai_confidence_score: number | null
          ai_suggested_time: boolean | null
          allow_guests: boolean | null
          application_id: string | null
          booking_id: string | null
          branding: Json | null
          candidate_id: string | null
          created_at: string | null
          created_by_ai: boolean | null
          created_via: string | null
          description: string | null
          enable_notetaker: boolean | null
          host_id: string
          host_settings: Json | null
          id: string
          interview_stage: string | null
          job_id: string | null
          max_participants: number | null
          meeting_code: string
          meeting_password: string | null
          meeting_type: string | null
          original_user_request: string | null
          pmr_id: string | null
          recurrence_rule: string | null
          require_approval: boolean | null
          scheduled_end: string
          scheduled_start: string
          settings: Json | null
          status: string
          template_id: string | null
          timezone: string
          title: string
          updated_at: string | null
          video_session_id: string | null
        }
        Insert: {
          access_type?: string
          agenda?: string | null
          ai_confidence_score?: number | null
          ai_suggested_time?: boolean | null
          allow_guests?: boolean | null
          application_id?: string | null
          booking_id?: string | null
          branding?: Json | null
          candidate_id?: string | null
          created_at?: string | null
          created_by_ai?: boolean | null
          created_via?: string | null
          description?: string | null
          enable_notetaker?: boolean | null
          host_id: string
          host_settings?: Json | null
          id?: string
          interview_stage?: string | null
          job_id?: string | null
          max_participants?: number | null
          meeting_code: string
          meeting_password?: string | null
          meeting_type?: string | null
          original_user_request?: string | null
          pmr_id?: string | null
          recurrence_rule?: string | null
          require_approval?: boolean | null
          scheduled_end: string
          scheduled_start: string
          settings?: Json | null
          status?: string
          template_id?: string | null
          timezone?: string
          title: string
          updated_at?: string | null
          video_session_id?: string | null
        }
        Update: {
          access_type?: string
          agenda?: string | null
          ai_confidence_score?: number | null
          ai_suggested_time?: boolean | null
          allow_guests?: boolean | null
          application_id?: string | null
          booking_id?: string | null
          branding?: Json | null
          candidate_id?: string | null
          created_at?: string | null
          created_by_ai?: boolean | null
          created_via?: string | null
          description?: string | null
          enable_notetaker?: boolean | null
          host_id?: string
          host_settings?: Json | null
          id?: string
          interview_stage?: string | null
          job_id?: string | null
          max_participants?: number | null
          meeting_code?: string
          meeting_password?: string | null
          meeting_type?: string | null
          original_user_request?: string | null
          pmr_id?: string | null
          recurrence_rule?: string | null
          require_approval?: boolean | null
          scheduled_end?: string
          scheduled_start?: string
          settings?: Json | null
          status?: string
          template_id?: string | null
          timezone?: string
          title?: string
          updated_at?: string | null
          video_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications_with_deleted_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "meetings_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "unified_candidate_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_pmr_id_fkey"
            columns: ["pmr_id"]
            isOneToOne: false
            referencedRelation: "personal_meeting_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "meeting_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_video_session_id_fkey"
            columns: ["video_session_id"]
            isOneToOne: false
            referencedRelation: "video_call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          message_id?: string
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
      message_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string
          resource_type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id: string
          resource_type: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string
          resource_type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      message_edits: {
        Row: {
          edited_at: string | null
          edited_by: string
          id: string
          message_id: string
          previous_content: string
        }
        Insert: {
          edited_at?: string | null
          edited_by: string
          id?: string
          message_id: string
          previous_content: string
        }
        Update: {
          edited_at?: string | null
          edited_by?: string
          id?: string
          message_id?: string
          previous_content?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_edits_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_mentions: {
        Row: {
          created_at: string | null
          id: string
          mentioned_user_id: string
          message_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mentioned_user_id: string
          message_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mentioned_user_id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_mentions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_notifications: {
        Row: {
          id: string
          is_read: boolean | null
          message_id: string
          notified_at: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          is_read?: boolean | null
          message_id: string
          notified_at?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          is_read?: boolean | null
          message_id?: string
          notified_at?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_notifications_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_rate_limits: {
        Row: {
          created_at: string | null
          last_message_at: string | null
          message_count: number | null
          updated_at: string | null
          user_id: string
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          last_message_at?: string | null
          message_count?: number | null
          updated_at?: string | null
          user_id: string
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          last_message_at?: string | null
          message_count?: number | null
          updated_at?: string | null
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_read_receipts: {
        Row: {
          id: string
          message_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_read_receipts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_retention_policies: {
        Row: {
          auto_archive: boolean | null
          company_id: string | null
          created_at: string | null
          id: string
          retention_days: number
          updated_at: string | null
        }
        Insert: {
          auto_archive?: boolean | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          retention_days?: number
          updated_at?: string | null
        }
        Update: {
          auto_archive?: boolean | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          retention_days?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_retention_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_retention_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          category: string
          company_id: string | null
          content: string
          created_at: string | null
          created_by: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          usage_count: number | null
          variables: Json | null
        }
        Insert: {
          category: string
          company_id?: string | null
          content: string
          created_at?: string | null
          created_by: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          usage_count?: number | null
          variables?: Json | null
        }
        Update: {
          category?: string
          company_id?: string | null
          content?: string
          created_at?: string | null
          created_by?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          usage_count?: number | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      message_translations: {
        Row: {
          created_at: string | null
          id: string
          language_code: string
          message_id: string
          translated_content: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          language_code: string
          message_id: string
          translated_content: string
        }
        Update: {
          created_at?: string | null
          id?: string
          language_code?: string
          message_id?: string
          translated_content?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_translations_message_id_fkey"
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
          deleted_at: string | null
          edited_at: string | null
          gif_url: string | null
          id: string
          is_read: boolean | null
          is_urgent: boolean | null
          media_duration: number | null
          media_type: string | null
          media_url: string | null
          meeting_id: string | null
          message_type: string
          metadata: Json | null
          parent_message_id: string | null
          pinned_at: string | null
          pinned_by: string | null
          priority: string | null
          read_at: string | null
          reply_count: number | null
          sender_id: string
          sentiment_score: number | null
          sticker_url: string | null
          system_message_type: string | null
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          gif_url?: string | null
          id?: string
          is_read?: boolean | null
          is_urgent?: boolean | null
          media_duration?: number | null
          media_type?: string | null
          media_url?: string | null
          meeting_id?: string | null
          message_type?: string
          metadata?: Json | null
          parent_message_id?: string | null
          pinned_at?: string | null
          pinned_by?: string | null
          priority?: string | null
          read_at?: string | null
          reply_count?: number | null
          sender_id: string
          sentiment_score?: number | null
          sticker_url?: string | null
          system_message_type?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          gif_url?: string | null
          id?: string
          is_read?: boolean | null
          is_urgent?: boolean | null
          media_duration?: number | null
          media_type?: string | null
          media_url?: string | null
          meeting_id?: string | null
          message_type?: string
          metadata?: Json | null
          parent_message_id?: string | null
          pinned_at?: string | null
          pinned_by?: string | null
          priority?: string | null
          read_at?: string | null
          reply_count?: number | null
          sender_id?: string
          sentiment_score?: number | null
          sticker_url?: string | null
          system_message_type?: string | null
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
            foreignKeyName: "messages_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_ab_tests: {
        Row: {
          ended_at: string | null
          hypothesis: string | null
          id: string
          metrics_a: Json | null
          metrics_b: Json | null
          model_a_version: number
          model_b_version: number
          sample_size_a: number
          sample_size_b: number
          started_at: string
          statistical_significance: number | null
          status: string
          target_metric: string
          test_name: string
          traffic_split: number
          winner: string | null
        }
        Insert: {
          ended_at?: string | null
          hypothesis?: string | null
          id?: string
          metrics_a?: Json | null
          metrics_b?: Json | null
          model_a_version: number
          model_b_version: number
          sample_size_a?: number
          sample_size_b?: number
          started_at?: string
          statistical_significance?: number | null
          status?: string
          target_metric: string
          test_name: string
          traffic_split?: number
          winner?: string | null
        }
        Update: {
          ended_at?: string | null
          hypothesis?: string | null
          id?: string
          metrics_a?: Json | null
          metrics_b?: Json | null
          model_a_version?: number
          model_b_version?: number
          sample_size_a?: number
          sample_size_b?: number
          started_at?: string
          statistical_significance?: number | null
          status?: string
          target_metric?: string
          test_name?: string
          traffic_split?: number
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_ab_tests_model_a_version_fkey"
            columns: ["model_a_version"]
            isOneToOne: false
            referencedRelation: "ml_models"
            referencedColumns: ["version"]
          },
          {
            foreignKeyName: "ml_ab_tests_model_b_version_fkey"
            columns: ["model_b_version"]
            isOneToOne: false
            referencedRelation: "ml_models"
            referencedColumns: ["version"]
          },
        ]
      }
      ml_feedback: {
        Row: {
          created_at: string
          feedback_score: number | null
          feedback_text: string | null
          feedback_type: string
          id: string
          metadata: Json | null
          prediction_id: string
          user_id: string
          user_role: string
        }
        Insert: {
          created_at?: string
          feedback_score?: number | null
          feedback_text?: string | null
          feedback_type: string
          id?: string
          metadata?: Json | null
          prediction_id: string
          user_id: string
          user_role: string
        }
        Update: {
          created_at?: string
          feedback_score?: number | null
          feedback_text?: string | null
          feedback_type?: string
          id?: string
          metadata?: Json | null
          prediction_id?: string
          user_id?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_feedback_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "ml_predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_model_metrics: {
        Row: {
          confidence_interval_lower: number | null
          confidence_interval_upper: number | null
          created_at: string
          id: string
          metric_date: string
          metric_name: string
          metric_value: number
          model_version: number
          sample_size: number | null
          segment: string | null
        }
        Insert: {
          confidence_interval_lower?: number | null
          confidence_interval_upper?: number | null
          created_at?: string
          id?: string
          metric_date: string
          metric_name: string
          metric_value: number
          model_version: number
          sample_size?: number | null
          segment?: string | null
        }
        Update: {
          confidence_interval_lower?: number | null
          confidence_interval_upper?: number | null
          created_at?: string
          id?: string
          metric_date?: string
          metric_name?: string
          metric_value?: number
          model_version?: number
          sample_size?: number | null
          segment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_model_metrics_model_version_fkey"
            columns: ["model_version"]
            isOneToOne: false
            referencedRelation: "ml_models"
            referencedColumns: ["version"]
          },
        ]
      }
      ml_models: {
        Row: {
          created_at: string
          feature_importance: Json | null
          id: string
          metrics: Json
          model_storage_path: string | null
          model_type: string
          notes: string | null
          status: string
          training_config: Json | null
          training_data_count: number | null
          training_end_time: string | null
          training_start_time: string | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          feature_importance?: Json | null
          id?: string
          metrics?: Json
          model_storage_path?: string | null
          model_type: string
          notes?: string | null
          status?: string
          training_config?: Json | null
          training_data_count?: number | null
          training_end_time?: string | null
          training_start_time?: string | null
          updated_at?: string
          version: number
        }
        Update: {
          created_at?: string
          feature_importance?: Json | null
          id?: string
          metrics?: Json
          model_storage_path?: string | null
          model_type?: string
          notes?: string | null
          status?: string
          training_config?: Json | null
          training_data_count?: number | null
          training_end_time?: string | null
          training_start_time?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      ml_predictions: {
        Row: {
          ab_test_id: string | null
          ab_test_variant: string | null
          actual_outcome: string | null
          actual_outcome_updated_at: string | null
          candidate_id: string
          created_at: string
          features_used: Json | null
          id: string
          interview_probability: number | null
          job_id: string
          model_version: number
          predicted_time_to_hire_days: number | null
          prediction_score: number
          rank_position: number | null
          shap_values: Json | null
        }
        Insert: {
          ab_test_id?: string | null
          ab_test_variant?: string | null
          actual_outcome?: string | null
          actual_outcome_updated_at?: string | null
          candidate_id: string
          created_at?: string
          features_used?: Json | null
          id?: string
          interview_probability?: number | null
          job_id: string
          model_version: number
          predicted_time_to_hire_days?: number | null
          prediction_score: number
          rank_position?: number | null
          shap_values?: Json | null
        }
        Update: {
          ab_test_id?: string | null
          ab_test_variant?: string | null
          actual_outcome?: string | null
          actual_outcome_updated_at?: string | null
          candidate_id?: string
          created_at?: string
          features_used?: Json | null
          id?: string
          interview_probability?: number | null
          job_id?: string
          model_version?: number
          predicted_time_to_hire_days?: number | null
          prediction_score?: number
          rank_position?: number | null
          shap_values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_predictions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_predictions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "ml_predictions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "unified_candidate_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_predictions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_predictions_model_version_fkey"
            columns: ["model_version"]
            isOneToOne: false
            referencedRelation: "ml_models"
            referencedColumns: ["version"]
          },
        ]
      }
      ml_training_data: {
        Row: {
          application_id: string | null
          candidate_id: string
          company_id: string | null
          created_at: string | null
          features: Json
          id: string
          job_id: string
          label_hired: boolean
          label_interviewed: boolean
          label_rejected: boolean
          match_score_at_time: number | null
          rejection_stage: string | null
          semantic_similarity_score: number | null
          strategist_feedback: string | null
          time_to_hire_days: number | null
          time_to_interview_days: number | null
          updated_at: string | null
        }
        Insert: {
          application_id?: string | null
          candidate_id: string
          company_id?: string | null
          created_at?: string | null
          features: Json
          id?: string
          job_id: string
          label_hired?: boolean
          label_interviewed?: boolean
          label_rejected?: boolean
          match_score_at_time?: number | null
          rejection_stage?: string | null
          semantic_similarity_score?: number | null
          strategist_feedback?: string | null
          time_to_hire_days?: number | null
          time_to_interview_days?: number | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string | null
          candidate_id?: string
          company_id?: string | null
          created_at?: string | null
          features?: Json
          id?: string
          job_id?: string
          label_hired?: boolean
          label_interviewed?: boolean
          label_rejected?: boolean
          match_score_at_time?: number | null
          rejection_stage?: string | null
          semantic_similarity_score?: number | null
          strategist_feedback?: string | null
          time_to_hire_days?: number | null
          time_to_interview_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ml_training_runs: {
        Row: {
          created_at: string | null
          error_message: string | null
          feature_importance: Json | null
          hyperparameters: Json | null
          id: string
          metrics: Json | null
          model_version: number
          status: string | null
          training_end_time: string | null
          training_samples_count: number | null
          training_start_time: string
          updated_at: string | null
          validation_samples_count: number | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          feature_importance?: Json | null
          hyperparameters?: Json | null
          id?: string
          metrics?: Json | null
          model_version: number
          status?: string | null
          training_end_time?: string | null
          training_samples_count?: number | null
          training_start_time?: string
          updated_at?: string | null
          validation_samples_count?: number | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          feature_importance?: Json | null
          hyperparameters?: Json | null
          id?: string
          metrics?: Json | null
          model_version?: number
          status?: string | null
          training_end_time?: string | null
          training_samples_count?: number | null
          training_start_time?: string
          updated_at?: string | null
          validation_samples_count?: number | null
        }
        Relationships: []
      }
      module_chat_messages: {
        Row: {
          created_at: string | null
          id: string
          is_instructor: boolean | null
          message: string
          module_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_instructor?: boolean | null
          message: string
          module_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_instructor?: boolean | null
          message?: string
          module_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_chat_messages_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "module_chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      module_content: {
        Row: {
          content: Json
          content_type: string
          created_at: string | null
          display_order: number | null
          id: string
          metadata: Json | null
          module_id: string
          updated_at: string | null
        }
        Insert: {
          content: Json
          content_type: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          metadata?: Json | null
          module_id: string
          updated_at?: string | null
        }
        Update: {
          content?: Json
          content_type?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          metadata?: Json | null
          module_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_content_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_discussions: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_resolved: boolean | null
          module_id: string | null
          title: string
          updated_at: string | null
          upvotes: number | null
          user_id: string | null
          views: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          module_id?: string | null
          title: string
          updated_at?: string | null
          upvotes?: number | null
          user_id?: string | null
          views?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          module_id?: string | null
          title?: string
          updated_at?: string | null
          upvotes?: number | null
          user_id?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "module_discussions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_experts: {
        Row: {
          added_at: string | null
          contribution_notes: string | null
          expert_id: string
          id: string
          module_id: string
          role: string | null
        }
        Insert: {
          added_at?: string | null
          contribution_notes?: string | null
          expert_id: string
          id?: string
          module_id: string
          role?: string | null
        }
        Update: {
          added_at?: string | null
          contribution_notes?: string | null
          expert_id?: string
          id?: string
          module_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_experts_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "expert_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_experts_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_questions: {
        Row: {
          answered_at: string | null
          answered_by_type: string | null
          answered_by_user: string | null
          context: Json | null
          created_at: string | null
          id: string
          is_answered: boolean | null
          is_flagged_for_expert: boolean | null
          module_id: string
          question_text: string
          updated_at: string | null
          upvotes: number | null
          user_id: string
          visibility: string | null
        }
        Insert: {
          answered_at?: string | null
          answered_by_type?: string | null
          answered_by_user?: string | null
          context?: Json | null
          created_at?: string | null
          id?: string
          is_answered?: boolean | null
          is_flagged_for_expert?: boolean | null
          module_id: string
          question_text: string
          updated_at?: string | null
          upvotes?: number | null
          user_id: string
          visibility?: string | null
        }
        Update: {
          answered_at?: string | null
          answered_by_type?: string | null
          answered_by_user?: string | null
          context?: Json | null
          created_at?: string | null
          id?: string
          is_answered?: boolean | null
          is_flagged_for_expert?: boolean | null
          module_id?: string
          question_text?: string
          updated_at?: string | null
          upvotes?: number | null
          user_id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_questions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_resources: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          file_path: string | null
          id: string
          metadata: Json | null
          module_id: string
          resource_type: string
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          file_path?: string | null
          id?: string
          metadata?: Json | null
          module_id: string
          resource_type: string
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          file_path?: string | null
          id?: string
          metadata?: Json | null
          module_id?: string
          resource_type?: string
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_resources_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          estimated_minutes: number | null
          id: string
          image_url: string | null
          is_free: boolean | null
          is_published: boolean | null
          module_type: string | null
          published_at: string | null
          slug: string
          title: string
          transcript: Json | null
          updated_at: string | null
          video_duration_seconds: number | null
          video_url: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          estimated_minutes?: number | null
          id?: string
          image_url?: string | null
          is_free?: boolean | null
          is_published?: boolean | null
          module_type?: string | null
          published_at?: string | null
          slug: string
          title: string
          transcript?: Json | null
          updated_at?: string | null
          video_duration_seconds?: number | null
          video_url?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          estimated_minutes?: number | null
          id?: string
          image_url?: string | null
          is_free?: boolean | null
          is_published?: boolean | null
          module_type?: string | null
          published_at?: string | null
          slug?: string
          title?: string
          transcript?: Json | null
          updated_at?: string | null
          video_duration_seconds?: number | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "popular_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      note_mentions: {
        Row: {
          created_at: string | null
          id: string
          mentioned_user_id: string
          note_id: string
          notified_at: string | null
          read_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          mentioned_user_id: string
          note_id: string
          notified_at?: string | null
          read_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          mentioned_user_id?: string
          note_id?: string
          notified_at?: string | null
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "note_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "note_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_mentions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "candidate_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          browser_meetings: boolean | null
          created_at: string
          email_applications: boolean | null
          email_digest: boolean | null
          email_digest_frequency: string | null
          email_enabled: boolean | null
          email_interviews: boolean | null
          email_job_matches: boolean | null
          email_meetings: boolean | null
          email_messages: boolean | null
          email_system: boolean | null
          id: string
          inapp_applications: boolean | null
          inapp_enabled: boolean | null
          inapp_interviews: boolean | null
          inapp_job_matches: boolean | null
          inapp_messages: boolean | null
          inapp_system: boolean | null
          meeting_sound_type: string | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          quiet_hours_timezone: string | null
          sound_meetings: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          browser_meetings?: boolean | null
          created_at?: string
          email_applications?: boolean | null
          email_digest?: boolean | null
          email_digest_frequency?: string | null
          email_enabled?: boolean | null
          email_interviews?: boolean | null
          email_job_matches?: boolean | null
          email_meetings?: boolean | null
          email_messages?: boolean | null
          email_system?: boolean | null
          id?: string
          inapp_applications?: boolean | null
          inapp_enabled?: boolean | null
          inapp_interviews?: boolean | null
          inapp_job_matches?: boolean | null
          inapp_messages?: boolean | null
          inapp_system?: boolean | null
          meeting_sound_type?: string | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          quiet_hours_timezone?: string | null
          sound_meetings?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          browser_meetings?: boolean | null
          created_at?: string
          email_applications?: boolean | null
          email_digest?: boolean | null
          email_digest_frequency?: string | null
          email_enabled?: boolean | null
          email_interviews?: boolean | null
          email_job_matches?: boolean | null
          email_meetings?: boolean | null
          email_messages?: boolean | null
          email_system?: boolean | null
          id?: string
          inapp_applications?: boolean | null
          inapp_enabled?: boolean | null
          inapp_interviews?: boolean | null
          inapp_job_matches?: boolean | null
          inapp_messages?: boolean | null
          inapp_system?: boolean | null
          meeting_sound_type?: string | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          quiet_hours_timezone?: string | null
          sound_meetings?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          category: string | null
          created_at: string
          id: string
          is_archived: boolean | null
          is_read: boolean
          message: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean | null
          is_read?: boolean
          message: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean | null
          is_read?: boolean
          message?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      objective_activities: {
        Row: {
          activity_data: Json | null
          activity_type: string
          created_at: string | null
          id: string
          objective_id: string
          user_id: string | null
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          created_at?: string | null
          id?: string
          objective_id: string
          user_id?: string | null
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          created_at?: string | null
          id?: string
          objective_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objective_activities_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "club_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      objective_comments: {
        Row: {
          comment: string
          created_at: string | null
          id: string
          mentioned_users: string[] | null
          objective_id: string
          parent_comment_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          id?: string
          mentioned_users?: string[] | null
          objective_id: string
          parent_comment_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          id?: string
          mentioned_users?: string[] | null
          objective_id?: string
          parent_comment_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_comments_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "club_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "objective_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      org_chart_candidate_placements: {
        Row: {
          candidate_user_id: string
          company_id: string
          created_at: string | null
          created_by: string | null
          department_id: string | null
          id: string
          placement_notes: string | null
          placement_status: string | null
          proposed_job_title: string
          proposed_reports_to_member_id: string | null
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          candidate_user_id: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          id?: string
          placement_notes?: string | null
          placement_status?: string | null
          proposed_job_title: string
          proposed_reports_to_member_id?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          candidate_user_id?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          id?: string
          placement_notes?: string | null
          placement_status?: string | null
          proposed_job_title?: string
          proposed_reports_to_member_id?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_chart_candidate_placement_proposed_reports_to_member_i_fkey"
            columns: ["proposed_reports_to_member_id"]
            isOneToOne: false
            referencedRelation: "company_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_chart_candidate_placements_candidate_user_id_fkey"
            columns: ["candidate_user_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "org_chart_candidate_placements_candidate_user_id_fkey"
            columns: ["candidate_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_chart_candidate_placements_candidate_user_id_fkey"
            columns: ["candidate_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_chart_candidate_placements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_chart_candidate_placements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_chart_candidate_placements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "org_chart_candidate_placements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_chart_candidate_placements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_chart_candidate_placements_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "company_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_analytics_snapshots: {
        Row: {
          active_candidates: number
          avg_time_to_hire_days: number | null
          avg_time_to_interview_days: number | null
          company_id: string
          created_at: string
          hires_made: number
          id: string
          interviews_scheduled: number
          offer_acceptance_rate: number | null
          offers_sent: number
          snapshot_date: string
          source_breakdown: Json | null
          stage_distribution: Json | null
          total_applications: number
        }
        Insert: {
          active_candidates?: number
          avg_time_to_hire_days?: number | null
          avg_time_to_interview_days?: number | null
          company_id: string
          created_at?: string
          hires_made?: number
          id?: string
          interviews_scheduled?: number
          offer_acceptance_rate?: number | null
          offers_sent?: number
          snapshot_date: string
          source_breakdown?: Json | null
          stage_distribution?: Json | null
          total_applications?: number
        }
        Update: {
          active_candidates?: number
          avg_time_to_hire_days?: number | null
          avg_time_to_interview_days?: number | null
          company_id?: string
          created_at?: string
          hires_made?: number
          id?: string
          interviews_scheduled?: number
          offer_acceptance_rate?: number | null
          offers_sent?: number
          snapshot_date?: string
          source_breakdown?: Json | null
          stage_distribution?: Json | null
          total_applications?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_analytics_snapshots_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_analytics_snapshots_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_audit_log: {
        Row: {
          action_type: string
          actor_id: string
          after_state: Json | null
          before_state: Json | null
          company_id: string
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
        }
        Insert: {
          action_type: string
          actor_id: string
          after_state?: Json | null
          before_state?: Json | null
          company_id: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string
          after_state?: Json | null
          before_state?: Json | null
          company_id?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_partner_audit_actor"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "fk_partner_audit_actor"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_partner_audit_actor"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_partner_audit_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_partner_audit_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_billing_details: {
        Row: {
          bank_account_iban: string | null
          bank_account_name: string | null
          bank_account_swift: string | null
          billing_address_line1: string
          billing_address_line2: string | null
          billing_city: string
          billing_country: string
          billing_email: string
          billing_postal_code: string
          billing_state: string | null
          company_id: string | null
          created_at: string | null
          default_fee_percentage: number | null
          id: string
          is_verified: boolean | null
          legal_company_name: string
          payment_method: string | null
          preferred_payment_terms_days: number | null
          updated_at: string | null
          vat_number: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          bank_account_iban?: string | null
          bank_account_name?: string | null
          bank_account_swift?: string | null
          billing_address_line1: string
          billing_address_line2?: string | null
          billing_city: string
          billing_country?: string
          billing_email: string
          billing_postal_code: string
          billing_state?: string | null
          company_id?: string | null
          created_at?: string | null
          default_fee_percentage?: number | null
          id?: string
          is_verified?: boolean | null
          legal_company_name: string
          payment_method?: string | null
          preferred_payment_terms_days?: number | null
          updated_at?: string | null
          vat_number?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          bank_account_iban?: string | null
          bank_account_name?: string | null
          bank_account_swift?: string | null
          billing_address_line1?: string
          billing_address_line2?: string | null
          billing_city?: string
          billing_country?: string
          billing_email?: string
          billing_postal_code?: string
          billing_state?: string | null
          company_id?: string | null
          created_at?: string | null
          default_fee_percentage?: number | null
          id?: string
          is_verified?: boolean | null
          legal_company_name?: string
          payment_method?: string | null
          preferred_payment_terms_days?: number | null
          updated_at?: string | null
          vat_number?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_billing_details_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_billing_details_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_integrations: {
        Row: {
          api_key_encrypted: string | null
          company_id: string
          config: Json | null
          created_at: string | null
          id: string
          integration_type: string
          is_active: boolean | null
          last_sync_at: string | null
          sync_frequency: string | null
          sync_status: string | null
          updated_at: string | null
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          company_id: string
          config?: Json | null
          created_at?: string | null
          id?: string
          integration_type: string
          is_active?: boolean | null
          last_sync_at?: string | null
          sync_frequency?: string | null
          sync_status?: string | null
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          company_id?: string
          config?: Json | null
          created_at?: string | null
          id?: string
          integration_type?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          sync_frequency?: string | null
          sync_status?: string | null
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_invoices: {
        Row: {
          billing_details_id: string | null
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          due_date: string
          id: string
          internal_notes: string | null
          invoice_date: string
          invoice_number: string
          notes: string | null
          paid_at: string | null
          partner_company_id: string
          payment_terms_days: number | null
          pdf_url: string | null
          sent_at: string | null
          status: string | null
          stripe_payment_intent_id: string | null
          subtotal: number
          tax_amount: number
          tax_rate: number | null
          total_amount: number
          updated_at: string | null
          viewed_at: string | null
        }
        Insert: {
          billing_details_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          due_date: string
          id?: string
          internal_notes?: string | null
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          paid_at?: string | null
          partner_company_id: string
          payment_terms_days?: number | null
          pdf_url?: string | null
          sent_at?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          subtotal: number
          tax_amount: number
          tax_rate?: number | null
          total_amount: number
          updated_at?: string | null
          viewed_at?: string | null
        }
        Update: {
          billing_details_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          due_date?: string
          id?: string
          internal_notes?: string | null
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          paid_at?: string | null
          partner_company_id?: string
          payment_terms_days?: number | null
          pdf_url?: string | null
          sent_at?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number | null
          total_amount?: number
          updated_at?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_invoices_billing_details_id_fkey"
            columns: ["billing_details_id"]
            isOneToOne: false
            referencedRelation: "partner_billing_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invoices_partner_company_id_fkey"
            columns: ["partner_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invoices_partner_company_id_fkey"
            columns: ["partner_company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_permissions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      partner_requests: {
        Row: {
          agreed_nda: boolean | null
          agreed_no_cure_no_pay: boolean
          agreed_privacy: boolean
          assigned_to: string | null
          budget_range: string | null
          company_name: string
          company_size: string
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          decline_reason: string | null
          description: string
          estimated_roles_per_year: number | null
          followed_up_at: string | null
          headquarters_location: string | null
          id: string
          industry: string
          last_step_viewed: string | null
          linkedin_url: string | null
          notes: string | null
          partnership_type: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          session_id: string | null
          source_channel: string | null
          status: string
          steps_completed: number
          time_to_complete_seconds: number | null
          timeline: string | null
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          website: string | null
        }
        Insert: {
          agreed_nda?: boolean | null
          agreed_no_cure_no_pay?: boolean
          agreed_privacy?: boolean
          assigned_to?: string | null
          budget_range?: string | null
          company_name: string
          company_size: string
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          decline_reason?: string | null
          description: string
          estimated_roles_per_year?: number | null
          followed_up_at?: string | null
          headquarters_location?: string | null
          id?: string
          industry: string
          last_step_viewed?: string | null
          linkedin_url?: string | null
          notes?: string | null
          partnership_type?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string | null
          source_channel?: string | null
          status?: string
          steps_completed?: number
          time_to_complete_seconds?: number | null
          timeline?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          website?: string | null
        }
        Update: {
          agreed_nda?: boolean | null
          agreed_no_cure_no_pay?: boolean
          agreed_privacy?: boolean
          assigned_to?: string | null
          budget_range?: string | null
          company_name?: string
          company_size?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          decline_reason?: string | null
          description?: string
          estimated_roles_per_year?: number | null
          followed_up_at?: string | null
          headquarters_location?: string | null
          id?: string
          industry?: string
          last_step_viewed?: string | null
          linkedin_url?: string | null
          notes?: string | null
          partnership_type?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string | null
          source_channel?: string | null
          status?: string
          steps_completed?: number
          time_to_complete_seconds?: number | null
          timeline?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "partner_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_sla_config: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          interview_scheduling_hours: number | null
          is_active: boolean | null
          penalties: Json | null
          replacement_guarantee_days: number | null
          response_time_hours: number | null
          shortlist_delivery_hours: number | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          interview_scheduling_hours?: number | null
          is_active?: boolean | null
          penalties?: Json | null
          replacement_guarantee_days?: number | null
          response_time_hours?: number | null
          shortlist_delivery_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          interview_scheduling_hours?: number | null
          is_active?: boolean | null
          penalties?: Json | null
          replacement_guarantee_days?: number | null
          response_time_hours?: number | null
          shortlist_delivery_hours?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_sla_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_sla_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_sla_tracking: {
        Row: {
          actual_value: number | null
          company_id: string
          created_at: string | null
          id: string
          is_met: boolean | null
          measured_at: string | null
          metric_type: string
          reference_id: string | null
          reference_type: string | null
          target_value: number
        }
        Insert: {
          actual_value?: number | null
          company_id: string
          created_at?: string | null
          id?: string
          is_met?: boolean | null
          measured_at?: string | null
          metric_type: string
          reference_id?: string | null
          reference_type?: string | null
          target_value: number
        }
        Update: {
          actual_value?: number | null
          company_id?: string
          created_at?: string | null
          id?: string
          is_met?: boolean | null
          measured_at?: string | null
          metric_type?: string
          reference_id?: string | null
          reference_type?: string | null
          target_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_sla_tracking_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_sla_tracking_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      password_history: {
        Row: {
          created_at: string | null
          id: string
          password_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          password_hash: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          password_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      password_reset_attempts: {
        Row: {
          attempt_type: string | null
          attempted_at: string | null
          email: string
          id: string
          ip_address: string | null
          success: boolean | null
        }
        Insert: {
          attempt_type?: string | null
          attempted_at?: string | null
          email: string
          id?: string
          ip_address?: string | null
          success?: boolean | null
        }
        Update: {
          attempt_type?: string | null
          attempted_at?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          success?: boolean | null
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          attempts: number | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          ip_address: string | null
          is_used: boolean | null
          magic_token: string
          otp_code: string
          used_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          ip_address?: string | null
          is_used?: boolean | null
          magic_token: string
          otp_code: string
          used_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_used?: boolean | null
          magic_token?: string
          otp_code?: string
          used_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      path_enrollments: {
        Row: {
          completed_at: string | null
          enrolled_at: string | null
          id: string
          learning_path_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          enrolled_at?: string | null
          id?: string
          learning_path_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          enrolled_at?: string | null
          id?: string
          learning_path_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "path_enrollments_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          bank_transaction_id: string | null
          created_at: string | null
          currency_code: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          payment_method: string
          payment_reference: string | null
          processed_by: string | null
          proof_of_payment_url: string | null
          status: string | null
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          transaction_date: string
        }
        Insert: {
          amount: number
          bank_transaction_id?: string | null
          created_at?: string | null
          currency_code?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_method: string
          payment_reference?: string | null
          processed_by?: string | null
          proof_of_payment_url?: string | null
          status?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          transaction_date?: string
        }
        Update: {
          amount?: number
          bank_transaction_id?: string | null
          created_at?: string | null
          currency_code?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_method?: string
          payment_reference?: string | null
          processed_by?: string | null
          proof_of_payment_url?: string | null
          status?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "partner_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_meeting_rooms: {
        Row: {
          allow_guests: boolean | null
          created_at: string | null
          custom_branding: Json | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          require_approval: boolean | null
          room_code: string
          total_meetings: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          allow_guests?: boolean | null
          created_at?: string | null
          custom_branding?: Json | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          require_approval?: boolean | null
          room_code: string
          total_meetings?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          allow_guests?: boolean | null
          created_at?: string | null
          custom_branding?: Json | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          require_approval?: boolean | null
          room_code?: string
          total_meetings?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_meeting_rooms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "personal_meeting_rooms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_meeting_rooms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_verifications: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string
          id: string
          ip_address: unknown
          phone: string
          user_agent: string | null
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          phone: string
          user_agent?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          phone?: string
          user_agent?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      pilot_metrics: {
        Row: {
          avg_completion_time_minutes: number | null
          created_at: string
          date: string
          focus_time_minutes: number
          id: string
          interruptions_count: number
          tasks_completed: number
          tasks_scheduled: number
          tasks_snoozed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_completion_time_minutes?: number | null
          created_at?: string
          date?: string
          focus_time_minutes?: number
          id?: string
          interruptions_count?: number
          tasks_completed?: number
          tasks_scheduled?: number
          tasks_snoozed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_completion_time_minutes?: number | null
          created_at?: string
          date?: string
          focus_time_minutes?: number
          id?: string
          interruptions_count?: number
          tasks_completed?: number
          tasks_scheduled?: number
          tasks_snoozed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pilot_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "pilot_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_preferences: {
        Row: {
          auto_schedule_enabled: boolean
          break_between_tasks_minutes: number
          buffer_minutes: number
          created_at: string
          focus_blocks: Json | null
          max_tasks_per_day: number
          morning_digest_enabled: boolean
          morning_digest_time: string
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          timezone: string
          updated_at: string
          user_id: string
          work_hours_end: string
          work_hours_start: string
          working_days: number[]
        }
        Insert: {
          auto_schedule_enabled?: boolean
          break_between_tasks_minutes?: number
          buffer_minutes?: number
          created_at?: string
          focus_blocks?: Json | null
          max_tasks_per_day?: number
          morning_digest_enabled?: boolean
          morning_digest_time?: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          timezone?: string
          updated_at?: string
          user_id: string
          work_hours_end?: string
          work_hours_start?: string
          working_days?: number[]
        }
        Update: {
          auto_schedule_enabled?: boolean
          break_between_tasks_minutes?: number
          buffer_minutes?: number
          created_at?: string
          focus_blocks?: Json | null
          max_tasks_per_day?: number
          morning_digest_enabled?: boolean
          morning_digest_time?: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
          work_hours_end?: string
          work_hours_start?: string
          working_days?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "pilot_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "pilot_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_tasks: {
        Row: {
          ai_recommendation: string | null
          auto_scheduled_at: string | null
          completed_at: string | null
          context: Json
          created_at: string
          description: string | null
          effort_minutes: number | null
          id: string
          impact_score: number | null
          priority_score: number
          related_entity_id: string | null
          related_entity_type: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          snoozed_until: string | null
          status: string
          task_type: string
          title: string
          updated_at: string
          urgency_score: number | null
          user_id: string
        }
        Insert: {
          ai_recommendation?: string | null
          auto_scheduled_at?: string | null
          completed_at?: string | null
          context?: Json
          created_at?: string
          description?: string | null
          effort_minutes?: number | null
          id?: string
          impact_score?: number | null
          priority_score?: number
          related_entity_id?: string | null
          related_entity_type?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          snoozed_until?: string | null
          status?: string
          task_type: string
          title: string
          updated_at?: string
          urgency_score?: number | null
          user_id: string
        }
        Update: {
          ai_recommendation?: string | null
          auto_scheduled_at?: string | null
          completed_at?: string | null
          context?: Json
          created_at?: string
          description?: string | null
          effort_minutes?: number | null
          id?: string
          impact_score?: number | null
          priority_score?: number
          related_entity_id?: string | null
          related_entity_type?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          snoozed_until?: string | null
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
          urgency_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pilot_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "pilot_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pinned_posts: {
        Row: {
          id: string
          pin_order: number
          pinned_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          id?: string
          pin_order?: number
          pinned_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          id?: string
          pin_order?: number
          pinned_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinned_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          job_id: string
          metadata: Json | null
          stage_data: Json
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          job_id: string
          metadata?: Json | null
          stage_data?: Json
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          job_id?: string
          metadata?: Json | null
          stage_data?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_audit_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_events: {
        Row: {
          application_id: string
          created_at: string
          event_type: string
          from_stage: number | null
          id: string
          job_id: string
          metadata: Json | null
          performed_by: string
          to_stage: number | null
        }
        Insert: {
          application_id: string
          created_at?: string
          event_type: string
          from_stage?: number | null
          id?: string
          job_id: string
          metadata?: Json | null
          performed_by: string
          to_stage?: number | null
        }
        Update: {
          application_id?: string
          created_at?: string
          event_type?: string
          from_stage?: number | null
          id?: string
          job_id?: string
          metadata?: Json | null
          performed_by?: string
          to_stage?: number | null
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
      pitr_test_logs: {
        Row: {
          created_at: string | null
          data_loss_detected: boolean | null
          duration_seconds: number | null
          id: string
          notes: Json | null
          recovery_accuracy: number | null
          target_recovery_time: string
          test_id: string
          test_status: string
          timestamp: string
        }
        Insert: {
          created_at?: string | null
          data_loss_detected?: boolean | null
          duration_seconds?: number | null
          id?: string
          notes?: Json | null
          recovery_accuracy?: number | null
          target_recovery_time: string
          test_id: string
          test_status: string
          timestamp: string
        }
        Update: {
          created_at?: string | null
          data_loss_detected?: boolean | null
          duration_seconds?: number | null
          id?: string
          notes?: Json | null
          recovery_accuracy?: number | null
          target_recovery_time?: string
          test_id?: string
          test_status?: string
          timestamp?: string
        }
        Relationships: []
      }
      pitr_test_markers: {
        Row: {
          created_at: string | null
          id: string
          marker_value: string
          test_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          marker_value: string
          test_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          marker_value?: string
          test_id?: string
        }
        Relationships: []
      }
      placement_fees: {
        Row: {
          application_id: string | null
          candidate_id: string | null
          candidate_salary: number | null
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          fee_amount: number
          fee_percentage: number
          fee_percentage_used: number | null
          hired_date: string
          id: string
          invoice_id: string | null
          job_id: string | null
          notes: string | null
          partner_company_id: string | null
          payment_due_date: string | null
          referrer_splits: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          application_id?: string | null
          candidate_id?: string | null
          candidate_salary?: number | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          fee_amount: number
          fee_percentage: number
          fee_percentage_used?: number | null
          hired_date: string
          id?: string
          invoice_id?: string | null
          job_id?: string | null
          notes?: string | null
          partner_company_id?: string | null
          payment_due_date?: string | null
          referrer_splits?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string | null
          candidate_id?: string | null
          candidate_salary?: number | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          fee_amount?: number
          fee_percentage?: number
          fee_percentage_used?: number | null
          hired_date?: string
          id?: string
          invoice_id?: string | null
          job_id?: string | null
          notes?: string | null
          partner_company_id?: string | null
          payment_due_date?: string | null
          referrer_splits?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "placement_fees_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placement_fees_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications_with_deleted_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placement_fees_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placement_fees_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "placement_fees_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "unified_candidate_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placement_fees_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placement_fees_partner_company_id_fkey"
            columns: ["partner_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placement_fees_partner_company_id_fkey"
            columns: ["partner_company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          severity: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          severity: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "platform_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_tracks: {
        Row: {
          created_at: string
          id: string
          playlist_id: string
          position: number
          track_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          playlist_id: string
          position: number
          track_id: string
        }
        Update: {
          created_at?: string
          id?: string
          playlist_id?: string
          position?: number
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_tracks_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          energy_level: string | null
          genre: string | null
          id: string
          is_featured: boolean | null
          is_live: boolean | null
          is_published: boolean | null
          like_count: number | null
          mood_tags: string[] | null
          name: string
          play_count: number | null
          playlist_type: string | null
          spotify_embed_url: string | null
          spotify_playlist_id: string | null
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          energy_level?: string | null
          genre?: string | null
          id?: string
          is_featured?: boolean | null
          is_live?: boolean | null
          is_published?: boolean | null
          like_count?: number | null
          mood_tags?: string[] | null
          name: string
          play_count?: number | null
          playlist_type?: string | null
          spotify_embed_url?: string | null
          spotify_playlist_id?: string | null
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          energy_level?: string | null
          genre?: string | null
          id?: string
          is_featured?: boolean | null
          is_live?: boolean | null
          is_published?: boolean | null
          like_count?: number | null
          mood_tags?: string[] | null
          name?: string
          play_count?: number | null
          playlist_type?: string | null
          spotify_embed_url?: string | null
          spotify_playlist_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      poll_votes: {
        Row: {
          created_at: string | null
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: []
      }
      post_analytics: {
        Row: {
          clicks: number | null
          comments: number | null
          created_at: string
          date: string
          engagement_rate: number | null
          id: string
          impressions: number | null
          likes: number | null
          metadata: Json | null
          post_id: string
          reach: number | null
          saves: number | null
          shares: number | null
          video_completion_rate: number | null
          video_views: number | null
        }
        Insert: {
          clicks?: number | null
          comments?: number | null
          created_at?: string
          date?: string
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          metadata?: Json | null
          post_id: string
          reach?: number | null
          saves?: number | null
          shares?: number | null
          video_completion_rate?: number | null
          video_views?: number | null
        }
        Update: {
          clicks?: number | null
          comments?: number | null
          created_at?: string
          date?: string
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          metadata?: Json | null
          post_id?: string
          reach?: number | null
          saves?: number | null
          shares?: number | null
          video_completion_rate?: number | null
          video_views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_analytics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "unified_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_engagement_signals: {
        Row: {
          city: string | null
          commented: boolean | null
          commented_at: string | null
          country: string | null
          created_at: string | null
          device_type: string | null
          id: string
          last_viewed_at: string | null
          liked: boolean | null
          liked_at: string | null
          post_id: string
          referrer: string | null
          saved: boolean | null
          saved_at: string | null
          shared: boolean | null
          shared_at: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
          view_count: number | null
          view_duration_seconds: number | null
          viewed_at: string | null
        }
        Insert: {
          city?: string | null
          commented?: boolean | null
          commented_at?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          last_viewed_at?: string | null
          liked?: boolean | null
          liked_at?: string | null
          post_id: string
          referrer?: string | null
          saved?: boolean | null
          saved_at?: string | null
          shared?: boolean | null
          shared_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
          view_count?: number | null
          view_duration_seconds?: number | null
          viewed_at?: string | null
        }
        Update: {
          city?: string | null
          commented?: boolean | null
          commented_at?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          last_viewed_at?: string | null
          liked?: boolean | null
          liked_at?: string | null
          post_id?: string
          referrer?: string | null
          saved?: boolean | null
          saved_at?: string | null
          shared?: boolean | null
          shared_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
          view_count?: number | null
          view_duration_seconds?: number | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_engagement_signals_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_incident_reviews: {
        Row: {
          action_items: Json | null
          attendees: string[] | null
          conducted_by: string | null
          contributing_factors: string[] | null
          created_at: string | null
          follow_up_date: string | null
          id: string
          incident_id: string | null
          incident_summary: string
          review_date: string
          root_cause: string | null
          status: string | null
          timeline: Json | null
          updated_at: string | null
          what_went_well: string[] | null
          what_went_wrong: string[] | null
        }
        Insert: {
          action_items?: Json | null
          attendees?: string[] | null
          conducted_by?: string | null
          contributing_factors?: string[] | null
          created_at?: string | null
          follow_up_date?: string | null
          id?: string
          incident_id?: string | null
          incident_summary: string
          review_date: string
          root_cause?: string | null
          status?: string | null
          timeline?: Json | null
          updated_at?: string | null
          what_went_well?: string[] | null
          what_went_wrong?: string[] | null
        }
        Update: {
          action_items?: Json | null
          attendees?: string[] | null
          conducted_by?: string | null
          contributing_factors?: string[] | null
          created_at?: string | null
          follow_up_date?: string | null
          id?: string
          incident_id?: string | null
          incident_summary?: string
          review_date?: string
          root_cause?: string | null
          status?: string | null
          timeline?: Json | null
          updated_at?: string | null
          what_went_well?: string[] | null
          what_went_wrong?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "post_incident_reviews_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incident_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      post_interactions: {
        Row: {
          created_at: string
          id: string
          interaction_metadata: Json | null
          interaction_type: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_metadata?: Json | null
          interaction_type: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interaction_metadata?: Json | null
          interaction_type?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_interactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "unified_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "unified_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reposts: {
        Row: {
          id: string
          original_post_id: string
          repost_post_id: string | null
          reposted_at: string
          reposted_by: string
        }
        Insert: {
          id?: string
          original_post_id: string
          repost_post_id?: string | null
          reposted_at?: string
          reposted_by: string
        }
        Update: {
          id?: string
          original_post_id?: string
          repost_post_id?: string | null
          reposted_at?: string
          reposted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reposts_original_post_id_fkey"
            columns: ["original_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reposts_repost_post_id_fkey"
            columns: ["repost_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_shares: {
        Row: {
          created_at: string
          id: string
          post_id: string
          share_tree_path: string[] | null
          shared_by: string
          shared_to: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          share_tree_path?: string[] | null
          shared_by: string
          shared_to?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          share_tree_path?: string[] | null
          shared_by?: string
          shared_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "unified_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_views: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          id: string
          is_unique_view: boolean | null
          os_type: string | null
          post_id: string
          referrer_source: string | null
          user_id: string | null
          view_duration_seconds: number | null
          viewed_at: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          is_unique_view?: boolean | null
          os_type?: string | null
          post_id: string
          referrer_source?: string | null
          user_id?: string | null
          view_duration_seconds?: number | null
          viewed_at?: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          is_unique_view?: boolean | null
          os_type?: string | null
          post_id?: string
          referrer_source?: string | null
          user_id?: string | null
          view_duration_seconds?: number | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "unified_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          ai_summary: string | null
          company_id: string | null
          content: string
          created_at: string
          id: string
          is_public: boolean | null
          media_urls: Json | null
          poll_options: Json | null
          poll_question: string | null
          repost_of: string | null
          summary_generated_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ai_summary?: string | null
          company_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_public?: boolean | null
          media_urls?: Json | null
          poll_options?: Json | null
          poll_question?: string | null
          repost_of?: string | null
          summary_generated_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ai_summary?: string | null
          company_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_public?: boolean | null
          media_urls?: Json | null
          poll_options?: Json | null
          poll_question?: string | null
          repost_of?: string | null
          summary_generated_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_repost_of_fkey"
            columns: ["repost_of"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      pressure_cooker_actions: {
        Row: {
          action: string
          created_at: string | null
          id: string
          notes: string | null
          quality_score: number | null
          session_id: string | null
          task_id: string
          time_spent_ms: number | null
          timestamp_ms: number
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          notes?: string | null
          quality_score?: number | null
          session_id?: string | null
          task_id: string
          time_spent_ms?: number | null
          timestamp_ms: number
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          quality_score?: number | null
          session_id?: string | null
          task_id?: string
          time_spent_ms?: number | null
          timestamp_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "pressure_cooker_actions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pressure_cooker_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      pressure_cooker_sessions: {
        Row: {
          avg_response_time_ms: number | null
          communication_style: string | null
          completed_at: string | null
          completed_tasks: number | null
          completion_rate: number | null
          decision_quality: number | null
          id: string
          multitasking_ability: number | null
          prioritization_accuracy: number | null
          scenario_seed: string
          started_at: string | null
          stress_handling_score: number | null
          tasks_presented: Json
          total_tasks: number | null
          user_id: string
        }
        Insert: {
          avg_response_time_ms?: number | null
          communication_style?: string | null
          completed_at?: string | null
          completed_tasks?: number | null
          completion_rate?: number | null
          decision_quality?: number | null
          id?: string
          multitasking_ability?: number | null
          prioritization_accuracy?: number | null
          scenario_seed: string
          started_at?: string | null
          stress_handling_score?: number | null
          tasks_presented: Json
          total_tasks?: number | null
          user_id: string
        }
        Update: {
          avg_response_time_ms?: number | null
          communication_style?: string | null
          completed_at?: string | null
          completed_tasks?: number | null
          completion_rate?: number | null
          decision_quality?: number | null
          id?: string
          multitasking_ability?: number | null
          prioritization_accuracy?: number | null
          scenario_seed?: string
          started_at?: string | null
          stress_handling_score?: number | null
          tasks_presented?: Json
          total_tasks?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profile_achievements: {
        Row: {
          certificate_file_url: string | null
          created_at: string | null
          credential_id: string | null
          credential_url: string | null
          description: string | null
          display_order: number | null
          expiry_date: string | null
          id: string
          issue_date: string | null
          issuer: string | null
          metadata: Json | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
          verification_status: string | null
          visibility: string | null
        }
        Insert: {
          certificate_file_url?: string | null
          created_at?: string | null
          credential_id?: string | null
          credential_url?: string | null
          description?: string | null
          display_order?: number | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuer?: string | null
          metadata?: Json | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
          verification_status?: string | null
          visibility?: string | null
        }
        Update: {
          certificate_file_url?: string | null
          created_at?: string | null
          credential_id?: string | null
          credential_url?: string | null
          description?: string | null
          display_order?: number | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuer?: string | null
          metadata?: Json | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
          verification_status?: string | null
          visibility?: string | null
        }
        Relationships: []
      }
      profile_activity: {
        Row: {
          activity_type: string
          actor_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          actor_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          actor_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      profile_analytics: {
        Row: {
          created_at: string
          date: string
          engagement_rate: number | null
          followers_count: number | null
          id: string
          metrics: Json | null
          post_count: number | null
          profile_views: number | null
          top_post_id: string | null
          total_engagement: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          engagement_rate?: number | null
          followers_count?: number | null
          id?: string
          metrics?: Json | null
          post_count?: number | null
          profile_views?: number | null
          top_post_id?: string | null
          total_engagement?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          engagement_rate?: number | null
          followers_count?: number | null
          id?: string
          metrics?: Json | null
          post_count?: number | null
          profile_views?: number | null
          top_post_id?: string | null
          total_engagement?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_analytics_top_post_id_fkey"
            columns: ["top_post_id"]
            isOneToOne: false
            referencedRelation: "unified_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_custom_fields: {
        Row: {
          created_at: string | null
          display_order: number | null
          field_type: string
          icon: string | null
          id: string
          label: string
          updated_at: string | null
          url: string | null
          user_id: string
          value: string
          visibility: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          field_type: string
          icon?: string | null
          id?: string
          label: string
          updated_at?: string | null
          url?: string | null
          user_id: string
          value: string
          visibility?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          field_type?: string
          icon?: string | null
          id?: string
          label?: string
          updated_at?: string | null
          url?: string | null
          user_id?: string
          value?: string
          visibility?: string | null
        }
        Relationships: []
      }
      profile_data_exports: {
        Row: {
          completed_at: string | null
          expires_at: string | null
          export_file_url: string | null
          export_status: string | null
          id: string
          requested_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          expires_at?: string | null
          export_file_url?: string | null
          export_status?: string | null
          id?: string
          requested_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          expires_at?: string | null
          export_file_url?: string | null
          export_status?: string | null
          id?: string
          requested_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profile_education: {
        Row: {
          activities: Json | null
          certificate_url: string | null
          certificate_verified: boolean | null
          created_at: string | null
          degree_type: string | null
          description: string | null
          display_order: number | null
          end_date: string | null
          field_of_study: string | null
          grade: string | null
          id: string
          institution_name: string
          is_current: boolean | null
          start_date: string | null
          updated_at: string | null
          user_id: string
          visibility: string | null
        }
        Insert: {
          activities?: Json | null
          certificate_url?: string | null
          certificate_verified?: boolean | null
          created_at?: string | null
          degree_type?: string | null
          description?: string | null
          display_order?: number | null
          end_date?: string | null
          field_of_study?: string | null
          grade?: string | null
          id?: string
          institution_name: string
          is_current?: boolean | null
          start_date?: string | null
          updated_at?: string | null
          user_id: string
          visibility?: string | null
        }
        Update: {
          activities?: Json | null
          certificate_url?: string | null
          certificate_verified?: boolean | null
          created_at?: string | null
          degree_type?: string | null
          description?: string | null
          display_order?: number | null
          end_date?: string | null
          field_of_study?: string | null
          grade?: string | null
          id?: string
          institution_name?: string
          is_current?: boolean | null
          start_date?: string | null
          updated_at?: string | null
          user_id?: string
          visibility?: string | null
        }
        Relationships: []
      }
      profile_experience: {
        Row: {
          achievements: Json | null
          company_name: string
          created_at: string | null
          description: string | null
          display_order: number | null
          employment_type: string | null
          end_date: string | null
          id: string
          is_current: boolean | null
          location: string | null
          location_type: string | null
          position_title: string
          projects: Json | null
          skills_used: Json | null
          start_date: string
          updated_at: string | null
          user_id: string
          visibility: string | null
        }
        Insert: {
          achievements?: Json | null
          company_name: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          employment_type?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          location?: string | null
          location_type?: string | null
          position_title: string
          projects?: Json | null
          skills_used?: Json | null
          start_date: string
          updated_at?: string | null
          user_id: string
          visibility?: string | null
        }
        Update: {
          achievements?: Json | null
          company_name?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          employment_type?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          location?: string | null
          location_type?: string | null
          position_title?: string
          projects?: Json | null
          skills_used?: Json | null
          start_date?: string
          updated_at?: string | null
          user_id?: string
          visibility?: string | null
        }
        Relationships: []
      }
      profile_media: {
        Row: {
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          file_size: number | null
          file_url: string
          id: string
          is_primary: boolean | null
          mime_type: string | null
          thumbnail_url: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
          views_count: number | null
          visibility: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          file_size?: number | null
          file_url: string
          id?: string
          is_primary?: boolean | null
          mime_type?: string | null
          thumbnail_url?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
          views_count?: number | null
          visibility?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          file_size?: number | null
          file_url?: string
          id?: string
          is_primary?: boolean | null
          mime_type?: string | null
          thumbnail_url?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
          views_count?: number | null
          visibility?: string | null
        }
        Relationships: []
      }
      profile_portfolio: {
        Row: {
          collaborators: Json | null
          created_at: string | null
          date_completed: string | null
          description: string | null
          display_order: number | null
          featured: boolean | null
          github_url: string | null
          id: string
          likes_count: number | null
          media_urls: Json | null
          project_url: string | null
          tags: Json | null
          thumbnail_url: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
          views_count: number | null
          visibility: string | null
        }
        Insert: {
          collaborators?: Json | null
          created_at?: string | null
          date_completed?: string | null
          description?: string | null
          display_order?: number | null
          featured?: boolean | null
          github_url?: string | null
          id?: string
          likes_count?: number | null
          media_urls?: Json | null
          project_url?: string | null
          tags?: Json | null
          thumbnail_url?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
          views_count?: number | null
          visibility?: string | null
        }
        Update: {
          collaborators?: Json | null
          created_at?: string | null
          date_completed?: string | null
          description?: string | null
          display_order?: number | null
          featured?: boolean | null
          github_url?: string | null
          id?: string
          likes_count?: number | null
          media_urls?: Json | null
          project_url?: string | null
          tags?: Json | null
          thumbnail_url?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
          views_count?: number | null
          visibility?: string | null
        }
        Relationships: []
      }
      profile_recommendations: {
        Row: {
          created_at: string | null
          display_order: number | null
          featured: boolean | null
          id: string
          rating: number | null
          recommendation_text: string
          recommender_company: string | null
          recommender_id: string | null
          recommender_name: string
          recommender_title: string | null
          relationship: string | null
          skills_highlighted: Json | null
          status: string | null
          updated_at: string | null
          user_id: string
          visibility: string | null
          voice_message_url: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          featured?: boolean | null
          id?: string
          rating?: number | null
          recommendation_text: string
          recommender_company?: string | null
          recommender_id?: string | null
          recommender_name: string
          recommender_title?: string | null
          relationship?: string | null
          skills_highlighted?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          visibility?: string | null
          voice_message_url?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          featured?: boolean | null
          id?: string
          rating?: number | null
          recommendation_text?: string
          recommender_company?: string | null
          recommender_id?: string | null
          recommender_name?: string
          recommender_title?: string | null
          relationship?: string | null
          skills_highlighted?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          visibility?: string | null
          voice_message_url?: string | null
        }
        Relationships: []
      }
      profile_share_links: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          last_viewed_at: string | null
          token: string
          user_id: string
          view_count: number | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          last_viewed_at?: string | null
          token: string
          user_id: string
          view_count?: number | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          last_viewed_at?: string | null
          token?: string
          user_id?: string
          view_count?: number | null
        }
        Relationships: []
      }
      profile_skills: {
        Row: {
          ai_verified: boolean | null
          category: string | null
          created_at: string | null
          display_order: number | null
          endorsement_count: number | null
          id: string
          last_used: string | null
          proficiency_level: number | null
          proof_of_work: Json | null
          skill_name: string
          updated_at: string | null
          user_id: string
          visibility: string | null
          years_experience: number | null
        }
        Insert: {
          ai_verified?: boolean | null
          category?: string | null
          created_at?: string | null
          display_order?: number | null
          endorsement_count?: number | null
          id?: string
          last_used?: string | null
          proficiency_level?: number | null
          proof_of_work?: Json | null
          skill_name: string
          updated_at?: string | null
          user_id: string
          visibility?: string | null
          years_experience?: number | null
        }
        Update: {
          ai_verified?: boolean | null
          category?: string | null
          created_at?: string | null
          display_order?: number | null
          endorsement_count?: number | null
          id?: string
          last_used?: string | null
          proficiency_level?: number | null
          proof_of_work?: Json | null
          skill_name?: string
          updated_at?: string | null
          user_id?: string
          visibility?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      profile_strength_stats: {
        Row: {
          all_levels_completed_at: string | null
          completed_tasks: number | null
          completion_percentage: number | null
          created_at: string | null
          current_level: number | null
          id: string
          level_1_completed: boolean | null
          level_2_completed: boolean | null
          level_3_completed: boolean | null
          level_4_completed: boolean | null
          level_5_completed: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          total_tasks: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          all_levels_completed_at?: string | null
          completed_tasks?: number | null
          completion_percentage?: number | null
          created_at?: string | null
          current_level?: number | null
          id?: string
          level_1_completed?: boolean | null
          level_2_completed?: boolean | null
          level_3_completed?: boolean | null
          level_4_completed?: boolean | null
          level_5_completed?: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          total_tasks?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          all_levels_completed_at?: string | null
          completed_tasks?: number | null
          completion_percentage?: number | null
          created_at?: string | null
          current_level?: number | null
          id?: string
          level_1_completed?: boolean | null
          level_2_completed?: boolean | null
          level_3_completed?: boolean | null
          level_4_completed?: boolean | null
          level_5_completed?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          total_tasks?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profile_strength_tasks: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          skipped: boolean | null
          task_key: string
          task_level: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          skipped?: boolean | null
          task_key: string
          task_level: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          skipped?: boolean | null
          task_key?: string
          task_level?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profile_views: {
        Row: {
          id: string
          is_anonymous: boolean | null
          viewed_at: string | null
          viewed_user_id: string
          viewer_company_id: string | null
          viewer_user_id: string | null
        }
        Insert: {
          id?: string
          is_anonymous?: boolean | null
          viewed_at?: string | null
          viewed_user_id: string
          viewer_company_id?: string | null
          viewer_user_id?: string | null
        }
        Update: {
          id?: string
          is_anonymous?: boolean | null
          viewed_at?: string | null
          viewed_user_id?: string
          viewer_company_id?: string | null
          viewer_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_viewer_company_id_fkey"
            columns: ["viewer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_viewer_company_id_fkey"
            columns: ["viewer_company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_visibility_rules: {
        Row: {
          allowed_companies: Json | null
          allowed_roles: Json | null
          blocked_companies: Json | null
          created_at: string | null
          id: string
          section_name: string
          updated_at: string | null
          user_id: string
          visibility_level: string | null
        }
        Insert: {
          allowed_companies?: Json | null
          allowed_roles?: Json | null
          blocked_companies?: Json | null
          created_at?: string | null
          id?: string
          section_name: string
          updated_at?: string | null
          user_id: string
          visibility_level?: string | null
        }
        Update: {
          allowed_companies?: Json | null
          allowed_roles?: Json | null
          blocked_companies?: Json | null
          created_at?: string | null
          id?: string
          section_name?: string
          updated_at?: string | null
          user_id?: string
          visibility_level?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_approved_at: string | null
          account_approved_by: string | null
          account_decline_reason: string | null
          account_reviewed_at: string | null
          account_status: string | null
          actively_looking: boolean | null
          allow_stealth_cold_outreach: boolean | null
          apple_music_connected: boolean | null
          apple_music_playlists: Json | null
          apple_music_user_id: string | null
          assigned_strategist_id: string | null
          available_hours_per_week: number | null
          avatar_url: string | null
          bio: string | null
          blocked_companies: Json | null
          career_preferences: string | null
          club_sync_enabled: boolean | null
          company_id: string | null
          company_size_preference: string | null
          contract_end_date: string | null
          created_at: string | null
          current_salary_max: number | null
          current_salary_min: number | null
          current_title: string | null
          desired_salary_max: number | null
          desired_salary_min: number | null
          email: string | null
          email_verified: boolean | null
          employment_type_preference: string | null
          freelance_availability_status: string | null
          freelance_categories: string[] | null
          freelance_hourly_rate_max: number | null
          freelance_hourly_rate_min: number | null
          freelance_hours_per_week_max: number | null
          freelance_hours_per_week_min: number | null
          freelance_preferred_engagement_types: string[] | null
          freelance_preferred_project_duration: string[] | null
          freelance_years_experience: number | null
          full_name: string | null
          fulltime_hours_per_week_max: number | null
          fulltime_hours_per_week_min: number | null
          ghost_mode_enabled: boolean | null
          ghost_mode_reason: string | null
          github_connected: boolean | null
          github_profile_data: Json | null
          github_username: string | null
          has_indefinite_contract: boolean | null
          header_media_type: string | null
          header_media_url: string | null
          id: string
          industry_preference: string | null
          instagram_connected: boolean | null
          instagram_username: string | null
          job_alert_frequency: string | null
          linkedin_connected: boolean | null
          linkedin_profile_data: Json | null
          linkedin_url: string | null
          location: string | null
          notice_period: string | null
          onboarding_completed_at: string | null
          onboarding_current_step: number | null
          onboarding_last_activity_at: string | null
          onboarding_partial_data: Json | null
          open_to_freelance_work: boolean | null
          overtime_willingness: number | null
          phone: string | null
          phone_verified: boolean | null
          preferred_currency: string
          preferred_job_types: string[] | null
          preferred_language: string | null
          preferred_locations: string[] | null
          preferred_work_locations: Json | null
          privacy_settings: Json | null
          profile_slug: string | null
          public_fields: Json | null
          reference_timezone: string | null
          remote_work_aspiration: boolean | null
          remote_work_preference: boolean | null
          resume_filename: string | null
          resume_url: string | null
          salary_expectation_currency: string | null
          salary_expectation_max: number | null
          salary_expectation_min: number | null
          salary_preference_hidden: boolean | null
          skills: string[] | null
          spotify_connected: boolean | null
          spotify_playlists: Json | null
          spotify_user_id: string | null
          stealth_mode_enabled: boolean | null
          stealth_mode_level: number | null
          twitter_connected: boolean | null
          twitter_username: string | null
          updated_at: string | null
          weekend_availability: boolean | null
          work_days: number[] | null
          work_hours_end: string | null
          work_hours_start: string | null
          work_timezone: string | null
          work_timezone_flexibility_hours: number | null
          years_of_experience: number | null
        }
        Insert: {
          account_approved_at?: string | null
          account_approved_by?: string | null
          account_decline_reason?: string | null
          account_reviewed_at?: string | null
          account_status?: string | null
          actively_looking?: boolean | null
          allow_stealth_cold_outreach?: boolean | null
          apple_music_connected?: boolean | null
          apple_music_playlists?: Json | null
          apple_music_user_id?: string | null
          assigned_strategist_id?: string | null
          available_hours_per_week?: number | null
          avatar_url?: string | null
          bio?: string | null
          blocked_companies?: Json | null
          career_preferences?: string | null
          club_sync_enabled?: boolean | null
          company_id?: string | null
          company_size_preference?: string | null
          contract_end_date?: string | null
          created_at?: string | null
          current_salary_max?: number | null
          current_salary_min?: number | null
          current_title?: string | null
          desired_salary_max?: number | null
          desired_salary_min?: number | null
          email?: string | null
          email_verified?: boolean | null
          employment_type_preference?: string | null
          freelance_availability_status?: string | null
          freelance_categories?: string[] | null
          freelance_hourly_rate_max?: number | null
          freelance_hourly_rate_min?: number | null
          freelance_hours_per_week_max?: number | null
          freelance_hours_per_week_min?: number | null
          freelance_preferred_engagement_types?: string[] | null
          freelance_preferred_project_duration?: string[] | null
          freelance_years_experience?: number | null
          full_name?: string | null
          fulltime_hours_per_week_max?: number | null
          fulltime_hours_per_week_min?: number | null
          ghost_mode_enabled?: boolean | null
          ghost_mode_reason?: string | null
          github_connected?: boolean | null
          github_profile_data?: Json | null
          github_username?: string | null
          has_indefinite_contract?: boolean | null
          header_media_type?: string | null
          header_media_url?: string | null
          id: string
          industry_preference?: string | null
          instagram_connected?: boolean | null
          instagram_username?: string | null
          job_alert_frequency?: string | null
          linkedin_connected?: boolean | null
          linkedin_profile_data?: Json | null
          linkedin_url?: string | null
          location?: string | null
          notice_period?: string | null
          onboarding_completed_at?: string | null
          onboarding_current_step?: number | null
          onboarding_last_activity_at?: string | null
          onboarding_partial_data?: Json | null
          open_to_freelance_work?: boolean | null
          overtime_willingness?: number | null
          phone?: string | null
          phone_verified?: boolean | null
          preferred_currency?: string
          preferred_job_types?: string[] | null
          preferred_language?: string | null
          preferred_locations?: string[] | null
          preferred_work_locations?: Json | null
          privacy_settings?: Json | null
          profile_slug?: string | null
          public_fields?: Json | null
          reference_timezone?: string | null
          remote_work_aspiration?: boolean | null
          remote_work_preference?: boolean | null
          resume_filename?: string | null
          resume_url?: string | null
          salary_expectation_currency?: string | null
          salary_expectation_max?: number | null
          salary_expectation_min?: number | null
          salary_preference_hidden?: boolean | null
          skills?: string[] | null
          spotify_connected?: boolean | null
          spotify_playlists?: Json | null
          spotify_user_id?: string | null
          stealth_mode_enabled?: boolean | null
          stealth_mode_level?: number | null
          twitter_connected?: boolean | null
          twitter_username?: string | null
          updated_at?: string | null
          weekend_availability?: boolean | null
          work_days?: number[] | null
          work_hours_end?: string | null
          work_hours_start?: string | null
          work_timezone?: string | null
          work_timezone_flexibility_hours?: number | null
          years_of_experience?: number | null
        }
        Update: {
          account_approved_at?: string | null
          account_approved_by?: string | null
          account_decline_reason?: string | null
          account_reviewed_at?: string | null
          account_status?: string | null
          actively_looking?: boolean | null
          allow_stealth_cold_outreach?: boolean | null
          apple_music_connected?: boolean | null
          apple_music_playlists?: Json | null
          apple_music_user_id?: string | null
          assigned_strategist_id?: string | null
          available_hours_per_week?: number | null
          avatar_url?: string | null
          bio?: string | null
          blocked_companies?: Json | null
          career_preferences?: string | null
          club_sync_enabled?: boolean | null
          company_id?: string | null
          company_size_preference?: string | null
          contract_end_date?: string | null
          created_at?: string | null
          current_salary_max?: number | null
          current_salary_min?: number | null
          current_title?: string | null
          desired_salary_max?: number | null
          desired_salary_min?: number | null
          email?: string | null
          email_verified?: boolean | null
          employment_type_preference?: string | null
          freelance_availability_status?: string | null
          freelance_categories?: string[] | null
          freelance_hourly_rate_max?: number | null
          freelance_hourly_rate_min?: number | null
          freelance_hours_per_week_max?: number | null
          freelance_hours_per_week_min?: number | null
          freelance_preferred_engagement_types?: string[] | null
          freelance_preferred_project_duration?: string[] | null
          freelance_years_experience?: number | null
          full_name?: string | null
          fulltime_hours_per_week_max?: number | null
          fulltime_hours_per_week_min?: number | null
          ghost_mode_enabled?: boolean | null
          ghost_mode_reason?: string | null
          github_connected?: boolean | null
          github_profile_data?: Json | null
          github_username?: string | null
          has_indefinite_contract?: boolean | null
          header_media_type?: string | null
          header_media_url?: string | null
          id?: string
          industry_preference?: string | null
          instagram_connected?: boolean | null
          instagram_username?: string | null
          job_alert_frequency?: string | null
          linkedin_connected?: boolean | null
          linkedin_profile_data?: Json | null
          linkedin_url?: string | null
          location?: string | null
          notice_period?: string | null
          onboarding_completed_at?: string | null
          onboarding_current_step?: number | null
          onboarding_last_activity_at?: string | null
          onboarding_partial_data?: Json | null
          open_to_freelance_work?: boolean | null
          overtime_willingness?: number | null
          phone?: string | null
          phone_verified?: boolean | null
          preferred_currency?: string
          preferred_job_types?: string[] | null
          preferred_language?: string | null
          preferred_locations?: string[] | null
          preferred_work_locations?: Json | null
          privacy_settings?: Json | null
          profile_slug?: string | null
          public_fields?: Json | null
          reference_timezone?: string | null
          remote_work_aspiration?: boolean | null
          remote_work_preference?: boolean | null
          resume_filename?: string | null
          resume_url?: string | null
          salary_expectation_currency?: string | null
          salary_expectation_max?: number | null
          salary_expectation_min?: number | null
          salary_preference_hidden?: boolean | null
          skills?: string[] | null
          spotify_connected?: boolean | null
          spotify_playlists?: Json | null
          spotify_user_id?: string | null
          stealth_mode_enabled?: boolean | null
          stealth_mode_level?: number | null
          twitter_connected?: boolean | null
          twitter_username?: string | null
          updated_at?: string | null
          weekend_availability?: boolean | null
          work_days?: number[] | null
          work_hours_end?: string | null
          work_hours_start?: string | null
          work_timezone?: string | null
          work_timezone_flexibility_hours?: number | null
          years_of_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_account_approved_by_fkey"
            columns: ["account_approved_by"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "profiles_account_approved_by_fkey"
            columns: ["account_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_account_approved_by_fkey"
            columns: ["account_approved_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_assigned_strategist_id_fkey"
            columns: ["assigned_strategist_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "profiles_assigned_strategist_id_fkey"
            columns: ["assigned_strategist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_assigned_strategist_id_fkey"
            columns: ["assigned_strategist_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      projected_earnings: {
        Row: {
          application_id: string
          candidate_id: string | null
          company_id: string
          confidence_score: number | null
          created_at: string | null
          estimated_salary: number | null
          fee_percentage: number | null
          id: string
          job_id: string
          projected_fee_amount: number | null
          referrer_splits: Json | null
          updated_at: string | null
        }
        Insert: {
          application_id: string
          candidate_id?: string | null
          company_id: string
          confidence_score?: number | null
          created_at?: string | null
          estimated_salary?: number | null
          fee_percentage?: number | null
          id?: string
          job_id: string
          projected_fee_amount?: number | null
          referrer_splits?: Json | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          candidate_id?: string | null
          company_id?: string
          confidence_score?: number | null
          created_at?: string | null
          estimated_salary?: number | null
          fee_percentage?: number | null
          id?: string
          job_id?: string
          projected_fee_amount?: number | null
          referrer_splits?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projected_earnings_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projected_earnings_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications_with_deleted_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projected_earnings_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projected_earnings_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "projected_earnings_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "unified_candidate_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projected_earnings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projected_earnings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projected_earnings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          device_name: string | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          device_name?: string | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          device_name?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quantum_achievements: {
        Row: {
          animation_effect: string | null
          category: Database["public"]["Enums"]["achievement_category"]
          created_at: string
          description: string
          icon: string | null
          icon_emoji: string
          id: string
          is_active: boolean | null
          is_deprecated: boolean | null
          name: string
          points: number
          rarity: Database["public"]["Enums"]["achievement_rarity"]
          unlock_condition_json: Json | null
          unlock_criteria: Json
          version: number | null
        }
        Insert: {
          animation_effect?: string | null
          category: Database["public"]["Enums"]["achievement_category"]
          created_at?: string
          description: string
          icon?: string | null
          icon_emoji: string
          id?: string
          is_active?: boolean | null
          is_deprecated?: boolean | null
          name: string
          points?: number
          rarity?: Database["public"]["Enums"]["achievement_rarity"]
          unlock_condition_json?: Json | null
          unlock_criteria?: Json
          version?: number | null
        }
        Update: {
          animation_effect?: string | null
          category?: Database["public"]["Enums"]["achievement_category"]
          created_at?: string
          description?: string
          icon?: string | null
          icon_emoji?: string
          id?: string
          is_active?: boolean | null
          is_deprecated?: boolean | null
          name?: string
          points?: number
          rarity?: Database["public"]["Enums"]["achievement_rarity"]
          unlock_condition_json?: Json | null
          unlock_criteria?: Json
          version?: number | null
        }
        Relationships: []
      }
      question_answers: {
        Row: {
          answer_text: string
          answer_type: string | null
          created_at: string | null
          id: string
          is_accepted: boolean | null
          is_ai_generated: boolean | null
          question_id: string
          updated_at: string | null
          upvotes: number | null
          user_id: string | null
        }
        Insert: {
          answer_text: string
          answer_type?: string | null
          created_at?: string | null
          id?: string
          is_accepted?: boolean | null
          is_ai_generated?: boolean | null
          question_id: string
          updated_at?: string | null
          upvotes?: number | null
          user_id?: string | null
        }
        Update: {
          answer_text?: string
          answer_type?: string | null
          created_at?: string | null
          id?: string
          is_accepted?: boolean | null
          is_ai_generated?: boolean | null
          question_id?: string
          updated_at?: string | null
          upvotes?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "module_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_metrics: {
        Row: {
          actual_rpo_minutes: number | null
          actual_rto_minutes: number | null
          cost_impact_usd: number | null
          created_at: string | null
          customer_impact: string | null
          data_loss_amount_mb: number | null
          data_loss_detected: boolean | null
          downtime_minutes: number | null
          id: string
          incident_id: string | null
          metric_date: string
          recovery_method: string | null
          recovery_success: boolean
          services_affected: string[] | null
          target_rpo_minutes: number
          target_rto_minutes: number
        }
        Insert: {
          actual_rpo_minutes?: number | null
          actual_rto_minutes?: number | null
          cost_impact_usd?: number | null
          created_at?: string | null
          customer_impact?: string | null
          data_loss_amount_mb?: number | null
          data_loss_detected?: boolean | null
          downtime_minutes?: number | null
          id?: string
          incident_id?: string | null
          metric_date?: string
          recovery_method?: string | null
          recovery_success: boolean
          services_affected?: string[] | null
          target_rpo_minutes?: number
          target_rto_minutes?: number
        }
        Update: {
          actual_rpo_minutes?: number | null
          actual_rto_minutes?: number | null
          cost_impact_usd?: number | null
          created_at?: string | null
          customer_impact?: string | null
          data_loss_amount_mb?: number | null
          data_loss_detected?: boolean | null
          downtime_minutes?: number | null
          id?: string
          incident_id?: string | null
          metric_date?: string
          recovery_method?: string | null
          recovery_success?: boolean
          services_affected?: string[] | null
          target_rpo_minutes?: number
          target_rto_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "recovery_metrics_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incident_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_playbooks: {
        Row: {
          created_at: string | null
          created_by: string | null
          decision_points: Json | null
          estimated_rpo_minutes: number | null
          estimated_rto_minutes: number | null
          external_dependencies: string[] | null
          id: string
          is_active: boolean | null
          last_tested_at: string | null
          playbook_name: string
          prerequisites: string[] | null
          required_contacts: string[] | null
          rollback_steps: Json | null
          scenario_type: string
          severity_level: string
          steps: Json
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          decision_points?: Json | null
          estimated_rpo_minutes?: number | null
          estimated_rto_minutes?: number | null
          external_dependencies?: string[] | null
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          playbook_name: string
          prerequisites?: string[] | null
          required_contacts?: string[] | null
          rollback_steps?: Json | null
          scenario_type: string
          severity_level: string
          steps: Json
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          decision_points?: Json | null
          estimated_rpo_minutes?: number | null
          estimated_rto_minutes?: number | null
          external_dependencies?: string[] | null
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          playbook_name?: string
          prerequisites?: string[] | null
          required_contacts?: string[] | null
          rollback_steps?: Json | null
          scenario_type?: string
          severity_level?: string
          steps?: Json
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      referral_bonuses: {
        Row: {
          bonus_amount_euros: number
          bonus_type: string
          created_at: string | null
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          qualified_at: string | null
          referral_type: string
          referred_id: string
          referrer_id: string
          requirements_met: Json | null
          status: string
          updated_at: string | null
        }
        Insert: {
          bonus_amount_euros: number
          bonus_type: string
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          qualified_at?: string | null
          referral_type: string
          referred_id: string
          referrer_id: string
          requirements_met?: Json | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          bonus_amount_euros?: number
          bonus_type?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          qualified_at?: string | null
          referral_type?: string
          referred_id?: string
          referrer_id?: string
          requirements_met?: Json | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      referral_config: {
        Row: {
          bonus_amount_euros: number
          config_type: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          requirements: Json
          updated_at: string | null
        }
        Insert: {
          bonus_amount_euros: number
          config_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          requirements: Json
          updated_at?: string | null
        }
        Update: {
          bonus_amount_euros?: number
          config_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          requirements?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      referral_metadata: {
        Row: {
          company_name: string
          created_at: string
          expires_at: string
          friend_current_company: string | null
          friend_current_role: string | null
          friend_email: string | null
          friend_linkedin: string | null
          friend_name: string | null
          id: string
          invite_code_id: string | null
          job_id: string
          job_title: string
          referrer_notes: string | null
          why_good_fit: string | null
        }
        Insert: {
          company_name: string
          created_at?: string
          expires_at?: string
          friend_current_company?: string | null
          friend_current_role?: string | null
          friend_email?: string | null
          friend_linkedin?: string | null
          friend_name?: string | null
          id?: string
          invite_code_id?: string | null
          job_id: string
          job_title: string
          referrer_notes?: string | null
          why_good_fit?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string
          expires_at?: string
          friend_current_company?: string | null
          friend_current_role?: string | null
          friend_email?: string | null
          friend_linkedin?: string | null
          friend_name?: string | null
          id?: string
          invite_code_id?: string | null
          job_id?: string
          job_title?: string
          referrer_notes?: string | null
          why_good_fit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_metadata_invite_code_id_fkey"
            columns: ["invite_code_id"]
            isOneToOne: false
            referencedRelation: "invite_codes"
            referencedColumns: ["id"]
          },
        ]
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
      referral_payouts: {
        Row: {
          application_id: string | null
          approved_at: string | null
          approved_by: string | null
          calculation_basis: Json | null
          candidate_id: string | null
          created_at: string | null
          currency_code: string | null
          id: string
          notes: string | null
          paid_at: string | null
          payment_details: Json | null
          payment_method: string | null
          payment_reference: string | null
          payout_amount: number
          processed_at: string | null
          processed_by: string | null
          referral_id: string | null
          referrer_user_id: string
          rejection_reason: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          application_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          calculation_basis?: Json | null
          candidate_id?: string | null
          created_at?: string | null
          currency_code?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_details?: Json | null
          payment_method?: string | null
          payment_reference?: string | null
          payout_amount: number
          processed_at?: string | null
          processed_by?: string | null
          referral_id?: string | null
          referrer_user_id: string
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          calculation_basis?: Json | null
          candidate_id?: string | null
          created_at?: string | null
          currency_code?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_details?: Json | null
          payment_method?: string | null
          payment_reference?: string | null
          payout_amount?: number
          processed_at?: string | null
          processed_by?: string | null
          referral_id?: string | null
          referrer_user_id?: string
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_payouts_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_payouts_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications_with_deleted_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_payouts_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_payouts_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "referral_payouts_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "unified_candidate_view"
            referencedColumns: ["id"]
          },
        ]
      }
      region_health_checks: {
        Row: {
          check_type: string
          created_at: string | null
          error_message: string | null
          id: string
          latency_ms: number | null
          metadata: Json | null
          region: string
          status: string
        }
        Insert: {
          check_type?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          region: string
          status: string
        }
        Update: {
          check_type?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          region?: string
          status?: string
        }
        Relationships: []
      }
      revenue_metrics: {
        Row: {
          active_subscriptions: number | null
          arr: number
          average_revenue_per_user: number | null
          canceled_subscriptions: number | null
          churn_mrr: number | null
          churn_rate: number | null
          contraction_mrr: number | null
          created_at: string | null
          customer_lifetime_value: number | null
          expansion_mrr: number | null
          id: string
          metadata: Json | null
          metric_date: string
          mrr: number
          net_revenue_retention: number | null
          new_mrr: number | null
          new_subscriptions: number | null
          total_revenue: number | null
          trialing_subscriptions: number | null
          updated_at: string | null
        }
        Insert: {
          active_subscriptions?: number | null
          arr?: number
          average_revenue_per_user?: number | null
          canceled_subscriptions?: number | null
          churn_mrr?: number | null
          churn_rate?: number | null
          contraction_mrr?: number | null
          created_at?: string | null
          customer_lifetime_value?: number | null
          expansion_mrr?: number | null
          id?: string
          metadata?: Json | null
          metric_date: string
          mrr?: number
          net_revenue_retention?: number | null
          new_mrr?: number | null
          new_subscriptions?: number | null
          total_revenue?: number | null
          trialing_subscriptions?: number | null
          updated_at?: string | null
        }
        Update: {
          active_subscriptions?: number | null
          arr?: number
          average_revenue_per_user?: number | null
          canceled_subscriptions?: number | null
          churn_mrr?: number | null
          churn_rate?: number | null
          contraction_mrr?: number | null
          created_at?: string | null
          customer_lifetime_value?: number | null
          expansion_mrr?: number | null
          id?: string
          metadata?: Json | null
          metric_date?: string
          mrr?: number
          net_revenue_retention?: number | null
          new_mrr?: number | null
          new_subscriptions?: number | null
          total_revenue?: number | null
          trialing_subscriptions?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      role_candidate_feedback: {
        Row: {
          application_id: string | null
          candidate_id: string | null
          created_at: string | null
          experience_match_score: number | null
          feedback_text: string | null
          feedback_type: string
          id: string
          job_id: string
          metadata: Json | null
          provided_by: string
          rejection_reason: string | null
          skills_match_score: number | null
          specific_gaps: string[] | null
          stage_name: string | null
          strong_points: string[] | null
        }
        Insert: {
          application_id?: string | null
          candidate_id?: string | null
          created_at?: string | null
          experience_match_score?: number | null
          feedback_text?: string | null
          feedback_type: string
          id?: string
          job_id: string
          metadata?: Json | null
          provided_by: string
          rejection_reason?: string | null
          skills_match_score?: number | null
          specific_gaps?: string[] | null
          stage_name?: string | null
          strong_points?: string[] | null
        }
        Update: {
          application_id?: string | null
          candidate_id?: string | null
          created_at?: string | null
          experience_match_score?: number | null
          feedback_text?: string | null
          feedback_type?: string
          id?: string
          job_id?: string
          metadata?: Json | null
          provided_by?: string
          rejection_reason?: string | null
          skills_match_score?: number | null
          specific_gaps?: string[] | null
          stage_name?: string | null
          strong_points?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "role_candidate_feedback_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_candidate_feedback_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications_with_deleted_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_candidate_feedback_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_candidate_feedback_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "role_candidate_feedback_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "unified_candidate_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_candidate_feedback_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_candidate_feedback_provided_by_fkey"
            columns: ["provided_by"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "role_candidate_feedback_provided_by_fkey"
            columns: ["provided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_candidate_feedback_provided_by_fkey"
            columns: ["provided_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_change_audit: {
        Row: {
          change_type: string
          changed_by: string
          created_at: string | null
          id: string
          metadata: Json | null
          new_roles: Json | null
          old_roles: Json | null
          user_id: string
        }
        Insert: {
          change_type: string
          changed_by: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_roles?: Json | null
          old_roles?: Json | null
          user_id: string
        }
        Update: {
          change_type?: string
          changed_by?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_roles?: Json | null
          old_roles?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      role_verification_logs: {
        Row: {
          checked_at: string | null
          checked_role: string
          function_name: string | null
          id: string
          ip_address: unknown
          result: boolean
          user_id: string
        }
        Insert: {
          checked_at?: string | null
          checked_role: string
          function_name?: string | null
          id?: string
          ip_address?: unknown
          result: boolean
          user_id: string
        }
        Update: {
          checked_at?: string | null
          checked_role?: string
          function_name?: string | null
          id?: string
          ip_address?: unknown
          result?: boolean
          user_id?: string
        }
        Relationships: []
      }
      rss_feeds: {
        Row: {
          company_id: string
          created_at: string | null
          feed_name: string
          feed_url: string
          fetch_interval_minutes: number | null
          id: string
          is_active: boolean | null
          last_fetched_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          feed_name: string
          feed_url: string
          fetch_interval_minutes?: number | null
          id?: string
          is_active?: boolean | null
          last_fetched_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          feed_name?: string
          feed_url?: string
          fetch_interval_minutes?: number | null
          id?: string
          is_active?: boolean | null
          last_fetched_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rss_feeds_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rss_feeds_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_benchmarks: {
        Row: {
          currency: string | null
          experience_years: unknown
          id: string
          location: string
          role_title: string
          salary_max: number | null
          salary_min: number | null
          sample_size: number | null
          updated_at: string | null
        }
        Insert: {
          currency?: string | null
          experience_years?: unknown
          id?: string
          location: string
          role_title: string
          salary_max?: number | null
          salary_min?: number | null
          sample_size?: number | null
          updated_at?: string | null
        }
        Update: {
          currency?: string | null
          experience_years?: unknown
          id?: string
          location?: string
          role_title?: string
          salary_max?: number | null
          salary_min?: number | null
          sample_size?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      saved_jobs: {
        Row: {
          created_at: string | null
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_posts: {
        Row: {
          collection_name: string | null
          id: string
          notes: string | null
          post_id: string
          saved_at: string | null
          user_id: string
        }
        Insert: {
          collection_name?: string | null
          id?: string
          notes?: string | null
          post_id: string
          saved_at?: string | null
          user_id: string
        }
        Update: {
          collection_name?: string | null
          id?: string
          notes?: string | null
          post_id?: string
          saved_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "unified_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string | null
          filters: Json | null
          id: string
          is_favorite: boolean | null
          name: string
          search_query: string
          sort_order: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          filters?: Json | null
          id?: string
          is_favorite?: boolean | null
          name: string
          search_query: string
          sort_order?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          filters?: Json | null
          id?: string
          is_favorite?: boolean | null
          name?: string
          search_query?: string
          sort_order?: number | null
          user_id?: string
        }
        Relationships: []
      }
      scheduled_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          scheduled_for: string
          sender_id: string
          sent_at: string | null
          status: string | null
          timezone: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          scheduled_for: string
          sender_id: string
          sent_at?: string | null
          status?: string | null
          timezone: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          scheduled_for?: string
          sender_id?: string
          sent_at?: string | null
          status?: string | null
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      security_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          description: string
          dismissed_at: string | null
          dismissed_by: string | null
          id: string
          is_dismissed: boolean | null
          metadata: Json | null
          severity: string
          title: string
          updated_at: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          description: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          id?: string
          is_dismissed?: boolean | null
          metadata?: Json | null
          severity: string
          title: string
          updated_at?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          description?: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          id?: string
          is_dismissed?: boolean | null
          metadata?: Json | null
          severity?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_alerts_dismissed_by_fkey"
            columns: ["dismissed_by"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "security_alerts_dismissed_by_fkey"
            columns: ["dismissed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_alerts_dismissed_by_fkey"
            columns: ["dismissed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_metrics_history: {
        Row: {
          authenticated_functions: number | null
          buckets_with_size_limits: number | null
          created_at: string | null
          failed_auth_attempts: number | null
          id: string
          metric_date: string
          public_buckets: number | null
          public_functions: number | null
          rate_limit_rejections: number | null
          tables_with_rls: number
          total_auth_attempts: number | null
          total_buckets: number | null
          total_edge_functions: number | null
          total_rls_policies: number
          total_tables: number
          unique_failed_ips: number | null
          unique_rate_limited_ips: number | null
        }
        Insert: {
          authenticated_functions?: number | null
          buckets_with_size_limits?: number | null
          created_at?: string | null
          failed_auth_attempts?: number | null
          id?: string
          metric_date?: string
          public_buckets?: number | null
          public_functions?: number | null
          rate_limit_rejections?: number | null
          tables_with_rls: number
          total_auth_attempts?: number | null
          total_buckets?: number | null
          total_edge_functions?: number | null
          total_rls_policies: number
          total_tables: number
          unique_failed_ips?: number | null
          unique_rate_limited_ips?: number | null
        }
        Update: {
          authenticated_functions?: number | null
          buckets_with_size_limits?: number | null
          created_at?: string | null
          failed_auth_attempts?: number | null
          id?: string
          metric_date?: string
          public_buckets?: number | null
          public_functions?: number | null
          rate_limit_rejections?: number | null
          tables_with_rls?: number
          total_auth_attempts?: number | null
          total_buckets?: number | null
          total_edge_functions?: number | null
          total_rls_policies?: number
          total_tables?: number
          unique_failed_ips?: number | null
          unique_rate_limited_ips?: number | null
        }
        Relationships: []
      }
      service_dependencies: {
        Row: {
          created_at: string | null
          criticality: string
          dependency_type: string
          depends_on_service_id: string | null
          health_check_url: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          mttr_minutes: number | null
          service_name: string
          service_type: string
          sla_uptime_pct: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          criticality: string
          dependency_type: string
          depends_on_service_id?: string | null
          health_check_url?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          mttr_minutes?: number | null
          service_name: string
          service_type: string
          sla_uptime_pct?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          criticality?: string
          dependency_type?: string
          depends_on_service_id?: string | null
          health_check_url?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          mttr_minutes?: number | null
          service_name?: string
          service_type?: string
          sla_uptime_pct?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_dependencies_depends_on_service_id_fkey"
            columns: ["depends_on_service_id"]
            isOneToOne: false
            referencedRelation: "service_dependencies"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_endorsements: {
        Row: {
          comment: string | null
          created_at: string | null
          endorsed_by: string
          id: string
          rating: number | null
          relationship: string | null
          skill_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          endorsed_by: string
          id?: string
          rating?: number | null
          relationship?: string | null
          skill_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          endorsed_by?: string
          id?: string
          rating?: number | null
          relationship?: string | null
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_endorsements_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "profile_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skills_demand_metrics: {
        Row: {
          course_count: number | null
          created_at: string | null
          demand_trend: number | null
          id: string
          job_count: number | null
          last_updated: string | null
          skill_name: string
        }
        Insert: {
          course_count?: number | null
          created_at?: string | null
          demand_trend?: number | null
          id?: string
          job_count?: number | null
          last_updated?: string | null
          skill_name: string
        }
        Update: {
          course_count?: number | null
          created_at?: string | null
          demand_trend?: number | null
          id?: string
          job_count?: number | null
          last_updated?: string | null
          skill_name?: string
        }
        Relationships: []
      }
      social_campaigns: {
        Row: {
          budget: number | null
          company_id: string | null
          created_at: string
          description: string | null
          end_date: string | null
          goals: Json | null
          id: string
          metadata: Json | null
          name: string
          platforms: string[]
          start_date: string
          status: string | null
          updated_at: string
        }
        Insert: {
          budget?: number | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          goals?: Json | null
          id?: string
          metadata?: Json | null
          name: string
          platforms: string[]
          start_date: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          budget?: number | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          goals?: Json | null
          id?: string
          metadata?: Json | null
          name?: string
          platforms?: string[]
          start_date?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      social_comments: {
        Row: {
          assigned_to: string | null
          author_avatar_url: string | null
          author_display_name: string | null
          author_username: string
          content: string
          created_at: string
          id: string
          is_replied: boolean | null
          is_spam: boolean | null
          metadata: Json | null
          parent_comment_id: string | null
          platform: string
          platform_comment_id: string | null
          post_id: string | null
          sentiment: string | null
          social_account_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          author_avatar_url?: string | null
          author_display_name?: string | null
          author_username: string
          content: string
          created_at?: string
          id?: string
          is_replied?: boolean | null
          is_spam?: boolean | null
          metadata?: Json | null
          parent_comment_id?: string | null
          platform: string
          platform_comment_id?: string | null
          post_id?: string | null
          sentiment?: string | null
          social_account_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          author_avatar_url?: string | null
          author_display_name?: string | null
          author_username?: string
          content?: string
          created_at?: string
          id?: string
          is_replied?: boolean | null
          is_spam?: boolean | null
          metadata?: Json | null
          parent_comment_id?: string | null
          platform?: string
          platform_comment_id?: string | null
          post_id?: string | null
          sentiment?: string | null
          social_account_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "social_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "unified_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_comments_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_media_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_accounts: {
        Row: {
          access_token: string | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          permissions: Json | null
          platform: string
          platform_user_id: string
          profile_url: string | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          access_token?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          permissions?: Json | null
          platform: string
          platform_user_id: string
          profile_url?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          access_token?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          permissions?: Json | null
          platform?: string
          platform_user_id?: string
          profile_url?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      sso_connections: {
        Row: {
          certificate: string | null
          company_id: string | null
          created_at: string | null
          entity_id: string
          id: string
          idp_name: string
          idp_type: string
          is_active: boolean | null
          metadata_xml: string | null
          sso_url: string
          updated_at: string | null
        }
        Insert: {
          certificate?: string | null
          company_id?: string | null
          created_at?: string | null
          entity_id: string
          id?: string
          idp_name: string
          idp_type: string
          is_active?: boolean | null
          metadata_xml?: string | null
          sso_url: string
          updated_at?: string | null
        }
        Update: {
          certificate?: string | null
          company_id?: string | null
          created_at?: string | null
          entity_id?: string
          id?: string
          idp_name?: string
          idp_type?: string
          is_active?: boolean | null
          metadata_xml?: string | null
          sso_url?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sso_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sso_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stakeholder_relationships: {
        Row: {
          created_at: string | null
          id: string
          relationship_strength: number | null
          relationship_type: string | null
          stakeholder_a_id: string | null
          stakeholder_b_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          relationship_strength?: number | null
          relationship_type?: string | null
          stakeholder_a_id?: string | null
          stakeholder_b_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          relationship_strength?: number | null
          relationship_type?: string | null
          stakeholder_a_id?: string | null
          stakeholder_b_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stakeholder_relationships_stakeholder_a_id_fkey"
            columns: ["stakeholder_a_id"]
            isOneToOne: false
            referencedRelation: "company_stakeholders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stakeholder_relationships_stakeholder_b_id_fkey"
            columns: ["stakeholder_b_id"]
            isOneToOne: false
            referencedRelation: "company_stakeholders"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          caption: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          media_type: string
          media_url: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          media_type: string
          media_url: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          media_type?: string
          media_url?: string
          user_id?: string
          views_count?: number | null
        }
        Relationships: []
      }
      story_comments: {
        Row: {
          comment_text: string
          created_at: string
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_comments_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_reactions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_saves: {
        Row: {
          created_at: string
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_saves_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_shares: {
        Row: {
          created_at: string
          id: string
          share_type: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          share_type: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          share_type?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_shares_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          completed: boolean | null
          id: string
          story_id: string
          viewed_at: string | null
          viewer_id: string
          watch_duration_seconds: number | null
        }
        Insert: {
          completed?: boolean | null
          id?: string
          story_id: string
          viewed_at?: string | null
          viewer_id: string
          watch_duration_seconds?: number | null
        }
        Update: {
          completed?: boolean | null
          id?: string
          story_id?: string
          viewed_at?: string | null
          viewer_id?: string
          watch_duration_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean | null
          processed_at: string | null
          processing_error: string | null
          stripe_event_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          processing_error?: string | null
          stripe_event_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          processing_error?: string | null
          stripe_event_id?: string
        }
        Relationships: []
      }
      subprocessor_changes: {
        Row: {
          change_description: string
          change_type: string
          created_at: string | null
          created_by: string | null
          id: string
          new_data: Json | null
          notification_sent: boolean | null
          notification_sent_at: string | null
          previous_data: Json | null
          subprocessor_id: string | null
        }
        Insert: {
          change_description: string
          change_type: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          new_data?: Json | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          previous_data?: Json | null
          subprocessor_id?: string | null
        }
        Update: {
          change_description?: string
          change_type?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          new_data?: Json | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          previous_data?: Json | null
          subprocessor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subprocessor_changes_subprocessor_id_fkey"
            columns: ["subprocessor_id"]
            isOneToOne: false
            referencedRelation: "subprocessors"
            referencedColumns: ["id"]
          },
        ]
      }
      subprocessors: {
        Row: {
          added_date: string | null
          certification_urls: Json | null
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string | null
          created_by: string | null
          data_location: string
          data_processed: string[] | null
          data_residency: string[] | null
          dpa_url: string | null
          id: string
          is_active: boolean | null
          last_reviewed_date: string | null
          notes: string | null
          privacy_policy_url: string | null
          risk_level: string | null
          security_certifications: string[] | null
          service_provided: string
          sub_subprocessors: string[] | null
          updated_at: string | null
          vendor_description: string | null
          vendor_name: string
          vendor_website: string | null
        }
        Insert: {
          added_date?: string | null
          certification_urls?: Json | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string | null
          created_by?: string | null
          data_location: string
          data_processed?: string[] | null
          data_residency?: string[] | null
          dpa_url?: string | null
          id?: string
          is_active?: boolean | null
          last_reviewed_date?: string | null
          notes?: string | null
          privacy_policy_url?: string | null
          risk_level?: string | null
          security_certifications?: string[] | null
          service_provided: string
          sub_subprocessors?: string[] | null
          updated_at?: string | null
          vendor_description?: string | null
          vendor_name: string
          vendor_website?: string | null
        }
        Update: {
          added_date?: string | null
          certification_urls?: Json | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string | null
          created_by?: string | null
          data_location?: string
          data_processed?: string[] | null
          data_residency?: string[] | null
          dpa_url?: string | null
          id?: string
          is_active?: boolean | null
          last_reviewed_date?: string | null
          notes?: string | null
          privacy_policy_url?: string | null
          risk_level?: string | null
          security_certifications?: string[] | null
          service_provided?: string
          sub_subprocessors?: string[] | null
          updated_at?: string | null
          vendor_description?: string | null
          vendor_name?: string
          vendor_website?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          billing_interval: string
          created_at: string | null
          description: string | null
          display_order: number | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price_euros: number
          stripe_price_id: string
          stripe_product_id: string
          tier: string
          updated_at: string | null
          user_type: string
        }
        Insert: {
          billing_interval?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price_euros: number
          stripe_price_id: string
          stripe_product_id: string
          tier: string
          updated_at?: string | null
          user_type: string
        }
        Update: {
          billing_interval?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_euros?: number
          stripe_price_id?: string
          stripe_product_id?: string
          tier?: string
          updated_at?: string | null
          user_type?: string
        }
        Relationships: []
      }
      subscription_tier_limits: {
        Row: {
          created_at: string | null
          id: string
          limit_type: string
          limit_value: number
          period: string
          plan_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          limit_type: string
          limit_value: number
          period?: string
          plan_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          limit_type?: string
          limit_value?: number
          period?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_tier_limits_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_usage: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          metric_name: string
          period_end: string
          period_start: string
          quantity: number
          subscription_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_name: string
          period_end: string
          period_start: string
          quantity?: number
          subscription_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_name?: string
          period_end?: string
          period_start?: string
          quantity?: number
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_usage_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          company_id: string | null
          created_at: string | null
          current_period_end: string
          current_period_start: string
          id: string
          metadata: Json | null
          plan_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          company_id?: string | null
          created_at?: string | null
          current_period_end: string
          current_period_start: string
          id?: string
          metadata?: Json | null
          plan_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          company_id?: string | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          metadata?: Json | null
          plan_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_sla_policies: {
        Row: {
          auto_escalate_to_csm: boolean | null
          business_hours_only: boolean | null
          channels_available: string[] | null
          created_at: string | null
          customer_tier: string
          escalation_after_minutes: number | null
          id: string
          priority_level: string
          target_first_response_minutes: number
          target_resolution_hours: number
        }
        Insert: {
          auto_escalate_to_csm?: boolean | null
          business_hours_only?: boolean | null
          channels_available?: string[] | null
          created_at?: string | null
          customer_tier: string
          escalation_after_minutes?: number | null
          id?: string
          priority_level: string
          target_first_response_minutes: number
          target_resolution_hours: number
        }
        Update: {
          auto_escalate_to_csm?: boolean | null
          business_hours_only?: boolean | null
          channels_available?: string[] | null
          created_at?: string | null
          customer_tier?: string
          escalation_after_minutes?: number | null
          id?: string
          priority_level?: string
          target_first_response_minutes?: number
          target_resolution_hours?: number
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          attachments: Json | null
          created_at: string | null
          id: string
          is_internal: boolean | null
          message: string
          read_by_agent: boolean | null
          read_by_customer: boolean | null
          sender_email: string | null
          sender_id: string | null
          sender_type: string
          ticket_id: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message: string
          read_by_agent?: boolean | null
          read_by_customer?: boolean | null
          sender_email?: string | null
          sender_id?: string | null
          sender_type: string
          ticket_id?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message?: string
          read_by_agent?: boolean | null
          read_by_customer?: boolean | null
          sender_email?: string | null
          sender_id?: string | null
          sender_type?: string
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "support_ticket_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          actual_resolution_hours: number | null
          actual_response_minutes: number | null
          assigned_at: string | null
          assigned_to: string | null
          category: string
          channel: string | null
          closed_at: string | null
          company_id: string | null
          created_at: string | null
          created_by_email: string | null
          description: string
          first_response_at: string | null
          id: string
          internal_notes: string | null
          metadata: Json | null
          priority: string | null
          resolved_at: string | null
          satisfaction_feedback: string | null
          satisfaction_rating: number | null
          sla_breached: boolean | null
          sla_target_resolution_hours: number | null
          sla_target_response_minutes: number | null
          status: string | null
          subject: string
          tags: string[] | null
          ticket_number: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          actual_resolution_hours?: number | null
          actual_response_minutes?: number | null
          assigned_at?: string | null
          assigned_to?: string | null
          category: string
          channel?: string | null
          closed_at?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by_email?: string | null
          description: string
          first_response_at?: string | null
          id?: string
          internal_notes?: string | null
          metadata?: Json | null
          priority?: string | null
          resolved_at?: string | null
          satisfaction_feedback?: string | null
          satisfaction_rating?: number | null
          sla_breached?: boolean | null
          sla_target_resolution_hours?: number | null
          sla_target_response_minutes?: number | null
          status?: string | null
          subject: string
          tags?: string[] | null
          ticket_number: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          actual_resolution_hours?: number | null
          actual_response_minutes?: number | null
          assigned_at?: string | null
          assigned_to?: string | null
          category?: string
          channel?: string | null
          closed_at?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by_email?: string | null
          description?: string
          first_response_at?: string | null
          id?: string
          internal_notes?: string | null
          metadata?: Json | null
          priority?: string | null
          resolved_at?: string | null
          satisfaction_feedback?: string | null
          satisfaction_rating?: number | null
          sla_breached?: boolean | null
          sla_target_resolution_hours?: number | null
          sla_target_response_minutes?: number | null
          status?: string | null
          subject?: string
          tags?: string[] | null
          ticket_number?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
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
      target_companies: {
        Row: {
          company_id: string
          company_insider: string | null
          created_at: string
          created_by: string
          enrichment_source: string | null
          id: string
          industry: string | null
          job_id: string | null
          job_specifications: Json | null
          location: string | null
          logo_url: string | null
          name: string
          notes: string | null
          priority: number | null
          source_company_id: string | null
          status: string
          updated_at: string
          votes: number | null
          website_url: string | null
        }
        Insert: {
          company_id: string
          company_insider?: string | null
          created_at?: string
          created_by: string
          enrichment_source?: string | null
          id?: string
          industry?: string | null
          job_id?: string | null
          job_specifications?: Json | null
          location?: string | null
          logo_url?: string | null
          name: string
          notes?: string | null
          priority?: number | null
          source_company_id?: string | null
          status?: string
          updated_at?: string
          votes?: number | null
          website_url?: string | null
        }
        Update: {
          company_id?: string
          company_insider?: string | null
          created_at?: string
          created_by?: string
          enrichment_source?: string | null
          id?: string
          industry?: string | null
          job_id?: string | null
          job_specifications?: Json | null
          location?: string | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          priority?: number | null
          source_company_id?: string | null
          status?: string
          updated_at?: string
          votes?: number | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "target_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "target_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "target_companies_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "target_companies_source_company_id_fkey"
            columns: ["source_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "target_companies_source_company_id_fkey"
            columns: ["source_company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      target_company_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          target_company_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          target_company_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          target_company_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "target_company_comments_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "target_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      target_company_contacts: {
        Row: {
          created_at: string | null
          created_by: string
          custom_role: string | null
          email: string | null
          id: string
          linkedin_url: string | null
          name: string
          notes: string | null
          phone: string | null
          role_id: string | null
          target_company_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          custom_role?: string | null
          email?: string | null
          id?: string
          linkedin_url?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          role_id?: string | null
          target_company_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          custom_role?: string | null
          email?: string | null
          id?: string
          linkedin_url?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          role_id?: string | null
          target_company_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "target_company_contacts_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "contact_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "target_company_contacts_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "target_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      target_company_votes: {
        Row: {
          created_at: string
          id: string
          target_company_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_company_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_company_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "target_company_votes_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "target_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignees: {
        Row: {
          assigned_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "club_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_blockers: {
        Row: {
          blocked_task_id: string
          blocking_task_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_task_id: string
          blocking_task_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_task_id?: string
          blocking_task_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_blockers_blocked_task_id_fkey"
            columns: ["blocked_task_id"]
            isOneToOne: false
            referencedRelation: "club_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_blockers_blocking_task_id_fkey"
            columns: ["blocking_task_id"]
            isOneToOne: false
            referencedRelation: "club_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_board_invitations: {
        Row: {
          accepted_at: string | null
          board_id: string
          created_at: string | null
          expires_at: string
          id: string
          invitation_token: string
          invited_by: string
          invitee_email: string
          invitee_user_id: string | null
          message: string | null
          role: Database["public"]["Enums"]["board_member_role"]
          status: string
        }
        Insert: {
          accepted_at?: string | null
          board_id: string
          created_at?: string | null
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by: string
          invitee_email: string
          invitee_user_id?: string | null
          message?: string | null
          role?: Database["public"]["Enums"]["board_member_role"]
          status?: string
        }
        Update: {
          accepted_at?: string | null
          board_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by?: string
          invitee_email?: string
          invitee_user_id?: string | null
          message?: string | null
          role?: Database["public"]["Enums"]["board_member_role"]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_board_invitations_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "task_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_board_invitations_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      task_board_members: {
        Row: {
          accepted_at: string | null
          board_id: string
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          last_viewed_at: string | null
          role: Database["public"]["Enums"]["board_member_role"]
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          board_id: string
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          last_viewed_at?: string | null
          role?: Database["public"]["Enums"]["board_member_role"]
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          board_id?: string
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          last_viewed_at?: string | null
          role?: Database["public"]["Enums"]["board_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_board_members_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "task_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_board_members_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      task_boards: {
        Row: {
          allow_member_invites: boolean | null
          color: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_archived: boolean | null
          name: string
          owner_id: string
          updated_at: string | null
          visibility: Database["public"]["Enums"]["board_visibility"]
        }
        Insert: {
          allow_member_invites?: boolean | null
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          name: string
          owner_id: string
          updated_at?: string | null
          visibility?: Database["public"]["Enums"]["board_visibility"]
        }
        Update: {
          allow_member_invites?: boolean | null
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          name?: string
          owner_id?: string
          updated_at?: string | null
          visibility?: Database["public"]["Enums"]["board_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "task_boards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_boards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          created_at: string
          created_by: string | null
          depends_on_task_id: string
          id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          depends_on_task_id: string
          id?: string
          task_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          depends_on_task_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "unified_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "unified_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_migration_log: {
        Row: {
          error_message: string | null
          id: string
          migrated_at: string | null
          migrated_by: string | null
          migration_data: Json | null
          migration_status: string
          migration_type: string
          rolled_back_at: string | null
          source_task_id: string
          target_task_id: string | null
        }
        Insert: {
          error_message?: string | null
          id?: string
          migrated_at?: string | null
          migrated_by?: string | null
          migration_data?: Json | null
          migration_status: string
          migration_type: string
          rolled_back_at?: string | null
          source_task_id: string
          target_task_id?: string | null
        }
        Update: {
          error_message?: string | null
          id?: string
          migrated_at?: string | null
          migrated_by?: string | null
          migration_data?: Json | null
          migration_status?: string
          migration_type?: string
          rolled_back_at?: string | null
          source_task_id?: string
          target_task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_migration_log_target_task_id_fkey"
            columns: ["target_task_id"]
            isOneToOne: false
            referencedRelation: "unified_tasks"
            referencedColumns: ["id"]
          },
        ]
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
      task_system_preferences: {
        Row: {
          active_system: string
          ai_scheduling_enabled: boolean | null
          buffer_between_tasks_minutes: number | null
          created_at: string | null
          id: string
          max_tasks_per_day: number | null
          preferences: Json | null
          show_migration_banner: boolean | null
          updated_at: string | null
          user_id: string
          working_days: number[] | null
          working_hours_end: string | null
          working_hours_start: string | null
        }
        Insert: {
          active_system?: string
          ai_scheduling_enabled?: boolean | null
          buffer_between_tasks_minutes?: number | null
          created_at?: string | null
          id?: string
          max_tasks_per_day?: number | null
          preferences?: Json | null
          show_migration_banner?: boolean | null
          updated_at?: string | null
          user_id: string
          working_days?: number[] | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Update: {
          active_system?: string
          ai_scheduling_enabled?: boolean | null
          buffer_between_tasks_minutes?: number | null
          created_at?: string | null
          id?: string
          max_tasks_per_day?: number | null
          preferences?: Json | null
          show_migration_banner?: boolean | null
          updated_at?: string | null
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
      tools_and_skills: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          official_website: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          official_website?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          official_website?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tracks: {
        Row: {
          artist: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string
          duration_seconds: number | null
          file_url: string
          id: string
          tags: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          artist?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          duration_seconds?: number | null
          file_url: string
          id?: string
          tags?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          artist?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          duration_seconds?: number | null
          file_url?: string
          id?: string
          tags?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      translation_feedback: {
        Row: {
          created_at: string | null
          id: string
          issue_type: string
          language: string
          namespace: string
          reported_by: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          translation_key: string
          user_comment: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          issue_type: string
          language: string
          namespace: string
          reported_by?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          translation_key: string
          user_comment?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          issue_type?: string
          language?: string
          namespace?: string
          reported_by?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          translation_key?: string
          user_comment?: string | null
        }
        Relationships: []
      }
      translation_generation_jobs: {
        Row: {
          completed_at: string | null
          completed_languages: string[] | null
          created_by: string | null
          error_message: string | null
          failed_languages: Json | null
          id: string
          namespace: string
          processed_keys_count: number | null
          started_at: string | null
          status: string | null
          target_languages: string[]
          total_keys_count: number | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_languages?: string[] | null
          created_by?: string | null
          error_message?: string | null
          failed_languages?: Json | null
          id?: string
          namespace: string
          processed_keys_count?: number | null
          started_at?: string | null
          status?: string | null
          target_languages: string[]
          total_keys_count?: number | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_languages?: string[] | null
          created_by?: string | null
          error_message?: string | null
          failed_languages?: Json | null
          id?: string
          namespace?: string
          processed_keys_count?: number | null
          started_at?: string | null
          status?: string | null
          target_languages?: string[]
          total_keys_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      translations: {
        Row: {
          created_at: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          is_active: boolean | null
          language: string
          namespace: string
          translations: Json
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          is_active?: boolean | null
          language: string
          namespace: string
          translations: Json
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          is_active?: boolean | null
          language?: string
          namespace?: string
          translations?: Json
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      trending_topics: {
        Row: {
          created_at: string
          engagement_score: number | null
          id: string
          mention_count: number | null
          metadata: Json | null
          period_end: string
          period_start: string
          topic: string
          topic_type: string
          trending_period: string
        }
        Insert: {
          created_at?: string
          engagement_score?: number | null
          id?: string
          mention_count?: number | null
          metadata?: Json | null
          period_end: string
          period_start: string
          topic: string
          topic_type: string
          trending_period: string
        }
        Update: {
          created_at?: string
          engagement_score?: number | null
          id?: string
          mention_count?: number | null
          metadata?: Json | null
          period_end?: string
          period_start?: string
          topic?: string
          topic_type?: string
          trending_period?: string
        }
        Relationships: []
      }
      unified_posts: {
        Row: {
          comments_count: number | null
          content: string
          created_at: string
          engagement_count: number | null
          event_date: string | null
          event_link: string | null
          event_location: string | null
          hashtags: string[] | null
          id: string
          impressions_count: number | null
          is_featured: boolean | null
          is_pinned: boolean | null
          is_scheduled: boolean | null
          likes_count: number | null
          media_urls: string[] | null
          mentions: string[] | null
          metadata: Json | null
          platform: string
          platform_post_id: string | null
          poll_ends_at: string | null
          poll_options: Json | null
          poll_votes: Json | null
          post_subtype: string | null
          post_type: string
          published_at: string | null
          reach_count: number | null
          saves_count: number | null
          scheduled_for: string | null
          shares_count: number | null
          social_account_id: string | null
          status: string | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          views_count: number | null
          visibility: string | null
        }
        Insert: {
          comments_count?: number | null
          content: string
          created_at?: string
          engagement_count?: number | null
          event_date?: string | null
          event_link?: string | null
          event_location?: string | null
          hashtags?: string[] | null
          id?: string
          impressions_count?: number | null
          is_featured?: boolean | null
          is_pinned?: boolean | null
          is_scheduled?: boolean | null
          likes_count?: number | null
          media_urls?: string[] | null
          mentions?: string[] | null
          metadata?: Json | null
          platform: string
          platform_post_id?: string | null
          poll_ends_at?: string | null
          poll_options?: Json | null
          poll_votes?: Json | null
          post_subtype?: string | null
          post_type: string
          published_at?: string | null
          reach_count?: number | null
          saves_count?: number | null
          scheduled_for?: string | null
          shares_count?: number | null
          social_account_id?: string | null
          status?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          views_count?: number | null
          visibility?: string | null
        }
        Update: {
          comments_count?: number | null
          content?: string
          created_at?: string
          engagement_count?: number | null
          event_date?: string | null
          event_link?: string | null
          event_location?: string | null
          hashtags?: string[] | null
          id?: string
          impressions_count?: number | null
          is_featured?: boolean | null
          is_pinned?: boolean | null
          is_scheduled?: boolean | null
          likes_count?: number | null
          media_urls?: string[] | null
          mentions?: string[] | null
          metadata?: Json | null
          platform?: string
          platform_post_id?: string | null
          poll_ends_at?: string | null
          poll_options?: Json | null
          poll_votes?: Json | null
          post_subtype?: string | null
          post_type?: string
          published_at?: string | null
          reach_count?: number | null
          saves_count?: number | null
          scheduled_for?: string | null
          shares_count?: number | null
          social_account_id?: string | null
          status?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          views_count?: number | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unified_posts_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_media_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_task_assignees: {
        Row: {
          assigned_at: string | null
          id: string
          role: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          role?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          role?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unified_task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "unified_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_task_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "unified_task_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_task_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_task_blockers: {
        Row: {
          blocked_task_id: string
          blocking_task_id: string
          created_at: string | null
          id: string
          reason: string | null
          resolved_at: string | null
        }
        Insert: {
          blocked_task_id: string
          blocking_task_id: string
          created_at?: string | null
          id?: string
          reason?: string | null
          resolved_at?: string | null
        }
        Update: {
          blocked_task_id?: string
          blocking_task_id?: string
          created_at?: string | null
          id?: string
          reason?: string | null
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unified_task_blockers_blocked_task_id_fkey"
            columns: ["blocked_task_id"]
            isOneToOne: false
            referencedRelation: "unified_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_task_blockers_blocking_task_id_fkey"
            columns: ["blocking_task_id"]
            isOneToOne: false
            referencedRelation: "unified_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_tasks: {
        Row: {
          ai_confidence_score: number | null
          auto_scheduled: boolean | null
          board_id: string | null
          company_name: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          estimated_duration_minutes: number | null
          id: string
          legacy_club_task_id: string | null
          legacy_pilot_task_id: string | null
          migration_status: string | null
          objective_id: string | null
          position: string | null
          priority: string
          scheduled_end: string | null
          scheduled_start: string | null
          scheduling_mode: string | null
          status: string
          tags: Json | null
          task_number: string
          task_type: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ai_confidence_score?: number | null
          auto_scheduled?: boolean | null
          board_id?: string | null
          company_name?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          legacy_club_task_id?: string | null
          legacy_pilot_task_id?: string | null
          migration_status?: string | null
          objective_id?: string | null
          position?: string | null
          priority?: string
          scheduled_end?: string | null
          scheduled_start?: string | null
          scheduling_mode?: string | null
          status?: string
          tags?: Json | null
          task_number: string
          task_type?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ai_confidence_score?: number | null
          auto_scheduled?: boolean | null
          board_id?: string | null
          company_name?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          legacy_club_task_id?: string | null
          legacy_pilot_task_id?: string | null
          migration_status?: string | null
          objective_id?: string | null
          position?: string | null
          priority?: string
          scheduled_end?: string | null
          scheduled_start?: string | null
          scheduling_mode?: string | null
          status?: string
          tags?: Json | null
          task_number?: string
          task_type?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unified_tasks_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "task_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_tasks_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "user_accessible_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_tasks_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "club_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_description: string | null
          achievement_name: string
          achievement_type: string
          id: string
          is_showcased: boolean | null
          metadata: Json | null
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_description?: string | null
          achievement_name: string
          achievement_type: string
          id?: string
          is_showcased?: boolean | null
          metadata?: Json | null
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_description?: string | null
          achievement_name?: string
          achievement_type?: string
          id?: string
          is_showcased?: boolean | null
          metadata?: Json | null
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_activity_tracking: {
        Row: {
          activity_level: string
          activity_score: number | null
          created_at: string | null
          last_action_type: string | null
          last_activity_at: string
          last_login_at: string | null
          online_status: string
          session_count: number | null
          total_actions: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_level?: string
          activity_score?: number | null
          created_at?: string | null
          last_action_type?: string | null
          last_activity_at?: string
          last_login_at?: string | null
          online_status?: string
          session_count?: number | null
          total_actions?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_level?: string
          activity_score?: number | null
          created_at?: string | null
          last_action_type?: string | null
          last_activity_at?: string
          last_login_at?: string | null
          online_status?: string
          session_count?: number | null
          total_actions?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string | null
          earned_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          badge_id?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          badge_id?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "learning_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_engagement: {
        Row: {
          achievements: Json | null
          badges: Json | null
          created_at: string | null
          current_streak: number | null
          experience_points: number | null
          id: string
          last_activity_date: string | null
          level: number | null
          longest_streak: number | null
          total_comments: number | null
          total_likes_given: number | null
          total_posts: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achievements?: Json | null
          badges?: Json | null
          created_at?: string | null
          current_streak?: number | null
          experience_points?: number | null
          id?: string
          last_activity_date?: string | null
          level?: number | null
          longest_streak?: number | null
          total_comments?: number | null
          total_likes_given?: number | null
          total_posts?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achievements?: Json | null
          badges?: Json | null
          created_at?: string | null
          current_streak?: number | null
          experience_points?: number | null
          id?: string
          last_activity_date?: string | null
          level?: number | null
          longest_streak?: number | null
          total_comments?: number | null
          total_likes_given?: number | null
          total_posts?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_events: {
        Row: {
          action_data: Json | null
          created_at: string | null
          device_type: string | null
          duration_seconds: number | null
          event_category: string | null
          event_type: string
          id: string
          page_path: string | null
          referrer: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          action_data?: Json | null
          created_at?: string | null
          device_type?: string | null
          duration_seconds?: number | null
          event_category?: string | null
          event_type: string
          id?: string
          page_path?: string | null
          referrer?: string | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          action_data?: Json | null
          created_at?: string | null
          device_type?: string | null
          duration_seconds?: number | null
          event_category?: string | null
          event_type?: string
          id?: string
          page_path?: string | null
          referrer?: string | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          admin_notes: string | null
          comment: string | null
          created_at: string | null
          email: string
          id: string
          is_reviewed: boolean | null
          navigation_trail: Json | null
          page_path: string
          page_title: string
          rating: number
          resolution_conversation_id: string | null
          resolution_message: string | null
          resolution_status: string | null
          resolved_at: string | null
          resolved_by: string | null
          role: string
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          comment?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_reviewed?: boolean | null
          navigation_trail?: Json | null
          page_path: string
          page_title: string
          rating: number
          resolution_conversation_id?: string | null
          resolution_message?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          role: string
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          comment?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_reviewed?: boolean | null
          navigation_trail?: Json | null
          page_path?: string
          page_title?: string
          rating?: number
          resolution_conversation_id?: string | null
          resolution_message?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          role?: string
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feedback_resolution_conversation_id_fkey"
            columns: ["resolution_conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_network: {
        Row: {
          connected_user_id: string
          connection_type: string
          created_at: string
          id: string
          interaction_count: number | null
          last_interaction: string | null
          user_id: string
        }
        Insert: {
          connected_user_id: string
          connection_type: string
          created_at?: string
          id?: string
          interaction_count?: number | null
          last_interaction?: string | null
          user_id: string
        }
        Update: {
          connected_user_id?: string
          connection_type?: string
          created_at?: string
          id?: string
          interaction_count?: number | null
          last_interaction?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          accent_color: string | null
          apply_to_all_pages: boolean | null
          background_blur_enabled: boolean | null
          background_blur_intensity: number | null
          background_enabled: boolean | null
          background_type: string | null
          background_value: string | null
          created_at: string
          id: string
          overlay_color: string | null
          overlay_opacity: number | null
          preferred_role_view: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          apply_to_all_pages?: boolean | null
          background_blur_enabled?: boolean | null
          background_blur_intensity?: number | null
          background_enabled?: boolean | null
          background_type?: string | null
          background_value?: string | null
          created_at?: string
          id?: string
          overlay_color?: string | null
          overlay_opacity?: number | null
          preferred_role_view?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accent_color?: string | null
          apply_to_all_pages?: boolean | null
          background_blur_enabled?: boolean | null
          background_blur_intensity?: number | null
          background_enabled?: boolean | null
          background_type?: string | null
          background_value?: string | null
          created_at?: string
          id?: string
          overlay_color?: string | null
          overlay_opacity?: number | null
          preferred_role_view?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          custom_status: string | null
          last_seen: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          custom_status?: string | null
          last_seen?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          custom_status?: string | null
          last_seen?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_quantum_achievements: {
        Row: {
          achievement_id: string
          id: string
          is_showcased: boolean | null
          progress: Json | null
          showcase_position: number | null
          story_text: string | null
          unlocked_at: string
          user_id: string
          visibility: string | null
        }
        Insert: {
          achievement_id: string
          id?: string
          is_showcased?: boolean | null
          progress?: Json | null
          showcase_position?: number | null
          story_text?: string | null
          unlocked_at?: string
          user_id: string
          visibility?: string | null
        }
        Update: {
          achievement_id?: string
          id?: string
          is_showcased?: boolean | null
          progress?: Json | null
          showcase_position?: number | null
          story_text?: string | null
          unlocked_at?: string
          user_id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_quantum_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "quantum_achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_relationships: {
        Row: {
          created_at: string | null
          id: string
          last_interaction_at: string | null
          related_user_id: string
          relationship_score: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_interaction_at?: string | null
          related_user_id: string
          relationship_score?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_interaction_at?: string | null
          related_user_id?: string
          relationship_score?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_resumes: {
        Row: {
          display_name: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          is_primary: boolean | null
          mime_type: string
          updated_at: string | null
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          display_name: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          is_primary?: boolean | null
          mime_type: string
          updated_at?: string | null
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          display_name?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          is_primary?: boolean | null
          mime_type?: string
          updated_at?: string | null
          uploaded_at?: string | null
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
      user_sessions: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          ended_at: string | null
          id: string
          session_type: string | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          session_type?: string | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          session_type?: string | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_trend_subscriptions: {
        Row: {
          alerted_at: string | null
          id: string
          is_relevant: boolean | null
          subscribed_at: string
          trend_id: string
          user_id: string
          user_notes: string | null
        }
        Insert: {
          alerted_at?: string | null
          id?: string
          is_relevant?: boolean | null
          subscribed_at?: string
          trend_id: string
          user_id: string
          user_notes?: string | null
        }
        Update: {
          alerted_at?: string | null
          id?: string
          is_relevant?: boolean | null
          subscribed_at?: string
          trend_id?: string
          user_id?: string
          user_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_trend_subscriptions_trend_id_fkey"
            columns: ["trend_id"]
            isOneToOne: false
            referencedRelation: "career_trend_insights"
            referencedColumns: ["id"]
          },
        ]
      }
      values_poker_sessions: {
        Row: {
          completed_at: string | null
          consistency_score: number | null
          culture_fit_scores: Json | null
          id: string
          red_flags: string[] | null
          revealed_priorities: Json | null
          started_at: string | null
          stated_priorities: Json
          tradeoff_responses: Json
          user_id: string
          value_archetype: string | null
        }
        Insert: {
          completed_at?: string | null
          consistency_score?: number | null
          culture_fit_scores?: Json | null
          id?: string
          red_flags?: string[] | null
          revealed_priorities?: Json | null
          started_at?: string | null
          stated_priorities: Json
          tradeoff_responses: Json
          user_id: string
          value_archetype?: string | null
        }
        Update: {
          completed_at?: string | null
          consistency_score?: number | null
          culture_fit_scores?: Json | null
          id?: string
          red_flags?: string[] | null
          revealed_priorities?: Json | null
          started_at?: string | null
          stated_priorities?: Json
          tradeoff_responses?: Json
          user_id?: string
          value_archetype?: string | null
        }
        Relationships: []
      }
      verification_attempts: {
        Row: {
          action: string
          created_at: string | null
          email: string | null
          error_message: string | null
          id: string
          ip_address: unknown
          phone: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
          verification_type: string
        }
        Insert: {
          action: string
          created_at?: string | null
          email?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          phone?: string | null
          success: boolean
          user_agent?: string | null
          user_id?: string | null
          verification_type: string
        }
        Update: {
          action?: string
          created_at?: string | null
          email?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          phone?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
          verification_type?: string
        }
        Relationships: []
      }
      video_call_participants: {
        Row: {
          connection_quality: string | null
          created_at: string | null
          display_name: string
          id: string
          is_hand_raised: boolean | null
          is_muted: boolean | null
          is_screen_sharing: boolean | null
          is_speaking: boolean | null
          is_video_off: boolean | null
          joined_at: string | null
          left_at: string | null
          metadata: Json | null
          role: string | null
          session_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          connection_quality?: string | null
          created_at?: string | null
          display_name: string
          id?: string
          is_hand_raised?: boolean | null
          is_muted?: boolean | null
          is_screen_sharing?: boolean | null
          is_speaking?: boolean | null
          is_video_off?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          metadata?: Json | null
          role?: string | null
          session_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          connection_quality?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          is_hand_raised?: boolean | null
          is_muted?: boolean | null
          is_screen_sharing?: boolean | null
          is_speaking?: boolean | null
          is_video_off?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          metadata?: Json | null
          role?: string | null
          session_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_call_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "video_call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      video_call_reactions: {
        Row: {
          created_at: string | null
          id: string
          participant_id: string
          reaction_type: string
          session_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          participant_id: string
          reaction_type: string
          session_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          participant_id?: string
          reaction_type?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_call_reactions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "video_call_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_call_reactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "video_call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      video_call_recordings: {
        Row: {
          created_at: string | null
          created_by: string | null
          download_url: string | null
          duration_seconds: number | null
          expires_at: string | null
          file_size_bytes: number | null
          format: string | null
          id: string
          participants: Json | null
          session_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          download_url?: string | null
          duration_seconds?: number | null
          expires_at?: string | null
          file_size_bytes?: number | null
          format?: string | null
          id?: string
          participants?: Json | null
          session_id: string
          storage_path: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          download_url?: string | null
          duration_seconds?: number | null
          expires_at?: string | null
          file_size_bytes?: number | null
          format?: string | null
          id?: string
          participants?: Json | null
          session_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_call_recordings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "video_call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      video_call_sessions: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          ended_at: string | null
          host_id: string | null
          id: string
          is_recording: boolean | null
          meeting_code: string | null
          password: string | null
          recording_url: string | null
          settings: Json | null
          started_at: string | null
          status: string | null
          title: string | null
          transcript: Json | null
          updated_at: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          ended_at?: string | null
          host_id?: string | null
          id?: string
          is_recording?: boolean | null
          meeting_code?: string | null
          password?: string | null
          recording_url?: string | null
          settings?: Json | null
          started_at?: string | null
          status?: string | null
          title?: string | null
          transcript?: Json | null
          updated_at?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          ended_at?: string | null
          host_id?: string | null
          id?: string
          is_recording?: boolean | null
          meeting_code?: string | null
          password?: string | null
          recording_url?: string | null
          settings?: Json | null
          started_at?: string | null
          status?: string | null
          title?: string | null
          transcript?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_call_sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      video_call_signals: {
        Row: {
          created_at: string | null
          from_user_id: string
          id: string
          processed: boolean | null
          session_id: string
          signal_data: Json
          signal_type: string
          to_user_id: string | null
        }
        Insert: {
          created_at?: string | null
          from_user_id: string
          id?: string
          processed?: boolean | null
          session_id: string
          signal_data: Json
          signal_type: string
          to_user_id?: string | null
        }
        Update: {
          created_at?: string | null
          from_user_id?: string
          id?: string
          processed?: boolean | null
          session_id?: string
          signal_data?: Json
          signal_type?: string
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_call_signals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "video_call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      video_call_transcripts: {
        Row: {
          confidence: number | null
          created_at: string | null
          id: string
          is_final: boolean | null
          language: string | null
          participant_id: string | null
          session_id: string
          text: string
          timestamp_ms: number
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          is_final?: boolean | null
          language?: string | null
          participant_id?: string | null
          session_id: string
          text: string
          timestamp_ms: number
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          is_final?: boolean | null
          language?: string | null
          participant_id?: string | null
          session_id?: string
          text?: string
          timestamp_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_call_transcripts_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "video_call_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_call_transcripts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "video_call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          applicant_type: string | null
          approved_at: string | null
          company: string | null
          created_at: string | null
          elevator_pitch: string | null
          email: string
          engagement_score: number | null
          expertise: string | null
          goals: string | null
          id: string
          industry: string | null
          job_title: string | null
          linkedin_url: string | null
          location: string | null
          metadata: Json | null
          name: string
          phone: string | null
          priority_score: number | null
          referral_code: string | null
          referred_by_code: string | null
          rejected_at: string | null
          rejection_feedback: string | null
          rejection_reason: string | null
          reviewed_by: string | null
          seniority: string | null
          status: string | null
          updated_at: string | null
          video_intro_url: string | null
        }
        Insert: {
          applicant_type?: string | null
          approved_at?: string | null
          company?: string | null
          created_at?: string | null
          elevator_pitch?: string | null
          email: string
          engagement_score?: number | null
          expertise?: string | null
          goals?: string | null
          id?: string
          industry?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          location?: string | null
          metadata?: Json | null
          name: string
          phone?: string | null
          priority_score?: number | null
          referral_code?: string | null
          referred_by_code?: string | null
          rejected_at?: string | null
          rejection_feedback?: string | null
          rejection_reason?: string | null
          reviewed_by?: string | null
          seniority?: string | null
          status?: string | null
          updated_at?: string | null
          video_intro_url?: string | null
        }
        Update: {
          applicant_type?: string | null
          approved_at?: string | null
          company?: string | null
          created_at?: string | null
          elevator_pitch?: string | null
          email?: string
          engagement_score?: number | null
          expertise?: string | null
          goals?: string | null
          id?: string
          industry?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          location?: string | null
          metadata?: Json | null
          name?: string
          phone?: string | null
          priority_score?: number | null
          referral_code?: string | null
          referred_by_code?: string | null
          rejected_at?: string | null
          rejection_feedback?: string | null
          rejection_reason?: string | null
          reviewed_by?: string | null
          seniority?: string | null
          status?: string | null
          updated_at?: string | null
          video_intro_url?: string | null
        }
        Relationships: []
      }
      waitlist_analytics: {
        Row: {
          approval_rate: number | null
          avg_priority_score: number | null
          by_industry: Json | null
          by_location: Json | null
          by_source: Json | null
          by_type: Json | null
          created_at: string | null
          date: string
          id: string
          total_referrals: number | null
          total_submissions: number | null
        }
        Insert: {
          approval_rate?: number | null
          avg_priority_score?: number | null
          by_industry?: Json | null
          by_location?: Json | null
          by_source?: Json | null
          by_type?: Json | null
          created_at?: string | null
          date?: string
          id?: string
          total_referrals?: number | null
          total_submissions?: number | null
        }
        Update: {
          approval_rate?: number | null
          avg_priority_score?: number | null
          by_industry?: Json | null
          by_location?: Json | null
          by_source?: Json | null
          by_type?: Json | null
          created_at?: string | null
          date?: string
          id?: string
          total_referrals?: number | null
          total_submissions?: number | null
        }
        Relationships: []
      }
      waitlist_engagement: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          waitlist_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          waitlist_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          waitlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_engagement_waitlist_id_fkey"
            columns: ["waitlist_id"]
            isOneToOne: false
            referencedRelation: "waitlist"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_referrals: {
        Row: {
          created_at: string | null
          id: string
          referred_email: string
          referred_joined_id: string | null
          referrer_id: string | null
          reward_points: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referred_email: string
          referred_joined_id?: string | null
          referrer_id?: string | null
          reward_points?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referred_email?: string
          referred_joined_id?: string | null
          referrer_id?: string | null
          reward_points?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_referrals_referred_joined_id_fkey"
            columns: ["referred_joined_id"]
            isOneToOne: false
            referencedRelation: "waitlist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "waitlist"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempts: number
          created_at: string
          delivered_at: string | null
          event_type: string
          http_status_code: number | null
          id: string
          next_retry_at: string | null
          payload: Json
          response_body: string | null
          status: string
          updated_at: string
          webhook_endpoint_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          event_type: string
          http_status_code?: number | null
          id?: string
          next_retry_at?: string | null
          payload: Json
          response_body?: string | null
          status?: string
          updated_at?: string
          webhook_endpoint_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          event_type?: string
          http_status_code?: number | null
          id?: string
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          status?: string
          updated_at?: string
          webhook_endpoint_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_endpoint_id_fkey"
            columns: ["webhook_endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          company_id: string
          consecutive_failures: number
          created_at: string
          events: string[]
          id: string
          is_active: boolean
          last_failure_at: string | null
          last_success_at: string | null
          secret: string
          updated_at: string
          url: string
        }
        Insert: {
          company_id: string
          consecutive_failures?: number
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          last_failure_at?: string | null
          last_success_at?: string | null
          secret: string
          updated_at?: string
          url: string
        }
        Update: {
          company_id?: string
          consecutive_failures?: number
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          last_failure_at?: string | null
          last_success_at?: string | null
          secret?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_endpoints_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      webrtc_signals: {
        Row: {
          created_at: string
          id: string
          meeting_id: string
          processed: boolean | null
          receiver_id: string | null
          sender_id: string
          signal_data: Json
          signal_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_id: string
          processed?: boolean | null
          receiver_id?: string | null
          sender_id: string
          signal_data?: Json
          signal_type: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_id?: string
          processed?: boolean | null
          receiver_id?: string | null
          sender_id?: string
          signal_data?: Json
          signal_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "webrtc_signals_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_imports: {
        Row: {
          company_id: string | null
          completed_at: string | null
          created_at: string | null
          date_range_end: string | null
          date_range_start: string | null
          error_message: string | null
          file_url: string
          filename: string
          id: string
          participants_detected: string[] | null
          stakeholders_created: number | null
          stakeholders_matched: number | null
          status: string | null
          total_messages: number | null
          uploaded_by: string | null
        }
        Insert: {
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          error_message?: string | null
          file_url: string
          filename: string
          id?: string
          participants_detected?: string[] | null
          stakeholders_created?: number | null
          stakeholders_matched?: number | null
          status?: string | null
          total_messages?: number | null
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          error_message?: string | null
          file_url?: string
          filename?: string
          id?: string
          participants_detected?: string[] | null
          stakeholders_created?: number | null
          stakeholders_matched?: number | null
          status?: string | null
          total_messages?: number | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_imports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_imports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_imports_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "whatsapp_imports_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_imports_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      applications_with_deleted_candidates: {
        Row: {
          application_source:
            | Database["public"]["Enums"]["application_source_enum"]
            | null
          applied_at: string | null
          candidate_company: string | null
          candidate_deleted_at: string | null
          candidate_deletion_type: string | null
          candidate_email: string | null
          candidate_full_name: string | null
          candidate_id: string | null
          candidate_linkedin_url: string | null
          candidate_phone: string | null
          candidate_resume_url: string | null
          candidate_status: string | null
          candidate_title: string | null
          company_name: string | null
          created_at: string | null
          current_stage_index: number | null
          id: string | null
          job_id: string | null
          match_factors: Json | null
          match_score: number | null
          position: string | null
          source_context: Json | null
          sourced_by: string | null
          stages: Json | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "unified_candidate_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_sourced_by_fkey"
            columns: ["sourced_by"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "applications_sourced_by_fkey"
            columns: ["sourced_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_sourced_by_fkey"
            columns: ["sourced_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_applications_candidate_profiles"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_applications_candidate_profiles"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "fk_applications_candidate_profiles"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "unified_candidate_view"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_video_platform_analytics: {
        Row: {
          active_video_platform: string | null
          attendance_rate: number | null
          attended_count: number | null
          booking_count: number | null
          confirmed_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
      member_requests_unified: {
        Row: {
          additional_data: Json | null
          assigned_to: string | null
          created_at: string | null
          decline_reason: string | null
          desired_salary_max: number | null
          desired_salary_min: number | null
          email: string | null
          id: string | null
          linkedin_url: string | null
          location: string | null
          name: string | null
          phone: string | null
          request_type: string | null
          resume_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          title_or_company: string | null
        }
        Relationships: []
      }
      pipeline_conversion_metrics: {
        Row: {
          avg_days_to_convert: number | null
          conversion_count: number | null
          conversion_rate_pct: number | null
          from_stage: string | null
          to_stage: string | null
        }
        Relationships: []
      }
      popular_courses: {
        Row: {
          academy_id: string | null
          category: string | null
          course_image_url: string | null
          course_video_url: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty_level: string | null
          display_order: number | null
          enrolled_count: number | null
          estimated_hours: number | null
          featured_until: string | null
          id: string | null
          is_featured: boolean | null
          is_published: boolean | null
          learning_objectives: Json | null
          learning_path_id: string | null
          prerequisites: Json | null
          published_at: string | null
          slug: string | null
          title: string | null
          total_enrollments: number | null
          trending_score: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "potential_merges"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      potential_merges: {
        Row: {
          already_merged: boolean | null
          candidate_completeness: number | null
          candidate_created_at: string | null
          candidate_email: string | null
          candidate_id: string | null
          candidate_name: string | null
          confidence_score: number | null
          invitation_status: string | null
          linked_user_id: string | null
          match_type: string | null
          profile_created_at: string | null
          profile_email: string | null
          profile_id: string | null
          profile_name: string | null
        }
        Relationships: []
      }
      public_companies: {
        Row: {
          benefits: Json | null
          careers_email: string | null
          careers_page_url: string | null
          company_size: string | null
          cover_image_url: string | null
          created_at: string | null
          culture_highlights: Json | null
          description: string | null
          founded_year: number | null
          headquarters_location: string | null
          id: string | null
          industry: string | null
          instagram_url: string | null
          is_active: boolean | null
          linkedin_url: string | null
          logo_url: string | null
          member_since: string | null
          membership_tier: string | null
          meta_description: string | null
          meta_title: string | null
          mission: string | null
          name: string | null
          slug: string | null
          tagline: string | null
          tech_stack: Json | null
          twitter_url: string | null
          updated_at: string | null
          values: Json | null
          vision: string | null
          website_url: string | null
        }
        Insert: {
          benefits?: Json | null
          careers_email?: string | null
          careers_page_url?: string | null
          company_size?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          culture_highlights?: Json | null
          description?: string | null
          founded_year?: number | null
          headquarters_location?: string | null
          id?: string | null
          industry?: string | null
          instagram_url?: string | null
          is_active?: boolean | null
          linkedin_url?: string | null
          logo_url?: string | null
          member_since?: string | null
          membership_tier?: string | null
          meta_description?: string | null
          meta_title?: string | null
          mission?: string | null
          name?: string | null
          slug?: string | null
          tagline?: string | null
          tech_stack?: Json | null
          twitter_url?: string | null
          updated_at?: string | null
          values?: Json | null
          vision?: string | null
          website_url?: string | null
        }
        Update: {
          benefits?: Json | null
          careers_email?: string | null
          careers_page_url?: string | null
          company_size?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          culture_highlights?: Json | null
          description?: string | null
          founded_year?: number | null
          headquarters_location?: string | null
          id?: string | null
          industry?: string | null
          instagram_url?: string | null
          is_active?: boolean | null
          linkedin_url?: string | null
          logo_url?: string | null
          member_since?: string | null
          membership_tier?: string | null
          meta_description?: string | null
          meta_title?: string | null
          mission?: string | null
          name?: string | null
          slug?: string | null
          tagline?: string | null
          tech_stack?: Json | null
          twitter_url?: string | null
          updated_at?: string | null
          values?: Json | null
          vision?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          profile_slug: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          profile_slug?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          profile_slug?: string | null
        }
        Relationships: []
      }
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
      rejection_stats_view: {
        Row: {
          active_count: number | null
          hired_count: number | null
          job_id: string | null
          orphaned_applications: number | null
          rejection_count: number | null
          total_valid_applications: number | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_candidate_view: {
        Row: {
          avatar_url: string | null
          blocked_companies: Json | null
          created_at: string | null
          current_company: string | null
          current_salary_max: number | null
          current_salary_min: number | null
          current_title: string | null
          desired_locations: Json | null
          desired_salary_max: number | null
          desired_salary_min: number | null
          email: string | null
          full_name: string | null
          gdpr_consent: boolean | null
          id: string | null
          last_activity_at: string | null
          last_application_date: string | null
          last_interaction_date: string | null
          linkedin_url: string | null
          merged_at: string | null
          notice_period: string | null
          phone: string | null
          preferred_currency: string | null
          profile_full_name: string | null
          profile_slug: string | null
          profile_views: number | null
          remote_preference: string | null
          skills: Json | null
          total_applications: number | null
          total_documents: number | null
          updated_at: string | null
          user_id: string | null
          work_authorization: Json | null
          years_of_experience: number | null
        }
        Relationships: []
      }
      user_accessible_boards: {
        Row: {
          allow_member_invites: boolean | null
          color: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string | null
          is_archived: boolean | null
          member_count: number | null
          my_role: Database["public"]["Enums"]["board_member_role"] | null
          name: string | null
          owner_id: string | null
          task_count: number | null
          updated_at: string | null
          visibility: Database["public"]["Enums"]["board_visibility"] | null
        }
        Relationships: [
          {
            foreignKeyName: "task_boards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_boards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "public_companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      aggregate_daily_security_metrics: { Args: never; Returns: undefined }
      archive_expired_documents: { Args: never; Returns: undefined }
      calculate_activity_level: {
        Args: { last_activity: string }
        Returns: string
      }
      calculate_churn_rate: {
        Args: { end_date: string; start_date: string }
        Returns: number
      }
      calculate_current_mrr: { Args: never; Returns: number }
      calculate_deal_health_score: { Args: { job_id: string }; Returns: number }
      calculate_name_similarity: {
        Args: { name1: string; name2: string }
        Returns: number
      }
      calculate_objective_completion: {
        Args: { objective_uuid: string }
        Returns: number
      }
      calculate_online_status: {
        Args: { last_activity: string }
        Returns: string
      }
      calculate_post_score: {
        Args: {
          p_comments_count: number
          p_likes_count: number
          p_post_author_id: string
          p_post_created_at: string
          p_post_id: string
          p_shares_count: number
          p_user_id: string
        }
        Returns: number
      }
      calculate_projected_earnings: { Args: never; Returns: undefined }
      calculate_weighted_pipeline: {
        Args: never
        Returns: {
          avg_deal_size: number
          deal_count: number
          total_pipeline: number
          weighted_pipeline: number
        }[]
      }
      can_access_board: {
        Args: { _board_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_conversation_storage: {
        Args: { _conversation_id: string }
        Returns: boolean
      }
      can_join_meeting: {
        Args: { _meeting_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_board: {
        Args: { _board_id: string; _user_id: string }
        Returns: boolean
      }
      check_booking_conflict: {
        Args: {
          p_exclude_booking_id?: string
          p_scheduled_end: string
          p_scheduled_start: string
          p_user_id: string
        }
        Returns: boolean
      }
      check_error_threshold: { Args: never; Returns: undefined }
      check_password_reset_rate_limit: {
        Args: { p_email: string; p_ip_address: string }
        Returns: Json
      }
      check_profile_auth_integrity: {
        Args: never
        Returns: {
          auth_email: string
          auth_full_name: string
          mismatch_type: string
          profile_email: string
          profile_full_name: string
          user_id: string
        }[]
      }
      check_rate_limit: {
        Args: { p_api_key_id: string; p_limit: number }
        Returns: boolean
      }
      check_tier_limit: {
        Args: { check_user_id: string; limit_type_param: string }
        Returns: Json
      }
      check_verification_rate_limit: {
        Args: { _action: string; _user_id: string; _verification_type: string }
        Returns: Json
      }
      cleanup_expired_password_resets: { Args: never; Returns: undefined }
      cleanup_expired_push_subscriptions: { Args: never; Returns: undefined }
      cleanup_expired_verifications: { Args: never; Returns: undefined }
      cleanup_inactive_participants: { Args: never; Returns: undefined }
      cosine_similarity: { Args: { a: string; b: string }; Returns: number }
      evaluate_user_achievements: {
        Args: { _user_id: string }
        Returns: {
          achievement_id: string
          achievement_name: string
          progress: number
          target: number
          unlocked: boolean
        }[]
      }
      extract_email_domain: { Args: { email: string }; Returns: string }
      extract_mentions_from_note: {
        Args: { p_content: string }
        Returns: string[]
      }
      fix_profile_auth_mismatches: {
        Args: never
        Returns: {
          fix_type: string
          fixed_email: string
          fixed_name: string
          user_id: string
        }[]
      }
      generate_api_key: {
        Args: {
          p_company_id: string
          p_created_by?: string
          p_name: string
          p_rate_limit_per_hour?: number
          p_scopes: string[]
        }
        Returns: Json
      }
      generate_audit_request_number: { Args: never; Returns: string }
      generate_dossier_share_token: { Args: never; Returns: string }
      generate_invite_code: { Args: never; Returns: string }
      generate_invoice_number: {
        Args: { p_company_id?: string }
        Returns: string
      }
      generate_meeting_code: { Args: never; Returns: string }
      generate_pmr_code: { Args: { p_user_id: string }; Returns: string }
      generate_profile_slug: { Args: { name: string }; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      generate_share_token: { Args: never; Returns: string }
      generate_support_ticket_number: { Args: never; Returns: string }
      generate_task_number: { Args: never; Returns: string }
      generate_unified_task_number: { Args: never; Returns: string }
      get_achievement_metrics: { Args: never; Returns: Json }
      get_achievement_stats: { Args: never; Returns: Json }
      get_application_metrics: { Args: never; Returns: Json }
      get_application_stats: { Args: never; Returns: Json }
      get_assessment_metrics: { Args: never; Returns: Json }
      get_assessment_stats: { Args: never; Returns: Json }
      get_auth_failure_stats: { Args: { hours_back?: number }; Returns: Json }
      get_board_role: {
        Args: { _board_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["board_member_role"]
      }
      get_candidate_complete_data: {
        Args: { p_candidate_id: string }
        Returns: Json
      }
      get_company_metrics: { Args: never; Returns: Json }
      get_company_stats: { Args: never; Returns: Json }
      get_conversation_participants: {
        Args: { _conversation_id: string }
        Returns: {
          avatar_url: string
          conversation_id: string
          full_name: string
          id: string
          is_muted: boolean
          joined_at: string
          last_read_at: string
          notifications_enabled: boolean
          role: string
          user_id: string
        }[]
      }
      get_department_hierarchy: {
        Args: { p_company_id: string }
        Returns: {
          department_id: string
          department_name: string
          level: number
          parent_department_id: string
          path: string[]
        }[]
      }
      get_edge_function_health: {
        Args: never
        Returns: {
          avg_duration_ms: number
          error_count: number
          function_name: string
          success_count: number
          success_rate: number
          total_calls: number
        }[]
      }
      get_embedding_stats: {
        Args: never
        Returns: {
          entity_type: string
          percentage: number
          total_records: number
          with_embeddings: number
        }[]
      }
      get_historical_conversion_rate: {
        Args: {
          p_company_id?: string
          p_lookback_days?: number
          p_stage: string
        }
        Returns: number
      }
      get_ml_training_data: {
        Args: { limit_count?: number; offset_count?: number }
        Returns: {
          candidate_id: string
          features: Json
          job_id: string
          label_hired: boolean
          label_interviewed: boolean
          label_rejected: boolean
          semantic_similarity_score: number
          training_id: string
        }[]
      }
      get_module_course_id: { Args: { _module_id: string }; Returns: string }
      get_org_chart_tree: {
        Args: { p_company_id: string }
        Returns: {
          department_id: string
          job_title: string
          level: number
          member_id: string
          path: string[]
          reports_to_member_id: string
          user_id: string
        }[]
      }
      get_pending_booking_reminders: {
        Args: never
        Returns: {
          booking_id: string
          duration_minutes: number
          guest_email: string
          guest_name: string
          guest_phone: string
          link_title: string
          reminder_id: string
          reminder_type: string
          scheduled_start: string
          send_before_minutes: number
          user_id: string
        }[]
      }
      get_pipeline_candidate_stats: {
        Args: { p_job_id: string }
        Returns: {
          avg_current_salary: number
          avg_expected_salary: number
          candidate_count: number
          salary_range_max: number
          salary_range_min: number
        }[]
      }
      get_popular_courses: {
        Args: never
        Returns: {
          description: string
          id: string
          name: string
          total_enrollments: number
        }[]
      }
      get_realtime_system_health: { Args: never; Returns: Json }
      get_rls_policy_count: { Args: never; Returns: Json }
      get_role_distribution: {
        Args: never
        Returns: {
          role: string
          user_count: number
        }[]
      }
      get_storage_bucket_stats: { Args: never; Returns: Json }
      get_system_health_metrics: { Args: never; Returns: Json }
      get_system_health_stats: { Args: never; Returns: Json }
      get_top_achievements_by_unlocks: {
        Args: { limit_count?: number }
        Returns: {
          achievement_id: string
          achievement_name: string
          unlock_count: number
        }[]
      }
      get_top_companies_by_followers: {
        Args: { limit_count?: number }
        Returns: {
          company_id: string
          company_name: string
          follower_count: number
        }[]
      }
      get_top_companies_by_jobs: {
        Args: { limit_count?: number }
        Returns: {
          company_id: string
          company_name: string
          job_count: number
        }[]
      }
      get_user_metrics: { Args: never; Returns: Json }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: {
          role: string
        }[]
      }
      get_user_stats: { Args: never; Returns: Json }
      get_user_subscription_plan: {
        Args: { check_user_id: string }
        Returns: {
          period_end: string
          plan_name: string
          status: string
          tier: string
          user_type: string
        }[]
      }
      get_users_without_roles: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          user_id: string
        }[]
      }
      has_active_subscription: {
        Args: { check_user_id: string; check_user_type?: string }
        Returns: boolean
      }
      has_company_role: {
        Args: { _company_id: string; _role: string; _user_id: string }
        Returns: boolean
      }
      has_role:
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
      is_company_blocked_by_candidate: {
        Args: { _candidate_id: string; _company_email: string }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_course_owner: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      is_dossier_share_valid: { Args: { _token: string }; Returns: boolean }
      is_meeting_participant: {
        Args: { _meeting_id: string; _user_id: string }
        Returns: boolean
      }
      is_module_expert: {
        Args: { _module_id: string; _user_id: string }
        Returns: boolean
      }
      is_pure_candidate: { Args: { check_user_id: string }; Returns: boolean }
      is_team_member: { Args: { check_user_id: string }; Returns: boolean }
      is_tqc_team_email_for_job: {
        Args: { check_email: string; check_job_id?: string }
        Returns: {
          assigned_to_job: boolean
          full_name: string
          is_match: boolean
          job_role: string
          roles: string[]
          user_id: string
        }[]
      }
      join_default_server: { Args: never; Returns: undefined }
      log_achievement_event: {
        Args: { _event_data?: Json; _event_type: string; _user_id: string }
        Returns: string
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_actor_email: string
          p_actor_id: string
          p_actor_role: string
          p_event_type: string
          p_ip_address?: unknown
          p_metadata?: Json
          p_resource_id: string
          p_resource_type: string
          p_result?: string
          p_user_agent?: string
        }
        Returns: string
      }
      owns_message_attachment: {
        Args: { _file_path: string }
        Returns: boolean
      }
      queue_webhook_delivery: {
        Args: { p_company_id: string; p_event_type: string; p_payload: Json }
        Returns: undefined
      }
      refresh_activity_dashboard_view: { Args: never; Returns: undefined }
      register_listener: {
        Args: {
          p_ip_address?: string
          p_session_id: string
          p_user_id?: string
        }
        Returns: string
      }
      release_booking_slot_lock: {
        Args: {
          p_scheduled_end: string
          p_scheduled_start: string
          p_user_id: string
        }
        Returns: boolean
      }
      search_candidate_notes: {
        Args: {
          p_candidate_id: string
          p_note_type?: string
          p_search_term?: string
          p_user_id?: string
        }
        Returns: {
          candidate_id: string
          content: string
          created_at: string
          created_by: string
          creator_email: string
          creator_name: string
          id: string
          mention_count: number
          note_type: string
          pinned: boolean
          tags: string[]
          title: string
          updated_at: string
          visibility: string
        }[]
      }
      semantic_search_candidates: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          bio: string
          current_company: string
          current_title: string
          full_name: string
          id: string
          location: string
          similarity_score: number
          user_id: string
        }[]
      }
      semantic_search_jobs: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          department: string
          description: string
          id: string
          location: string
          requirements: string
          similarity_score: number
          title: string
        }[]
      }
      semantic_search_knowledge: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          category: string
          content: string
          id: string
          similarity_score: number
          tags: string[]
          title: string
        }[]
      }
      sync_existing_partner_domains: {
        Args: never
        Returns: {
          company_id: string
          domain: string
          synced_count: number
        }[]
      }
      track_share_link_view: { Args: { _token: string }; Returns: string }
      track_slot_view: {
        Args: {
          p_booking_link_id: string
          p_slot_start: string
          p_timezone: string
        }
        Returns: undefined
      }
      track_user_event: {
        Args: {
          p_action_data?: Json
          p_device_type?: string
          p_duration_seconds?: number
          p_event_category?: string
          p_event_type: string
          p_page_path?: string
          p_referrer?: string
          p_session_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      try_acquire_booking_slot_lock: {
        Args: {
          p_scheduled_end: string
          p_scheduled_start: string
          p_user_id: string
        }
        Returns: boolean
      }
      unregister_listener: {
        Args: {
          p_ip_address?: string
          p_session_id: string
          p_user_id?: string
        }
        Returns: undefined
      }
      update_expired_assignments: { Args: never; Returns: undefined }
      update_overdue_invoices: { Args: never; Returns: undefined }
      update_relationship_score: {
        Args: { p_related_user_id: string; p_user_id: string }
        Returns: undefined
      }
      update_user_activity_tracking: {
        Args: {
          p_action_type: string
          p_increment_actions?: boolean
          p_is_login?: boolean
          p_is_logout?: boolean
          p_session_duration_minutes?: number
          p_session_id?: string
          p_user_id: string
        }
        Returns: undefined
      }
      update_user_online_status: {
        Args: { p_status: string; p_user_id: string }
        Returns: undefined
      }
      use_invite_code: {
        Args: { _code: string; _user_id: string }
        Returns: Json
      }
      user_has_role: {
        Args: { _role: string; _user_id: string }
        Returns: boolean
      }
      user_has_storage_role: { Args: { user_id: string }; Returns: boolean }
      user_in_video_session: {
        Args: { session_id_param: string; user_id_param: string }
        Returns: boolean
      }
    }
    Enums: {
      achievement_category:
        | "influence"
        | "innovation"
        | "social"
        | "learning"
        | "prestige"
        | "event"
        | "pioneer"
      achievement_rarity: "common" | "rare" | "epic" | "legendary" | "quantum"
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "hiring_manager"
        | "strategist"
        | "partner"
        | "company_admin"
        | "recruiter"
      application_source_enum:
        | "direct"
        | "club_sync"
        | "referral"
        | "linkedin"
        | "careers_page"
        | "other"
      board_member_role: "owner" | "admin" | "editor" | "viewer"
      board_visibility: "personal" | "shared" | "company"
      club_sync_status_enum: "not_offered" | "pending" | "accepted" | "declined"
      company_achievement_type: "custom" | "platform_generated"
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
      achievement_category: [
        "influence",
        "innovation",
        "social",
        "learning",
        "prestige",
        "event",
        "pioneer",
      ],
      achievement_rarity: ["common", "rare", "epic", "legendary", "quantum"],
      app_role: [
        "admin",
        "moderator",
        "user",
        "hiring_manager",
        "strategist",
        "partner",
        "company_admin",
        "recruiter",
      ],
      application_source_enum: [
        "direct",
        "club_sync",
        "referral",
        "linkedin",
        "careers_page",
        "other",
      ],
      board_member_role: ["owner", "admin", "editor", "viewer"],
      board_visibility: ["personal", "shared", "company"],
      club_sync_status_enum: ["not_offered", "pending", "accepted", "declined"],
      company_achievement_type: ["custom", "platform_generated"],
    },
  },
} as const

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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
      booking_links: {
        Row: {
          advance_booking_days: number | null
          allow_waitlist: boolean | null
          auto_generate_meeting_link: boolean | null
          buffer_after_minutes: number | null
          buffer_before_minutes: number | null
          color: string | null
          confirmation_message: string | null
          created_at: string
          custom_questions: Json | null
          description: string | null
          duration_minutes: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_bookings_per_day: number | null
          max_uses: number | null
          min_notice_hours: number | null
          redirect_url: string | null
          requires_approval: boolean | null
          routing_rules: Json | null
          scheduling_type: string | null
          single_use: boolean | null
          slug: string
          team_members: string[] | null
          title: string
          updated_at: string
          use_count: number | null
          user_id: string
          video_conferencing_provider: string | null
        }
        Insert: {
          advance_booking_days?: number | null
          allow_waitlist?: boolean | null
          auto_generate_meeting_link?: boolean | null
          buffer_after_minutes?: number | null
          buffer_before_minutes?: number | null
          color?: string | null
          confirmation_message?: string | null
          created_at?: string
          custom_questions?: Json | null
          description?: string | null
          duration_minutes?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_bookings_per_day?: number | null
          max_uses?: number | null
          min_notice_hours?: number | null
          redirect_url?: string | null
          requires_approval?: boolean | null
          routing_rules?: Json | null
          scheduling_type?: string | null
          single_use?: boolean | null
          slug: string
          team_members?: string[] | null
          title: string
          updated_at?: string
          use_count?: number | null
          user_id: string
          video_conferencing_provider?: string | null
        }
        Update: {
          advance_booking_days?: number | null
          allow_waitlist?: boolean | null
          auto_generate_meeting_link?: boolean | null
          buffer_after_minutes?: number | null
          buffer_before_minutes?: number | null
          color?: string | null
          confirmation_message?: string | null
          created_at?: string
          custom_questions?: Json | null
          description?: string | null
          duration_minutes?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_bookings_per_day?: number | null
          max_uses?: number | null
          min_notice_hours?: number | null
          redirect_url?: string | null
          requires_approval?: boolean | null
          routing_rules?: Json | null
          scheduling_type?: string | null
          single_use?: boolean | null
          slug?: string
          team_members?: string[] | null
          title?: string
          updated_at?: string
          use_count?: number | null
          user_id?: string
          video_conferencing_provider?: string | null
        }
        Relationships: []
      }
      booking_reminders: {
        Row: {
          booking_id: string
          created_at: string | null
          id: string
          reminder_type: string
          send_before_minutes: number
          sent_at: string | null
          status: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          id?: string
          reminder_type: string
          send_before_minutes: number
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          id?: string
          reminder_type?: string
          send_before_minutes?: number
          sent_at?: string | null
          status?: string | null
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
      booking_waitlist: {
        Row: {
          booking_link_id: string
          created_at: string | null
          guest_email: string
          guest_name: string
          guest_phone: string | null
          id: string
          notified: boolean | null
          preferred_dates: Json
        }
        Insert: {
          booking_link_id: string
          created_at?: string | null
          guest_email: string
          guest_name: string
          guest_phone?: string | null
          id?: string
          notified?: boolean | null
          preferred_dates?: Json
        }
        Update: {
          booking_link_id?: string
          created_at?: string | null
          guest_email?: string
          guest_name?: string
          guest_phone?: string | null
          id?: string
          notified?: boolean | null
          preferred_dates?: Json
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
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          assigned_team_member: string | null
          attended: boolean | null
          booking_link_id: string
          calendar_event_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          custom_responses: Json | null
          guest_email: string
          guest_name: string
          guest_phone: string | null
          id: string
          no_show: boolean | null
          notes: string | null
          reminder_sent: boolean | null
          scheduled_end: string
          scheduled_start: string
          status: string
          timezone: string
          updated_at: string
          user_id: string
          video_meeting_id: string | null
          video_meeting_link: string | null
          video_meeting_password: string | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_team_member?: string | null
          attended?: boolean | null
          booking_link_id: string
          calendar_event_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          custom_responses?: Json | null
          guest_email: string
          guest_name: string
          guest_phone?: string | null
          id?: string
          no_show?: boolean | null
          notes?: string | null
          reminder_sent?: boolean | null
          scheduled_end: string
          scheduled_start: string
          status?: string
          timezone: string
          updated_at?: string
          user_id: string
          video_meeting_id?: string | null
          video_meeting_link?: string | null
          video_meeting_password?: string | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_team_member?: string | null
          attended?: boolean | null
          booking_link_id?: string
          calendar_event_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          custom_responses?: Json | null
          guest_email?: string
          guest_name?: string
          guest_phone?: string | null
          id?: string
          no_show?: boolean | null
          notes?: string | null
          reminder_sent?: boolean | null
          scheduled_end?: string
          scheduled_start?: string
          status?: string
          timezone?: string
          updated_at?: string
          user_id?: string
          video_meeting_id?: string | null
          video_meeting_link?: string | null
          video_meeting_password?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_booking_link_id_fkey"
            columns: ["booking_link_id"]
            isOneToOne: false
            referencedRelation: "booking_links"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "candidate_interactions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
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
          ai_concerns: Json | null
          ai_strengths: Json | null
          ai_summary: string | null
          avatar_url: string | null
          blocked_companies: Json | null
          certifications: Json | null
          created_at: string
          created_by: string | null
          current_company: string | null
          current_title: string | null
          data_retention_date: string | null
          desired_locations: Json | null
          desired_salary_max: number | null
          desired_salary_min: number | null
          education: Json | null
          email: string
          engagement_score: number | null
          enrichment_data: Json | null
          fit_score: number | null
          full_name: string
          gdpr_consent: boolean | null
          gdpr_consent_date: string | null
          github_url: string | null
          id: string
          internal_rating: number | null
          languages: Json | null
          last_activity_at: string | null
          linkedin_profile_data: Json | null
          linkedin_url: string | null
          notice_period: string | null
          personality_insights: Json | null
          phone: string | null
          portfolio_url: string | null
          preferred_currency: string | null
          remote_preference: string | null
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
          ai_concerns?: Json | null
          ai_strengths?: Json | null
          ai_summary?: string | null
          avatar_url?: string | null
          blocked_companies?: Json | null
          certifications?: Json | null
          created_at?: string
          created_by?: string | null
          current_company?: string | null
          current_title?: string | null
          data_retention_date?: string | null
          desired_locations?: Json | null
          desired_salary_max?: number | null
          desired_salary_min?: number | null
          education?: Json | null
          email: string
          engagement_score?: number | null
          enrichment_data?: Json | null
          fit_score?: number | null
          full_name: string
          gdpr_consent?: boolean | null
          gdpr_consent_date?: string | null
          github_url?: string | null
          id?: string
          internal_rating?: number | null
          languages?: Json | null
          last_activity_at?: string | null
          linkedin_profile_data?: Json | null
          linkedin_url?: string | null
          notice_period?: string | null
          personality_insights?: Json | null
          phone?: string | null
          portfolio_url?: string | null
          preferred_currency?: string | null
          remote_preference?: string | null
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
          ai_concerns?: Json | null
          ai_strengths?: Json | null
          ai_summary?: string | null
          avatar_url?: string | null
          blocked_companies?: Json | null
          certifications?: Json | null
          created_at?: string
          created_by?: string | null
          current_company?: string | null
          current_title?: string | null
          data_retention_date?: string | null
          desired_locations?: Json | null
          desired_salary_max?: number | null
          desired_salary_min?: number | null
          education?: Json | null
          email?: string
          engagement_score?: number | null
          enrichment_data?: Json | null
          fit_score?: number | null
          full_name?: string
          gdpr_consent?: boolean | null
          gdpr_consent_date?: string | null
          github_url?: string | null
          id?: string
          internal_rating?: number | null
          languages?: Json | null
          last_activity_at?: string | null
          linkedin_profile_data?: Json | null
          linkedin_url?: string | null
          notice_period?: string | null
          personality_insights?: Json | null
          phone?: string | null
          portfolio_url?: string | null
          preferred_currency?: string | null
          remote_preference?: string | null
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
        Relationships: []
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
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          joined_at: string | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          estimated_hours: number | null
          id: string
          is_published: boolean | null
          learning_objectives: Json | null
          learning_path_id: string | null
          prerequisites: Json | null
          published_at: string | null
          slug: string
          title: string
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
          estimated_hours?: number | null
          id?: string
          is_published?: boolean | null
          learning_objectives?: Json | null
          learning_path_id?: string | null
          prerequisites?: Json | null
          published_at?: string | null
          slug: string
          title: string
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
          estimated_hours?: number | null
          id?: string
          is_published?: boolean | null
          learning_objectives?: Json | null
          learning_path_id?: string | null
          prerequisites?: Json | null
          published_at?: string | null
          slug?: string
          title?: string
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
      email_verifications: {
        Row: {
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string
          verified_at?: string | null
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
      jobs: {
        Row: {
          benefits: Json | null
          closed_at: string | null
          company_id: string
          created_at: string | null
          created_by: string
          currency: string
          description: string | null
          employment_type: string | null
          id: string
          location: string | null
          pipeline_stages: Json | null
          published_at: string | null
          requirements: Json | null
          responsibilities: Json | null
          salary_max: number | null
          salary_min: number | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          benefits?: Json | null
          closed_at?: string | null
          company_id: string
          created_at?: string | null
          created_by: string
          currency?: string
          description?: string | null
          employment_type?: string | null
          id?: string
          location?: string | null
          pipeline_stages?: Json | null
          published_at?: string | null
          requirements?: Json | null
          responsibilities?: Json | null
          salary_max?: number | null
          salary_min?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          benefits?: Json | null
          closed_at?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string
          currency?: string
          description?: string | null
          employment_type?: string | null
          id?: string
          location?: string | null
          pipeline_stages?: Json | null
          published_at?: string | null
          requirements?: Json | null
          responsibilities?: Json | null
          salary_max?: number | null
          salary_min?: number | null
          status?: string | null
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
        ]
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
        ]
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
      meeting_participants: {
        Row: {
          created_at: string | null
          guest_email: string | null
          guest_name: string | null
          id: string
          joined_at: string | null
          left_at: string | null
          meeting_id: string
          permissions: Json | null
          role: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          joined_at?: string | null
          left_at?: string | null
          meeting_id: string
          permissions?: Json | null
          role?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          joined_at?: string | null
          left_at?: string | null
          meeting_id?: string
          permissions?: Json | null
          role?: string
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
      meetings: {
        Row: {
          access_type: string
          agenda: string | null
          allow_guests: boolean | null
          branding: Json | null
          created_at: string | null
          description: string | null
          host_id: string
          id: string
          max_participants: number | null
          meeting_code: string
          meeting_password: string | null
          recurrence_rule: string | null
          require_approval: boolean | null
          scheduled_end: string
          scheduled_start: string
          settings: Json | null
          status: string
          timezone: string
          title: string
          updated_at: string | null
          video_session_id: string | null
        }
        Insert: {
          access_type?: string
          agenda?: string | null
          allow_guests?: boolean | null
          branding?: Json | null
          created_at?: string | null
          description?: string | null
          host_id: string
          id?: string
          max_participants?: number | null
          meeting_code: string
          meeting_password?: string | null
          recurrence_rule?: string | null
          require_approval?: boolean | null
          scheduled_end: string
          scheduled_start: string
          settings?: Json | null
          status?: string
          timezone?: string
          title: string
          updated_at?: string | null
          video_session_id?: string | null
        }
        Update: {
          access_type?: string
          agenda?: string | null
          allow_guests?: boolean | null
          branding?: Json | null
          created_at?: string | null
          description?: string | null
          host_id?: string
          id?: string
          max_participants?: number | null
          meeting_code?: string
          meeting_password?: string | null
          recurrence_rule?: string | null
          require_approval?: boolean | null
          scheduled_end?: string
          scheduled_start?: string
          settings?: Json | null
          status?: string
          timezone?: string
          title?: string
          updated_at?: string | null
          video_session_id?: string | null
        }
        Relationships: [
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
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
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
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
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
          created_at?: string
          id?: string
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
          created_at?: string
          id?: string
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
      phone_verifications: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string
          id: string
          ip_address: unknown | null
          phone: string
          user_agent: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          phone: string
          user_agent?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          phone?: string
          user_agent?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
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
          reposted_at: string
          reposted_by: string
        }
        Insert: {
          id?: string
          original_post_id: string
          reposted_at?: string
          reposted_by: string
        }
        Update: {
          id?: string
          original_post_id?: string
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
            foreignKeyName: "posts_repost_of_fkey"
            columns: ["repost_of"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
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
          allow_stealth_cold_outreach: boolean | null
          apple_music_connected: boolean | null
          apple_music_playlists: Json | null
          apple_music_user_id: string | null
          avatar_url: string | null
          blocked_companies: Json | null
          career_preferences: string | null
          company_id: string | null
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
          has_indefinite_contract: boolean | null
          header_media_type: string | null
          header_media_url: string | null
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
          preferred_currency: string
          preferred_work_locations: Json | null
          privacy_settings: Json | null
          profile_slug: string | null
          public_fields: Json | null
          remote_work_preference: boolean | null
          resume_url: string | null
          spotify_connected: boolean | null
          spotify_playlists: Json | null
          spotify_user_id: string | null
          stealth_mode_enabled: boolean | null
          stealth_mode_level: number | null
          twitter_connected: boolean | null
          twitter_username: string | null
          updated_at: string | null
        }
        Insert: {
          allow_stealth_cold_outreach?: boolean | null
          apple_music_connected?: boolean | null
          apple_music_playlists?: Json | null
          apple_music_user_id?: string | null
          avatar_url?: string | null
          blocked_companies?: Json | null
          career_preferences?: string | null
          company_id?: string | null
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
          has_indefinite_contract?: boolean | null
          header_media_type?: string | null
          header_media_url?: string | null
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
          preferred_currency?: string
          preferred_work_locations?: Json | null
          privacy_settings?: Json | null
          profile_slug?: string | null
          public_fields?: Json | null
          remote_work_preference?: boolean | null
          resume_url?: string | null
          spotify_connected?: boolean | null
          spotify_playlists?: Json | null
          spotify_user_id?: string | null
          stealth_mode_enabled?: boolean | null
          stealth_mode_level?: number | null
          twitter_connected?: boolean | null
          twitter_username?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_stealth_cold_outreach?: boolean | null
          apple_music_connected?: boolean | null
          apple_music_playlists?: Json | null
          apple_music_user_id?: string | null
          avatar_url?: string | null
          blocked_companies?: Json | null
          career_preferences?: string | null
          company_id?: string | null
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
          has_indefinite_contract?: boolean | null
          header_media_type?: string | null
          header_media_url?: string | null
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
          preferred_currency?: string
          preferred_work_locations?: Json | null
          privacy_settings?: Json | null
          profile_slug?: string | null
          public_fields?: Json | null
          remote_work_preference?: boolean | null
          resume_url?: string | null
          spotify_connected?: boolean | null
          spotify_playlists?: Json | null
          spotify_user_id?: string | null
          stealth_mode_enabled?: boolean | null
          stealth_mode_level?: number | null
          twitter_connected?: boolean | null
          twitter_username?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quantum_achievements: {
        Row: {
          animation_effect: string | null
          category: Database["public"]["Enums"]["achievement_category"]
          created_at: string
          description: string
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
          id: string
          industry: string | null
          job_id: string | null
          job_specifications: Json | null
          location: string | null
          logo_url: string | null
          name: string
          notes: string | null
          priority: number | null
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
          id?: string
          industry?: string | null
          job_id?: string | null
          job_specifications?: Json | null
          location?: string | null
          logo_url?: string | null
          name: string
          notes?: string | null
          priority?: number | null
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
          id?: string
          industry?: string | null
          job_id?: string | null
          job_specifications?: Json | null
          location?: string | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          priority?: number | null
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
            foreignKeyName: "target_companies_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
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
          role?: string
          submitted_at?: string | null
          user_id?: string
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
          created_at: string
          id: string
          preferred_role_view: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          preferred_role_view?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
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
      verification_attempts: {
        Row: {
          action: string
          created_at: string | null
          email: string | null
          error_message: string | null
          id: string
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
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
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          current_title: string | null
          full_name: string | null
          id: string | null
          location: string | null
        }
        Insert: {
          avatar_url?: string | null
          current_title?: never
          full_name?: string | null
          id?: string | null
          location?: never
        }
        Update: {
          avatar_url?: string | null
          current_title?: never
          full_name?: string | null
          id?: string | null
          location?: never
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
    }
    Functions: {
      calculate_objective_completion: {
        Args: { objective_uuid: string }
        Returns: number
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
      can_access_conversation_storage: {
        Args: { _conversation_id: string }
        Returns: boolean
      }
      check_verification_rate_limit: {
        Args: { _action: string; _user_id: string; _verification_type: string }
        Returns: Json
      }
      cleanup_expired_verifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
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
      generate_invite_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_meeting_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_profile_slug: {
        Args: { name: string }
        Returns: string
      }
      generate_referral_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_share_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_task_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_unified_task_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_company_role: {
        Args: { _company_id: string; _role: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      log_achievement_event: {
        Args: { _event_data?: Json; _event_type: string; _user_id: string }
        Returns: string
      }
      owns_message_attachment: {
        Args: { _file_path: string }
        Returns: boolean
      }
      track_share_link_view: {
        Args: { _token: string }
        Returns: string
      }
      update_relationship_score: {
        Args: { p_related_user_id: string; p_user_id: string }
        Returns: undefined
      }
      use_invite_code: {
        Args: { _code: string; _user_id: string }
        Returns: Json
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
      company_achievement_type: ["custom", "platform_generated"],
    },
  },
} as const

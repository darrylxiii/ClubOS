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
      booking_links: {
        Row: {
          advance_booking_days: number | null
          buffer_after_minutes: number | null
          buffer_before_minutes: number | null
          color: string | null
          confirmation_message: string | null
          created_at: string
          custom_questions: Json | null
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          min_notice_hours: number | null
          redirect_url: string | null
          slug: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          advance_booking_days?: number | null
          buffer_after_minutes?: number | null
          buffer_before_minutes?: number | null
          color?: string | null
          confirmation_message?: string | null
          created_at?: string
          custom_questions?: Json | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          min_notice_hours?: number | null
          redirect_url?: string | null
          slug: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          advance_booking_days?: number | null
          buffer_after_minutes?: number | null
          buffer_before_minutes?: number | null
          color?: string | null
          confirmation_message?: string | null
          created_at?: string
          custom_questions?: Json | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          min_notice_hours?: number | null
          redirect_url?: string | null
          slug?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
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
          notes: string | null
          reminder_sent: boolean | null
          scheduled_end: string
          scheduled_start: string
          status: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
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
          notes?: string | null
          reminder_sent?: boolean | null
          scheduled_end: string
          scheduled_start: string
          status?: string
          timezone: string
          updated_at?: string
          user_id: string
        }
        Update: {
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
          notes?: string | null
          reminder_sent?: boolean | null
          scheduled_end?: string
          scheduled_start?: string
          status?: string
          timezone?: string
          updated_at?: string
          user_id?: string
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
          id: string
          is_read: boolean | null
          is_urgent: boolean | null
          media_duration: number | null
          media_type: string | null
          media_url: string | null
          message_type: string
          metadata: Json | null
          parent_message_id: string | null
          priority: string | null
          reply_count: number | null
          sender_id: string
          sentiment_score: number | null
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_read?: boolean | null
          is_urgent?: boolean | null
          media_duration?: number | null
          media_type?: string | null
          media_url?: string | null
          message_type?: string
          metadata?: Json | null
          parent_message_id?: string | null
          priority?: string | null
          reply_count?: number | null
          sender_id: string
          sentiment_score?: number | null
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_read?: boolean | null
          is_urgent?: boolean | null
          media_duration?: number | null
          media_type?: string | null
          media_url?: string | null
          message_type?: string
          metadata?: Json | null
          parent_message_id?: string | null
          priority?: string | null
          reply_count?: number | null
          sender_id?: string
          sentiment_score?: number | null
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
          company_id: string | null
          content: string
          created_at: string
          id: string
          media_urls: Json | null
          poll_options: Json | null
          poll_question: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          content: string
          created_at?: string
          id?: string
          media_urls?: Json | null
          poll_options?: Json | null
          poll_question?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          content?: string
          created_at?: string
          id?: string
          media_urls?: Json | null
          poll_options?: Json | null
          poll_question?: string | null
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
          avatar_url: string | null
          blocked_companies: Json | null
          career_preferences: string | null
          company_id: string | null
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
          preferred_currency: string
          preferred_work_locations: Json | null
          privacy_settings: Json | null
          public_fields: Json | null
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
          company_id?: string | null
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
          preferred_currency?: string
          preferred_work_locations?: Json | null
          privacy_settings?: Json | null
          public_fields?: Json | null
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
          company_id?: string | null
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
          preferred_currency?: string
          preferred_work_locations?: Json | null
          privacy_settings?: Json | null
          public_fields?: Json | null
          remote_work_preference?: boolean | null
          resume_url?: string | null
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
      check_verification_rate_limit: {
        Args: { _action: string; _user_id: string; _verification_type: string }
        Returns: Json
      }
      cleanup_expired_verifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_invite_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_referral_code: {
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
      use_invite_code: {
        Args: { _code: string; _user_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "hiring_manager"
        | "strategist"
        | "partner"
        | "company_admin"
        | "recruiter"
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
        "admin",
        "moderator",
        "user",
        "hiring_manager",
        "strategist",
        "partner",
        "company_admin",
        "recruiter",
      ],
    },
  },
} as const

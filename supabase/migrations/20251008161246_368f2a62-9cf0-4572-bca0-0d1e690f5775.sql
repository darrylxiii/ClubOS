-- Create comprehensive candidate profiles table (2040-ready)
CREATE TABLE IF NOT EXISTS public.candidate_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Basic Info
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  avatar_url TEXT,
  
  -- Professional Data
  current_title TEXT,
  current_company TEXT,
  years_of_experience NUMERIC,
  skills JSONB DEFAULT '[]'::jsonb,
  languages JSONB DEFAULT '[]'::jsonb,
  certifications JSONB DEFAULT '[]'::jsonb,
  education JSONB DEFAULT '[]'::jsonb,
  work_history JSONB DEFAULT '[]'::jsonb,
  
  -- Preferences & Requirements
  desired_salary_min NUMERIC,
  desired_salary_max NUMERIC,
  preferred_currency TEXT DEFAULT 'EUR',
  desired_locations JSONB DEFAULT '[]'::jsonb,
  remote_preference TEXT,
  notice_period TEXT,
  work_authorization JSONB DEFAULT '{}'::jsonb,
  
  -- Quantum Club Specific
  source_channel TEXT, -- 'linkedin', 'referral', 'manual', 'job_board', etc.
  source_metadata JSONB DEFAULT '{}'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  internal_rating NUMERIC,
  fit_score NUMERIC,
  engagement_score NUMERIC,
  
  -- AI & Automation
  ai_summary TEXT,
  ai_strengths JSONB DEFAULT '[]'::jsonb,
  ai_concerns JSONB DEFAULT '[]'::jsonb,
  personality_insights JSONB DEFAULT '{}'::jsonb,
  
  -- Privacy & Compliance
  gdpr_consent BOOLEAN DEFAULT false,
  gdpr_consent_date TIMESTAMPTZ,
  data_retention_date TIMESTAMPTZ,
  blocked_companies JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  linkedin_profile_data JSONB,
  enrichment_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  last_activity_at TIMESTAMPTZ,
  
  CONSTRAINT unique_email UNIQUE(email)
);

-- Create candidate interactions log (comprehensive audit trail)
CREATE TABLE IF NOT EXISTS public.candidate_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  
  -- Interaction Details
  interaction_type TEXT NOT NULL, -- 'call', 'email', 'note', 'meeting', 'profile_view', 'job_view', 'message', 'document', 'status_change'
  interaction_direction TEXT, -- 'inbound', 'outbound', 'internal'
  
  -- Content
  title TEXT,
  content TEXT,
  summary TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb, -- duration, sentiment, participants, attachments, etc.
  tags JSONB DEFAULT '[]'::jsonb,
  
  -- Participants
  created_by UUID REFERENCES auth.users(id),
  participants JSONB DEFAULT '[]'::jsonb, -- array of user_ids involved
  
  -- AI Analysis
  ai_sentiment TEXT,
  ai_key_points JSONB DEFAULT '[]'::jsonb,
  ai_action_items JSONB DEFAULT '[]'::jsonb,
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Visibility
  is_internal BOOLEAN DEFAULT true,
  visible_to_candidate BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create candidate profile views tracking
CREATE TABLE IF NOT EXISTS public.candidate_profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- View context
  view_context TEXT, -- 'job_pipeline', 'search', 'direct_link', 'referral'
  view_source TEXT, -- page or feature where viewed
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  
  -- View metadata
  session_id TEXT,
  duration_seconds INTEGER,
  sections_viewed JSONB DEFAULT '[]'::jsonb,
  
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_email ON public.candidate_profiles(email);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_user_id ON public.candidate_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_linkedin_url ON public.candidate_profiles(linkedin_url);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_created_by ON public.candidate_profiles(created_by);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_last_activity ON public.candidate_profiles(last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_candidate_interactions_candidate_id ON public.candidate_interactions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_interactions_application_id ON public.candidate_interactions(application_id);
CREATE INDEX IF NOT EXISTS idx_candidate_interactions_type ON public.candidate_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_candidate_interactions_created_at ON public.candidate_interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidate_interactions_created_by ON public.candidate_interactions(created_by);

CREATE INDEX IF NOT EXISTS idx_candidate_profile_views_candidate_id ON public.candidate_profile_views(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_profile_views_viewer_id ON public.candidate_profile_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_candidate_profile_views_job_id ON public.candidate_profile_views(job_id);

-- Enable RLS
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_profile_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for candidate_profiles
CREATE POLICY "Admins and partners can view all candidate profiles"
  ON public.candidate_profiles FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'partner'::app_role)
  );

CREATE POLICY "Admins and partners can create candidate profiles"
  ON public.candidate_profiles FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'partner'::app_role)
  );

CREATE POLICY "Admins and partners can update candidate profiles"
  ON public.candidate_profiles FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'partner'::app_role)
  );

-- RLS Policies for candidate_interactions
CREATE POLICY "Admins and partners can view interactions"
  ON public.candidate_interactions FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'partner'::app_role)
  );

CREATE POLICY "Admins and partners can create interactions"
  ON public.candidate_interactions FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role))
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their own interactions"
  ON public.candidate_interactions FOR UPDATE
  USING (created_by = auth.uid());

-- RLS Policies for candidate_profile_views
CREATE POLICY "Admins and partners can view all profile views"
  ON public.candidate_profile_views FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'partner'::app_role)
  );

CREATE POLICY "System can track profile views"
  ON public.candidate_profile_views FOR INSERT
  WITH CHECK (viewer_id = auth.uid());

-- Create function to update last_activity_at
CREATE OR REPLACE FUNCTION update_candidate_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.candidate_profiles
  SET last_activity_at = now()
  WHERE id = NEW.candidate_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic last_activity updates
CREATE TRIGGER update_candidate_activity_on_interaction
  AFTER INSERT ON public.candidate_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_candidate_last_activity();

-- Create function to auto-log profile views as interactions
CREATE OR REPLACE FUNCTION log_profile_view_interaction()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.candidate_interactions (
    candidate_id,
    interaction_type,
    interaction_direction,
    title,
    metadata,
    created_by,
    visible_to_candidate
  ) VALUES (
    NEW.candidate_id,
    'profile_view',
    'internal',
    'Profile viewed',
    jsonb_build_object(
      'view_context', NEW.view_context,
      'view_source', NEW.view_source,
      'duration_seconds', NEW.duration_seconds
    ),
    NEW.viewer_id,
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic profile view logging
CREATE TRIGGER log_profile_view_as_interaction
  AFTER INSERT ON public.candidate_profile_views
  FOR EACH ROW
  EXECUTE FUNCTION log_profile_view_interaction();
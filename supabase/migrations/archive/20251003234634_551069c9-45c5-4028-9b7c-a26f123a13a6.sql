-- ============================================
-- PROFILE MODULE PHASE 1: CORE TABLES
-- ============================================

-- Work Experience Table
CREATE TABLE IF NOT EXISTS public.profile_experience (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_name text NOT NULL,
  position_title text NOT NULL,
  employment_type text DEFAULT 'fulltime', -- fulltime, parttime, contract, freelance, internship
  location text,
  location_type text DEFAULT 'onsite', -- onsite, remote, hybrid
  start_date date NOT NULL,
  end_date date,
  is_current boolean DEFAULT false,
  description text,
  achievements jsonb DEFAULT '[]'::jsonb,
  skills_used jsonb DEFAULT '[]'::jsonb,
  projects jsonb DEFAULT '[]'::jsonb,
  visibility text DEFAULT 'public', -- public, private, company, recruiter
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Education Table
CREATE TABLE IF NOT EXISTS public.profile_education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  institution_name text NOT NULL,
  degree_type text, -- bachelor, master, phd, certificate, bootcamp
  field_of_study text,
  grade text,
  start_date date,
  end_date date,
  is_current boolean DEFAULT false,
  description text,
  activities jsonb DEFAULT '[]'::jsonb,
  certificate_url text,
  certificate_verified boolean DEFAULT false,
  visibility text DEFAULT 'public',
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Skills Table with Endorsements
CREATE TABLE IF NOT EXISTS public.profile_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  skill_name text NOT NULL,
  category text, -- technical, soft, language, tool, framework
  proficiency_level integer DEFAULT 3, -- 1-5 scale
  years_experience integer,
  endorsement_count integer DEFAULT 0,
  last_used date,
  ai_verified boolean DEFAULT false,
  proof_of_work jsonb DEFAULT '[]'::jsonb, -- links, projects, certificates
  visibility text DEFAULT 'public',
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, skill_name)
);

-- Skills Endorsements
CREATE TABLE IF NOT EXISTS public.skill_endorsements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid REFERENCES public.profile_skills(id) ON DELETE CASCADE NOT NULL,
  endorsed_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  relationship text, -- colleague, manager, client, mentor
  comment text,
  rating integer, -- 1-5
  created_at timestamptz DEFAULT now(),
  UNIQUE(skill_id, endorsed_by)
);

-- Certifications & Awards
CREATE TABLE IF NOT EXISTS public.profile_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL, -- certification, award, publication, patent, speaking
  title text NOT NULL,
  issuer text,
  issue_date date,
  expiry_date date,
  credential_id text,
  credential_url text,
  description text,
  verification_status text DEFAULT 'unverified', -- verified, unverified, pending
  certificate_file_url text,
  visibility text DEFAULT 'public',
  display_order integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Portfolio Items
CREATE TABLE IF NOT EXISTS public.profile_portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  type text NOT NULL, -- project, code, design, video, presentation, article, case_study
  thumbnail_url text,
  media_urls jsonb DEFAULT '[]'::jsonb,
  project_url text,
  github_url text,
  tags jsonb DEFAULT '[]'::jsonb,
  collaborators jsonb DEFAULT '[]'::jsonb,
  date_completed date,
  featured boolean DEFAULT false,
  visibility text DEFAULT 'public',
  display_order integer DEFAULT 0,
  views_count integer DEFAULT 0,
  likes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Recommendations/Testimonials
CREATE TABLE IF NOT EXISTS public.profile_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recommender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recommender_name text NOT NULL,
  recommender_title text,
  recommender_company text,
  relationship text, -- colleague, manager, client, mentor, direct_report
  recommendation_text text NOT NULL,
  skills_highlighted jsonb DEFAULT '[]'::jsonb,
  voice_message_url text,
  rating integer, -- 1-5
  status text DEFAULT 'approved', -- pending, approved, declined
  visibility text DEFAULT 'public',
  featured boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Custom Profile Fields (User-defined)
CREATE TABLE IF NOT EXISTS public.profile_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  field_type text NOT NULL, -- link, text, badge, metric, social
  label text NOT NULL,
  value text NOT NULL,
  icon text,
  url text,
  display_order integer DEFAULT 0,
  visibility text DEFAULT 'public',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Profile Media (Showreels, Intros)
CREATE TABLE IF NOT EXISTS public.profile_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL, -- video_intro, showreel, voice_intro, presentation
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  thumbnail_url text,
  duration_seconds integer,
  file_size integer,
  mime_type text,
  is_primary boolean DEFAULT false,
  visibility text DEFAULT 'public',
  views_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Profile Visibility Rules (Granular Control)
CREATE TABLE IF NOT EXISTS public.profile_visibility_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  section_name text NOT NULL, -- experience, education, skills, portfolio, etc.
  visibility_level text DEFAULT 'public', -- public, authenticated, company, recruiter, private
  allowed_companies jsonb DEFAULT '[]'::jsonb,
  allowed_roles jsonb DEFAULT '[]'::jsonb, -- admin, strategist, partner
  blocked_companies jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, section_name)
);

-- Profile Activity & Engagement
CREATE TABLE IF NOT EXISTS public.profile_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL, -- view, share, recommendation_received, endorsement, job_application
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- LinkedIn Import History
CREATE TABLE IF NOT EXISTS public.linkedin_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  import_type text NOT NULL, -- manual, oauth, scrape
  imported_data jsonb NOT NULL,
  import_status text DEFAULT 'success', -- success, partial, failed
  sections_imported jsonb DEFAULT '[]'::jsonb,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- GDPR Data Export Requests
CREATE TABLE IF NOT EXISTS public.profile_data_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  export_status text DEFAULT 'pending', -- pending, processing, completed, failed
  export_file_url text,
  requested_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_experience_user ON public.profile_experience(user_id);
CREATE INDEX IF NOT EXISTS idx_experience_current ON public.profile_experience(user_id, is_current);
CREATE INDEX IF NOT EXISTS idx_education_user ON public.profile_education(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_user ON public.profile_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_category ON public.profile_skills(user_id, category);
CREATE INDEX IF NOT EXISTS idx_portfolio_user ON public.profile_portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_featured ON public.profile_portfolio(user_id, featured);
CREATE INDEX IF NOT EXISTS idx_recommendations_user ON public.profile_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON public.profile_recommendations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_activity_user ON public.profile_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_type ON public.profile_activity(user_id, activity_type);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Profile Experience
ALTER TABLE public.profile_experience ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public experience" ON public.profile_experience
  FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id);

CREATE POLICY "Users can manage their own experience" ON public.profile_experience
  FOR ALL USING (auth.uid() = user_id);

-- Profile Education
ALTER TABLE public.profile_education ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public education" ON public.profile_education
  FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id);

CREATE POLICY "Users can manage their own education" ON public.profile_education
  FOR ALL USING (auth.uid() = user_id);

-- Profile Skills
ALTER TABLE public.profile_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public skills" ON public.profile_skills
  FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id);

CREATE POLICY "Users can manage their own skills" ON public.profile_skills
  FOR ALL USING (auth.uid() = user_id);

-- Skill Endorsements
ALTER TABLE public.skill_endorsements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view endorsements" ON public.skill_endorsements
  FOR SELECT USING (true);

CREATE POLICY "Users can endorse skills" ON public.skill_endorsements
  FOR INSERT WITH CHECK (auth.uid() = endorsed_by);

CREATE POLICY "Users can update their endorsements" ON public.skill_endorsements
  FOR UPDATE USING (auth.uid() = endorsed_by);

-- Profile Achievements
ALTER TABLE public.profile_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public achievements" ON public.profile_achievements
  FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id);

CREATE POLICY "Users can manage their own achievements" ON public.profile_achievements
  FOR ALL USING (auth.uid() = user_id);

-- Portfolio
ALTER TABLE public.profile_portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public portfolio" ON public.profile_portfolio
  FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id);

CREATE POLICY "Users can manage their own portfolio" ON public.profile_portfolio
  FOR ALL USING (auth.uid() = user_id);

-- Recommendations
ALTER TABLE public.profile_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view approved recommendations" ON public.profile_recommendations
  FOR SELECT USING (
    (visibility = 'public' AND status = 'approved') OR 
    auth.uid() = user_id OR 
    auth.uid() = recommender_id
  );

CREATE POLICY "Users can manage recommendations for themselves" ON public.profile_recommendations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Recommenders can create recommendations" ON public.profile_recommendations
  FOR INSERT WITH CHECK (auth.uid() = recommender_id);

-- Custom Fields
ALTER TABLE public.profile_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public custom fields" ON public.profile_custom_fields
  FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id);

CREATE POLICY "Users can manage their own custom fields" ON public.profile_custom_fields
  FOR ALL USING (auth.uid() = user_id);

-- Profile Media
ALTER TABLE public.profile_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public media" ON public.profile_media
  FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id);

CREATE POLICY "Users can manage their own media" ON public.profile_media
  FOR ALL USING (auth.uid() = user_id);

-- Visibility Rules
ALTER TABLE public.profile_visibility_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their visibility rules" ON public.profile_visibility_rules
  FOR ALL USING (auth.uid() = user_id);

-- Activity
ALTER TABLE public.profile_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their activity" ON public.profile_activity
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can log activity" ON public.profile_activity
  FOR INSERT WITH CHECK (true);

-- LinkedIn Imports
ALTER TABLE public.linkedin_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their imports" ON public.linkedin_imports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create imports" ON public.linkedin_imports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Data Exports
ALTER TABLE public.profile_data_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their data exports" ON public.profile_data_exports
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE TRIGGER update_experience_updated_at BEFORE UPDATE ON public.profile_experience
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_education_updated_at BEFORE UPDATE ON public.profile_education
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON public.profile_skills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_achievements_updated_at BEFORE UPDATE ON public.profile_achievements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_portfolio_updated_at BEFORE UPDATE ON public.profile_portfolio
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recommendations_updated_at BEFORE UPDATE ON public.profile_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_media_updated_at BEFORE UPDATE ON public.profile_media
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
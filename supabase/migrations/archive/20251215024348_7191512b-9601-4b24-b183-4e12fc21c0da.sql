-- =============================================
-- PHASE 1: FREELANCE MARKETPLACE DATABASE SCHEMA
-- =============================================

-- Create custom types
DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('draft', 'open', 'in_review', 'active', 'paused', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE engagement_type AS ENUM ('hourly', 'fixed', 'milestone', 'retainer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE proposal_status AS ENUM ('draft', 'submitted', 'viewed', 'shortlisted', 'interviewing', 'accepted', 'rejected', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE milestone_status AS ENUM ('pending', 'in_progress', 'submitted', 'revision_requested', 'approved', 'paid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE dispute_status AS ENUM ('open', 'under_review', 'mediation', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE freelancer_level AS ENUM ('standard', 'rising_star', 'top_rated', 'top_rated_plus', 'expert_vetted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- 1. FREELANCE PROFILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.freelance_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  freelance_status TEXT DEFAULT 'available' CHECK (freelance_status IN ('available', 'busy', 'not_accepting')),
  professional_title TEXT,
  professional_summary TEXT,
  hourly_rate_min NUMERIC(10,2),
  hourly_rate_max NUMERIC(10,2),
  hourly_rate_currency TEXT DEFAULT 'EUR',
  project_rate_preference TEXT DEFAULT 'both' CHECK (project_rate_preference IN ('hourly', 'fixed', 'both')),
  availability_hours_per_week INTEGER DEFAULT 40,
  available_from_date DATE,
  categories TEXT[] DEFAULT '{}',
  subcategories TEXT[] DEFAULT '{}',
  portfolio_items JSONB DEFAULT '[]',
  years_freelancing INTEGER DEFAULT 0,
  preferred_engagement_types TEXT[] DEFAULT '{}',
  preferred_industries TEXT[] DEFAULT '{}',
  preferred_project_duration TEXT[] DEFAULT '{}',
  total_completed_projects INTEGER DEFAULT 0,
  total_project_earnings NUMERIC(12,2) DEFAULT 0,
  avg_project_rating NUMERIC(3,2),
  completion_rate_percentage NUMERIC(5,2) DEFAULT 100,
  on_time_delivery_rate NUMERIC(5,2) DEFAULT 100,
  avg_response_time_hours NUMERIC(6,2),
  active_projects_count INTEGER DEFAULT 0,
  certifications JSONB DEFAULT '[]',
  education JSONB DEFAULT '[]',
  timezone_preference TEXT,
  language_proficiencies JSONB DEFAULT '[]',
  is_open_to_retainers BOOLEAN DEFAULT true,
  min_project_value NUMERIC(10,2),
  max_concurrent_projects INTEGER DEFAULT 3,
  job_success_score NUMERIC(5,2),
  talent_level freelancer_level DEFAULT 'standard',
  is_verified BOOLEAN DEFAULT false,
  verification_date TIMESTAMPTZ,
  verification_type TEXT,
  connects_balance INTEGER DEFAULT 60,
  connects_last_refreshed_at TIMESTAMPTZ DEFAULT now(),
  profile_completeness INTEGER DEFAULT 0,
  profile_views_count INTEGER DEFAULT 0,
  search_appearances_count INTEGER DEFAULT 0,
  stripe_connect_account_id TEXT,
  stripe_connect_onboarded BOOLEAN DEFAULT false,
  payout_schedule TEXT DEFAULT 'weekly',
  instant_payout_enabled BOOLEAN DEFAULT false,
  video_intro_url TEXT,
  featured_until TIMESTAMPTZ,
  is_accepting_invites BOOLEAN DEFAULT true,
  auto_respond_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 2. PROJECTS TABLE (Enhanced from existing)
-- =============================================
CREATE TABLE IF NOT EXISTS public.marketplace_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  posted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  detailed_scope JSONB,
  category TEXT,
  subcategory TEXT,
  skills_required TEXT[] DEFAULT '{}',
  preferred_skills TEXT[] DEFAULT '{}',
  experience_level TEXT CHECK (experience_level IN ('entry', 'intermediate', 'expert', 'any')),
  project_type TEXT DEFAULT 'one-time' CHECK (project_type IN ('one-time', 'recurring', 'retainer')),
  engagement_type engagement_type DEFAULT 'hourly',
  budget_min NUMERIC(12,2),
  budget_max NUMERIC(12,2),
  budget_currency TEXT DEFAULT 'EUR',
  budget_visibility TEXT DEFAULT 'visible' CHECK (budget_visibility IN ('visible', 'hidden', 'negotiable')),
  estimated_hours INTEGER,
  timeline_weeks INTEGER,
  start_date_target DATE,
  end_date_target DATE,
  remote_policy TEXT DEFAULT 'remote' CHECK (remote_policy IN ('remote', 'hybrid', 'onsite')),
  location_requirement TEXT,
  timezone_requirement TEXT,
  timezone_overlap_hours INTEGER,
  deliverables JSONB DEFAULT '[]',
  success_criteria JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  status project_status DEFAULT 'draft',
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'invite_only', 'private', 'unlisted')),
  priority_level INTEGER DEFAULT 0,
  club_ai_match_enabled BOOLEAN DEFAULT true,
  auto_accept_proposals BOOLEAN DEFAULT false,
  requires_nda BOOLEAN DEFAULT false,
  nda_template_id UUID,
  requires_interview BOOLEAN DEFAULT false,
  requires_portfolio BOOLEAN DEFAULT true,
  screening_questions JSONB DEFAULT '[]',
  max_proposals INTEGER DEFAULT 50,
  proposal_deadline TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  proposal_count INTEGER DEFAULT 0,
  invite_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  boost_level INTEGER DEFAULT 0,
  boost_expires_at TIMESTAMPTZ,
  assigned_freelancer_id UUID REFERENCES public.profiles(id),
  contract_id UUID,
  platform_fee_percentage NUMERIC(5,2) DEFAULT 12.00,
  hourly_markup_percentage NUMERIC(5,2) DEFAULT 0,
  escrow_funded BOOLEAN DEFAULT false,
  escrow_amount NUMERIC(12,2),
  total_spent NUMERIC(12,2) DEFAULT 0,
  ai_match_score NUMERIC(5,2),
  ai_recommendations JSONB,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  closed_reason TEXT
);

-- =============================================
-- 3. PROJECT PROPOSALS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.project_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.marketplace_projects(id) ON DELETE CASCADE,
  freelancer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cover_letter TEXT,
  proposal_type TEXT DEFAULT 'manual' CHECK (proposal_type IN ('club_ai', 'invited', 'manual')),
  proposed_rate NUMERIC(10,2),
  proposed_rate_type TEXT DEFAULT 'hourly' CHECK (proposed_rate_type IN ('hourly', 'fixed', 'milestone')),
  proposed_total NUMERIC(12,2),
  proposed_timeline_weeks INTEGER,
  proposed_start_date DATE,
  proposed_deliverables JSONB DEFAULT '[]',
  proposed_milestones JSONB DEFAULT '[]',
  portfolio_highlights JSONB DEFAULT '[]',
  availability_statement TEXT,
  hours_per_week_available INTEGER,
  relevant_experience JSONB DEFAULT '[]',
  questions_for_client JSONB DEFAULT '[]',
  answers_to_screening JSONB DEFAULT '[]',
  match_score NUMERIC(5,2),
  match_factors JSONB,
  match_explanation TEXT,
  status proposal_status DEFAULT 'draft',
  club_ai_confidence NUMERIC(5,2),
  is_ai_generated BOOLEAN DEFAULT false,
  ai_enhancement_applied BOOLEAN DEFAULT false,
  video_introduction_url TEXT,
  attachments JSONB DEFAULT '[]',
  connects_used INTEGER DEFAULT 0,
  is_boosted BOOLEAN DEFAULT false,
  boost_expires_at TIMESTAMPTZ,
  viewed_by_client_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  client_notes TEXT,
  internal_notes TEXT,
  rejection_reason TEXT,
  rejection_feedback TEXT,
  interview_scheduled_at TIMESTAMPTZ,
  interview_booking_id UUID,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  shortlisted_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  withdrawal_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, freelancer_id)
);

-- =============================================
-- 4. PROJECT CONTRACTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.freelance_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.marketplace_projects(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES public.project_proposals(id),
  client_id UUID NOT NULL REFERENCES public.profiles(id),
  freelancer_id UUID NOT NULL REFERENCES public.profiles(id),
  company_id UUID REFERENCES public.companies(id),
  contract_number TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  engagement_type engagement_type NOT NULL,
  hourly_rate NUMERIC(10,2),
  fixed_price NUMERIC(12,2),
  budget_cap NUMERIC(12,2),
  weekly_hour_limit INTEGER,
  currency TEXT DEFAULT 'EUR',
  platform_fee_percentage NUMERIC(5,2) DEFAULT 12.00,
  hourly_markup_percentage NUMERIC(5,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  auto_renew BOOLEAN DEFAULT false,
  renewal_terms TEXT,
  terms_and_conditions TEXT,
  special_terms JSONB,
  deliverables JSONB DEFAULT '[]',
  payment_schedule TEXT DEFAULT 'weekly' CHECK (payment_schedule IN ('weekly', 'biweekly', 'monthly', 'milestone', 'on_completion')),
  payment_terms_days INTEGER DEFAULT 7,
  requires_timesheet_approval BOOLEAN DEFAULT true,
  auto_approve_after_hours INTEGER DEFAULT 168,
  escrow_required BOOLEAN DEFAULT true,
  escrow_funded BOOLEAN DEFAULT false,
  escrow_amount NUMERIC(12,2) DEFAULT 0,
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_signature', 'active', 'paused', 'completed', 'terminated', 'disputed')),
  client_signed_at TIMESTAMPTZ,
  freelancer_signed_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  pause_reason TEXT,
  completed_at TIMESTAMPTZ,
  terminated_at TIMESTAMPTZ,
  termination_reason TEXT,
  terminated_by UUID REFERENCES public.profiles(id),
  total_hours_worked NUMERIC(10,2) DEFAULT 0,
  total_amount_earned NUMERIC(12,2) DEFAULT 0,
  total_amount_paid NUMERIC(12,2) DEFAULT 0,
  total_platform_fees NUMERIC(12,2) DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  nda_signed BOOLEAN DEFAULT false,
  nda_signed_at TIMESTAMPTZ,
  ip_assignment_signed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 5. PROJECT MILESTONES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.freelance_contracts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.marketplace_projects(id),
  milestone_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  deliverable_description TEXT,
  acceptance_criteria JSONB DEFAULT '[]',
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  due_date DATE,
  estimated_hours NUMERIC(8,2),
  status milestone_status DEFAULT 'pending',
  escrow_funded BOOLEAN DEFAULT false,
  escrow_funded_at TIMESTAMPTZ,
  stripe_payment_intent_id TEXT,
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  submitted_files JSONB DEFAULT '[]',
  submission_notes TEXT,
  revision_count INTEGER DEFAULT 0,
  max_revisions INTEGER DEFAULT 3,
  revision_requests JSONB DEFAULT '[]',
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id),
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  feedback_from_client TEXT,
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  time_spent_hours NUMERIC(8,2),
  is_bonus BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 6. PROJECT REVIEWS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.project_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.marketplace_projects(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES public.freelance_contracts(id) ON DELETE SET NULL,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id),
  reviewee_id UUID NOT NULL REFERENCES public.profiles(id),
  review_type TEXT NOT NULL CHECK (review_type IN ('client_to_freelancer', 'freelancer_to_client')),
  overall_rating NUMERIC(3,2) NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  review_text TEXT,
  communication_rating NUMERIC(3,2) CHECK (communication_rating >= 1 AND communication_rating <= 5),
  quality_rating NUMERIC(3,2) CHECK (quality_rating >= 1 AND quality_rating <= 5),
  expertise_rating NUMERIC(3,2) CHECK (expertise_rating >= 1 AND expertise_rating <= 5),
  professionalism_rating NUMERIC(3,2) CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
  timeliness_rating NUMERIC(3,2) CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
  value_rating NUMERIC(3,2) CHECK (value_rating >= 1 AND value_rating <= 5),
  would_work_again BOOLEAN,
  would_recommend BOOLEAN,
  project_highlights TEXT[] DEFAULT '{}',
  improvement_areas TEXT[] DEFAULT '{}',
  private_feedback TEXT,
  is_public BOOLEAN DEFAULT true,
  visibility_after_days INTEGER DEFAULT 14,
  response_text TEXT,
  response_at TIMESTAMPTZ,
  is_featured BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  reported_count INTEGER DEFAULT 0,
  is_verified_project BOOLEAN DEFAULT true,
  project_value NUMERIC(12,2),
  project_duration_weeks INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contract_id, reviewer_id)
);

-- =============================================
-- 7. PROJECT DISPUTES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.project_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.freelance_contracts(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.project_milestones(id),
  project_id UUID REFERENCES public.marketplace_projects(id),
  raised_by UUID NOT NULL REFERENCES public.profiles(id),
  against_user_id UUID NOT NULL REFERENCES public.profiles(id),
  dispute_type TEXT NOT NULL CHECK (dispute_type IN ('quality', 'non_payment', 'non_delivery', 'scope_creep', 'communication', 'missed_deadline', 'ip_violation', 'fraud', 'other')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence_files JSONB DEFAULT '[]',
  evidence_links JSONB DEFAULT '[]',
  timeline_of_events JSONB DEFAULT '[]',
  requested_outcome TEXT CHECK (requested_outcome IN ('full_refund', 'partial_refund', 'completion', 'mediation', 'termination', 'compensation')),
  requested_amount NUMERIC(12,2),
  amount_in_dispute NUMERIC(12,2),
  status dispute_status DEFAULT 'open',
  escalation_level INTEGER DEFAULT 1,
  escalated_at TIMESTAMPTZ,
  assigned_mediator_id UUID REFERENCES public.profiles(id),
  mediator_notes TEXT,
  resolution_type TEXT CHECK (resolution_type IN ('client_favor', 'freelancer_favor', 'split', 'mutual_agreement', 'no_action', 'policy_violation')),
  resolution_amount NUMERIC(12,2),
  resolution_notes TEXT,
  resolution_accepted_by_raiser BOOLEAN,
  resolution_accepted_by_other BOOLEAN,
  client_response TEXT,
  client_response_at TIMESTAMPTZ,
  freelancer_response TEXT,
  freelancer_response_at TIMESTAMPTZ,
  sla_deadline TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  appeal_deadline TIMESTAMPTZ,
  is_appealed BOOLEAN DEFAULT false,
  appeal_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 8. FREELANCER GIGS TABLE (Fiverr-style)
-- =============================================
CREATE TABLE IF NOT EXISTS public.freelancer_gigs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  tags TEXT[] DEFAULT '{}',
  packages JSONB NOT NULL DEFAULT '[
    {"name": "Basic", "description": "", "price": 0, "delivery_days": 7, "revisions": 1, "features": []},
    {"name": "Standard", "description": "", "price": 0, "delivery_days": 5, "revisions": 2, "features": []},
    {"name": "Premium", "description": "", "price": 0, "delivery_days": 3, "revisions": 3, "features": []}
  ]',
  extras JSONB DEFAULT '[]',
  requirements_form JSONB DEFAULT '[]',
  gallery_images JSONB DEFAULT '[]',
  video_url TEXT,
  faq JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'active', 'paused', 'rejected')),
  rejection_reason TEXT,
  is_featured BOOLEAN DEFAULT false,
  boost_level INTEGER DEFAULT 0,
  boost_expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  avg_rating NUMERIC(3,2),
  review_count INTEGER DEFAULT 0,
  avg_delivery_time_days NUMERIC(5,2),
  response_time_hours NUMERIC(6,2),
  last_order_at TIMESTAMPTZ,
  impressions_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  conversion_rate NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ
);

-- =============================================
-- 9. GIG ORDERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.gig_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE,
  gig_id UUID NOT NULL REFERENCES public.freelancer_gigs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id),
  freelancer_id UUID NOT NULL REFERENCES public.profiles(id),
  package_selected TEXT NOT NULL,
  package_price NUMERIC(10,2) NOT NULL,
  extras_selected JSONB DEFAULT '[]',
  extras_total NUMERIC(10,2) DEFAULT 0,
  subtotal NUMERIC(10,2) NOT NULL,
  platform_fee NUMERIC(10,2) NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  requirements_responses JSONB DEFAULT '{}',
  delivery_deadline TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'delivered', 'revision_requested', 'completed', 'cancelled', 'disputed')),
  revision_count INTEGER DEFAULT 0,
  max_revisions INTEGER,
  delivered_at TIMESTAMPTZ,
  delivery_files JSONB DEFAULT '[]',
  delivery_message TEXT,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES public.profiles(id),
  stripe_payment_intent_id TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'held', 'released', 'refunded', 'disputed')),
  client_rating NUMERIC(3,2),
  client_review TEXT,
  freelancer_rating NUMERIC(3,2),
  freelancer_review TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 10. PROJECT INVITATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.project_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.marketplace_projects(id) ON DELETE CASCADE,
  freelancer_id UUID NOT NULL REFERENCES public.profiles(id),
  invited_by UUID NOT NULL REFERENCES public.profiles(id),
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'accepted', 'declined', 'expired')),
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  decline_reason TEXT,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 11. SAVED FREELANCERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.saved_freelancers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  freelancer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  list_name TEXT DEFAULT 'Saved',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, freelancer_id)
);

-- =============================================
-- 12. PROJECT ACTIVITY LOG TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.project_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.marketplace_projects(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.freelance_contracts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  activity_type TEXT NOT NULL,
  activity_data JSONB,
  is_system_generated BOOLEAN DEFAULT false,
  visibility TEXT DEFAULT 'both' CHECK (visibility IN ('client_only', 'freelancer_only', 'both', 'admin_only')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_freelance_profiles_status ON public.freelance_profiles(freelance_status);
CREATE INDEX IF NOT EXISTS idx_freelance_profiles_categories ON public.freelance_profiles USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_freelance_profiles_talent_level ON public.freelance_profiles(talent_level);
CREATE INDEX IF NOT EXISTS idx_freelance_profiles_hourly_rate ON public.freelance_profiles(hourly_rate_min, hourly_rate_max);

CREATE INDEX IF NOT EXISTS idx_marketplace_projects_status ON public.marketplace_projects(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_projects_category ON public.marketplace_projects(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_projects_company ON public.marketplace_projects(company_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_projects_posted_by ON public.marketplace_projects(posted_by);
CREATE INDEX IF NOT EXISTS idx_marketplace_projects_skills ON public.marketplace_projects USING GIN(skills_required);
CREATE INDEX IF NOT EXISTS idx_marketplace_projects_engagement ON public.marketplace_projects(engagement_type);

CREATE INDEX IF NOT EXISTS idx_project_proposals_project ON public.project_proposals(project_id);
CREATE INDEX IF NOT EXISTS idx_project_proposals_freelancer ON public.project_proposals(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_project_proposals_status ON public.project_proposals(status);

CREATE INDEX IF NOT EXISTS idx_freelance_contracts_project ON public.freelance_contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_freelance_contracts_client ON public.freelance_contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_freelance_contracts_freelancer ON public.freelance_contracts(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_freelance_contracts_status ON public.freelance_contracts(status);

CREATE INDEX IF NOT EXISTS idx_project_milestones_contract ON public.project_milestones(contract_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_status ON public.project_milestones(status);

CREATE INDEX IF NOT EXISTS idx_project_reviews_reviewee ON public.project_reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_project_reviews_contract ON public.project_reviews(contract_id);

CREATE INDEX IF NOT EXISTS idx_project_disputes_contract ON public.project_disputes(contract_id);
CREATE INDEX IF NOT EXISTS idx_project_disputes_status ON public.project_disputes(status);

CREATE INDEX IF NOT EXISTS idx_freelancer_gigs_freelancer ON public.freelancer_gigs(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_gigs_category ON public.freelancer_gigs(category);
CREATE INDEX IF NOT EXISTS idx_freelancer_gigs_status ON public.freelancer_gigs(status);

CREATE INDEX IF NOT EXISTS idx_gig_orders_gig ON public.gig_orders(gig_id);
CREATE INDEX IF NOT EXISTS idx_gig_orders_client ON public.gig_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_gig_orders_freelancer ON public.gig_orders(freelancer_id);

CREATE INDEX IF NOT EXISTS idx_project_activity_log_project ON public.project_activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_log_contract ON public.project_activity_log(contract_id);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.freelance_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelance_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gig_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_freelancers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_activity_log ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES: FREELANCE PROFILES
-- =============================================
CREATE POLICY "Freelance profiles are viewable by authenticated users"
  ON public.freelance_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own freelance profile"
  ON public.freelance_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own freelance profile"
  ON public.freelance_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- =============================================
-- RLS POLICIES: MARKETPLACE PROJECTS
-- =============================================
CREATE POLICY "Public projects viewable by authenticated users"
  ON public.marketplace_projects FOR SELECT
  TO authenticated
  USING (
    visibility = 'public' 
    OR posted_by = auth.uid()
    OR assigned_freelancer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

CREATE POLICY "Users can create projects"
  ON public.marketplace_projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = posted_by);

CREATE POLICY "Project owners can update their projects"
  ON public.marketplace_projects FOR UPDATE
  TO authenticated
  USING (
    posted_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

CREATE POLICY "Project owners can delete their projects"
  ON public.marketplace_projects FOR DELETE
  TO authenticated
  USING (
    posted_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- =============================================
-- RLS POLICIES: PROJECT PROPOSALS
-- =============================================
CREATE POLICY "Freelancers can view their own proposals"
  ON public.project_proposals FOR SELECT
  TO authenticated
  USING (
    freelancer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.marketplace_projects 
      WHERE id = project_id AND posted_by = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

CREATE POLICY "Freelancers can create proposals"
  ON public.project_proposals FOR INSERT
  TO authenticated
  WITH CHECK (freelancer_id = auth.uid());

CREATE POLICY "Proposal owners and project owners can update"
  ON public.project_proposals FOR UPDATE
  TO authenticated
  USING (
    freelancer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.marketplace_projects 
      WHERE id = project_id AND posted_by = auth.uid()
    )
  );

-- =============================================
-- RLS POLICIES: FREELANCE CONTRACTS
-- =============================================
CREATE POLICY "Contract parties can view their contracts"
  ON public.freelance_contracts FOR SELECT
  TO authenticated
  USING (
    client_id = auth.uid()
    OR freelancer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

CREATE POLICY "Clients can create contracts"
  ON public.freelance_contracts FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Contract parties can update their contracts"
  ON public.freelance_contracts FOR UPDATE
  TO authenticated
  USING (
    client_id = auth.uid()
    OR freelancer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- =============================================
-- RLS POLICIES: PROJECT MILESTONES
-- =============================================
CREATE POLICY "Contract parties can view milestones"
  ON public.project_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.freelance_contracts 
      WHERE id = contract_id 
      AND (client_id = auth.uid() OR freelancer_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

CREATE POLICY "Contract parties can manage milestones"
  ON public.project_milestones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.freelance_contracts 
      WHERE id = contract_id 
      AND (client_id = auth.uid() OR freelancer_id = auth.uid())
    )
  );

-- =============================================
-- RLS POLICIES: PROJECT REVIEWS
-- =============================================
CREATE POLICY "Public reviews are viewable by all authenticated users"
  ON public.project_reviews FOR SELECT
  TO authenticated
  USING (
    is_public = true
    OR reviewer_id = auth.uid()
    OR reviewee_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Contract parties can create reviews"
  ON public.project_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.freelance_contracts 
      WHERE id = contract_id 
      AND (client_id = auth.uid() OR freelancer_id = auth.uid())
    )
  );

CREATE POLICY "Reviewees can respond to reviews"
  ON public.project_reviews FOR UPDATE
  TO authenticated
  USING (reviewee_id = auth.uid());

-- =============================================
-- RLS POLICIES: PROJECT DISPUTES
-- =============================================
CREATE POLICY "Dispute parties and admins can view disputes"
  ON public.project_disputes FOR SELECT
  TO authenticated
  USING (
    raised_by = auth.uid()
    OR against_user_id = auth.uid()
    OR assigned_mediator_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
  );

CREATE POLICY "Users can raise disputes"
  ON public.project_disputes FOR INSERT
  TO authenticated
  WITH CHECK (raised_by = auth.uid());

CREATE POLICY "Parties and mediators can update disputes"
  ON public.project_disputes FOR UPDATE
  TO authenticated
  USING (
    raised_by = auth.uid()
    OR against_user_id = auth.uid()
    OR assigned_mediator_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- =============================================
-- RLS POLICIES: FREELANCER GIGS
-- =============================================
CREATE POLICY "Active gigs are publicly viewable"
  ON public.freelancer_gigs FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    OR freelancer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Freelancers can manage their gigs"
  ON public.freelancer_gigs FOR ALL
  TO authenticated
  USING (freelancer_id = auth.uid());

-- =============================================
-- RLS POLICIES: GIG ORDERS
-- =============================================
CREATE POLICY "Order parties can view their orders"
  ON public.gig_orders FOR SELECT
  TO authenticated
  USING (
    client_id = auth.uid()
    OR freelancer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Clients can create orders"
  ON public.gig_orders FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Order parties can update orders"
  ON public.gig_orders FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid() OR freelancer_id = auth.uid());

-- =============================================
-- RLS POLICIES: PROJECT INVITATIONS
-- =============================================
CREATE POLICY "Invitation parties can view invitations"
  ON public.project_invitations FOR SELECT
  TO authenticated
  USING (
    freelancer_id = auth.uid()
    OR invited_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Project owners can create invitations"
  ON public.project_invitations FOR INSERT
  TO authenticated
  WITH CHECK (invited_by = auth.uid());

CREATE POLICY "Freelancers can respond to invitations"
  ON public.project_invitations FOR UPDATE
  TO authenticated
  USING (freelancer_id = auth.uid() OR invited_by = auth.uid());

-- =============================================
-- RLS POLICIES: SAVED FREELANCERS
-- =============================================
CREATE POLICY "Users can manage their saved freelancers"
  ON public.saved_freelancers FOR ALL
  TO authenticated
  USING (client_id = auth.uid());

-- =============================================
-- RLS POLICIES: PROJECT ACTIVITY LOG
-- =============================================
CREATE POLICY "Relevant parties can view activity logs"
  ON public.project_activity_log FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.marketplace_projects 
      WHERE id = project_id 
      AND (posted_by = auth.uid() OR assigned_freelancer_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.freelance_contracts 
      WHERE id = contract_id 
      AND (client_id = auth.uid() OR freelancer_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can create activity logs"
  ON public.project_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_system_generated = true);

-- =============================================
-- ENABLE REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.freelance_contracts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_milestones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_disputes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gig_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_activity_log;

-- =============================================
-- UPDATE TRIGGERS
-- =============================================
CREATE OR REPLACE FUNCTION public.update_freelance_marketplace_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_freelance_profiles_updated_at
  BEFORE UPDATE ON public.freelance_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_freelance_marketplace_updated_at();

CREATE TRIGGER update_marketplace_projects_updated_at
  BEFORE UPDATE ON public.marketplace_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_freelance_marketplace_updated_at();

CREATE TRIGGER update_project_proposals_updated_at
  BEFORE UPDATE ON public.project_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_freelance_marketplace_updated_at();

CREATE TRIGGER update_freelance_contracts_updated_at
  BEFORE UPDATE ON public.freelance_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_freelance_marketplace_updated_at();

CREATE TRIGGER update_project_milestones_updated_at
  BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_freelance_marketplace_updated_at();

CREATE TRIGGER update_project_reviews_updated_at
  BEFORE UPDATE ON public.project_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_freelance_marketplace_updated_at();

CREATE TRIGGER update_project_disputes_updated_at
  BEFORE UPDATE ON public.project_disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_freelance_marketplace_updated_at();

CREATE TRIGGER update_freelancer_gigs_updated_at
  BEFORE UPDATE ON public.freelancer_gigs
  FOR EACH ROW EXECUTE FUNCTION public.update_freelance_marketplace_updated_at();

CREATE TRIGGER update_gig_orders_updated_at
  BEFORE UPDATE ON public.gig_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_freelance_marketplace_updated_at();
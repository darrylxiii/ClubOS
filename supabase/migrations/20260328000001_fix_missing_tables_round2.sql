-- ============================================================
-- ROUND 2: Fix 7 Missing Tables + 19 New Enterprise Tables
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- SECTION A: Fix 7 Missing Tables (referenced by existing code)
-- ════════════════════════════════════════════════════════════

-- A1. booking_links (used by useBookingLinks, useInterviewBookingLinks, BulkSchedulingTab)
CREATE TABLE IF NOT EXISTS public.booking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  buffer_before_minutes INTEGER DEFAULT 0,
  buffer_after_minutes INTEGER DEFAULT 0,
  advance_booking_days INTEGER DEFAULT 60,
  min_notice_hours INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT true,
  color TEXT DEFAULT '#3B82F6',
  scheduling_type TEXT DEFAULT 'one_on_one',
  video_conferencing_provider TEXT,
  video_platform TEXT,
  preferred_video_provider TEXT,
  auto_generate_meeting_link BOOLEAN DEFAULT true,
  auto_record BOOLEAN DEFAULT false,
  allow_waitlist BOOLEAN DEFAULT false,
  single_use BOOLEAN DEFAULT false,
  max_uses INTEGER,
  use_count INTEGER DEFAULT 0,
  requires_approval BOOLEAN DEFAULT false,
  max_bookings_per_day INTEGER,
  host_display_mode TEXT DEFAULT 'name_and_avatar',
  confirmation_message TEXT,
  redirect_url TEXT,
  custom_logo_url TEXT,
  custom_questions JSONB DEFAULT '[]',
  payment_required BOOLEAN DEFAULT false,
  payment_amount NUMERIC(10,2),
  payment_currency TEXT DEFAULT 'EUR',
  primary_calendar_id TEXT,
  team_members TEXT[],
  available_platforms TEXT[],
  allow_guest_platform_choice BOOLEAN DEFAULT false,
  google_meet_settings JSONB,
  guest_permissions JSONB,
  routing_rules JSONB,
  create_quantum_meeting BOOLEAN DEFAULT false,
  enable_club_ai BOOLEAN DEFAULT false,
  share_recording_with_guest BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_booking_links_user ON public.booking_links(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_links_slug ON public.booking_links(slug);
ALTER TABLE public.booking_links ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'booking_links' AND policyname = 'Users manage own booking links') THEN
    CREATE POLICY "Users manage own booking links" ON public.booking_links FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- A2. job_closures (used by ClosedJobs.tsx)
CREATE TABLE IF NOT EXISTS public.job_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  closure_type TEXT NOT NULL CHECK (closure_type IN ('hired', 'not_filled', 'cancelled', 'on_hold')),
  actual_closing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  hired_application_id UUID,
  closed_by UUID REFERENCES auth.users(id),
  closer_name TEXT,
  sourced_by TEXT,
  sourcer_name TEXT,
  sourcer_override_reason TEXT,
  added_by TEXT,
  added_by_name TEXT,
  time_to_fill_days INTEGER,
  actual_salary NUMERIC(12,2),
  estimated_salary_min NUMERIC(12,2),
  estimated_salary_max NUMERIC(12,2),
  salary_variance_percent NUMERIC(5,2),
  placement_fee NUMERIC(12,2),
  loss_reason TEXT,
  total_applicants INTEGER DEFAULT 0,
  candidates_interviewed INTEGER DEFAULT 0,
  candidates_final_round INTEGER DEFAULT 0,
  candidate_quality_rating INTEGER CHECK (candidate_quality_rating BETWEEN 1 AND 5),
  client_responsiveness_rating INTEGER CHECK (client_responsiveness_rating BETWEEN 1 AND 5),
  market_difficulty_rating INTEGER CHECK (market_difficulty_rating BETWEEN 1 AND 5),
  avg_time_per_stage JSONB,
  what_went_well TEXT,
  what_could_improve TEXT,
  key_learnings TEXT[],
  recommendations_for_future TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_job_closures_job ON public.job_closures(job_id);
ALTER TABLE public.job_closures ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_closures' AND policyname = 'Admins manage job closures') THEN
    CREATE POLICY "Admins manage job closures" ON public.job_closures FOR ALL USING (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_closures' AND policyname = 'Partners view job closures') THEN
    CREATE POLICY "Partners view job closures" ON public.job_closures FOR SELECT USING (public.has_role(auth.uid(), 'partner'));
  END IF;
END $$;

-- A3. inventory_categories (used by useInventoryCategories)
CREATE TABLE IF NOT EXISTS public.inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key TEXT NOT NULL UNIQUE,
  category_name TEXT NOT NULL,
  category_name_nl TEXT,
  default_useful_life_years INTEGER NOT NULL DEFAULT 5,
  depreciation_method TEXT NOT NULL DEFAULT 'straight_line',
  description TEXT,
  display_order INTEGER DEFAULT 0,
  kia_eligible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_categories' AND policyname = 'All view inventory categories') THEN
    CREATE POLICY "All view inventory categories" ON public.inventory_categories FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_categories' AND policyname = 'Admins manage inventory categories') THEN
    CREATE POLICY "Admins manage inventory categories" ON public.inventory_categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
INSERT INTO public.inventory_categories (category_key, category_name, category_name_nl, default_useful_life_years, depreciation_method, display_order, kia_eligible) VALUES
  ('it_hardware', 'IT Hardware', 'IT Hardware', 5, 'straight_line', 1, true),
  ('office_furniture', 'Office Furniture', 'Kantoormeubilair', 10, 'straight_line', 2, true),
  ('software_purchased', 'Software (Purchased)', 'Software (Gekocht)', 3, 'straight_line', 3, false),
  ('software_developed', 'Software (Developed)', 'Software (Ontwikkeld)', 5, 'straight_line', 4, false),
  ('vehicles', 'Vehicles', 'Voertuigen', 5, 'straight_line', 5, true),
  ('other', 'Other', 'Overig', 5, 'straight_line', 6, true)
ON CONFLICT (category_key) DO NOTHING;

-- A4. inventory_fiscal_settings
CREATE TABLE IF NOT EXISTS public.inventory_fiscal_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year INTEGER NOT NULL,
  kia_threshold_min NUMERIC(12,2) DEFAULT 2801,
  kia_threshold_max NUMERIC(12,2) DEFAULT 387252,
  kia_percentage NUMERIC(5,2) DEFAULT 28,
  viatica_rate NUMERIC(5,2),
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(fiscal_year, company_id)
);
ALTER TABLE public.inventory_fiscal_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_fiscal_settings' AND policyname = 'Admins manage fiscal settings') THEN
    CREATE POLICY "Admins manage fiscal settings" ON public.inventory_fiscal_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- A5. data_classification_categories
CREATE TABLE IF NOT EXISTS public.data_classification_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  sensitivity_level TEXT NOT NULL CHECK (sensitivity_level IN ('public', 'internal', 'confidential', 'restricted')),
  retention_days INTEGER,
  encryption_required BOOLEAN DEFAULT false,
  access_roles TEXT[] DEFAULT '{admin}',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.data_classification_categories ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'data_classification_categories' AND policyname = 'All view classifications') THEN
    CREATE POLICY "All view classifications" ON public.data_classification_categories FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'data_classification_categories' AND policyname = 'Admins manage classifications') THEN
    CREATE POLICY "Admins manage classifications" ON public.data_classification_categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
INSERT INTO public.data_classification_categories (name, description, sensitivity_level, display_order) VALUES
  ('Public', 'Publicly available information', 'public', 1),
  ('Internal', 'For internal use only', 'internal', 2),
  ('Confidential', 'Restricted business information', 'confidential', 3),
  ('PII', 'Personally identifiable information', 'restricted', 4),
  ('Financial', 'Financial records and data', 'restricted', 5)
ON CONFLICT (name) DO NOTHING;

-- A6. kpi_alert_configs (used by kpi-alerts edge function)
CREATE TABLE IF NOT EXISTS public.kpi_alert_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_name TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT 'general',
  warning_threshold NUMERIC,
  critical_threshold NUMERIC,
  is_lower_better BOOLEAN DEFAULT false,
  notification_channels TEXT[] DEFAULT '{email}',
  is_active BOOLEAN DEFAULT true,
  notify_user_ids UUID[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(kpi_name, domain)
);
ALTER TABLE public.kpi_alert_configs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kpi_alert_configs' AND policyname = 'Admins manage kpi alerts') THEN
    CREATE POLICY "Admins manage kpi alerts" ON public.kpi_alert_configs FOR ALL USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- A7. kpi_targets
CREATE TABLE IF NOT EXISTS public.kpi_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_name TEXT NOT NULL,
  domain TEXT DEFAULT 'general',
  target_value NUMERIC NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_type TEXT DEFAULT 'absolute' CHECK (target_type IN ('absolute', 'percentage', 'ratio')),
  company_id UUID REFERENCES public.companies(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(kpi_name, domain, period_start, company_id)
);
ALTER TABLE public.kpi_targets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kpi_targets' AND policyname = 'Admins manage kpi targets') THEN
    CREATE POLICY "Admins manage kpi targets" ON public.kpi_targets FOR ALL USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════
-- SECTION B: P0 Feature Tables
-- ════════════════════════════════════════════════════════════

-- B1. pipeline_stage_templates (Pipeline Stage Customization)
CREATE TABLE IF NOT EXISTS public.pipeline_stage_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  stages JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  department TEXT,
  company_id UUID REFERENCES public.companies(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.pipeline_stage_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage pipeline templates" ON public.pipeline_stage_templates
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.pipeline_stage_templates (name, description, stages, is_default) VALUES
  ('Standard Hiring', 'Default pipeline for most roles', '[{"name":"Applied","color":"#6B7280"},{"name":"Phone Screen","color":"#3B82F6"},{"name":"Technical Interview","color":"#8B5CF6"},{"name":"Onsite","color":"#F59E0B"},{"name":"Offer","color":"#10B981"},{"name":"Hired","color":"#059669"}]', true),
  ('Executive Search', 'Pipeline for senior/exec roles', '[{"name":"Sourced","color":"#6B7280"},{"name":"Initial Outreach","color":"#3B82F6"},{"name":"Chemistry Check","color":"#8B5CF6"},{"name":"Panel Interview","color":"#F59E0B"},{"name":"Board Review","color":"#EF4444"},{"name":"Offer","color":"#10B981"},{"name":"Hired","color":"#059669"}]', false),
  ('High Volume', 'Streamlined for bulk hiring', '[{"name":"Applied","color":"#6B7280"},{"name":"Screen","color":"#3B82F6"},{"name":"Interview","color":"#F59E0B"},{"name":"Offer","color":"#10B981"},{"name":"Hired","color":"#059669"}]', false)
ON CONFLICT DO NOTHING;

-- B2. offer_acceptance_actions (Offer Management)
CREATE TABLE IF NOT EXISTS public.offer_acceptance_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('viewed', 'accepted', 'declined', 'negotiation_requested', 'signed', 'countered', 'expired')),
  actor_id UUID REFERENCES auth.users(id),
  actor_type TEXT DEFAULT 'candidate' CHECK (actor_type IN ('candidate', 'admin', 'partner', 'system')),
  ip_address INET,
  user_agent TEXT,
  signature_url TEXT,
  counter_offer_data JSONB,
  decline_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_offer_actions_offer ON public.offer_acceptance_actions(offer_id);
ALTER TABLE public.offer_acceptance_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own offer actions" ON public.offer_acceptance_actions
  FOR ALL USING (auth.uid() = actor_id OR public.has_role(auth.uid(), 'admin'));

-- B3. application_stage_history (Time-to-Fill Analytics)
CREATE TABLE IF NOT EXISTS public.application_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL,
  job_id UUID NOT NULL,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  moved_by UUID REFERENCES auth.users(id),
  duration_in_stage_hours NUMERIC,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_stage_history_app ON public.application_stage_history(application_id);
CREATE INDEX idx_stage_history_job ON public.application_stage_history(job_id);
CREATE INDEX idx_stage_history_date ON public.application_stage_history(created_at);
ALTER TABLE public.application_stage_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view stage history" ON public.application_stage_history
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated insert stage history" ON public.application_stage_history
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- B4. recruiter_activity_log (Recruiter Productivity)
CREATE TABLE IF NOT EXISTS public.recruiter_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID NOT NULL REFERENCES auth.users(id),
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'candidate_sourced', 'candidate_screened', 'interview_scheduled',
    'interview_conducted', 'offer_sent', 'placement_made',
    'email_sent', 'call_made', 'note_added', 'stage_moved'
  )),
  entity_type TEXT,
  entity_id UUID,
  job_id UUID,
  company_id UUID REFERENCES public.companies(id),
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_recruiter_activity_user ON public.recruiter_activity_log(recruiter_id, recorded_at);
CREATE INDEX idx_recruiter_activity_type ON public.recruiter_activity_log(activity_type, recorded_at);
ALTER TABLE public.recruiter_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view recruiter activity" ON public.recruiter_activity_log
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own activity" ON public.recruiter_activity_log
  FOR INSERT WITH CHECK (auth.uid() = recruiter_id);

-- B5. source_tracking (Source Effectiveness/ROI)
CREATE TABLE IF NOT EXISTS public.source_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('job_board', 'referral', 'direct', 'agency', 'social', 'event', 'career_page', 'other')),
  cost_per_period NUMERIC(12,2) DEFAULT 0,
  period_start DATE,
  period_end DATE,
  applications_count INTEGER DEFAULT 0,
  hires_count INTEGER DEFAULT 0,
  quality_score NUMERIC(5,2),
  avg_time_to_hire_days INTEGER,
  cost_per_hire NUMERIC(12,2),
  cost_per_application NUMERIC(12,2),
  company_id UUID REFERENCES public.companies(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.source_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage source tracking" ON public.source_tracking
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ════════════════════════════════════════════════════════════
-- SECTION C: P1 Feature Tables
-- ════════════════════════════════════════════════════════════

-- C1. headcount_plans + requisitions
CREATE TABLE IF NOT EXISTS public.headcount_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  quarter INTEGER CHECK (quarter BETWEEN 1 AND 4),
  department TEXT,
  company_id UUID REFERENCES public.companies(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'active', 'closed')),
  total_headcount_planned INTEGER DEFAULT 0,
  total_headcount_actual INTEGER DEFAULT 0,
  budget_planned NUMERIC(12,2),
  budget_actual NUMERIC(12,2),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headcount_plan_id UUID REFERENCES public.headcount_plans(id),
  job_id UUID,
  title TEXT NOT NULL,
  department TEXT,
  level TEXT,
  justification TEXT,
  salary_range_min NUMERIC(12,2),
  salary_range_max NUMERIC(12,2),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'open', 'filled', 'cancelled')),
  target_start_date DATE,
  requested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.headcount_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage headcount plans" ON public.headcount_plans FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage requisitions" ON public.requisitions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- C2. scorecard_question_library
CREATE TABLE IF NOT EXISTS public.scorecard_question_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'behavioral' CHECK (question_type IN ('behavioral', 'technical', 'situational', 'culture_fit', 'leadership', 'custom')),
  competency TEXT,
  difficulty_level TEXT DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  expected_answer_guide TEXT,
  scoring_criteria JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  department TEXT,
  is_global BOOLEAN DEFAULT true,
  company_id UUID REFERENCES public.companies(id),
  created_by UUID REFERENCES auth.users(id),
  usage_count INTEGER DEFAULT 0,
  avg_score NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.scorecard_question_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All view scorecard questions" ON public.scorecard_question_library FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage scorecard questions" ON public.scorecard_question_library FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- C3. email_tracking_events
CREATE TABLE IF NOT EXISTS public.email_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL,
  email_type TEXT,
  recipient_email TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed')),
  link_url TEXT,
  user_agent TEXT,
  ip_address INET,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_email_tracking_message ON public.email_tracking_events(message_id);
CREATE INDEX idx_email_tracking_date ON public.email_tracking_events(recorded_at);
ALTER TABLE public.email_tracking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view email tracking" ON public.email_tracking_events FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- C4. api_keys
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT 'read' CHECK (permissions IN ('read', 'write', 'admin')),
  company_id UUID REFERENCES public.companies(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  rate_limit_per_minute INTEGER DEFAULT 60,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ
);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own api keys" ON public.api_keys FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- C5. job_posting_templates
CREATE TABLE IF NOT EXISTS public.job_posting_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  department TEXT,
  template_data JSONB NOT NULL DEFAULT '{}',
  company_id UUID REFERENCES public.companies(id),
  is_global BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.job_posting_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage job templates" ON public.job_posting_templates FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- C6. ip_allowlist_rules
CREATE TABLE IF NOT EXISTS public.ip_allowlist_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cidr_range CIDR NOT NULL,
  description TEXT,
  applies_to_roles TEXT[] DEFAULT '{admin}',
  is_active BOOLEAN DEFAULT true,
  company_id UUID REFERENCES public.companies(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ip_allowlist_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ip allowlist" ON public.ip_allowlist_rules FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- C7. data_retention_policies + scheduled_data_deletions
CREATE TABLE IF NOT EXISTS public.data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  retention_days INTEGER NOT NULL,
  action TEXT DEFAULT 'delete' CHECK (action IN ('delete', 'anonymize', 'archive')),
  is_active BOOLEAN DEFAULT true,
  conditions JSONB DEFAULT '{}',
  last_executed_at TIMESTAMPTZ,
  records_affected_last_run INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.scheduled_data_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES public.data_retention_policies(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'executing', 'completed', 'failed', 'cancelled')),
  executed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_data_deletions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage retention policies" ON public.data_retention_policies FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage scheduled deletions" ON public.scheduled_data_deletions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- C8. candidate_scheduling_preferences
CREATE TABLE IF NOT EXISTS public.candidate_scheduling_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES auth.users(id),
  application_id UUID,
  booking_link_id UUID REFERENCES public.booking_links(id),
  selected_slot TIMESTAMPTZ,
  timezone TEXT DEFAULT 'Europe/Amsterdam',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'selected', 'confirmed', 'rescheduled', 'cancelled')),
  token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.candidate_scheduling_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Candidates manage own scheduling" ON public.candidate_scheduling_preferences
  FOR ALL USING (auth.uid() = candidate_id OR public.has_role(auth.uid(), 'admin'));

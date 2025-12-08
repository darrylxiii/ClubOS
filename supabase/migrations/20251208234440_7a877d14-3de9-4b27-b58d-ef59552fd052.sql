-- Phase 3-6 Employee Management System Tables

-- Commission Tiers for tiered commission structures
CREATE TABLE IF NOT EXISTS public.commission_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  min_revenue NUMERIC NOT NULL DEFAULT 0,
  max_revenue NUMERIC,
  percentage NUMERIC NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Performance Reviews
CREATE TABLE IF NOT EXISTS public.performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id),
  review_period TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'completed')),
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  strengths TEXT,
  areas_for_improvement TEXT,
  goals TEXT,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1:1 Meeting Notes
CREATE TABLE IF NOT EXISTS public.one_on_one_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES auth.users(id),
  meeting_date DATE NOT NULL,
  agenda TEXT,
  discussion_notes TEXT,
  action_items TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Training Records
CREATE TABLE IF NOT EXISTS public.training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
  training_name TEXT NOT NULL,
  training_type TEXT NOT NULL,
  provider TEXT,
  completion_date DATE,
  expiry_date DATE,
  certificate_url TEXT,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Onboarding Checklists
CREATE TABLE IF NOT EXISTS public.onboarding_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  category TEXT NOT NULL,
  due_date DATE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.commission_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.one_on_one_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_checklists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for commission_tiers (admin only for write, all authenticated can read)
CREATE POLICY "Authenticated users can view commission tiers" ON public.commission_tiers
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage commission tiers" ON public.commission_tiers
  FOR ALL USING (public.has_admin_role(auth.uid()));

-- RLS Policies for performance_reviews
CREATE POLICY "Users can view their own reviews" ON public.performance_reviews
  FOR SELECT USING (
    reviewer_id = auth.uid() OR 
    employee_id IN (SELECT id FROM public.employee_profiles WHERE user_id = auth.uid()) OR
    public.has_admin_role(auth.uid())
  );

CREATE POLICY "Managers and admins can manage reviews" ON public.performance_reviews
  FOR ALL USING (
    reviewer_id = auth.uid() OR 
    public.has_admin_role(auth.uid())
  );

-- RLS Policies for one_on_one_notes
CREATE POLICY "Users can view their own 1:1 notes" ON public.one_on_one_notes
  FOR SELECT USING (
    manager_id = auth.uid() OR 
    employee_id IN (SELECT id FROM public.employee_profiles WHERE user_id = auth.uid()) OR
    public.has_admin_role(auth.uid())
  );

CREATE POLICY "Managers can manage 1:1 notes" ON public.one_on_one_notes
  FOR ALL USING (
    manager_id = auth.uid() OR 
    public.has_admin_role(auth.uid())
  );

-- RLS Policies for training_records
CREATE POLICY "Users can view their own training" ON public.training_records
  FOR SELECT USING (
    employee_id IN (SELECT id FROM public.employee_profiles WHERE user_id = auth.uid()) OR
    public.has_admin_role(auth.uid())
  );

CREATE POLICY "Admins can manage training records" ON public.training_records
  FOR ALL USING (public.has_admin_role(auth.uid()));

-- RLS Policies for onboarding_checklists
CREATE POLICY "Users can view their own onboarding" ON public.onboarding_checklists
  FOR SELECT USING (
    employee_id IN (SELECT id FROM public.employee_profiles WHERE user_id = auth.uid()) OR
    public.has_admin_role(auth.uid())
  );

CREATE POLICY "Users can update their own onboarding items" ON public.onboarding_checklists
  FOR UPDATE USING (
    employee_id IN (SELECT id FROM public.employee_profiles WHERE user_id = auth.uid()) OR
    public.has_admin_role(auth.uid())
  );

CREATE POLICY "Admins can manage onboarding checklists" ON public.onboarding_checklists
  FOR ALL USING (public.has_admin_role(auth.uid()));

-- Default commission tiers
INSERT INTO public.commission_tiers (name, min_revenue, max_revenue, percentage, is_default) VALUES
  ('Starter', 0, 50000, 5, true),
  ('Standard', 50000, 100000, 7.5, false),
  ('Senior', 100000, 200000, 10, false),
  ('Elite', 200000, NULL, 12.5, false)
ON CONFLICT DO NOTHING;
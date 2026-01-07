-- =============================================================================
-- Enterprise Data Integrity Migration - Part 1
-- New tables and seeding with correct schema
-- =============================================================================

-- 1. Company Enrichment Cache Table (if not exists from previous attempt)
CREATE TABLE IF NOT EXISTS public.company_enrichment_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text UNIQUE NOT NULL,
  company_name text,
  description text,
  industry text,
  employee_count text,
  location text,
  linkedin_url text,
  founded_year text,
  logo_url text,
  website text,
  enrichment_source text DEFAULT 'lovable_ai',
  enrichment_data jsonb DEFAULT '{}'::jsonb,
  fetched_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_enrichment_domain ON public.company_enrichment_cache(domain);
CREATE INDEX IF NOT EXISTS idx_company_enrichment_expires ON public.company_enrichment_cache(expires_at);

ALTER TABLE public.company_enrichment_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read company enrichment cache" ON public.company_enrichment_cache;
CREATE POLICY "Anyone can read company enrichment cache"
  ON public.company_enrichment_cache FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert company enrichment" ON public.company_enrichment_cache;
CREATE POLICY "Authenticated users can insert company enrichment"
  ON public.company_enrichment_cache FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update company enrichment" ON public.company_enrichment_cache;
CREATE POLICY "Authenticated users can update company enrichment"
  ON public.company_enrichment_cache FOR UPDATE TO authenticated USING (true);

-- 2. Strategist Assignments Table
CREATE TABLE IF NOT EXISTS public.strategist_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  strategist_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  assignment_type text DEFAULT 'primary',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(partner_id, assignment_type)
);

CREATE INDEX IF NOT EXISTS idx_strategist_assignments_partner ON public.strategist_assignments(partner_id);
CREATE INDEX IF NOT EXISTS idx_strategist_assignments_strategist ON public.strategist_assignments(strategist_id);

ALTER TABLE public.strategist_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partners can view their assignments" ON public.strategist_assignments;
CREATE POLICY "Partners can view their assignments"
  ON public.strategist_assignments FOR SELECT TO authenticated
  USING (partner_id = auth.uid() OR strategist_id = auth.uid());

DROP POLICY IF EXISTS "Strategists can manage assignments" ON public.strategist_assignments;
CREATE POLICY "Strategists can manage assignments"
  ON public.strategist_assignments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist')));

-- 3. Leaderboard Entries Table
CREATE TABLE IF NOT EXISTS public.leaderboard_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  leaderboard_type text NOT NULL,
  period_start date NOT NULL,
  period_end date,
  score integer DEFAULT 0,
  rank integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, leaderboard_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_type_period ON public.leaderboard_entries(leaderboard_type, period_start);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON public.leaderboard_entries(leaderboard_type, rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON public.leaderboard_entries(user_id);

ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view leaderboard" ON public.leaderboard_entries;
CREATE POLICY "Anyone can view leaderboard" ON public.leaderboard_entries FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their leaderboard entries" ON public.leaderboard_entries;
CREATE POLICY "Users can manage their leaderboard entries"
  ON public.leaderboard_entries FOR ALL TO authenticated USING (user_id = auth.uid());

-- 4. Edge Function Registry Table
CREATE TABLE IF NOT EXISTS public.edge_function_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text UNIQUE NOT NULL,
  display_name text,
  description text,
  verify_jwt boolean DEFAULT true,
  category text,
  is_active boolean DEFAULT true,
  last_invoked_at timestamptz,
  invocation_count integer DEFAULT 0,
  avg_execution_time_ms numeric,
  error_rate numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edge_function_name ON public.edge_function_registry(function_name);
CREATE INDEX IF NOT EXISTS idx_edge_function_category ON public.edge_function_registry(category);

ALTER TABLE public.edge_function_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view edge functions" ON public.edge_function_registry;
CREATE POLICY "Admins can view edge functions"
  ON public.edge_function_registry FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can manage edge functions" ON public.edge_function_registry;
CREATE POLICY "Admins can manage edge functions"
  ON public.edge_function_registry FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 5. Seed Career Paths Data (matching existing schema: from_role, to_role, avg_years, salary_range_min, salary_range_max, required_skills)
INSERT INTO public.career_paths (from_role, to_role, avg_years, salary_range_min, salary_range_max, required_skills) VALUES
-- Software Engineering Track
('Software Engineer', 'Senior Software Engineer', 2.5, 75000, 110000, ARRAY['System Design', 'Mentoring', 'Technical Leadership', 'Code Reviews']),
('Senior Software Engineer', 'Staff Engineer', 3, 110000, 160000, ARRAY['Architecture', 'Cross-team Collaboration', 'Technical Vision', 'RFC Writing']),
('Senior Software Engineer', 'Engineering Manager', 2.5, 100000, 150000, ARRAY['People Management', 'Hiring', 'Performance Reviews', 'Project Planning']),
('Staff Engineer', 'Principal Engineer', 4, 140000, 200000, ARRAY['Technical Strategy', 'Innovation', 'Executive Communication', 'Industry Expertise']),
('Engineering Manager', 'Director of Engineering', 4, 130000, 180000, ARRAY['Department Strategy', 'Budget Management', 'Organizational Design', 'Stakeholder Management']),
('Software Engineer', 'Technical Architect', 5, 90000, 140000, ARRAY['System Architecture', 'Cloud Infrastructure', 'Security', 'Scalability']),
-- Product Track
('Software Engineer', 'Product Manager', 3, 80000, 120000, ARRAY['Product Strategy', 'User Research', 'Roadmapping', 'Stakeholder Management']),
('Product Manager', 'Senior Product Manager', 2.5, 95000, 140000, ARRAY['Portfolio Management', 'Market Analysis', 'OKRs', 'P&L Ownership']),
('Senior Product Manager', 'Director of Product', 3.5, 120000, 170000, ARRAY['Product Vision', 'Team Leadership', 'Go-to-Market Strategy', 'Executive Presentation']),
('Product Manager', 'Product Owner', 1.5, 70000, 100000, ARRAY['Agile', 'Backlog Management', 'Sprint Planning', 'User Stories']),
-- Design Track
('UX Designer', 'Senior UX Designer', 2.5, 65000, 95000, ARRAY['Design Systems', 'User Research', 'Prototyping', 'Accessibility']),
('Senior UX Designer', 'Design Lead', 3, 85000, 120000, ARRAY['Team Leadership', 'Design Strategy', 'Cross-functional Collaboration', 'Mentoring']),
('Design Lead', 'Head of Design', 4, 110000, 160000, ARRAY['Design Operations', 'Brand Strategy', 'Executive Communication', 'Hiring']),
('UX Designer', 'Product Designer', 1.5, 60000, 90000, ARRAY['End-to-end Design', 'Interaction Design', 'Visual Design', 'User Testing']),
-- Data Track
('Data Analyst', 'Senior Data Analyst', 2.5, 60000, 90000, ARRAY['Advanced SQL', 'Data Visualization', 'Statistical Analysis', 'Stakeholder Communication']),
('Senior Data Analyst', 'Data Scientist', 2, 80000, 120000, ARRAY['Machine Learning', 'Python', 'Statistical Modeling', 'Experimentation']),
('Data Scientist', 'Senior Data Scientist', 3, 100000, 150000, ARRAY['Deep Learning', 'MLOps', 'Research', 'Technical Leadership']),
('Senior Data Scientist', 'ML Engineer', 2, 110000, 160000, ARRAY['Production ML', 'System Design', 'Model Deployment', 'Infrastructure']),
('Data Analyst', 'Analytics Engineer', 2, 70000, 100000, ARRAY['dbt', 'Data Modeling', 'ETL/ELT', 'Data Warehousing']),
-- Sales Track
('Sales Representative', 'Account Executive', 2, 55000, 85000, ARRAY['Consultative Selling', 'Pipeline Management', 'Negotiation', 'CRM Mastery']),
('Account Executive', 'Senior Account Executive', 2.5, 75000, 120000, ARRAY['Enterprise Sales', 'Complex Deal Management', 'Strategic Planning', 'Executive Relationships']),
('Senior Account Executive', 'Sales Manager', 3, 90000, 140000, ARRAY['Team Leadership', 'Coaching', 'Forecasting', 'Territory Management']),
('Sales Manager', 'Director of Sales', 4, 120000, 180000, ARRAY['Revenue Strategy', 'Organization Building', 'Go-to-Market', 'Board Reporting']),
-- Marketing Track
('Marketing Coordinator', 'Marketing Manager', 2.5, 50000, 75000, ARRAY['Campaign Management', 'Analytics', 'Content Strategy', 'Budget Management']),
('Marketing Manager', 'Senior Marketing Manager', 3, 70000, 100000, ARRAY['Brand Strategy', 'Team Leadership', 'Multi-channel Marketing', 'ROI Optimization']),
('Senior Marketing Manager', 'Head of Marketing', 4, 95000, 140000, ARRAY['Marketing Strategy', 'Revenue Attribution', 'Executive Communication', 'Agency Management']),
('Marketing Manager', 'Growth Manager', 2, 65000, 95000, ARRAY['Experimentation', 'Data Analysis', 'Conversion Optimization', 'Product Marketing']),
-- Finance Track
('Financial Analyst', 'Senior Financial Analyst', 2.5, 55000, 80000, ARRAY['Financial Modeling', 'Forecasting', 'Variance Analysis', 'Presentation Skills']),
('Senior Financial Analyst', 'Finance Manager', 3, 75000, 110000, ARRAY['Team Leadership', 'Strategic Planning', 'Budgeting', 'Process Improvement']),
('Finance Manager', 'Controller', 4, 100000, 150000, ARRAY['Accounting', 'Compliance', 'Financial Reporting', 'Audit Management']),
('Controller', 'CFO', 6, 150000, 250000, ARRAY['Corporate Strategy', 'Capital Markets', 'Board Relations', 'M&A']),
-- HR Track
('HR Coordinator', 'HR Business Partner', 3, 50000, 75000, ARRAY['Employee Relations', 'Policy Development', 'Coaching', 'Employment Law']),
('HR Business Partner', 'Senior HRBP', 3, 70000, 100000, ARRAY['Organizational Development', 'Change Management', 'Leadership Development', 'Workforce Planning']),
('Senior HRBP', 'Head of People', 4, 95000, 140000, ARRAY['People Strategy', 'Culture Building', 'Executive Coaching', 'Total Rewards']),
('Recruiter', 'Senior Recruiter', 2, 50000, 75000, ARRAY['Full-cycle Recruiting', 'Sourcing', 'Employer Branding', 'Hiring Manager Partnership']),
('Senior Recruiter', 'Talent Acquisition Manager', 3, 70000, 100000, ARRAY['Team Leadership', 'Recruiting Strategy', 'Metrics & Analytics', 'Process Optimization']),
-- Consulting Track
('Consultant', 'Senior Consultant', 2.5, 65000, 95000, ARRAY['Client Management', 'Problem Solving', 'Presentation Skills', 'Industry Expertise']),
('Senior Consultant', 'Manager', 3, 90000, 130000, ARRAY['Team Leadership', 'Business Development', 'Project Management', 'Mentoring']),
('Manager', 'Senior Manager', 3, 110000, 160000, ARRAY['Client Relationships', 'Practice Development', 'Thought Leadership', 'Revenue Generation']),
('Senior Manager', 'Partner', 5, 150000, 300000, ARRAY['Business Building', 'Industry Eminence', 'Executive Relationships', 'Firm Leadership']),
-- Operations Track
('Operations Analyst', 'Operations Manager', 3, 50000, 75000, ARRAY['Process Improvement', 'Analytics', 'Project Management', 'Stakeholder Management']),
('Operations Manager', 'Senior Operations Manager', 3, 70000, 100000, ARRAY['Team Leadership', 'Strategic Planning', 'Change Management', 'Budget Management']),
('Senior Operations Manager', 'Director of Operations', 4, 95000, 140000, ARRAY['Operations Strategy', 'Organizational Design', 'Executive Communication', 'P&L Ownership']),
-- Customer Success Track
('Customer Success Manager', 'Senior CSM', 2.5, 55000, 85000, ARRAY['Account Management', 'Customer Health Scoring', 'Upselling', 'Renewal Management']),
('Senior CSM', 'Customer Success Lead', 3, 75000, 110000, ARRAY['Team Leadership', 'Process Development', 'Executive Relationships', 'Revenue Retention']),
('Customer Success Lead', 'VP of Customer Success', 4, 100000, 150000, ARRAY['CS Strategy', 'Organizational Design', 'Customer Experience', 'Executive Leadership']),
-- DevOps Track
('DevOps Engineer', 'Senior DevOps Engineer', 2.5, 75000, 110000, ARRAY['CI/CD', 'Infrastructure as Code', 'Kubernetes', 'Monitoring']),
('Senior DevOps Engineer', 'SRE Lead', 3, 100000, 150000, ARRAY['Reliability Engineering', 'Incident Management', 'SLO/SLI Design', 'Team Leadership']),
('SRE Lead', 'Director of Platform Engineering', 4, 130000, 180000, ARRAY['Platform Strategy', 'Developer Experience', 'Infrastructure Architecture', 'Cost Optimization'])
ON CONFLICT DO NOTHING;

-- 6. Seed Salary Benchmarks (matching schema: role_title, location, experience_years as int4range, salary_min, salary_max, currency, sample_size)
INSERT INTO public.salary_benchmarks (role_title, location, experience_years, salary_min, salary_max, currency, sample_size) VALUES
-- Software Engineering - Amsterdam
('Software Engineer', 'Amsterdam', '[0,2)'::int4range, 45000, 60000, 'EUR', 150),
('Software Engineer', 'Amsterdam', '[2,5)'::int4range, 60000, 80000, 'EUR', 280),
('Software Engineer', 'Amsterdam', '[5,10)'::int4range, 80000, 110000, 'EUR', 320),
('Senior Software Engineer', 'Amsterdam', '[5,15)'::int4range, 90000, 130000, 'EUR', 180),
('Staff Engineer', 'Amsterdam', '[8,20)'::int4range, 120000, 160000, 'EUR', 45),
('Engineering Manager', 'Amsterdam', '[5,15)'::int4range, 100000, 145000, 'EUR', 65),
-- Software Engineering - Rotterdam
('Software Engineer', 'Rotterdam', '[0,2)'::int4range, 42000, 55000, 'EUR', 85),
('Software Engineer', 'Rotterdam', '[2,5)'::int4range, 55000, 75000, 'EUR', 150),
('Software Engineer', 'Rotterdam', '[5,10)'::int4range, 75000, 100000, 'EUR', 120),
('Senior Software Engineer', 'Rotterdam', '[5,15)'::int4range, 85000, 120000, 'EUR', 90),
-- Software Engineering - Utrecht
('Software Engineer', 'Utrecht', '[0,2)'::int4range, 43000, 57000, 'EUR', 95),
('Software Engineer', 'Utrecht', '[2,5)'::int4range, 57000, 77000, 'EUR', 180),
('Software Engineer', 'Utrecht', '[5,10)'::int4range, 77000, 105000, 'EUR', 140),
('Senior Software Engineer', 'Utrecht', '[5,15)'::int4range, 87000, 125000, 'EUR', 75),
-- Software Engineering - Remote (Netherlands)
('Software Engineer', 'Remote (Netherlands)', '[0,2)'::int4range, 44000, 58000, 'EUR', 200),
('Software Engineer', 'Remote (Netherlands)', '[2,5)'::int4range, 58000, 78000, 'EUR', 350),
('Software Engineer', 'Remote (Netherlands)', '[5,10)'::int4range, 78000, 108000, 'EUR', 280),
('Senior Software Engineer', 'Remote (Netherlands)', '[5,15)'::int4range, 88000, 128000, 'EUR', 150),
('Staff Engineer', 'Remote (Netherlands)', '[8,20)'::int4range, 115000, 155000, 'EUR', 55),
-- Software Engineering - Berlin
('Software Engineer', 'Berlin', '[0,2)'::int4range, 48000, 62000, 'EUR', 180),
('Software Engineer', 'Berlin', '[2,5)'::int4range, 62000, 85000, 'EUR', 320),
('Software Engineer', 'Berlin', '[5,10)'::int4range, 85000, 115000, 'EUR', 280),
('Senior Software Engineer', 'Berlin', '[5,15)'::int4range, 95000, 135000, 'EUR', 160),
('Staff Engineer', 'Berlin', '[8,20)'::int4range, 125000, 170000, 'EUR', 50),
-- Software Engineering - London
('Software Engineer', 'London', '[0,2)'::int4range, 55000, 75000, 'GBP', 250),
('Software Engineer', 'London', '[2,5)'::int4range, 75000, 100000, 'GBP', 420),
('Software Engineer', 'London', '[5,10)'::int4range, 100000, 140000, 'GBP', 380),
('Senior Software Engineer', 'London', '[5,15)'::int4range, 110000, 160000, 'GBP', 220),
('Staff Engineer', 'London', '[8,20)'::int4range, 145000, 200000, 'GBP', 80),
-- Product Management
('Product Manager', 'Amsterdam', '[0,2)'::int4range, 55000, 70000, 'EUR', 60),
('Product Manager', 'Amsterdam', '[2,5)'::int4range, 70000, 95000, 'EUR', 120),
('Product Manager', 'Amsterdam', '[5,10)'::int4range, 95000, 130000, 'EUR', 85),
('Senior Product Manager', 'Amsterdam', '[5,15)'::int4range, 100000, 140000, 'EUR', 55),
('Product Manager', 'Berlin', '[2,5)'::int4range, 65000, 90000, 'EUR', 140),
('Product Manager', 'London', '[5,10)'::int4range, 100000, 145000, 'GBP', 180),
-- Design
('Designer', 'Amsterdam', '[0,2)'::int4range, 40000, 52000, 'EUR', 80),
('Designer', 'Amsterdam', '[2,5)'::int4range, 52000, 72000, 'EUR', 150),
('Designer', 'Amsterdam', '[5,10)'::int4range, 72000, 95000, 'EUR', 90),
('UX Designer', 'Amsterdam', '[5,10)'::int4range, 75000, 100000, 'EUR', 70),
('Design Lead', 'Amsterdam', '[8,15)'::int4range, 90000, 120000, 'EUR', 35),
('Designer', 'Berlin', '[2,5)'::int4range, 50000, 70000, 'EUR', 180),
('Designer', 'London', '[5,10)'::int4range, 75000, 105000, 'GBP', 200),
-- Data Science
('Data Scientist', 'Amsterdam', '[0,2)'::int4range, 50000, 65000, 'EUR', 55),
('Data Scientist', 'Amsterdam', '[2,5)'::int4range, 65000, 90000, 'EUR', 120),
('Data Scientist', 'Amsterdam', '[5,10)'::int4range, 90000, 125000, 'EUR', 75),
('Senior Data Scientist', 'Amsterdam', '[5,15)'::int4range, 100000, 140000, 'EUR', 45),
('Data Scientist', 'Berlin', '[2,5)'::int4range, 60000, 85000, 'EUR', 150),
('Data Scientist', 'London', '[5,10)'::int4range, 95000, 135000, 'GBP', 160),
-- Marketing
('Marketing Manager', 'Amsterdam', '[2,5)'::int4range, 55000, 75000, 'EUR', 85),
('Marketing Manager', 'Amsterdam', '[5,10)'::int4range, 75000, 100000, 'EUR', 55),
('Head of Marketing', 'Amsterdam', '[8,15)'::int4range, 100000, 140000, 'EUR', 25),
-- Sales
('Account Executive', 'Amsterdam', '[2,5)'::int4range, 60000, 90000, 'EUR', 90),
('Account Executive', 'Amsterdam', '[5,10)'::int4range, 90000, 130000, 'EUR', 60),
('Sales Manager', 'Amsterdam', '[5,15)'::int4range, 100000, 150000, 'EUR', 35),
-- Customer Success
('Customer Success Manager', 'Amsterdam', '[2,5)'::int4range, 50000, 70000, 'EUR', 75),
('Customer Success Manager', 'Amsterdam', '[5,10)'::int4range, 70000, 95000, 'EUR', 45),
-- DevOps
('DevOps Engineer', 'Amsterdam', '[2,5)'::int4range, 65000, 85000, 'EUR', 100),
('DevOps Engineer', 'Amsterdam', '[5,10)'::int4range, 85000, 115000, 'EUR', 80),
('SRE', 'Amsterdam', '[5,10)'::int4range, 95000, 130000, 'EUR', 40)
ON CONFLICT DO NOTHING;

-- 7. Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS set_updated_at_strategist_assignments ON public.strategist_assignments;
CREATE TRIGGER set_updated_at_strategist_assignments
  BEFORE UPDATE ON public.strategist_assignments
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_leaderboard_entries ON public.leaderboard_entries;
CREATE TRIGGER set_updated_at_leaderboard_entries
  BEFORE UPDATE ON public.leaderboard_entries
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_edge_function_registry ON public.edge_function_registry;
CREATE TRIGGER set_updated_at_edge_function_registry
  BEFORE UPDATE ON public.edge_function_registry
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
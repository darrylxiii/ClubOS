-- Phase 2: Core Features Database Tables

-- Salary Benchmarks table for market data
CREATE TABLE IF NOT EXISTS public.salary_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_title text NOT NULL,
  location text NOT NULL,
  experience_years int4range,
  salary_min numeric,
  salary_max numeric,
  currency text DEFAULT 'EUR',
  sample_size int,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_salary_benchmarks_role ON public.salary_benchmarks(role_title);
CREATE INDEX idx_salary_benchmarks_location ON public.salary_benchmarks(location);

-- Interview Prep Materials table
CREATE TABLE IF NOT EXISTS public.interview_prep_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  material_type text NOT NULL,
  content text NOT NULL,
  role_type text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_interview_prep_company ON public.interview_prep_materials(company_id);

-- Career Paths table
CREATE TABLE IF NOT EXISTS public.career_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_role text NOT NULL,
  to_role text NOT NULL,
  avg_years numeric,
  salary_range_min numeric,
  salary_range_max numeric,
  required_skills text[],
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_career_paths_from ON public.career_paths(from_role);
CREATE INDEX idx_career_paths_to ON public.career_paths(to_role);

-- Enable RLS
ALTER TABLE public.salary_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_prep_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_paths ENABLE ROW LEVEL SECURITY;

-- RLS Policies (public read for all authenticated users)
CREATE POLICY "Anyone can view salary benchmarks"
  ON public.salary_benchmarks FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view interview materials"
  ON public.interview_prep_materials FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view career paths"
  ON public.career_paths FOR SELECT
  USING (true);
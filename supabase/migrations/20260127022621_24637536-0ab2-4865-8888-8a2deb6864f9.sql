-- Phase 2: Add new columns and expand seed data for salary_benchmarks

-- 2.1 Add source, confidence_score, and fetched_at columns
ALTER TABLE public.salary_benchmarks 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'seed' CHECK (source IN ('seed', 'platform', 'external')),
ADD COLUMN IF NOT EXISTS confidence_score numeric(3,2) DEFAULT 0.75 CHECK (confidence_score >= 0 AND confidence_score <= 1),
ADD COLUMN IF NOT EXISTS fetched_at timestamptz DEFAULT now();

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_salary_benchmarks_role_location ON public.salary_benchmarks(role_title, location);
CREATE INDEX IF NOT EXISTS idx_salary_benchmarks_experience ON public.salary_benchmarks USING GIST (experience_years);

-- 2.2 Expand seed data with new locations, roles, and currencies

-- Paris - France (EUR)
INSERT INTO public.salary_benchmarks (role_title, location, experience_years, salary_min, salary_max, currency, sample_size, source, confidence_score) VALUES
('Software Engineer', 'Paris', '[0,2)'::int4range, 42000, 55000, 'EUR', 180, 'seed', 0.85),
('Software Engineer', 'Paris', '[2,5)'::int4range, 55000, 75000, 'EUR', 320, 'seed', 0.90),
('Software Engineer', 'Paris', '[5,10)'::int4range, 75000, 100000, 'EUR', 280, 'seed', 0.88),
('Senior Software Engineer', 'Paris', '[5,15)'::int4range, 85000, 120000, 'EUR', 150, 'seed', 0.82),
('Engineering Manager', 'Paris', '[5,15)'::int4range, 95000, 140000, 'EUR', 75, 'seed', 0.78),
('Product Manager', 'Paris', '[2,5)'::int4range, 55000, 75000, 'EUR', 120, 'seed', 0.80),
('Product Manager', 'Paris', '[5,10)'::int4range, 75000, 110000, 'EUR', 95, 'seed', 0.78),
('Data Scientist', 'Paris', '[2,5)'::int4range, 50000, 70000, 'EUR', 140, 'seed', 0.82),
('Data Scientist', 'Paris', '[5,10)'::int4range, 70000, 100000, 'EUR', 110, 'seed', 0.80),
('Designer', 'Paris', '[2,5)'::int4range, 45000, 65000, 'EUR', 95, 'seed', 0.75);

-- Munich - Germany (EUR)
INSERT INTO public.salary_benchmarks (role_title, location, experience_years, salary_min, salary_max, currency, sample_size, source, confidence_score) VALUES
('Software Engineer', 'Munich', '[0,2)'::int4range, 50000, 65000, 'EUR', 200, 'seed', 0.88),
('Software Engineer', 'Munich', '[2,5)'::int4range, 65000, 85000, 'EUR', 350, 'seed', 0.92),
('Software Engineer', 'Munich', '[5,10)'::int4range, 85000, 115000, 'EUR', 300, 'seed', 0.90),
('Senior Software Engineer', 'Munich', '[5,15)'::int4range, 95000, 135000, 'EUR', 160, 'seed', 0.85),
('Engineering Manager', 'Munich', '[5,15)'::int4range, 105000, 155000, 'EUR', 80, 'seed', 0.80),
('Product Manager', 'Munich', '[2,5)'::int4range, 60000, 80000, 'EUR', 130, 'seed', 0.82),
('Product Manager', 'Munich', '[5,10)'::int4range, 80000, 120000, 'EUR', 100, 'seed', 0.80),
('Data Scientist', 'Munich', '[2,5)'::int4range, 55000, 75000, 'EUR', 150, 'seed', 0.84),
('Data Scientist', 'Munich', '[5,10)'::int4range, 75000, 110000, 'EUR', 120, 'seed', 0.82),
('ML Engineer', 'Munich', '[2,5)'::int4range, 60000, 85000, 'EUR', 90, 'seed', 0.78),
('ML Engineer', 'Munich', '[5,10)'::int4range, 85000, 130000, 'EUR', 70, 'seed', 0.75);

-- Zurich - Switzerland (CHF)
INSERT INTO public.salary_benchmarks (role_title, location, experience_years, salary_min, salary_max, currency, sample_size, source, confidence_score) VALUES
('Software Engineer', 'Zurich', '[0,2)'::int4range, 85000, 110000, 'CHF', 120, 'seed', 0.82),
('Software Engineer', 'Zurich', '[2,5)'::int4range, 110000, 140000, 'CHF', 200, 'seed', 0.88),
('Software Engineer', 'Zurich', '[5,10)'::int4range, 140000, 180000, 'CHF', 180, 'seed', 0.85),
('Senior Software Engineer', 'Zurich', '[5,15)'::int4range, 150000, 200000, 'CHF', 100, 'seed', 0.80),
('Engineering Manager', 'Zurich', '[5,15)'::int4range, 160000, 220000, 'CHF', 50, 'seed', 0.72),
('Product Manager', 'Zurich', '[2,5)'::int4range, 100000, 130000, 'CHF', 80, 'seed', 0.75),
('Product Manager', 'Zurich', '[5,10)'::int4range, 130000, 170000, 'CHF', 60, 'seed', 0.72),
('Data Scientist', 'Zurich', '[2,5)'::int4range, 95000, 125000, 'CHF', 90, 'seed', 0.78),
('Data Scientist', 'Zurich', '[5,10)'::int4range, 125000, 165000, 'CHF', 70, 'seed', 0.75);

-- Dublin - Ireland (EUR)
INSERT INTO public.salary_benchmarks (role_title, location, experience_years, salary_min, salary_max, currency, sample_size, source, confidence_score) VALUES
('Software Engineer', 'Dublin', '[0,2)'::int4range, 45000, 60000, 'EUR', 170, 'seed', 0.85),
('Software Engineer', 'Dublin', '[2,5)'::int4range, 60000, 85000, 'EUR', 300, 'seed', 0.90),
('Software Engineer', 'Dublin', '[5,10)'::int4range, 85000, 120000, 'EUR', 250, 'seed', 0.88),
('Senior Software Engineer', 'Dublin', '[5,15)'::int4range, 100000, 145000, 'EUR', 130, 'seed', 0.82),
('Engineering Manager', 'Dublin', '[5,15)'::int4range, 110000, 160000, 'EUR', 60, 'seed', 0.75),
('Product Manager', 'Dublin', '[2,5)'::int4range, 55000, 75000, 'EUR', 110, 'seed', 0.80),
('Product Manager', 'Dublin', '[5,10)'::int4range, 75000, 110000, 'EUR', 85, 'seed', 0.78),
('Data Scientist', 'Dublin', '[2,5)'::int4range, 55000, 75000, 'EUR', 120, 'seed', 0.82),
('Data Scientist', 'Dublin', '[5,10)'::int4range, 75000, 110000, 'EUR', 95, 'seed', 0.80);

-- Barcelona - Spain (EUR)
INSERT INTO public.salary_benchmarks (role_title, location, experience_years, salary_min, salary_max, currency, sample_size, source, confidence_score) VALUES
('Software Engineer', 'Barcelona', '[0,2)'::int4range, 32000, 42000, 'EUR', 200, 'seed', 0.88),
('Software Engineer', 'Barcelona', '[2,5)'::int4range, 42000, 58000, 'EUR', 350, 'seed', 0.92),
('Software Engineer', 'Barcelona', '[5,10)'::int4range, 58000, 80000, 'EUR', 280, 'seed', 0.88),
('Senior Software Engineer', 'Barcelona', '[5,15)'::int4range, 70000, 100000, 'EUR', 140, 'seed', 0.82),
('Engineering Manager', 'Barcelona', '[5,15)'::int4range, 75000, 110000, 'EUR', 55, 'seed', 0.72),
('Product Manager', 'Barcelona', '[2,5)'::int4range, 40000, 55000, 'EUR', 100, 'seed', 0.78),
('Product Manager', 'Barcelona', '[5,10)'::int4range, 55000, 80000, 'EUR', 75, 'seed', 0.75),
('Designer', 'Barcelona', '[2,5)'::int4range, 35000, 50000, 'EUR', 120, 'seed', 0.80),
('Designer', 'Barcelona', '[5,10)'::int4range, 50000, 72000, 'EUR', 90, 'seed', 0.78);

-- Stockholm - Sweden (SEK)
INSERT INTO public.salary_benchmarks (role_title, location, experience_years, salary_min, salary_max, currency, sample_size, source, confidence_score) VALUES
('Software Engineer', 'Stockholm', '[0,2)'::int4range, 420000, 520000, 'SEK', 150, 'seed', 0.85),
('Software Engineer', 'Stockholm', '[2,5)'::int4range, 520000, 680000, 'SEK', 280, 'seed', 0.90),
('Software Engineer', 'Stockholm', '[5,10)'::int4range, 680000, 900000, 'SEK', 220, 'seed', 0.85),
('Senior Software Engineer', 'Stockholm', '[5,15)'::int4range, 780000, 1050000, 'SEK', 120, 'seed', 0.80),
('Engineering Manager', 'Stockholm', '[5,15)'::int4range, 850000, 1200000, 'SEK', 55, 'seed', 0.72),
('Product Manager', 'Stockholm', '[2,5)'::int4range, 480000, 620000, 'SEK', 95, 'seed', 0.78),
('Product Manager', 'Stockholm', '[5,10)'::int4range, 620000, 850000, 'SEK', 70, 'seed', 0.75);

-- Copenhagen - Denmark (DKK)
INSERT INTO public.salary_benchmarks (role_title, location, experience_years, salary_min, salary_max, currency, sample_size, source, confidence_score) VALUES
('Software Engineer', 'Copenhagen', '[0,2)'::int4range, 380000, 480000, 'DKK', 130, 'seed', 0.82),
('Software Engineer', 'Copenhagen', '[2,5)'::int4range, 480000, 620000, 'DKK', 240, 'seed', 0.88),
('Software Engineer', 'Copenhagen', '[5,10)'::int4range, 620000, 820000, 'DKK', 200, 'seed', 0.85),
('Senior Software Engineer', 'Copenhagen', '[5,15)'::int4range, 720000, 950000, 'DKK', 100, 'seed', 0.78),
('Engineering Manager', 'Copenhagen', '[5,15)'::int4range, 800000, 1100000, 'DKK', 45, 'seed', 0.70),
('Product Manager', 'Copenhagen', '[2,5)'::int4range, 450000, 580000, 'DKK', 85, 'seed', 0.75),
('Product Manager', 'Copenhagen', '[5,10)'::int4range, 580000, 780000, 'DKK', 60, 'seed', 0.72);

-- Warsaw - Poland (PLN)
INSERT INTO public.salary_benchmarks (role_title, location, experience_years, salary_min, salary_max, currency, sample_size, source, confidence_score) VALUES
('Software Engineer', 'Warsaw', '[0,2)'::int4range, 8000, 14000, 'PLN', 180, 'seed', 0.88),
('Software Engineer', 'Warsaw', '[2,5)'::int4range, 14000, 22000, 'PLN', 320, 'seed', 0.92),
('Software Engineer', 'Warsaw', '[5,10)'::int4range, 22000, 35000, 'PLN', 250, 'seed', 0.88),
('Senior Software Engineer', 'Warsaw', '[5,15)'::int4range, 28000, 45000, 'PLN', 130, 'seed', 0.82),
('Engineering Manager', 'Warsaw', '[5,15)'::int4range, 32000, 52000, 'PLN', 55, 'seed', 0.72),
('Product Manager', 'Warsaw', '[2,5)'::int4range, 12000, 18000, 'PLN', 100, 'seed', 0.78),
('Product Manager', 'Warsaw', '[5,10)'::int4range, 18000, 30000, 'PLN', 75, 'seed', 0.75);

-- Vienna - Austria (EUR)
INSERT INTO public.salary_benchmarks (role_title, location, experience_years, salary_min, salary_max, currency, sample_size, source, confidence_score) VALUES
('Software Engineer', 'Vienna', '[0,2)'::int4range, 42000, 55000, 'EUR', 140, 'seed', 0.82),
('Software Engineer', 'Vienna', '[2,5)'::int4range, 55000, 72000, 'EUR', 260, 'seed', 0.88),
('Software Engineer', 'Vienna', '[5,10)'::int4range, 72000, 95000, 'EUR', 200, 'seed', 0.85),
('Senior Software Engineer', 'Vienna', '[5,15)'::int4range, 85000, 115000, 'EUR', 100, 'seed', 0.78),
('Engineering Manager', 'Vienna', '[5,15)'::int4range, 95000, 135000, 'EUR', 45, 'seed', 0.70);

-- Milan - Italy (EUR)
INSERT INTO public.salary_benchmarks (role_title, location, experience_years, salary_min, salary_max, currency, sample_size, source, confidence_score) VALUES
('Software Engineer', 'Milan', '[0,2)'::int4range, 32000, 42000, 'EUR', 160, 'seed', 0.85),
('Software Engineer', 'Milan', '[2,5)'::int4range, 42000, 58000, 'EUR', 300, 'seed', 0.90),
('Software Engineer', 'Milan', '[5,10)'::int4range, 58000, 78000, 'EUR', 240, 'seed', 0.85),
('Senior Software Engineer', 'Milan', '[5,15)'::int4range, 68000, 95000, 'EUR', 120, 'seed', 0.80),
('Engineering Manager', 'Milan', '[5,15)'::int4range, 75000, 110000, 'EUR', 50, 'seed', 0.72);

-- New Roles - Amsterdam (additional)
INSERT INTO public.salary_benchmarks (role_title, location, experience_years, salary_min, salary_max, currency, sample_size, source, confidence_score) VALUES
('Backend Engineer', 'Amsterdam', '[0,2)'::int4range, 48000, 62000, 'EUR', 140, 'seed', 0.82),
('Backend Engineer', 'Amsterdam', '[2,5)'::int4range, 62000, 85000, 'EUR', 260, 'seed', 0.88),
('Backend Engineer', 'Amsterdam', '[5,10)'::int4range, 85000, 115000, 'EUR', 200, 'seed', 0.85),
('Frontend Engineer', 'Amsterdam', '[0,2)'::int4range, 45000, 58000, 'EUR', 130, 'seed', 0.80),
('Frontend Engineer', 'Amsterdam', '[2,5)'::int4range, 58000, 78000, 'EUR', 240, 'seed', 0.85),
('Frontend Engineer', 'Amsterdam', '[5,10)'::int4range, 78000, 105000, 'EUR', 180, 'seed', 0.82),
('Fullstack Engineer', 'Amsterdam', '[0,2)'::int4range, 47000, 60000, 'EUR', 120, 'seed', 0.78),
('Fullstack Engineer', 'Amsterdam', '[2,5)'::int4range, 60000, 82000, 'EUR', 220, 'seed', 0.85),
('Fullstack Engineer', 'Amsterdam', '[5,10)'::int4range, 82000, 112000, 'EUR', 170, 'seed', 0.82),
('ML Engineer', 'Amsterdam', '[2,5)'::int4range, 65000, 90000, 'EUR', 80, 'seed', 0.75),
('ML Engineer', 'Amsterdam', '[5,10)'::int4range, 90000, 130000, 'EUR', 55, 'seed', 0.70),
('AI Engineer', 'Amsterdam', '[2,5)'::int4range, 70000, 95000, 'EUR', 60, 'seed', 0.72),
('AI Engineer', 'Amsterdam', '[5,10)'::int4range, 95000, 140000, 'EUR', 40, 'seed', 0.68),
('Platform Engineer', 'Amsterdam', '[2,5)'::int4range, 62000, 85000, 'EUR', 90, 'seed', 0.78),
('Platform Engineer', 'Amsterdam', '[5,10)'::int4range, 85000, 120000, 'EUR', 65, 'seed', 0.75),
('VP of Engineering', 'Amsterdam', '[10,20)'::int4range, 150000, 220000, 'EUR', 25, 'seed', 0.65),
('CTO', 'Amsterdam', '[10,20)'::int4range, 180000, 280000, 'EUR', 15, 'seed', 0.55),
('Head of Product', 'Amsterdam', '[8,15)'::int4range, 130000, 180000, 'EUR', 35, 'seed', 0.68),
('Chief Product Officer', 'Amsterdam', '[10,20)'::int4range, 170000, 250000, 'EUR', 12, 'seed', 0.52),
('UX Researcher', 'Amsterdam', '[2,5)'::int4range, 50000, 70000, 'EUR', 75, 'seed', 0.75),
('UX Researcher', 'Amsterdam', '[5,10)'::int4range, 70000, 95000, 'EUR', 50, 'seed', 0.70),
('Design Director', 'Amsterdam', '[8,15)'::int4range, 100000, 145000, 'EUR', 30, 'seed', 0.65),
('HR Business Partner', 'Amsterdam', '[2,5)'::int4range, 55000, 72000, 'EUR', 65, 'seed', 0.72),
('HR Business Partner', 'Amsterdam', '[5,10)'::int4range, 72000, 95000, 'EUR', 45, 'seed', 0.68),
('Head of People', 'Amsterdam', '[8,15)'::int4range, 110000, 155000, 'EUR', 28, 'seed', 0.62);

-- London - UK (GBP, new addition)
INSERT INTO public.salary_benchmarks (role_title, location, experience_years, salary_min, salary_max, currency, sample_size, source, confidence_score) VALUES
('Software Engineer', 'London', '[0,2)'::int4range, 40000, 55000, 'GBP', 250, 'seed', 0.90),
('Software Engineer', 'London', '[2,5)'::int4range, 55000, 80000, 'GBP', 450, 'seed', 0.95),
('Software Engineer', 'London', '[5,10)'::int4range, 80000, 120000, 'GBP', 380, 'seed', 0.92),
('Senior Software Engineer', 'London', '[5,15)'::int4range, 95000, 145000, 'GBP', 200, 'seed', 0.88),
('Engineering Manager', 'London', '[5,15)'::int4range, 110000, 165000, 'GBP', 95, 'seed', 0.82),
('Product Manager', 'London', '[2,5)'::int4range, 55000, 75000, 'GBP', 150, 'seed', 0.85),
('Product Manager', 'London', '[5,10)'::int4range, 75000, 115000, 'GBP', 120, 'seed', 0.82),
('Data Scientist', 'London', '[2,5)'::int4range, 55000, 80000, 'GBP', 170, 'seed', 0.85),
('Data Scientist', 'London', '[5,10)'::int4range, 80000, 120000, 'GBP', 130, 'seed', 0.82),
('Designer', 'London', '[2,5)'::int4range, 45000, 65000, 'GBP', 110, 'seed', 0.80),
('Designer', 'London', '[5,10)'::int4range, 65000, 95000, 'GBP', 85, 'seed', 0.78),
('VP of Engineering', 'London', '[10,20)'::int4range, 160000, 240000, 'GBP', 35, 'seed', 0.70),
('CTO', 'London', '[10,20)'::int4range, 200000, 350000, 'GBP', 20, 'seed', 0.60);

-- Update existing records to have source and confidence_score
UPDATE public.salary_benchmarks 
SET source = 'seed', confidence_score = 0.80 
WHERE source IS NULL;
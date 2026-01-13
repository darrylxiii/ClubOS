-- Create companies table for Quantum Club member companies
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  cover_image_url TEXT,
  tagline TEXT,
  description TEXT,
  founded_year INTEGER,
  company_size TEXT,
  industry TEXT,
  headquarters_location TEXT,
  website_url TEXT,
  linkedin_url TEXT,
  twitter_url TEXT,
  
  -- Company details
  mission TEXT,
  vision TEXT,
  values JSONB DEFAULT '[]'::jsonb,
  culture_highlights JSONB DEFAULT '[]'::jsonb,
  benefits JSONB DEFAULT '[]'::jsonb,
  tech_stack JSONB DEFAULT '[]'::jsonb,
  
  -- Contact info
  careers_email TEXT,
  careers_page_url TEXT,
  
  -- Member status
  is_active BOOLEAN NOT NULL DEFAULT true,
  member_since DATE,
  membership_tier TEXT DEFAULT 'standard',
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view active companies
CREATE POLICY "Active companies are viewable by everyone"
ON public.companies
FOR SELECT
USING (is_active = true);

-- Only admins can manage companies
CREATE POLICY "Admins can manage companies"
ON public.companies
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_companies_slug ON public.companies(slug);
CREATE INDEX idx_companies_is_active ON public.companies(is_active);
CREATE INDEX idx_companies_industry ON public.companies(industry);
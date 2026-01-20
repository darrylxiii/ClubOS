-- Create partner requests table
CREATE TABLE public.partner_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Contact Information
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  website TEXT,
  linkedin_url TEXT,
  
  -- Company Details
  industry TEXT NOT NULL,
  company_size TEXT NOT NULL,
  headquarters_location TEXT,
  
  -- Partnership Details
  partnership_type TEXT NOT NULL,
  estimated_roles_per_year INTEGER,
  budget_range TEXT,
  timeline TEXT,
  description TEXT NOT NULL,
  
  -- Compliance
  agreed_no_cure_no_pay BOOLEAN NOT NULL DEFAULT false,
  agreed_privacy BOOLEAN NOT NULL DEFAULT false,
  agreed_nda BOOLEAN,
  
  -- Tracking
  status TEXT NOT NULL DEFAULT 'pending',
  source_channel TEXT,
  session_id TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- Analytics
  steps_completed INTEGER NOT NULL DEFAULT 0,
  time_to_complete_seconds INTEGER,
  last_step_viewed TEXT,
  
  -- Admin
  assigned_to UUID REFERENCES auth.users(id),
  notes TEXT,
  followed_up_at TIMESTAMP WITH TIME ZONE
);

-- Create funnel analytics tracking table
CREATE TABLE public.funnel_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  session_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  action TEXT NOT NULL, -- 'view', 'complete', 'abandon'
  
  -- Tracking
  source_channel TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  user_agent TEXT,
  
  -- Timing
  time_on_step_seconds INTEGER
);

-- Create funnel configuration table
CREATE TABLE public.funnel_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  custom_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  social_proof_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  live_stats JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Insert default funnel config
INSERT INTO public.funnel_config (is_active, social_proof_items, live_stats) 
VALUES (
  true,
  '[
    {"company": "TechCorp", "logo": "/placeholder.svg", "testimonial": "The Quantum Club delivered 3 perfect hires in 2 months"},
    {"company": "InnovateCo", "logo": "/placeholder.svg", "testimonial": "Best recruitment partner we have ever worked with"},
    {"company": "FutureLabs", "logo": "/placeholder.svg", "testimonial": "Response time under 24h, quality candidates every time"}
  ]'::jsonb,
  '{"partnerships_this_month": 26, "avg_response_hours": 48, "active_roles": 87}'::jsonb
);

-- Enable RLS
ALTER TABLE public.partner_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partner_requests
CREATE POLICY "Anyone can create partner requests"
ON public.partner_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins and partners can view all requests"
ON public.partner_requests
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'partner'::app_role)
);

CREATE POLICY "Admins and partners can update requests"
ON public.partner_requests
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'partner'::app_role)
);

-- RLS Policies for funnel_analytics
CREATE POLICY "Anyone can create analytics events"
ON public.funnel_analytics
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins and partners can view analytics"
ON public.funnel_analytics
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'partner'::app_role)
);

-- RLS Policies for funnel_config
CREATE POLICY "Anyone can view funnel config"
ON public.funnel_config
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can manage funnel config"
ON public.funnel_config
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_partner_requests_created_at ON public.partner_requests(created_at DESC);
CREATE INDEX idx_partner_requests_status ON public.partner_requests(status);
CREATE INDEX idx_partner_requests_source_channel ON public.partner_requests(source_channel);
CREATE INDEX idx_funnel_analytics_session_id ON public.funnel_analytics(session_id);
CREATE INDEX idx_funnel_analytics_created_at ON public.funnel_analytics(created_at DESC);
CREATE INDEX idx_funnel_analytics_step_name ON public.funnel_analytics(step_name);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_partner_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_partner_requests_timestamp
BEFORE UPDATE ON public.partner_requests
FOR EACH ROW
EXECUTE FUNCTION update_partner_requests_updated_at();
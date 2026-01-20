-- Company Contacts table: stores all contacts for companies (manual, auto-detected, registered users)
CREATE TABLE IF NOT EXISTS public.company_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT, -- e.g., "CEO", "HR Manager", "Account Manager"
  phone TEXT,
  is_primary BOOLEAN DEFAULT false,
  source TEXT DEFAULT 'manual', -- 'manual', 'auto_detected', 'profile'
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Link if this is a registered user
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, email)
);

-- Company Domains table: stores domains for matching emails to companies
CREATE TABLE IF NOT EXISTS public.company_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false, -- Block generic domains like gmail.com
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(domain)
);

-- Email Contact Matches table: links emails to companies and contacts
CREATE TABLE IF NOT EXISTS public.email_contact_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_address TEXT NOT NULL, -- The actual email address matched
  message_id TEXT, -- External reference to email
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.company_contacts(id) ON DELETE SET NULL,
  match_type TEXT NOT NULL, -- 'domain', 'exact_email', 'profile'
  match_confidence NUMERIC(3,2) DEFAULT 1.0, -- 0.0-1.0
  direction TEXT NOT NULL, -- 'inbound', 'outbound'
  subject TEXT,
  sentiment_score NUMERIC(3,2), -- -1.0 to 1.0
  sentiment_label TEXT, -- 'positive', 'neutral', 'negative'
  analyzed_at TIMESTAMPTZ,
  email_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Company Email Sentiment aggregation table
CREATE TABLE IF NOT EXISTS public.company_email_sentiment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  total_emails INTEGER DEFAULT 0,
  inbound_count INTEGER DEFAULT 0,
  outbound_count INTEGER DEFAULT 0,
  avg_sentiment_score NUMERIC(3,2) DEFAULT 0, -- -1.0 to 1.0
  sentiment_breakdown JSONB DEFAULT '{"positive": 0, "neutral": 0, "negative": 0}'::jsonb,
  last_email_at TIMESTAMPTZ,
  last_inbound_at TIMESTAMPTZ,
  last_outbound_at TIMESTAMPTZ,
  response_rate NUMERIC(3,2) DEFAULT 0,
  avg_response_time_hours INTEGER DEFAULT 0,
  health_score INTEGER DEFAULT 50, -- 0-100 composite score
  health_status TEXT DEFAULT 'unknown', -- 'excellent', 'good', 'at_risk', 'critical'
  top_topics JSONB DEFAULT '[]'::jsonb,
  sentiment_trend TEXT DEFAULT 'stable', -- 'improving', 'stable', 'declining'
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Contact Email Sentiment per-person aggregation
CREATE TABLE IF NOT EXISTS public.contact_email_sentiment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.company_contacts(id) ON DELETE CASCADE UNIQUE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  total_emails INTEGER DEFAULT 0,
  inbound_count INTEGER DEFAULT 0,
  outbound_count INTEGER DEFAULT 0,
  avg_sentiment_score NUMERIC(3,2) DEFAULT 0,
  sentiment_trend TEXT DEFAULT 'stable', -- 'improving', 'stable', 'declining'
  last_email_at TIMESTAMPTZ,
  last_sentiment TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.company_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_contact_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_email_sentiment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_email_sentiment ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_contacts
CREATE POLICY "Admins and strategists can view all company contacts"
ON public.company_contacts FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
);

CREATE POLICY "Admins and strategists can manage company contacts"
ON public.company_contacts FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
);

-- RLS Policies for company_domains
CREATE POLICY "Admins and strategists can view all company domains"
ON public.company_domains FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
);

CREATE POLICY "Admins and strategists can manage company domains"
ON public.company_domains FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
);

-- RLS Policies for email_contact_matches
CREATE POLICY "Admins and strategists can view email matches"
ON public.email_contact_matches FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
);

CREATE POLICY "Admins and strategists can manage email matches"
ON public.email_contact_matches FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
);

-- RLS Policies for company_email_sentiment
CREATE POLICY "Admins and strategists can view company sentiment"
ON public.company_email_sentiment FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
);

CREATE POLICY "Admins and strategists can manage company sentiment"
ON public.company_email_sentiment FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
);

-- RLS Policies for contact_email_sentiment
CREATE POLICY "Admins and strategists can view contact sentiment"
ON public.contact_email_sentiment FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
);

CREATE POLICY "Admins and strategists can manage contact sentiment"
ON public.contact_email_sentiment FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'strategist'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_contacts_company_id ON public.company_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_company_contacts_email ON public.company_contacts(email);
CREATE INDEX IF NOT EXISTS idx_company_contacts_profile_id ON public.company_contacts(profile_id);
CREATE INDEX IF NOT EXISTS idx_company_domains_company_id ON public.company_domains(company_id);
CREATE INDEX IF NOT EXISTS idx_company_domains_domain ON public.company_domains(domain);
CREATE INDEX IF NOT EXISTS idx_email_contact_matches_company_id ON public.email_contact_matches(company_id);
CREATE INDEX IF NOT EXISTS idx_email_contact_matches_contact_id ON public.email_contact_matches(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_contact_matches_email_address ON public.email_contact_matches(email_address);
CREATE INDEX IF NOT EXISTS idx_company_email_sentiment_company_id ON public.company_email_sentiment(company_id);
CREATE INDEX IF NOT EXISTS idx_contact_email_sentiment_contact_id ON public.contact_email_sentiment(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_email_sentiment_company_id ON public.contact_email_sentiment(company_id);

-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_email_sentiment;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_email_sentiment;
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_contact_matches;

-- Trigger for updated_at on company_contacts
CREATE OR REPLACE FUNCTION update_company_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_company_contacts_updated_at
BEFORE UPDATE ON public.company_contacts
FOR EACH ROW EXECUTE FUNCTION update_company_contacts_updated_at();

-- Trigger for updated_at on company_email_sentiment
CREATE TRIGGER update_company_email_sentiment_updated_at
BEFORE UPDATE ON public.company_email_sentiment
FOR EACH ROW EXECUTE FUNCTION update_company_contacts_updated_at();

-- Trigger for updated_at on contact_email_sentiment
CREATE TRIGGER update_contact_email_sentiment_updated_at
BEFORE UPDATE ON public.contact_email_sentiment
FOR EACH ROW EXECUTE FUNCTION update_company_contacts_updated_at();
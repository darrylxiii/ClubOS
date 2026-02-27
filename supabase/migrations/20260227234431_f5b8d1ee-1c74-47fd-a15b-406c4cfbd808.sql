
-- Financial Commentaries table for QUIN AI-generated narratives
CREATE TABLE public.financial_commentaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quarter TEXT NOT NULL,
  year INTEGER NOT NULL,
  narrative TEXT NOT NULL,
  financial_data JSONB,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_commentaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and strategists can manage financial commentaries"
  ON public.financial_commentaries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

CREATE INDEX idx_financial_commentaries_year_quarter
  ON public.financial_commentaries (year, quarter);

-- Investor Access Codes table for live portal invite-code access
CREATE TABLE public.investor_access_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code_hash TEXT NOT NULL,
  label TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.investor_access_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage investor access codes"
  ON public.investor_access_codes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Public read for code verification (hash lookup by edge function using service role)
CREATE POLICY "Anyone can verify active access codes"
  ON public.investor_access_codes FOR SELECT
  USING (is_active = true AND expires_at > now());

CREATE INDEX idx_investor_access_codes_hash
  ON public.investor_access_codes (code_hash);

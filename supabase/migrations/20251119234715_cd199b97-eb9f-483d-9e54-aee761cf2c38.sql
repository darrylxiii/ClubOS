-- Phase 1.1: Enterprise Security & Privacy (Fixed)
-- Current-Employer Protection, Dossier Security, Field-Level Consent, Ghost Mode

-- Helper function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role::text = _role
  )
$$;

-- ============================================
-- A. BLOCKED DOMAINS (Current-Employer Protection)
-- ============================================
CREATE TABLE IF NOT EXISTS public.blocked_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  domain TEXT NOT NULL, -- e.g., "acme.com", "bigcorp.io"
  reason TEXT, -- Optional: why they blocked this company
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_blocked_domains_user_id ON public.blocked_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_domains_domain ON public.blocked_domains(domain);

-- RLS for blocked_domains
ALTER TABLE public.blocked_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own blocked domains" ON public.blocked_domains;
CREATE POLICY "Users can view their own blocked domains"
  ON public.blocked_domains FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own blocked domains" ON public.blocked_domains;
CREATE POLICY "Users can insert their own blocked domains"
  ON public.blocked_domains FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own blocked domains" ON public.blocked_domains;
CREATE POLICY "Users can update their own blocked domains"
  ON public.blocked_domains FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own blocked domains" ON public.blocked_domains;
CREATE POLICY "Users can delete their own blocked domains"
  ON public.blocked_domains FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- B. DOSSIER SHARES (Secure Dossier Links)
-- ============================================
CREATE TABLE IF NOT EXISTS public.dossier_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT NOT NULL UNIQUE, -- Secure random token for the share link
  expires_at TIMESTAMPTZ NOT NULL,
  allowed_domains TEXT[], -- Domain allowlist (e.g., ["partner.com", "client.io"])
  watermark_text TEXT, -- Text to overlay on documents/profile
  max_views INTEGER DEFAULT NULL, -- Optional view limit
  view_count INTEGER NOT NULL DEFAULT 0,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dossier_shares_candidate_id ON public.dossier_shares(candidate_id);
CREATE INDEX IF NOT EXISTS idx_dossier_shares_token ON public.dossier_shares(token);
CREATE INDEX IF NOT EXISTS idx_dossier_shares_expires_at ON public.dossier_shares(expires_at);

-- RLS for dossier_shares
ALTER TABLE public.dossier_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Candidates can view their own dossier shares" ON public.dossier_shares;
CREATE POLICY "Candidates can view their own dossier shares"
  ON public.dossier_shares FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.candidate_profiles cp
      WHERE cp.id = candidate_id AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Strategists and admins can create dossier shares" ON public.dossier_shares;
CREATE POLICY "Strategists and admins can create dossier shares"
  ON public.dossier_shares FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'strategist')
  );

DROP POLICY IF EXISTS "Strategists and admins can update dossier shares" ON public.dossier_shares;
CREATE POLICY "Strategists and admins can update dossier shares"
  ON public.dossier_shares FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'strategist')
  );

DROP POLICY IF EXISTS "Strategists and admins can view all dossier shares" ON public.dossier_shares;
CREATE POLICY "Strategists and admins can view all dossier shares"
  ON public.dossier_shares FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'strategist')
  );

-- ============================================
-- C. DOSSIER VIEWS (Track who viewed dossiers)
-- ============================================
CREATE TABLE IF NOT EXISTS public.dossier_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_share_id UUID NOT NULL REFERENCES public.dossier_shares(id) ON DELETE CASCADE,
  viewer_email TEXT,
  viewer_name TEXT,
  viewer_company TEXT,
  ip_address INET,
  user_agent TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  view_duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_dossier_views_share_id ON public.dossier_views(dossier_share_id);
CREATE INDEX IF NOT EXISTS idx_dossier_views_viewed_at ON public.dossier_views(viewed_at);

-- RLS for dossier_views
ALTER TABLE public.dossier_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Candidates can view their dossier views" ON public.dossier_views;
CREATE POLICY "Candidates can view their dossier views"
  ON public.dossier_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dossier_shares ds
      JOIN public.candidate_profiles cp ON cp.id = ds.candidate_id
      WHERE ds.id = dossier_share_id AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Strategists and admins can view all dossier views" ON public.dossier_views;
CREATE POLICY "Strategists and admins can view all dossier views"
  ON public.dossier_views FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'strategist')
  );

-- Function to automatically increment view count
CREATE OR REPLACE FUNCTION increment_dossier_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.dossier_shares
  SET view_count = view_count + 1,
      updated_at = now()
  WHERE id = NEW.dossier_share_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_increment_dossier_view_count ON public.dossier_views;
CREATE TRIGGER trigger_increment_dossier_view_count
  AFTER INSERT ON public.dossier_views
  FOR EACH ROW
  EXECUTE FUNCTION increment_dossier_view_count();

-- ============================================
-- D. CONSENT RECEIPTS (Field-Level Consent Tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS public.consent_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL, -- e.g., "field_visibility", "data_share", "club_sync"
  scope TEXT NOT NULL, -- e.g., "email", "phone", "salary", "all_fields"
  recipient_type TEXT, -- e.g., "partner", "company", "public"
  recipient_id UUID, -- ID of the company/partner receiving consent
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  granted BOOLEAN NOT NULL,
  consent_text TEXT, -- What the user agreed to
  metadata JSONB DEFAULT '{}'::jsonb,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_consent_receipts_user_id ON public.consent_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_receipts_application_id ON public.consent_receipts(application_id);
CREATE INDEX IF NOT EXISTS idx_consent_receipts_recipient_id ON public.consent_receipts(recipient_id);

-- RLS for consent_receipts
ALTER TABLE public.consent_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own consent receipts" ON public.consent_receipts;
CREATE POLICY "Users can view their own consent receipts"
  ON public.consent_receipts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own consent receipts" ON public.consent_receipts;
CREATE POLICY "Users can insert their own consent receipts"
  ON public.consent_receipts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own consent receipts" ON public.consent_receipts;
CREATE POLICY "Users can update their own consent receipts"
  ON public.consent_receipts FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all consent receipts" ON public.consent_receipts;
CREATE POLICY "Admins can view all consent receipts"
  ON public.consent_receipts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- E. ADD GHOST MODE FIELDS TO PROFILES
-- ============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ghost_mode_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ghost_mode_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS actively_looking BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_fields JSONB DEFAULT '{"full_name": true, "title": true, "skills": true, "experience": true}'::jsonb;

ALTER TABLE public.candidate_profiles ADD COLUMN IF NOT EXISTS ghost_mode_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.candidate_profiles ADD COLUMN IF NOT EXISTS actively_looking BOOLEAN DEFAULT true;
ALTER TABLE public.candidate_profiles ADD COLUMN IF NOT EXISTS public_fields JSONB DEFAULT '{"full_name": true, "title": true, "skills": true, "experience": true}'::jsonb;

-- ============================================
-- F. HELPER FUNCTIONS
-- ============================================

-- Function to check if a candidate has blocked a company domain
CREATE OR REPLACE FUNCTION is_company_blocked_by_candidate(
  _candidate_id UUID,
  _company_email TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  _domain TEXT;
  _is_blocked BOOLEAN;
BEGIN
  _domain := split_part(_company_email, '@', 2);
  
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_domains bd
    JOIN public.candidate_profiles cp ON cp.user_id = bd.user_id
    WHERE cp.id = _candidate_id
    AND bd.domain = _domain
  ) INTO _is_blocked;
  
  RETURN _is_blocked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate secure dossier share token
CREATE OR REPLACE FUNCTION generate_dossier_share_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Function to check if dossier share is valid
CREATE OR REPLACE FUNCTION is_dossier_share_valid(_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.dossier_shares
    WHERE token = _token
    AND is_revoked = false
    AND expires_at > now()
    AND (max_views IS NULL OR view_count < max_views)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- G. AUDIT LOGGING
-- ============================================

CREATE OR REPLACE FUNCTION log_blocked_domain_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.comprehensive_audit_logs (
      actor_id, event_type, action, resource_type, resource_id,
      description, metadata, compliance_tags
    ) VALUES (
      NEW.user_id, 'configuration_change', 'create', 'blocked_domain', NEW.id,
      'User blocked company domain: ' || NEW.domain,
      jsonb_build_object('company_name', NEW.company_name, 'domain', NEW.domain),
      ARRAY['privacy', 'employer_protection']
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.comprehensive_audit_logs (
      actor_id, event_type, action, resource_type, resource_id,
      description, metadata, compliance_tags
    ) VALUES (
      OLD.user_id, 'configuration_change', 'delete', 'blocked_domain', OLD.id,
      'User unblocked company domain: ' || OLD.domain,
      jsonb_build_object('company_name', OLD.company_name, 'domain', OLD.domain),
      ARRAY['privacy', 'employer_protection']
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_blocked_domain_changes ON public.blocked_domains;
CREATE TRIGGER audit_blocked_domain_changes
  AFTER INSERT OR DELETE ON public.blocked_domains
  FOR EACH ROW
  EXECUTE FUNCTION log_blocked_domain_change();

CREATE OR REPLACE FUNCTION log_dossier_share_event()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.comprehensive_audit_logs (
      actor_id, event_type, action, resource_type, resource_id,
      description, metadata, compliance_tags
    ) VALUES (
      NEW.shared_by, 'data_access', 'create', 'dossier_share', NEW.id,
      'Dossier share created',
      jsonb_build_object('candidate_id', NEW.candidate_id, 'expires_at', NEW.expires_at, 'allowed_domains', NEW.allowed_domains),
      ARRAY['security', 'data_sharing', 'soc2']
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.is_revoked = true AND OLD.is_revoked = false THEN
    INSERT INTO public.comprehensive_audit_logs (
      actor_id, event_type, action, resource_type, resource_id,
      description, metadata, compliance_tags
    ) VALUES (
      NEW.revoked_by, 'data_access', 'update', 'dossier_share', NEW.id,
      'Dossier share revoked',
      jsonb_build_object('candidate_id', NEW.candidate_id),
      ARRAY['security', 'data_sharing', 'soc2']
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_dossier_share_events ON public.dossier_shares;
CREATE TRIGGER audit_dossier_share_events
  AFTER INSERT OR UPDATE ON public.dossier_shares
  FOR EACH ROW
  EXECUTE FUNCTION log_dossier_share_event();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_blocked_domains_updated_at ON public.blocked_domains;
CREATE TRIGGER update_blocked_domains_updated_at
  BEFORE UPDATE ON public.blocked_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dossier_shares_updated_at ON public.dossier_shares;
CREATE TRIGGER update_dossier_shares_updated_at
  BEFORE UPDATE ON public.dossier_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.blocked_domains IS 'Current-employer protection: domains blocked by candidates';
COMMENT ON TABLE public.dossier_shares IS 'Secure, expiring dossier share links with watermarking';
COMMENT ON TABLE public.dossier_views IS 'Audit trail of who viewed shared dossiers';
COMMENT ON TABLE public.consent_receipts IS 'Field-level consent tracking for GDPR compliance';
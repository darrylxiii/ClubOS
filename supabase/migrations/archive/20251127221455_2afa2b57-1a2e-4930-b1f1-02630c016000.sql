-- RLS Policies for partner_invoices (RLS should already be enabled from table creation)
DO $$
BEGIN
  -- Check if RLS is enabled, if not enable it
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'partner_invoices' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.partner_invoices ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

CREATE POLICY "Partners view invoices" ON public.partner_invoices FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'partner'::app_role));

CREATE POLICY "Admins manage invoices" ON public.partner_invoices FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- company_sso_config
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'company_sso_config' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.company_sso_config ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

CREATE POLICY "Partners view SSO" ON public.company_sso_config FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'partner'::app_role));

CREATE POLICY "Admins manage SSO" ON public.company_sso_config FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- partner_sla_config
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'partner_sla_config' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.partner_sla_config ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

CREATE POLICY "Partners view SLA config" ON public.partner_sla_config FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'partner'::app_role));

CREATE POLICY "Admins manage SLA config" ON public.partner_sla_config FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- partner_sla_tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'partner_sla_tracking' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.partner_sla_tracking ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

CREATE POLICY "All can view SLA tracking" ON public.partner_sla_tracking FOR SELECT TO authenticated
USING (true);

CREATE POLICY "System inserts SLA tracking" ON public.partner_sla_tracking FOR INSERT TO authenticated
WITH CHECK (true);

-- partner_integrations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'partner_integrations' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.partner_integrations ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

CREATE POLICY "Partners view integrations" ON public.partner_integrations FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'partner'::app_role));

CREATE POLICY "Admins manage integrations" ON public.partner_integrations FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
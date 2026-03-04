
-- Phase 1b: Activate partner funnel → CRM bridge via DB trigger
-- When a partner_request is inserted, call sync-partner-funnel-to-crm via pg_net

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create trigger function that calls the edge function
CREATE OR REPLACE FUNCTION public.trigger_sync_partner_to_crm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM extensions.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/sync-partner-funnel-to-crm',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := jsonb_build_object('partner_request_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

-- Create trigger on partner_requests
DROP TRIGGER IF EXISTS on_partner_request_sync_crm ON partner_requests;
CREATE TRIGGER on_partner_request_sync_crm
  AFTER INSERT ON partner_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sync_partner_to_crm();

-- Phase 2a: Add body_text columns to instantly_sequence_steps
ALTER TABLE instantly_sequence_steps 
  ADD COLUMN IF NOT EXISTS body_text TEXT,
  ADD COLUMN IF NOT EXISTS body_html TEXT;

-- Phase 2c: Create crm_outreach_learnings table
CREATE TABLE IF NOT EXISTS crm_outreach_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_type TEXT NOT NULL,
  pattern TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}',
  sample_size INTEGER DEFAULT 0,
  confidence_score NUMERIC(5,2) DEFAULT 0,
  performance_lift NUMERIC(5,2),
  is_active BOOLEAN DEFAULT true,
  applied_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE crm_outreach_learnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and strategists can manage outreach learnings"
  ON crm_outreach_learnings
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'strategist'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'strategist'));

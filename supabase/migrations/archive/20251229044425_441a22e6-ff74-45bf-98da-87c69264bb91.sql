-- SCIM 2.0 Provisioning Tables

-- SCIM Tokens for API authentication
CREATE TABLE public.scim_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  token_prefix TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  scopes TEXT[] DEFAULT ARRAY['users:read', 'users:write', 'groups:read', 'groups:write'],
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- SCIM Groups for group sync from IdP
CREATE TABLE public.scim_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  members_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, external_id)
);

-- SCIM User-Group Memberships
CREATE TABLE public.scim_user_group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.scim_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, group_id)
);

-- SCIM Provisioning Logs for audit
CREATE TABLE public.scim_provisioning_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  external_id TEXT,
  request_payload JSONB,
  response_payload JSONB,
  status TEXT NOT NULL,
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Webhook Dead Letter Queue
CREATE TABLE public.webhook_dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID,
  endpoint_url TEXT NOT NULL,
  payload JSONB NOT NULL,
  headers JSONB,
  http_status INTEGER,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  last_retry_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Webhook Delivery Stats
CREATE TABLE public.webhook_delivery_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID,
  endpoint_url TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  total_deliveries INTEGER DEFAULT 0,
  successful_deliveries INTEGER DEFAULT 0,
  failed_deliveries INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  last_delivery_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(webhook_id, date)
);

-- Rate Limit Analytics
CREATE TABLE public.rate_limit_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  hour INTEGER,
  total_requests INTEGER DEFAULT 0,
  blocked_requests INTEGER DEFAULT 0,
  unique_ips INTEGER DEFAULT 0,
  top_ips JSONB DEFAULT '[]',
  avg_response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(endpoint, date, hour)
);

-- Enable RLS
ALTER TABLE public.scim_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scim_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scim_user_group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scim_provisioning_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_dead_letter_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_delivery_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for SCIM tokens (admin only)
CREATE POLICY "Admins can manage SCIM tokens"
  ON public.scim_tokens FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- RLS Policies for SCIM groups
CREATE POLICY "Admins can manage SCIM groups"
  ON public.scim_groups FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can view their group memberships"
  ON public.scim_user_group_memberships FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can manage group memberships"
  ON public.scim_user_group_memberships FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- RLS for provisioning logs (admin only)
CREATE POLICY "Admins can view provisioning logs"
  ON public.scim_provisioning_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- RLS for webhook DLQ (admin only)
CREATE POLICY "Admins can manage webhook DLQ"
  ON public.webhook_dead_letter_queue FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- RLS for webhook stats (admin only)
CREATE POLICY "Admins can view webhook stats"
  ON public.webhook_delivery_stats FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- RLS for rate limit analytics (admin only)
CREATE POLICY "Admins can view rate limit analytics"
  ON public.rate_limit_analytics FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Indexes for performance
CREATE INDEX idx_scim_tokens_company ON public.scim_tokens(company_id);
CREATE INDEX idx_scim_tokens_active ON public.scim_tokens(is_active) WHERE is_active = true;
CREATE INDEX idx_scim_groups_company ON public.scim_groups(company_id);
CREATE INDEX idx_scim_groups_external_id ON public.scim_groups(external_id);
CREATE INDEX idx_scim_memberships_user ON public.scim_user_group_memberships(user_id);
CREATE INDEX idx_scim_memberships_group ON public.scim_user_group_memberships(group_id);
CREATE INDEX idx_scim_logs_company ON public.scim_provisioning_logs(company_id);
CREATE INDEX idx_scim_logs_created ON public.scim_provisioning_logs(created_at DESC);
CREATE INDEX idx_webhook_dlq_status ON public.webhook_dead_letter_queue(status);
CREATE INDEX idx_webhook_dlq_next_retry ON public.webhook_dead_letter_queue(next_retry_at) WHERE status = 'pending';
CREATE INDEX idx_webhook_stats_date ON public.webhook_delivery_stats(date DESC);
CREATE INDEX idx_rate_analytics_endpoint ON public.rate_limit_analytics(endpoint, date DESC);

-- Updated at triggers
CREATE TRIGGER update_scim_tokens_updated_at
  BEFORE UPDATE ON public.scim_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_scim_groups_updated_at
  BEFORE UPDATE ON public.scim_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_webhook_dlq_updated_at
  BEFORE UPDATE ON public.webhook_dead_letter_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_webhook_stats_updated_at
  BEFORE UPDATE ON public.webhook_delivery_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_rate_analytics_updated_at
  BEFORE UPDATE ON public.rate_limit_analytics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function to update SCIM group member count
CREATE OR REPLACE FUNCTION public.update_scim_group_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE scim_groups SET members_count = members_count + 1 WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE scim_groups SET members_count = members_count - 1 WHERE id = OLD.group_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_group_member_count
  AFTER INSERT OR DELETE ON public.scim_user_group_memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_scim_group_member_count();
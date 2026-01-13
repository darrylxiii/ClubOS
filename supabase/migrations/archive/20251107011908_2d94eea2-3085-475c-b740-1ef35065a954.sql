-- Create API Keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(15) NOT NULL UNIQUE,
  key_hash VARCHAR(64) NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  rate_limit_per_hour INTEGER NOT NULL DEFAULT 1000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create API Usage Logs table
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create API Rate Limits table
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  hour_bucket TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(api_key_id, hour_bucket)
);

-- Create Webhook Endpoints table
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret VARCHAR(255) NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create Webhook Deliveries table
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_endpoint_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  http_status_code INTEGER,
  response_body TEXT,
  next_retry_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_company ON public.api_keys(company_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON public.api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_key ON public.api_usage_logs(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_key_hour ON public.api_rate_limits(api_key_id, hour_bucket);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_company ON public.webhook_endpoints(company_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint ON public.webhook_deliveries(webhook_endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON public.webhook_deliveries(status, next_retry_at);

-- Create function to generate API key
CREATE OR REPLACE FUNCTION public.generate_api_key(
  p_company_id UUID,
  p_name VARCHAR,
  p_scopes TEXT[],
  p_rate_limit_per_hour INTEGER DEFAULT 1000,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
  v_prefix VARCHAR(15);
  v_hash VARCHAR(64);
  v_id UUID;
BEGIN
  -- Generate random key: tqc_live_ + 32 random chars
  v_key := 'tqc_live_' || encode(gen_random_bytes(24), 'hex');
  
  -- Get prefix (first 15 chars)
  v_prefix := substring(v_key from 1 for 15);
  
  -- Hash the full key
  v_hash := encode(digest(v_key, 'sha256'), 'hex');
  
  -- Insert the key
  INSERT INTO public.api_keys (
    company_id,
    name,
    key_prefix,
    key_hash,
    scopes,
    rate_limit_per_hour,
    created_by
  ) VALUES (
    p_company_id,
    p_name,
    v_prefix,
    v_hash,
    p_scopes,
    p_rate_limit_per_hour,
    p_created_by
  ) RETURNING id INTO v_id;
  
  -- Return the key and metadata (key only shown once!)
  RETURN jsonb_build_object(
    'id', v_id,
    'key', v_key,
    'prefix', v_prefix,
    'scopes', p_scopes,
    'rate_limit_per_hour', p_rate_limit_per_hour
  );
END;
$$;

-- Create function to check rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_api_key_id UUID,
  p_limit INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hour_bucket TIMESTAMPTZ;
  v_current_count INTEGER;
BEGIN
  -- Get current hour bucket
  v_hour_bucket := date_trunc('hour', now());
  
  -- Get or create rate limit record
  INSERT INTO public.api_rate_limits (api_key_id, hour_bucket, request_count)
  VALUES (p_api_key_id, v_hour_bucket, 1)
  ON CONFLICT (api_key_id, hour_bucket)
  DO UPDATE SET request_count = api_rate_limits.request_count + 1
  RETURNING request_count INTO v_current_count;
  
  -- Return true if under limit
  RETURN v_current_count <= p_limit;
END;
$$;

-- Create function to queue webhook delivery
CREATE OR REPLACE FUNCTION public.queue_webhook_delivery(
  p_company_id UUID,
  p_event_type VARCHAR,
  p_payload JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert delivery for all active webhooks subscribed to this event
  INSERT INTO public.webhook_deliveries (
    webhook_endpoint_id,
    event_type,
    payload,
    status,
    next_retry_at
  )
  SELECT 
    id,
    p_event_type,
    p_payload,
    'pending',
    now()
  FROM public.webhook_endpoints
  WHERE company_id = p_company_id
    AND is_active = true
    AND p_event_type = ANY(events);
END;
$$;

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_keys (company admins and system)
CREATE POLICY "Company admins can view their API keys"
  ON public.api_keys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = api_keys.company_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
        AND cm.is_active = true
    )
  );

CREATE POLICY "Company admins can create API keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = api_keys.company_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
        AND cm.is_active = true
    )
  );

CREATE POLICY "Company admins can update their API keys"
  ON public.api_keys FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = api_keys.company_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
        AND cm.is_active = true
    )
  );

CREATE POLICY "Company admins can delete their API keys"
  ON public.api_keys FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = api_keys.company_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
        AND cm.is_active = true
    )
  );

-- RLS Policies for api_usage_logs (company admins can view)
CREATE POLICY "Company admins can view API usage logs"
  ON public.api_usage_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.api_keys ak
      JOIN public.company_members cm ON cm.company_id = ak.company_id
      WHERE ak.id = api_usage_logs.api_key_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
        AND cm.is_active = true
    )
  );

-- RLS Policies for webhook_endpoints (company admins)
CREATE POLICY "Company admins can manage webhook endpoints"
  ON public.webhook_endpoints FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = webhook_endpoints.company_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
        AND cm.is_active = true
    )
  );

-- RLS Policies for webhook_deliveries (company admins can view)
CREATE POLICY "Company admins can view webhook deliveries"
  ON public.webhook_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.webhook_endpoints we
      JOIN public.company_members cm ON cm.company_id = we.company_id
      WHERE we.id = webhook_deliveries.webhook_endpoint_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
        AND cm.is_active = true
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_webhook_endpoints_updated_at
  BEFORE UPDATE ON public.webhook_endpoints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_webhook_deliveries_updated_at
  BEFORE UPDATE ON public.webhook_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
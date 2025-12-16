-- Create update_updated_at function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create workspace webhooks table
CREATE TABLE IF NOT EXISTS public.workspace_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES public.workspace_databases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  url TEXT NOT NULL,
  secret TEXT,
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create workspace API keys table
CREATE TABLE IF NOT EXISTS public.workspace_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT 'read',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create webhook logs table
CREATE TABLE IF NOT EXISTS public.workspace_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.workspace_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB,
  response_status INTEGER,
  response_body TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workspace_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for workspace_webhooks
CREATE POLICY "Users can view their own webhooks" ON public.workspace_webhooks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own webhooks" ON public.workspace_webhooks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webhooks" ON public.workspace_webhooks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own webhooks" ON public.workspace_webhooks
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for workspace_api_keys
CREATE POLICY "Users can view their own API keys" ON public.workspace_api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own API keys" ON public.workspace_api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" ON public.workspace_api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys" ON public.workspace_api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for workspace_webhook_logs
CREATE POLICY "Users can view logs for their webhooks" ON public.workspace_webhook_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_webhooks w
      WHERE w.id = workspace_webhook_logs.webhook_id
      AND w.user_id = auth.uid()
    )
  );

-- Updated at triggers
CREATE TRIGGER update_workspace_webhooks_updated_at
  BEFORE UPDATE ON public.workspace_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_workspace_api_keys_updated_at
  BEFORE UPDATE ON public.workspace_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Indexes
CREATE INDEX idx_workspace_webhooks_database_id ON public.workspace_webhooks(database_id);
CREATE INDEX idx_workspace_webhooks_user_id ON public.workspace_webhooks(user_id);
CREATE INDEX idx_workspace_api_keys_user_id ON public.workspace_api_keys(user_id);
CREATE INDEX idx_workspace_webhook_logs_webhook_id ON public.workspace_webhook_logs(webhook_id);
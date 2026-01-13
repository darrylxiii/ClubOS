-- Create email_connections table for storing connected email accounts
CREATE TABLE IF NOT EXISTS public.email_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook', 'private')),
  email TEXT NOT NULL,
  label TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_connections_user_id ON public.email_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_email_connections_provider ON public.email_connections(provider);
CREATE INDEX IF NOT EXISTS idx_email_connections_is_active ON public.email_connections(is_active);

-- Enable RLS
ALTER TABLE public.email_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own email connections
CREATE POLICY "Users can view their own email connections"
  ON public.email_connections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email connections"
  ON public.email_connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email connections"
  ON public.email_connections
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email connections"
  ON public.email_connections
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_email_connections_updated_at
  BEFORE UPDATE ON public.email_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
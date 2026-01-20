-- Create ai_usage_logs table for security monitoring
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  recaptcha_score NUMERIC(3,2),
  recaptcha_passed BOOLEAN,
  rate_limit_hit BOOLEAN DEFAULT false,
  request_payload JSONB,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own logs
CREATE POLICY "Users can read their own AI usage logs"
  ON public.ai_usage_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Only service role can insert logs
CREATE POLICY "Service role can insert AI usage logs"
  ON public.ai_usage_logs
  FOR INSERT
  WITH CHECK (true);

-- Create index for efficient queries
CREATE INDEX idx_ai_usage_logs_user_id ON public.ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_function_name ON public.ai_usage_logs(function_name);
CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at DESC);
CREATE INDEX idx_ai_usage_logs_rate_limit ON public.ai_usage_logs(rate_limit_hit) WHERE rate_limit_hit = true;
CREATE INDEX idx_ai_usage_logs_failed ON public.ai_usage_logs(success) WHERE success = false;

-- Add comment
COMMENT ON TABLE public.ai_usage_logs IS 'Security monitoring and usage tracking for AI edge functions';
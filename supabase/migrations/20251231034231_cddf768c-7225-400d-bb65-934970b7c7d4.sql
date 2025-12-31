-- Create notification retry queue table for failed notifications
CREATE TABLE IF NOT EXISTS public.notification_retry_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_type TEXT NOT NULL,
  recipient_id UUID,
  recipient_email TEXT,
  recipient_phone TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_error TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'))
);

-- Create device tokens table for push notification management
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'web',
  device_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_platform CHECK (platform IN ('web', 'ios', 'android', 'pwa')),
  UNIQUE(user_id, token)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notification_retry_queue_status_next_retry 
  ON public.notification_retry_queue(status, next_retry_at) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_notification_retry_queue_recipient 
  ON public.notification_retry_queue(recipient_id);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id 
  ON public.device_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_device_tokens_active 
  ON public.device_tokens(user_id, is_active) 
  WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.notification_retry_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_retry_queue (service role only for internal processing)
CREATE POLICY "Service role can manage retry queue"
  ON public.notification_retry_queue
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS policies for device_tokens
CREATE POLICY "Users can view their own device tokens"
  ON public.device_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own device tokens"
  ON public.device_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own device tokens"
  ON public.device_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own device tokens"
  ON public.device_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger for device_tokens
CREATE OR REPLACE FUNCTION update_device_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_device_tokens_updated_at ON public.device_tokens;
CREATE TRIGGER update_device_tokens_updated_at
  BEFORE UPDATE ON public.device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_device_tokens_updated_at();
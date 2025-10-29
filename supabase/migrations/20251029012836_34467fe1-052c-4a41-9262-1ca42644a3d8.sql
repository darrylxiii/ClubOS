-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  email_applications BOOLEAN DEFAULT true,
  email_messages BOOLEAN DEFAULT true,
  email_interviews BOOLEAN DEFAULT true,
  email_job_matches BOOLEAN DEFAULT true,
  email_system BOOLEAN DEFAULT true,
  email_digest BOOLEAN DEFAULT false,
  email_digest_frequency TEXT DEFAULT 'daily',
  inapp_enabled BOOLEAN DEFAULT true,
  inapp_applications BOOLEAN DEFAULT true,
  inapp_messages BOOLEAN DEFAULT true,
  inapp_interviews BOOLEAN DEFAULT true,
  inapp_job_matches BOOLEAN DEFAULT true,
  inapp_system BOOLEAN DEFAULT true,
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  quiet_hours_timezone TEXT DEFAULT 'Europe/Amsterdam',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notification preferences"
  ON public.notification_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
  ON public.notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON public.notification_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification preferences"
  ON public.notification_preferences
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
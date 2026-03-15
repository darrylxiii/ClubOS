
-- Add SMS + WhatsApp columns to notification_preferences
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS sms_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_interviews boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_reminders boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_offers boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_stage_updates boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_interviews boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_reminders boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_stage_updates boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_job_matches boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_offers boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS preferred_channel text DEFAULT 'email';

-- Track which notifications have been sent (replaces sessionStorage for dedup)
CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  event_id text NOT NULL,
  channel text NOT NULL,
  status text DEFAULT 'sent',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, event_type, event_id, channel)
);

-- RLS for notification_delivery_log
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own delivery log"
  ON notification_delivery_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own delivery log"
  ON notification_delivery_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role full access to delivery log"
  ON notification_delivery_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for fast dedup lookups
CREATE INDEX IF NOT EXISTS idx_delivery_log_dedup 
  ON notification_delivery_log(user_id, event_type, event_id);

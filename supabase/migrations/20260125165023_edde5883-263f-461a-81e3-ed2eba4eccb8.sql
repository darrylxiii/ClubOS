-- Phase 6-8 tables: Post-Meeting, Voice, and WhatsApp Booking

-- Meeting Follow-ups
CREATE TABLE IF NOT EXISTS public.meeting_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL,
  host_id UUID,
  generated_content JSONB NOT NULL DEFAULT '{}',
  email_subject TEXT,
  email_body TEXT,
  action_items JSONB DEFAULT '[]',
  calendar_blocks_created UUID[] DEFAULT '{}',
  thank_you_sent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meeting Action Items
CREATE TABLE IF NOT EXISTS public.meeting_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL,
  follow_up_id UUID REFERENCES meeting_follow_ups(id) ON DELETE CASCADE,
  assignee_id UUID,
  assignee_email TEXT,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meeting ROI Metrics
CREATE TABLE IF NOT EXISTS public.meeting_roi_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL UNIQUE,
  host_id UUID,
  participant_count INTEGER DEFAULT 0,
  duration_minutes INTEGER,
  total_salary_cost_usd NUMERIC(12, 2),
  outcomes JSONB DEFAULT '{}',
  decisions_made INTEGER DEFAULT 0,
  action_items_count INTEGER DEFAULT 0,
  efficiency_score INTEGER,
  could_have_been_email BOOLEAN DEFAULT false,
  value_generated_usd NUMERIC(12, 2),
  roi_calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice Booking Sessions
CREATE TABLE IF NOT EXISTS public.voice_booking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID,
  booking_link_id UUID,
  phone_number TEXT,
  transcript JSONB DEFAULT '[]',
  extracted_intent JSONB DEFAULT '{}',
  booking_id UUID,
  status TEXT DEFAULT 'active',
  duration_seconds INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WhatsApp Booking Sessions
CREATE TABLE IF NOT EXISTS public.whatsapp_booking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  booking_link_id UUID,
  conversation_history JSONB DEFAULT '[]',
  extracted_data JSONB DEFAULT '{}',
  booking_id UUID,
  status TEXT DEFAULT 'active',
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meeting_follow_ups_meeting ON meeting_follow_ups(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_meeting ON meeting_action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_session_id ON voice_booking_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone ON whatsapp_booking_sessions(phone_number);

-- Enable RLS
ALTER TABLE meeting_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_roi_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_booking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_booking_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage follow-ups" ON meeting_follow_ups FOR ALL USING (true);
CREATE POLICY "Users can manage action items" ON meeting_action_items FOR ALL USING (true);
CREATE POLICY "Users can manage roi metrics" ON meeting_roi_metrics FOR ALL USING (true);
CREATE POLICY "Anyone can use voice booking" ON voice_booking_sessions FOR ALL USING (true);
CREATE POLICY "Anyone can use whatsapp booking" ON whatsapp_booking_sessions FOR ALL USING (true);
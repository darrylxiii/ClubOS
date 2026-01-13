-- Email Relationships: Track contact patterns and communication history
CREATE TABLE IF NOT EXISTS public.email_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_email TEXT NOT NULL,
  contact_name TEXT,
  total_emails INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_received INTEGER DEFAULT 0,
  avg_response_time_hours NUMERIC,
  last_email_at TIMESTAMP WITH TIME ZONE,
  relationship_strength TEXT CHECK (relationship_strength IN ('cold', 'warm', 'hot', 'vip')),
  avg_sentiment TEXT CHECK (avg_sentiment IN ('positive', 'neutral', 'negative')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, contact_email)
);

-- Email Follow-ups: Track emails needing attention
CREATE TABLE IF NOT EXISTS public.email_follow_ups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  follow_up_type TEXT NOT NULL CHECK (follow_up_type IN ('no_reply', 'meeting_request', 'deadline', 'important')),
  follow_up_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed', 'completed')),
  reminder_sent BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email Meetings: Extracted meeting information
CREATE TABLE IF NOT EXISTS public.email_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  meeting_title TEXT,
  meeting_date TIMESTAMP WITH TIME ZONE,
  meeting_duration_minutes INTEGER,
  meeting_location TEXT,
  participants JSONB DEFAULT '[]',
  calendar_event_created BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'tentative')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_relationships_user_id ON public.email_relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_email_relationships_contact ON public.email_relationships(contact_email);
CREATE INDEX IF NOT EXISTS idx_email_follow_ups_user_id ON public.email_follow_ups(user_id);
CREATE INDEX IF NOT EXISTS idx_email_follow_ups_date ON public.email_follow_ups(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_email_follow_ups_status ON public.email_follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_email_meetings_user_id ON public.email_meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_email_meetings_email_id ON public.email_meetings(email_id);

-- Enable Row Level Security
ALTER TABLE public.email_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_meetings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own relationships"
  ON public.email_relationships FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own relationships"
  ON public.email_relationships FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own follow-ups"
  ON public.email_follow_ups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own follow-ups"
  ON public.email_follow_ups FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own meetings"
  ON public.email_meetings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own meetings"
  ON public.email_meetings FOR ALL
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_relationships_updated_at
  BEFORE UPDATE ON public.email_relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_follow_ups_updated_at
  BEFORE UPDATE ON public.email_follow_ups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_meetings_updated_at
  BEFORE UPDATE ON public.email_meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
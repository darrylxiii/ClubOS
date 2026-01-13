-- Meeting System Deep Integration Enhancements

-- Add missing columns to meetings table
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS ai_analysis_status TEXT DEFAULT 'pending';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS ai_recommendation TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS ai_key_moments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS transcript_url TEXT;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS has_recording BOOLEAN DEFAULT false;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS actual_start TIMESTAMPTZ;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS actual_end TIMESTAMPTZ;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'virtual';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add missing columns to meeting_participants
ALTER TABLE public.meeting_participants ADD COLUMN IF NOT EXISTS participant_type TEXT DEFAULT 'attendee';
ALTER TABLE public.meeting_participants ADD COLUMN IF NOT EXISTS role_in_interview TEXT;
ALTER TABLE public.meeting_participants ADD COLUMN IF NOT EXISTS rsvp_status TEXT DEFAULT 'pending';
ALTER TABLE public.meeting_participants ADD COLUMN IF NOT EXISTS attended BOOLEAN;
ALTER TABLE public.meeting_participants ADD COLUMN IF NOT EXISTS scorecard_submitted BOOLEAN DEFAULT false;
ALTER TABLE public.meeting_participants ADD COLUMN IF NOT EXISTS scorecard_due_at TIMESTAMPTZ;

-- Add missing columns to candidate_scorecards
ALTER TABLE public.candidate_scorecards ADD COLUMN IF NOT EXISTS meeting_id UUID;
ALTER TABLE public.candidate_scorecards ADD COLUMN IF NOT EXISTS candidate_id UUID;
ALTER TABLE public.candidate_scorecards ADD COLUMN IF NOT EXISTS ai_prefilled BOOLEAN DEFAULT false;
ALTER TABLE public.candidate_scorecards ADD COLUMN IF NOT EXISTS ai_suggested_rating INTEGER;
ALTER TABLE public.candidate_scorecards ADD COLUMN IF NOT EXISTS ai_suggested_strengths TEXT[];
ALTER TABLE public.candidate_scorecards ADD COLUMN IF NOT EXISTS ai_suggested_concerns TEXT[];
ALTER TABLE public.candidate_scorecards ADD COLUMN IF NOT EXISTS key_evidence JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.candidate_scorecards ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE public.candidate_scorecards ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE public.candidate_scorecards ADD COLUMN IF NOT EXISTS leadership INTEGER;
ALTER TABLE public.candidate_scorecards ADD COLUMN IF NOT EXISTS problem_solving INTEGER;

-- Add missing columns to meeting_templates
ALTER TABLE public.meeting_templates ADD COLUMN IF NOT EXISTS interview_stage TEXT;
ALTER TABLE public.meeting_templates ADD COLUMN IF NOT EXISTS evaluation_criteria TEXT[];
ALTER TABLE public.meeting_templates ADD COLUMN IF NOT EXISTS company_id UUID;

-- Add missing columns to pipeline_events
ALTER TABLE public.pipeline_events ADD COLUMN IF NOT EXISTS candidate_id UUID;
ALTER TABLE public.pipeline_events ADD COLUMN IF NOT EXISTS triggered_by TEXT;
ALTER TABLE public.pipeline_events ADD COLUMN IF NOT EXISTS related_meeting_id UUID;
ALTER TABLE public.pipeline_events ADD COLUMN IF NOT EXISTS related_scorecard_ids UUID[];

-- Create meeting_reminders table
CREATE TABLE IF NOT EXISTS public.meeting_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  reminder_type TEXT CHECK (reminder_type IN ('24h_prep', '1h_prep', 'scorecard_due', 'follow_up')),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  content JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create interview_analytics table
CREATE TABLE IF NOT EXISTS public.interview_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  job_id UUID,
  company_id UUID,
  interview_stage TEXT,
  total_interviews INTEGER DEFAULT 0,
  completed_interviews INTEGER DEFAULT 0,
  avg_duration_minutes NUMERIC(10,2),
  avg_rating NUMERIC(3,2),
  positive_recommendations INTEGER DEFAULT 0,
  negative_recommendations INTEGER DEFAULT 0,
  advanced_to_next_stage INTEGER DEFAULT 0,
  rejected_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date, job_id, interview_stage)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_meetings_candidate_scheduled ON public.meetings(candidate_id, scheduled_start DESC) WHERE candidate_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_meetings_application_id ON public.meetings(application_id) WHERE application_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_meetings_job_id ON public.meetings(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_meetings_host_status ON public.meetings(host_id, status);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled ON public.meetings(scheduled_start) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_scorecards_meeting ON public.candidate_scorecards(meeting_id) WHERE meeting_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scorecards_evaluator_pending ON public.candidate_scorecards(evaluator_id, status) WHERE status = 'draft';
CREATE INDEX IF NOT EXISTS idx_pipeline_events_application ON public.pipeline_events(application_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_participants_meeting ON public.meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON public.meeting_participants(user_id);

-- Enable RLS on new tables
ALTER TABLE public.meeting_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meeting_reminders
CREATE POLICY "Users can view their own reminders" ON public.meeting_reminders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can insert reminders" ON public.meeting_reminders FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for interview_analytics
CREATE POLICY "Authenticated users can view analytics" ON public.interview_analytics FOR SELECT USING (auth.uid() IS NOT NULL);

-- Create interview pipeline metrics view
CREATE OR REPLACE VIEW public.interview_pipeline_metrics AS
SELECT 
  m.job_id,
  m.interview_stage,
  COUNT(DISTINCT m.id) as total_interviews,
  COUNT(DISTINCT CASE WHEN cs.recommendation IN ('yes', 'strong_yes') THEN m.id END) as positive_outcomes,
  COUNT(DISTINCT CASE WHEN cs.recommendation IN ('no', 'strong_no') THEN m.id END) as negative_outcomes,
  AVG(cs.overall_rating) as avg_rating,
  COUNT(DISTINCT m.candidate_id) as unique_candidates
FROM public.meetings m
LEFT JOIN public.candidate_scorecards cs ON cs.meeting_id = m.id AND cs.status = 'submitted'
WHERE m.meeting_type = 'interview'
GROUP BY m.job_id, m.interview_stage;
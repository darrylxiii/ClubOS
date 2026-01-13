-- Phase 1: Quick Wins Database Tables (Fixed)

-- Activity Timeline table to track all candidate activities
CREATE TABLE IF NOT EXISTS public.activity_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  activity_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_timeline ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity_timeline
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'activity_timeline' AND policyname = 'Users can view their own activities'
  ) THEN
    CREATE POLICY "Users can view their own activities"
      ON public.activity_timeline
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'activity_timeline' AND policyname = 'System can insert activities'
  ) THEN
    CREATE POLICY "System can insert activities"
      ON public.activity_timeline
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_timeline_user_created ON public.activity_timeline(user_id, created_at DESC);

-- Dismissed Jobs table to track jobs candidates are not interested in
CREATE TABLE IF NOT EXISTS public.dismissed_jobs (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);

-- Enable RLS
ALTER TABLE public.dismissed_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dismissed_jobs
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dismissed_jobs' AND policyname = 'Users can view their dismissed jobs'
  ) THEN
    CREATE POLICY "Users can view their dismissed jobs"
      ON public.dismissed_jobs
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dismissed_jobs' AND policyname = 'Users can dismiss jobs'
  ) THEN
    CREATE POLICY "Users can dismiss jobs"
      ON public.dismissed_jobs
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dismissed_jobs' AND policyname = 'Users can undismiss jobs'
  ) THEN
    CREATE POLICY "Users can undismiss jobs"
      ON public.dismissed_jobs
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Function to automatically log activities
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log application activities
  IF TG_TABLE_NAME = 'applications' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO activity_timeline (user_id, activity_type, activity_data)
      VALUES (
        NEW.candidate_id,
        'application_submitted',
        jsonb_build_object('job_id', NEW.job_id, 'application_id', NEW.id)
      );
    ELSIF TG_OP = 'UPDATE' AND OLD.stage != NEW.stage THEN
      INSERT INTO activity_timeline (user_id, activity_type, activity_data)
      VALUES (
        NEW.candidate_id,
        'application_stage_changed',
        jsonb_build_object('job_id', NEW.job_id, 'application_id', NEW.id, 'old_stage', OLD.stage, 'new_stage', NEW.stage)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for applications
DROP TRIGGER IF EXISTS applications_activity_trigger ON public.applications;
CREATE TRIGGER applications_activity_trigger
  AFTER INSERT OR UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION log_activity();

-- Enable realtime for activity_timeline
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_timeline;
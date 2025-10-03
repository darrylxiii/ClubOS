-- Create pipeline_feedback table for NPS and detailed feedback
CREATE TABLE public.pipeline_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  position TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('hired', 'not_hired', 'withdrew')),
  
  -- NPS Score (0-10)
  nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
  
  -- Follow-up questions
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  process_clarity_rating INTEGER CHECK (process_clarity_rating >= 1 AND process_clarity_rating <= 5),
  strategist_rating INTEGER CHECK (strategist_rating >= 1 AND strategist_rating <= 5),
  timeline_rating INTEGER CHECK (timeline_rating >= 1 AND timeline_rating <= 5),
  interview_experience_rating INTEGER CHECK (interview_experience_rating >= 1 AND interview_experience_rating <= 5),
  
  -- Specific feedback
  what_went_well TEXT,
  what_could_improve TEXT,
  would_apply_again BOOLEAN,
  
  -- Open-ended
  additional_feedback TEXT,
  suggestions TEXT,
  
  -- Metadata
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pipeline_feedback ENABLE ROW LEVEL SECURITY;

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.pipeline_feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback"
ON public.pipeline_feedback
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own incomplete feedback
CREATE POLICY "Users can update their own feedback"
ON public.pipeline_feedback
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND completed_at IS NULL);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
ON public.pipeline_feedback
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create closed_pipelines table to track when pipelines close
CREATE TABLE public.closed_pipelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  position TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('hired', 'not_hired', 'withdrew')),
  closed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  feedback_requested BOOLEAN NOT NULL DEFAULT true,
  feedback_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, application_id)
);

-- Enable RLS
ALTER TABLE public.closed_pipelines ENABLE ROW LEVEL SECURITY;

-- Users can view their own closed pipelines
CREATE POLICY "Users can view their own closed pipelines"
ON public.closed_pipelines
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own closed pipelines
CREATE POLICY "Users can insert their own closed pipelines"
ON public.closed_pipelines
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own closed pipelines
CREATE POLICY "Users can update their own closed pipelines"
ON public.closed_pipelines
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Admins can manage all closed pipelines
CREATE POLICY "Admins can manage closed pipelines"
ON public.closed_pipelines
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create triggers
CREATE TRIGGER update_pipeline_feedback_updated_at
BEFORE UPDATE ON public.pipeline_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to mark feedback as completed
CREATE OR REPLACE FUNCTION public.mark_feedback_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark the closed pipeline as feedback completed
  UPDATE public.closed_pipelines
  SET feedback_completed = true
  WHERE user_id = NEW.user_id 
    AND application_id = NEW.application_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-mark feedback as completed
CREATE TRIGGER on_feedback_completed
AFTER UPDATE ON public.pipeline_feedback
FOR EACH ROW
WHEN (NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL)
EXECUTE FUNCTION public.mark_feedback_completed();
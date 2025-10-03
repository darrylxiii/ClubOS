-- Create match_scores table for detailed job matching analysis
CREATE TABLE public.match_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id TEXT NOT NULL,
  overall_score INTEGER NOT NULL,
  required_criteria_met JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_criteria_total INTEGER NOT NULL DEFAULT 0,
  preferred_criteria_met JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferred_criteria_total INTEGER NOT NULL DEFAULT 0,
  club_match_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  club_match_score INTEGER NOT NULL DEFAULT 0,
  additional_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
  hard_stops JSONB NOT NULL DEFAULT '[]'::jsonb,
  quick_wins JSONB NOT NULL DEFAULT '[]'::jsonb,
  longer_term_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, job_id)
);

-- Enable RLS
ALTER TABLE public.match_scores ENABLE ROW LEVEL SECURITY;

-- Users can view their own match scores
CREATE POLICY "Users can view their own match scores"
ON public.match_scores
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own match scores
CREATE POLICY "Users can insert their own match scores"
ON public.match_scores
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own match scores
CREATE POLICY "Users can update their own match scores"
ON public.match_scores
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_match_scores_user_job ON public.match_scores(user_id, job_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_match_scores_updated_at
BEFORE UPDATE ON public.match_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
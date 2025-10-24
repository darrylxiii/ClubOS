-- Create assessment_results table to store all user assessment data
CREATE TABLE public.assessment_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  assessment_id TEXT NOT NULL,
  assessment_name TEXT NOT NULL,
  assessment_type TEXT NOT NULL,
  results_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  score NUMERIC,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;

-- Users can insert their own assessment results
CREATE POLICY "Users can create their own assessment results"
ON public.assessment_results
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own assessment results
CREATE POLICY "Users can view their own assessment results"
ON public.assessment_results
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own assessment results
CREATE POLICY "Users can update their own assessment results"
ON public.assessment_results
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all assessment results
CREATE POLICY "Admins can view all assessment results"
ON public.assessment_results
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage all assessment results
CREATE POLICY "Admins can manage all assessment results"
ON public.assessment_results
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_assessment_results_user_id ON public.assessment_results(user_id);
CREATE INDEX idx_assessment_results_assessment_id ON public.assessment_results(assessment_id);
CREATE INDEX idx_assessment_results_completed_at ON public.assessment_results(completed_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_assessment_results_updated_at
BEFORE UPDATE ON public.assessment_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
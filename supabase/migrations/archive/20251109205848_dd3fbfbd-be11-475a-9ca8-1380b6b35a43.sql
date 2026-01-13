-- Create assessment_templates table for custom assessments
CREATE TABLE public.assessment_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('personality', 'skills', 'culture', 'technical', 'custom', 'strategic')),
  icon TEXT DEFAULT '📋',
  estimated_time INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT false,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assessment_assignments table to track sent assessments
CREATE TABLE public.assessment_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('built-in', 'custom')),
  assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'expired')),
  completed_at TIMESTAMP WITH TIME ZONE,
  result_id UUID,
  notes TEXT,
  company_id UUID,
  job_id UUID,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assessment_analytics table for aggregate metrics
CREATE TABLE public.assessment_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  date DATE NOT NULL,
  total_attempts INTEGER NOT NULL DEFAULT 0,
  total_completions INTEGER NOT NULL DEFAULT 0,
  avg_score DECIMAL(5,2),
  avg_time_spent INTEGER,
  completion_rate DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, date)
);

-- Add new columns to assessment_results table
ALTER TABLE public.assessment_results 
ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES public.assessment_assignments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER,
ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_latest BOOLEAN DEFAULT true;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assessment_templates_created_by ON public.assessment_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_assessment_templates_category ON public.assessment_templates(category);
CREATE INDEX IF NOT EXISTS idx_assessment_templates_is_active ON public.assessment_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_assessment_assignments_assigned_to ON public.assessment_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_assigned_by ON public.assessment_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_status ON public.assessment_assignments(status);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_due_date ON public.assessment_assignments(due_date);

CREATE INDEX IF NOT EXISTS idx_assessment_analytics_assessment_id ON public.assessment_analytics(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_analytics_date ON public.assessment_analytics(date);

CREATE INDEX IF NOT EXISTS idx_assessment_results_assignment_id ON public.assessment_results(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_is_latest ON public.assessment_results(is_latest);

-- Enable Row Level Security
ALTER TABLE public.assessment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assessment_templates
CREATE POLICY "Users can view public templates"
  ON public.assessment_templates FOR SELECT
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Admins can create templates"
  ON public.assessment_templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.candidate_profiles 
      WHERE user_id = auth.uid() AND current_role = 'admin'
    )
  );

CREATE POLICY "Creators can update their templates"
  ON public.assessment_templates FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creators can delete their templates"
  ON public.assessment_templates FOR DELETE
  USING (created_by = auth.uid());

-- RLS Policies for assessment_assignments
CREATE POLICY "Users can view their assignments"
  ON public.assessment_assignments FOR SELECT
  USING (
    assigned_to = auth.uid() OR 
    assigned_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.candidate_profiles 
      WHERE user_id = auth.uid() AND current_role IN ('admin', 'partner')
    )
  );

CREATE POLICY "Admins and partners can create assignments"
  ON public.assessment_assignments FOR INSERT
  WITH CHECK (
    assigned_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.candidate_profiles 
      WHERE user_id = auth.uid() AND current_role IN ('admin', 'partner')
    )
  );

CREATE POLICY "Assigners can update their assignments"
  ON public.assessment_assignments FOR UPDATE
  USING (assigned_by = auth.uid())
  WITH CHECK (assigned_by = auth.uid());

CREATE POLICY "Assigned users can update status"
  ON public.assessment_assignments FOR UPDATE
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- RLS Policies for assessment_analytics
CREATE POLICY "Admins can view analytics"
  ON public.assessment_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.candidate_profiles 
      WHERE user_id = auth.uid() AND current_role IN ('admin', 'partner')
    )
  );

CREATE POLICY "System can insert analytics"
  ON public.assessment_analytics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update analytics"
  ON public.assessment_analytics FOR UPDATE
  USING (true);

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assessment_templates_updated_at
  BEFORE UPDATE ON public.assessment_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assessment_assignments_updated_at
  BEFORE UPDATE ON public.assessment_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assessment_analytics_updated_at
  BEFORE UPDATE ON public.assessment_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-update assignment status based on due date
CREATE OR REPLACE FUNCTION public.update_expired_assignments()
RETURNS void AS $$
BEGIN
  UPDATE public.assessment_assignments
  SET status = 'expired'
  WHERE status = 'pending' 
    AND due_date IS NOT NULL 
    AND due_date < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
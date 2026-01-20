-- Create table for storing custom pipeline configurations per job
CREATE TABLE public.job_pipelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  position TEXT NOT NULL,
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for user applications with pipeline tracking
CREATE TABLE public.applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  position TEXT NOT NULL,
  current_stage_index INTEGER NOT NULL DEFAULT 0,
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Policies for job_pipelines (public read, admin write)
CREATE POLICY "Anyone can view job pipelines"
ON public.job_pipelines
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage job pipelines"
ON public.job_pipelines
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policies for applications
CREATE POLICY "Users can view their own applications"
ON public.applications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own applications"
ON public.applications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own applications"
ON public.applications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all applications"
ON public.applications
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_job_pipelines_updated_at
BEFORE UPDATE ON public.job_pipelines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
BEFORE UPDATE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
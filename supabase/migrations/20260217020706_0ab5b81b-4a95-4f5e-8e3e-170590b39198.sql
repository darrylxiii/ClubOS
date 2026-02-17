-- Task templates table
CREATE TABLE public.task_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_priority TEXT DEFAULT 'medium',
  default_task_type TEXT DEFAULT 'general',
  default_labels TEXT[] DEFAULT '{}',
  default_estimated_minutes INTEGER,
  template_data JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates" ON public.task_templates
  FOR SELECT USING (auth.uid() = created_by OR is_shared = true);

CREATE POLICY "Users can create templates" ON public.task_templates
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own templates" ON public.task_templates
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own templates" ON public.task_templates
  FOR DELETE USING (auth.uid() = created_by);

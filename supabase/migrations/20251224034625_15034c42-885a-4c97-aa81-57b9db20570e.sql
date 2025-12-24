-- Add time tracking and attachment columns to unified_tasks
ALTER TABLE public.unified_tasks 
ADD COLUMN IF NOT EXISTS time_tracked_minutes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS timer_running boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS timer_started_at timestamptz;

-- Create task_attachments table for file attachments
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.unified_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on task_attachments
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_attachments
CREATE POLICY "Users can view attachments on accessible tasks"
ON public.task_attachments FOR SELECT
USING (true);

CREATE POLICY "Users can add attachments"
ON public.task_attachments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attachments"
ON public.task_attachments FOR DELETE
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS task_attachments_task_id_idx ON public.task_attachments(task_id);

-- Create full-text search index on unified_tasks
CREATE INDEX IF NOT EXISTS unified_tasks_title_search_idx 
ON public.unified_tasks 
USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Create storage bucket for task attachments if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for task attachments
CREATE POLICY "Anyone can view task attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-attachments');

CREATE POLICY "Authenticated users can upload task attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own task attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
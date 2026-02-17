
CREATE TABLE public.task_completion_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.unified_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  time_spent_minutes INTEGER,
  difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 10),
  outcome_rating INTEGER CHECK (outcome_rating BETWEEN 1 AND 5),
  blockers TEXT[],
  improvement_suggestions TEXT[],
  notes TEXT,
  skipped BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_completion_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback"
  ON public.task_completion_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback"
  ON public.task_completion_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_task_completion_feedback_task_id ON public.task_completion_feedback(task_id);
CREATE INDEX idx_task_completion_feedback_user_id ON public.task_completion_feedback(user_id);
CREATE INDEX idx_task_completion_feedback_completed_at ON public.task_completion_feedback(completed_at);

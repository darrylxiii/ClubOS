
-- Table for persisting STAR method interview prep answers
CREATE TABLE public.interview_prep_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  question TEXT,
  situation TEXT,
  task TEXT,
  action TEXT,
  result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.interview_prep_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own prep answers"
  ON public.interview_prep_answers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own prep answers"
  ON public.interview_prep_answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prep answers"
  ON public.interview_prep_answers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prep answers"
  ON public.interview_prep_answers FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_interview_prep_answers_updated_at
  BEFORE UPDATE ON public.interview_prep_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

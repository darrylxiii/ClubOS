-- Create milestone_comments table for contract milestone discussions
CREATE TABLE IF NOT EXISTS public.milestone_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.project_milestones(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.milestone_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view comments for milestones in their contracts"
  ON public.milestone_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_milestones pm
      JOIN public.project_contracts pc ON pm.contract_id = pc.id
      WHERE pm.id = milestone_comments.milestone_id
      AND (pc.freelancer_id = auth.uid() OR pc.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can create comments for milestones in their contracts"
  ON public.milestone_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.project_milestones pm
      JOIN public.project_contracts pc ON pm.contract_id = pc.id
      WHERE pm.id = milestone_id
      AND (pc.freelancer_id = auth.uid() OR pc.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own comments"
  ON public.milestone_comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON public.milestone_comments FOR DELETE
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_milestone_comments_milestone_id ON public.milestone_comments(milestone_id);
CREATE INDEX idx_milestone_comments_user_id ON public.milestone_comments(user_id);
CREATE INDEX idx_milestone_comments_created_at ON public.milestone_comments(created_at DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_milestone_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_milestone_comments_updated_at
  BEFORE UPDATE ON public.milestone_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_milestone_comments_updated_at();



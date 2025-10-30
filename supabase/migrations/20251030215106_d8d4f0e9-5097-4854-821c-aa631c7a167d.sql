-- Add resolution tracking columns to user_feedback table
ALTER TABLE public.user_feedback
ADD COLUMN resolution_status TEXT DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'acknowledged', 'in_progress', 'fixed', 'wont_fix')),
ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN resolved_by UUID REFERENCES auth.users(id),
ADD COLUMN resolution_message TEXT,
ADD COLUMN resolution_conversation_id UUID REFERENCES public.conversations(id);

-- Create indexes for better query performance
CREATE INDEX idx_user_feedback_resolution_status ON public.user_feedback(resolution_status);
CREATE INDEX idx_user_feedback_resolved_by ON public.user_feedback(resolved_by);

-- Add comment explaining the resolution workflow
COMMENT ON COLUMN public.user_feedback.resolution_status IS 'Tracks the status of feedback: pending, acknowledged, in_progress, fixed, wont_fix';
COMMENT ON COLUMN public.user_feedback.resolution_conversation_id IS 'Links to the conversation created when responding to this feedback';

-- RLS Policy: Only admins can update resolution fields
CREATE POLICY "admins_can_resolve_feedback" ON public.user_feedback
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
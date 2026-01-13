-- Create user_feedback table
CREATE TABLE public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 10),
  comment TEXT,
  page_path TEXT NOT NULL,
  page_title TEXT NOT NULL,
  navigation_trail JSONB DEFAULT '[]'::jsonb,
  is_reviewed BOOLEAN DEFAULT false,
  admin_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users can insert their own feedback
CREATE POLICY "Users can submit feedback"
ON public.user_feedback
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own feedback
CREATE POLICY "Users can view own feedback"
ON public.user_feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
ON public.user_feedback
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Admins can update feedback (mark as reviewed, add notes)
CREATE POLICY "Admins can update feedback"
ON public.user_feedback
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_user_feedback_submitted_at ON public.user_feedback(submitted_at DESC);
CREATE INDEX idx_user_feedback_rating ON public.user_feedback(rating);
CREATE INDEX idx_user_feedback_page_path ON public.user_feedback(page_path);
CREATE INDEX idx_user_feedback_is_reviewed ON public.user_feedback(is_reviewed);
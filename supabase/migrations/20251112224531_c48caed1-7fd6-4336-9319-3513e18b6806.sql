-- Create error_logs table for centralized error tracking
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL CHECK (error_type IN ('react', 'api', 'edge_function', 'database', 'network', 'unknown')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  error_message TEXT NOT NULL,
  error_stack TEXT,
  component_name TEXT,
  page_url TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for common queries
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX idx_error_logs_severity ON public.error_logs(severity);
CREATE INDEX idx_error_logs_resolved ON public.error_logs(resolved);
CREATE INDEX idx_error_logs_error_type ON public.error_logs(error_type);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can read all error logs
CREATE POLICY "Admins can read all error logs"
  ON public.error_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Users can read their own error logs
CREATE POLICY "Users can read their own error logs"
  ON public.error_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: System can insert error logs (authenticated users and anon for guest errors)
CREATE POLICY "Anyone can insert error logs"
  ON public.error_logs
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Policy: Admins can update error logs (mark as resolved)
CREATE POLICY "Admins can update error logs"
  ON public.error_logs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
-- Add missing columns to user_activity_tracking
ALTER TABLE public.user_activity_tracking 
ADD COLUMN IF NOT EXISTS action_type TEXT DEFAULT 'page_view';

-- Add missing columns to performance_metrics  
ALTER TABLE public.performance_metrics 
ADD COLUMN IF NOT EXISTS metric_name TEXT;

-- Fix error_logs RLS to allow inserts for debugging
DROP POLICY IF EXISTS "Allow service role to insert error_logs" ON public.error_logs;
DROP POLICY IF EXISTS "Allow any insert to error_logs" ON public.error_logs;
DROP POLICY IF EXISTS "error_logs_insert_policy" ON public.error_logs;

-- Allow authenticated users to insert their own error logs
CREATE POLICY "Users can insert their own error logs" ON public.error_logs
FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Allow authenticated users to insert error logs without user_id (for anonymous errors)
CREATE POLICY "Allow anonymous error logging" ON public.error_logs
FOR INSERT WITH CHECK (user_id IS NULL);
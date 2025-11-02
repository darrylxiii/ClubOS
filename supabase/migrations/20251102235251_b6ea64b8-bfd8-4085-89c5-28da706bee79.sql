-- Add missing columns to notifications table
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('success', 'warning', 'error', 'info', 'update')) DEFAULT 'info',
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Update existing rows
UPDATE public.notifications SET category = 'info' WHERE category IS NULL;
UPDATE public.notifications SET is_archived = false WHERE is_archived IS NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_category ON public.notifications(user_id, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_archived ON public.notifications(user_id, is_archived, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read_status ON public.notifications(user_id, is_read, created_at DESC);

-- Add RLS policy for archive
DROP POLICY IF EXISTS "Users can archive their own notifications" ON public.notifications;
CREATE POLICY "Users can archive their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
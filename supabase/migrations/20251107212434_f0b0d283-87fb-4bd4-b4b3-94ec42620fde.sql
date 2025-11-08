-- Update the type CHECK constraint to include 'mention'
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('task', 'message', 'application', 'interview', 'system', 'mention'));

-- Update the category CHECK constraint to include 'notes'  
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_category_check;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_category_check
CHECK (category IN ('success', 'warning', 'error', 'info', 'update', 'notes'));
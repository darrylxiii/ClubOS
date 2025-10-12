-- Fix foreign key relationship for unified_task_assignees to profiles
ALTER TABLE public.unified_task_assignees 
DROP CONSTRAINT IF EXISTS unified_task_assignees_user_id_fkey;

ALTER TABLE public.unified_task_assignees
ADD CONSTRAINT unified_task_assignees_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
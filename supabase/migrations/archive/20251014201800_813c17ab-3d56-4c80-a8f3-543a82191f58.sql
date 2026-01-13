-- Drop the incorrect foreign key pointing to auth.users
ALTER TABLE public.courses
DROP CONSTRAINT IF EXISTS courses_created_by_fkey;

-- Add correct foreign key pointing to profiles
ALTER TABLE public.courses
ADD CONSTRAINT courses_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;
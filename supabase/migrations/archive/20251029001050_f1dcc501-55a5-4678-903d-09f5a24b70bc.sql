
-- Drop the existing restrictive SELECT policy for creators
DROP POLICY IF EXISTS "Creators can view their modules" ON public.modules;

-- Create a more comprehensive policy that allows:
-- 1. Anyone to view published modules
-- 2. Course owners to view all modules in their courses (published or not)
-- 3. Module creators to view their own modules
-- 4. Module experts to view modules they're assigned to
CREATE POLICY "View modules policy"
ON public.modules
FOR SELECT
USING (
  is_published = true 
  OR created_by = auth.uid()
  OR is_module_expert(auth.uid(), id)
  OR EXISTS (
    SELECT 1 FROM courses 
    WHERE courses.id = modules.course_id 
    AND courses.created_by = auth.uid()
  )
);

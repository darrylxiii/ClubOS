
-- Drop the restrictive expert-only insert policy for modules
DROP POLICY IF EXISTS "Experts can create modules" ON public.modules;

-- Create a new policy allowing authenticated users to create modules for their courses
CREATE POLICY "Course creators can create modules"
ON public.modules
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = modules.course_id
    AND courses.created_by = auth.uid()
  )
);

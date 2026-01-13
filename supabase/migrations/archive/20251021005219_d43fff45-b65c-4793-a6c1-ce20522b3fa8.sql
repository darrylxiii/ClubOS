-- Drop existing problematic policies
DROP POLICY IF EXISTS "Creators can view their modules" ON public.modules;
DROP POLICY IF EXISTS "Course creators can create modules" ON public.modules;
DROP POLICY IF EXISTS "Module experts can update" ON public.modules;

-- Create security definer function to check if user is module expert
CREATE OR REPLACE FUNCTION public.is_module_expert(_user_id uuid, _module_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM module_experts me
    JOIN expert_profiles ep ON me.expert_id = ep.id
    WHERE me.module_id = _module_id
      AND ep.user_id = _user_id
  )
$$;

-- Create security definer function to check if user owns the course
CREATE OR REPLACE FUNCTION public.is_course_owner(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM courses
    WHERE id = _course_id
      AND created_by = _user_id
  )
$$;

-- Create security definer function to get module's course_id
CREATE OR REPLACE FUNCTION public.get_module_course_id(_module_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT course_id
  FROM modules
  WHERE id = _module_id
  LIMIT 1
$$;

-- Recreate policies using security definer functions
CREATE POLICY "Creators can view their modules"
ON public.modules
FOR SELECT
USING (
  created_by = auth.uid() 
  OR public.is_module_expert(auth.uid(), id)
);

CREATE POLICY "Course creators can create modules"
ON public.modules
FOR INSERT
WITH CHECK (
  created_by = auth.uid() 
  AND public.is_course_owner(auth.uid(), course_id)
);

CREATE POLICY "Module experts can update"
ON public.modules
FOR UPDATE
USING (
  created_by = auth.uid() 
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.is_module_expert(auth.uid(), id)
);

-- Create delete policy as well
CREATE POLICY "Course owners can delete modules"
ON public.modules
FOR DELETE
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
-- Create security definer function to check user storage permissions
CREATE OR REPLACE FUNCTION public.user_has_storage_role(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_roles.user_id = user_has_storage_role.user_id
    AND user_roles.role IN ('admin', 'partner', 'strategist')
  );
$$;

-- Drop existing problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admin/Partner can upload candidate resumes" ON storage.objects;
DROP POLICY IF EXISTS "Admin/Partner can view candidate resumes" ON storage.objects;
DROP POLICY IF EXISTS "Admin/Partner can delete candidate resumes" ON storage.objects;
DROP POLICY IF EXISTS "Admin/Partner can update candidate resumes" ON storage.objects;

-- Create new simplified policies using security definer function
CREATE POLICY "Allow authorized users to insert resumes"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'resumes' 
  AND public.user_has_storage_role(auth.uid())
);

CREATE POLICY "Allow authorized users to select resumes"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'resumes' 
  AND public.user_has_storage_role(auth.uid())
);

CREATE POLICY "Allow authorized users to delete resumes"
ON storage.objects FOR DELETE
TO public
USING (
  bucket_id = 'resumes' 
  AND public.user_has_storage_role(auth.uid())
);

CREATE POLICY "Allow authorized users to update resumes"
ON storage.objects FOR UPDATE
TO public
USING (
  bucket_id = 'resumes' 
  AND public.user_has_storage_role(auth.uid())
);
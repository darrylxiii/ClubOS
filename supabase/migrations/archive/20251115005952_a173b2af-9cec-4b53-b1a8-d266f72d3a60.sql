-- Create storage bucket for interaction files
INSERT INTO storage.buckets (id, name, public)
VALUES ('interactions', 'interactions', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for interactions bucket
CREATE POLICY "Admins and strategists can upload interactions"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'interactions' AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'strategist')
  )
);

CREATE POLICY "Admins and strategists can view interactions"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'interactions' AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'strategist')
  )
);

CREATE POLICY "Admins can delete interactions"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'interactions' AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);
-- Create private bucket for admin export artifacts (manifest + SQL parts)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets b WHERE b.id = 'admin-exports'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('admin-exports', 'admin-exports', false);
  END IF;
END $$;

-- Storage policies (admin-only)
-- Note: We drop then recreate to keep migrations idempotent.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin can read admin exports') THEN
    EXECUTE 'DROP POLICY "Admin can read admin exports" ON storage.objects';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin can upload admin exports') THEN
    EXECUTE 'DROP POLICY "Admin can upload admin exports" ON storage.objects';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin can delete admin exports') THEN
    EXECUTE 'DROP POLICY "Admin can delete admin exports" ON storage.objects';
  END IF;
END $$;

CREATE POLICY "Admin can read admin exports"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'admin-exports'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  )
);

CREATE POLICY "Admin can upload admin exports"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'admin-exports'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  )
);

CREATE POLICY "Admin can delete admin exports"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'admin-exports'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  )
);

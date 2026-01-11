-- Fix permissions for adding candidates manually (Admin/Owner usage)

-- 1. Policies for candidate_profiles
-- Allow authenticated users (like admins) to create candidate profiles, even with user_id = null (standalone)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'candidate_profiles' AND policyname = 'Authenticated users can insert candidate profiles'
    ) THEN
        CREATE POLICY "Authenticated users can insert candidate profiles"
        ON candidate_profiles FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;
END $$;

-- Allow authenticated users to update profiles they created or if they are admins (simplified to authenticated for now)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'candidate_profiles' AND policyname = 'Authenticated users can update candidate profiles'
    ) THEN
        CREATE POLICY "Authenticated users can update candidate profiles"
        ON candidate_profiles FOR UPDATE
        TO authenticated
        USING (true);
    END IF;
END $$;


-- 2. Policies for applications
-- Allow authenticated users to insert applications
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'applications' AND policyname = 'Authenticated users can insert applications'
    ) THEN
        CREATE POLICY "Authenticated users can insert applications"
        ON applications FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;
END $$;

-- Allow authenticated users to update applications (needed for state changes)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'applications' AND policyname = 'Authenticated users can update applications'
    ) THEN
        CREATE POLICY "Authenticated users can update applications"
        ON applications FOR UPDATE
        TO authenticated
        USING (true);
    END IF;
END $$;

-- 3. Policies for candidate_interactions (Used for logging the addition)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'candidate_interactions' AND policyname = 'Authenticated users can insert interactions'
    ) THEN
        CREATE POLICY "Authenticated users can insert interactions"
        ON candidate_interactions FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;
END $$;

-- 4. Policies for pipeline_audit_logs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'pipeline_audit_logs' AND policyname = 'Authenticated users can insert audit logs'
    ) THEN
        CREATE POLICY "Authenticated users can insert audit logs"
        ON pipeline_audit_logs FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;
END $$;

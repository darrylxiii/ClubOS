-- Phase 1-5: Enterprise Translation System Database Migrations

-- 1. Add progress_percentage to translation_generation_jobs
ALTER TABLE translation_generation_jobs 
ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;

-- 2. Add created_at timestamp if missing
ALTER TABLE translation_generation_jobs 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Create translation_sync_queue table for incremental translations
CREATE TABLE IF NOT EXISTS translation_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace TEXT NOT NULL,
  new_keys JSONB NOT NULL,
  target_languages TEXT[] DEFAULT ARRAY['nl', 'de', 'fr', 'es', 'ru', 'zh', 'ar'],
  status TEXT DEFAULT 'pending',
  priority INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_message TEXT
);

-- 4. Create translation_namespace_registry for tracking namespaces
CREATE TABLE IF NOT EXISTS translation_namespace_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace TEXT UNIQUE NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  key_count INTEGER DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable realtime for translation jobs
ALTER PUBLICATION supabase_realtime ADD TABLE translation_generation_jobs;

-- 6. Add RLS policies for new tables
ALTER TABLE translation_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_namespace_registry ENABLE ROW LEVEL SECURITY;

-- Admin can manage translation sync queue (using user_roles table)
CREATE POLICY "Admins can manage translation sync queue" ON translation_sync_queue
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Admin can manage namespace registry
CREATE POLICY "Admins can manage namespace registry" ON translation_namespace_registry
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Anyone can read namespace registry
CREATE POLICY "Anyone can read namespace registry" ON translation_namespace_registry
  FOR SELECT USING (true);

-- 7. Seed initial namespaces
INSERT INTO translation_namespace_registry (namespace, description, priority, is_active)
VALUES 
  ('common', 'Common UI elements', 1, true),
  ('auth', 'Authentication flows', 2, true),
  ('onboarding', 'Onboarding wizard', 3, true),
  ('admin', 'Admin dashboard', 4, true),
  ('analytics', 'Analytics pages', 5, true),
  ('candidates', 'Candidate management', 5, true),
  ('compliance', 'GDPR/Legal', 5, true),
  ('contracts', 'Contract management', 5, true),
  ('jobs', 'Job listings', 4, true),
  ('meetings', 'Video meetings', 4, true),
  ('messages', 'Messaging system', 4, true),
  ('partner', 'Partner portal', 4, true),
  ('settings', 'Settings pages', 5, true)
ON CONFLICT (namespace) DO UPDATE SET
  is_active = true,
  updated_at = NOW();

-- 8. Fix stuck translation jobs
UPDATE translation_generation_jobs 
SET status = 'failed', 
    error_message = 'Job timed out or was interrupted',
    completed_at = NOW()
WHERE status = 'running' 
  AND (started_at < NOW() - INTERVAL '1 hour' OR started_at IS NULL);
-- Clean up stuck job
UPDATE translation_generation_jobs 
SET status = 'failed', 
    error_message = 'System cleanup - job timed out',
    completed_at = NOW()
WHERE status = 'running' 
AND started_at < NOW() - INTERVAL '30 minutes';

-- Create brand_terms table for protected terms
CREATE TABLE IF NOT EXISTS public.brand_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  term TEXT NOT NULL,
  description TEXT,
  never_translate BOOLEAN DEFAULT true,
  translations JSONB DEFAULT '{}',
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(term)
);

-- Create translation_audit_log table
CREATE TABLE IF NOT EXISTS public.translation_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  translation_id UUID REFERENCES public.translations(id) ON DELETE SET NULL,
  namespace TEXT NOT NULL,
  language TEXT NOT NULL,
  key_path TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  action TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Add reviewed columns to translations if not exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'translations' AND column_name = 'reviewed_at') THEN
    ALTER TABLE public.translations ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'translations' AND column_name = 'reviewed_by') THEN
    ALTER TABLE public.translations ADD COLUMN reviewed_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.brand_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for brand_terms (admins only for write, all authenticated for read)
CREATE POLICY "Anyone can read brand terms" ON public.brand_terms FOR SELECT USING (true);
CREATE POLICY "Admins can manage brand terms" ON public.brand_terms FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS policies for audit log (admins can read, system writes)
CREATE POLICY "Admins can read audit log" ON public.translation_audit_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Authenticated users can insert audit log" ON public.translation_audit_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_brand_terms_term ON public.brand_terms(term);
CREATE INDEX IF NOT EXISTS idx_translation_audit_namespace ON public.translation_audit_log(namespace);
CREATE INDEX IF NOT EXISTS idx_translation_audit_language ON public.translation_audit_log(language);
CREATE INDEX IF NOT EXISTS idx_translation_audit_changed_at ON public.translation_audit_log(changed_at DESC);

-- Insert default brand terms
INSERT INTO public.brand_terms (term, description, never_translate, priority) VALUES
('The Quantum Club', 'Platform brand name', true, 100),
('TQC', 'Platform abbreviation', true, 100),
('QUIN', 'AI assistant name', true, 100),
('Club Pilot', 'Task engine name', true, 90),
('Club Projects', 'Freelance marketplace name', true, 90),
('Club AI', 'AI feature branding', true, 90)
ON CONFLICT (term) DO NOTHING;
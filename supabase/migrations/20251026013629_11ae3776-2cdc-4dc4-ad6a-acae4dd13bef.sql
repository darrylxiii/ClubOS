-- Create candidate_documents table for storing CVs, certificates, etc.
CREATE TABLE candidate_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('cv', 'cover_letter', 'certificate', 'portfolio', 'reference', 'other')),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_kb INTEGER,
  mime_type TEXT,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  is_verified BOOLEAN DEFAULT false,
  verification_notes TEXT,
  parsing_results JSONB,
  version_number INTEGER DEFAULT 1,
  visible_to_candidate BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_candidate_documents_candidate ON candidate_documents(candidate_id);
CREATE INDEX idx_candidate_documents_type ON candidate_documents(document_type);
CREATE INDEX idx_candidate_documents_uploaded_by ON candidate_documents(uploaded_by);

-- Enable RLS
ALTER TABLE candidate_documents ENABLE ROW LEVEL SECURITY;

-- Admins/Partners/Strategists can do everything
CREATE POLICY candidate_documents_admin_all ON candidate_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'partner', 'strategist')
    )
  );

-- Candidates can view their own visible documents
CREATE POLICY candidate_documents_candidate_view ON candidate_documents
  FOR SELECT USING (
    visible_to_candidate = true 
    AND candidate_id IN (
      SELECT id FROM candidate_profiles WHERE user_id = auth.uid()
    )
  );

-- Add profile enhancement fields to candidate_profiles
ALTER TABLE candidate_profiles 
  ADD COLUMN IF NOT EXISTS profile_completeness INTEGER DEFAULT 0 CHECK (profile_completeness >= 0 AND profile_completeness <= 100),
  ADD COLUMN IF NOT EXISTS header_media_url TEXT,
  ADD COLUMN IF NOT EXISTS header_media_type TEXT CHECK (header_media_type IN ('image', 'video')),
  ADD COLUMN IF NOT EXISTS last_profile_update TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS cv_parsed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enrichment_last_run TIMESTAMPTZ;

COMMENT ON COLUMN candidate_profiles.profile_completeness IS 'Calculated completeness score 0-100';
COMMENT ON COLUMN candidate_profiles.header_media_url IS 'Optional header image/video like user profiles';
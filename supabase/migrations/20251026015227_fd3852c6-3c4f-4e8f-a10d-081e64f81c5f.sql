-- Phase 3: Candidate Invitations Table
CREATE TABLE candidate_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE NOT NULL,
  invited_by UUID REFERENCES profiles(id) NOT NULL,
  invitation_token TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'declined')),
  sent_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message_template TEXT,
  job_context JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_candidate_invitations_candidate ON candidate_invitations(candidate_id);
CREATE INDEX idx_candidate_invitations_token ON candidate_invitations(invitation_token);
CREATE INDEX idx_candidate_invitations_status ON candidate_invitations(status);
CREATE INDEX idx_candidate_invitations_email ON candidate_invitations(email);

ALTER TABLE candidate_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY candidate_invitations_admin_all ON candidate_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'partner', 'strategist')
    )
  );

CREATE POLICY candidate_invitations_public_read ON candidate_invitations
  FOR SELECT USING (true);

-- Add invitation tracking to candidate_profiles
ALTER TABLE candidate_profiles 
  ADD COLUMN IF NOT EXISTS invitation_status TEXT DEFAULT 'not_invited' 
    CHECK (invitation_status IN ('not_invited', 'invited', 'registered', 'active')),
  ADD COLUMN IF NOT EXISTS last_invite_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS merged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS merged_from_user_id UUID REFERENCES auth.users(id);

CREATE INDEX idx_candidate_profiles_invitation_status ON candidate_profiles(invitation_status);

-- Phase 4: Candidate Notes Table
CREATE TABLE candidate_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE NOT NULL,
  note_type TEXT NOT NULL CHECK (note_type IN ('tqc_internal', 'partner_shared', 'general')),
  title TEXT,
  content TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  visibility TEXT DEFAULT 'internal' CHECK (visibility IN ('internal', 'partner', 'candidate')),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  pinned BOOLEAN DEFAULT false,
  related_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_candidate_notes_candidate ON candidate_notes(candidate_id);
CREATE INDEX idx_candidate_notes_type ON candidate_notes(note_type);
CREATE INDEX idx_candidate_notes_created_by ON candidate_notes(created_by);
CREATE INDEX idx_candidate_notes_visibility ON candidate_notes(visibility);

ALTER TABLE candidate_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY candidate_notes_tqc_internal ON candidate_notes
  FOR ALL USING (
    note_type = 'tqc_internal' AND
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'strategist')
    )
  );

CREATE POLICY candidate_notes_partner_shared ON candidate_notes
  FOR ALL USING (
    note_type = 'partner_shared' AND
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'strategist', 'partner')
    )
  );

CREATE POLICY candidate_notes_general ON candidate_notes
  FOR ALL USING (
    note_type = 'general' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY candidate_notes_candidate_read ON candidate_notes
  FOR SELECT USING (
    visibility = 'candidate' AND
    candidate_id IN (
      SELECT id FROM candidate_profiles WHERE user_id = auth.uid()
    )
  );
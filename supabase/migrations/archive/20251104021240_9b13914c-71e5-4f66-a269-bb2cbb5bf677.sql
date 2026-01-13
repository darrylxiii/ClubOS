-- Add AI tracking columns to meetings table
ALTER TABLE meetings 
ADD COLUMN IF NOT EXISTS created_by_ai BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_suggested_time BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_user_request TEXT,
ADD COLUMN IF NOT EXISTS ai_confidence_score INTEGER;

-- Create AI meeting suggestions table
CREATE TABLE IF NOT EXISTS ai_meeting_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  suggested_times JSONB NOT NULL DEFAULT '[]',
  participant_ids UUID[],
  duration_minutes INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acted_upon BOOLEAN DEFAULT FALSE
);

-- Create meeting invitations table
CREATE TABLE IF NOT EXISTS meeting_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  invitee_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_email TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'tentative')),
  response_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE ai_meeting_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_meeting_suggestions
CREATE POLICY "Users can view their own suggestions"
  ON ai_meeting_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own suggestions"
  ON ai_meeting_suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suggestions"
  ON ai_meeting_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS policies for meeting_invitations (fixed to use host_id)
CREATE POLICY "Users can view invitations they sent or received"
  ON meeting_invitations FOR SELECT
  USING (
    auth.uid() = invitee_user_id OR
    auth.uid() IN (
      SELECT host_id FROM meetings WHERE id = meeting_id
    )
  );

CREATE POLICY "Meeting hosts can create invitations"
  ON meeting_invitations FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT host_id FROM meetings WHERE id = meeting_id
    )
  );

CREATE POLICY "Invitees can update their invitation status"
  ON meeting_invitations FOR UPDATE
  USING (auth.uid() = invitee_user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_meeting_suggestions_user_id ON ai_meeting_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_meeting_suggestions_created_at ON ai_meeting_suggestions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_invitations_meeting_id ON meeting_invitations(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_invitations_invitee ON meeting_invitations(invitee_user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_invitations_status ON meeting_invitations(status);
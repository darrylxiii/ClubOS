-- Create call_invitations table for call signaling
CREATE TABLE public.call_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.video_call_sessions(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  caller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL CHECK (call_type IN ('audio', 'video')),
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'accepted', 'declined', 'missed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.call_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Conversation participants can view invitations
CREATE POLICY "Participants can view call invitations"
ON public.call_invitations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = call_invitations.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Policy: Caller can insert invitations
CREATE POLICY "Caller can create invitations"
ON public.call_invitations
FOR INSERT
WITH CHECK (caller_id = auth.uid());

-- Policy: Participants can update invitation status
CREATE POLICY "Participants can update invitations"
ON public.call_invitations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = call_invitations.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_invitations;

-- Create index for faster queries
CREATE INDEX idx_call_invitations_conversation ON public.call_invitations(conversation_id);
CREATE INDEX idx_call_invitations_status ON public.call_invitations(status);
CREATE INDEX idx_call_invitations_created ON public.call_invitations(created_at DESC);
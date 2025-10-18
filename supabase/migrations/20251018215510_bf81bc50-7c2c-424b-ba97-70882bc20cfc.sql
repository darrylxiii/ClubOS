-- Drop existing problematic policies on meetings table
DROP POLICY IF EXISTS "Users can view meetings they host or participate in" ON public.meetings;
DROP POLICY IF EXISTS "Users can create meetings" ON public.meetings;
DROP POLICY IF EXISTS "Hosts can update their meetings" ON public.meetings;
DROP POLICY IF EXISTS "Hosts can delete their meetings" ON public.meetings;

-- Create simple, non-recursive policies for meetings
CREATE POLICY "Users can view meetings they host"
ON public.meetings
FOR SELECT
USING (auth.uid() = host_id);

CREATE POLICY "Users can view meetings they participate in"
ON public.meetings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.meeting_participants
    WHERE meeting_participants.meeting_id = meetings.id
    AND meeting_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create meetings"
ON public.meetings
FOR INSERT
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update meetings"
ON public.meetings
FOR UPDATE
USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete meetings"
ON public.meetings
FOR DELETE
USING (auth.uid() = host_id);

-- Ensure meeting_participants policies are correct
DROP POLICY IF EXISTS "Participants can view their participations" ON public.meeting_participants;
DROP POLICY IF EXISTS "Hosts can manage participants" ON public.meeting_participants;
DROP POLICY IF EXISTS "System can add participants" ON public.meeting_participants;

CREATE POLICY "Users can view their participations"
ON public.meeting_participants
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Hosts can view meeting participants"
ON public.meeting_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.meetings
    WHERE meetings.id = meeting_participants.meeting_id
    AND meetings.host_id = auth.uid()
  )
);

CREATE POLICY "System can add participants"
ON public.meeting_participants
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Hosts can manage participants"
ON public.meeting_participants
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.meetings
    WHERE meetings.id = meeting_participants.meeting_id
    AND meetings.host_id = auth.uid()
  )
);
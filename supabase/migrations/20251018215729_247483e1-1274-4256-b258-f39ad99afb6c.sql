-- Drop all meeting-related policies to start fresh
DROP POLICY IF EXISTS "Users can view meetings they host" ON public.meetings;
DROP POLICY IF EXISTS "Users can view meetings they participate in" ON public.meetings;
DROP POLICY IF EXISTS "Users can create meetings" ON public.meetings;
DROP POLICY IF EXISTS "Hosts can update meetings" ON public.meetings;
DROP POLICY IF EXISTS "Hosts can delete meetings" ON public.meetings;

DROP POLICY IF EXISTS "Users can view their participations" ON public.meeting_participants;
DROP POLICY IF EXISTS "Hosts can view meeting participants" ON public.meeting_participants;
DROP POLICY IF EXISTS "System can add participants" ON public.meeting_participants;
DROP POLICY IF EXISTS "Hosts can manage participants" ON public.meeting_participants;

-- Create a security definer function to check if user is meeting participant
CREATE OR REPLACE FUNCTION public.is_meeting_participant(_user_id uuid, _meeting_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meeting_participants
    WHERE meeting_id = _meeting_id
    AND user_id = _user_id
  );
$$;

-- Simple, non-recursive policies for meetings
CREATE POLICY "Users can view meetings they host"
ON public.meetings
FOR SELECT
USING (auth.uid() = host_id);

CREATE POLICY "Users can view meetings they participate in"
ON public.meetings
FOR SELECT
USING (is_meeting_participant(auth.uid(), id));

CREATE POLICY "Users can create meetings"
ON public.meetings
FOR INSERT
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their meetings"
ON public.meetings
FOR UPDATE
USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their meetings"
ON public.meetings
FOR DELETE
USING (auth.uid() = host_id);

-- Simple policies for meeting_participants (no circular reference)
CREATE POLICY "Users can view their own participations"
ON public.meeting_participants
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert participants"
ON public.meeting_participants
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own participations"
ON public.meeting_participants
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own participations"
ON public.meeting_participants
FOR DELETE
USING (auth.uid() = user_id);
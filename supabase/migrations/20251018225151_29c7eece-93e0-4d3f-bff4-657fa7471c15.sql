-- Allow anyone to view meetings by meeting code (public access for guests)
DROP POLICY IF EXISTS "Anyone can view meetings by code" ON public.meetings;

CREATE POLICY "Anyone can view meetings by code"
ON public.meetings
FOR SELECT
TO public
USING (true);

-- Allow meeting hosts to manage their meetings
DROP POLICY IF EXISTS "Hosts can manage their meetings" ON public.meetings;

CREATE POLICY "Hosts can manage their meetings"
ON public.meetings
FOR ALL
TO authenticated
USING (auth.uid() = host_id)
WITH CHECK (auth.uid() = host_id);

-- Update webrtc_signals to allow guest access
DROP POLICY IF EXISTS "Anyone can insert signals for meetings" ON public.webrtc_signals;

CREATE POLICY "Anyone can insert signals for meetings"
ON public.webrtc_signals
FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view signals for their meetings" ON public.webrtc_signals;

CREATE POLICY "Anyone can view signals for their meetings"
ON public.webrtc_signals
FOR SELECT
TO public
USING (true);

-- Update meeting_participants to allow guest insertions
DROP POLICY IF EXISTS "Anyone can join as participant" ON public.meeting_participants;

CREATE POLICY "Anyone can join as participant"
ON public.meeting_participants
FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view participants" ON public.meeting_participants;

CREATE POLICY "Anyone can view participants"
ON public.meeting_participants
FOR SELECT
TO public
USING (true);
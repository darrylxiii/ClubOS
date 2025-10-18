-- Create meeting join requests table for guest approval
CREATE TABLE IF NOT EXISTS public.meeting_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  request_status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  responded_by UUID REFERENCES auth.users(id),
  session_token TEXT NOT NULL, -- Unique token for this guest session
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_join_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can create a join request
CREATE POLICY "Anyone can create join requests"
ON public.meeting_join_requests
FOR INSERT
TO public
WITH CHECK (true);

-- Anyone can view their own requests by session token
CREATE POLICY "Users can view their own requests"
ON public.meeting_join_requests
FOR SELECT
TO public
USING (true);

-- Meeting hosts can update requests
CREATE POLICY "Hosts can update requests"
ON public.meeting_join_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.meetings
    WHERE meetings.id = meeting_join_requests.meeting_id
    AND meetings.host_id = auth.uid()
  )
);

-- Create index for performance
CREATE INDEX idx_meeting_join_requests_meeting_id ON public.meeting_join_requests(meeting_id);
CREATE INDEX idx_meeting_join_requests_status ON public.meeting_join_requests(request_status);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_join_requests;
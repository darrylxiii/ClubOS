-- Extend webrtc_signals table to support both meetings and LiveHub channels

-- Add new columns for LiveHub channels (keeping existing meeting columns for backward compat)
ALTER TABLE public.webrtc_signals
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.live_channels(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Make meeting_id nullable since we now support both meetings and channels
ALTER TABLE public.webrtc_signals
ALTER COLUMN meeting_id DROP NOT NULL;

-- Update the check constraint to ensure either meeting_id or channel_id is present
ALTER TABLE public.webrtc_signals
DROP CONSTRAINT IF EXISTS check_signal_target,
ADD CONSTRAINT check_signal_target CHECK (
  (meeting_id IS NOT NULL AND channel_id IS NULL) OR
  (meeting_id IS NULL AND channel_id IS NOT NULL)
);

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_channel_id ON public.webrtc_signals(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_from_user ON public.webrtc_signals(from_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_to_user ON public.webrtc_signals(to_user_id, created_at DESC);

-- Update RLS policies to handle both use cases
DROP POLICY IF EXISTS "Users can read signals for meetings or channels" ON public.webrtc_signals;
DROP POLICY IF EXISTS "Users can create signals for meetings or channels" ON public.webrtc_signals;

CREATE POLICY "Users can read signals for meetings or channels"
ON public.webrtc_signals FOR SELECT
USING (
  -- Allow reading meeting signals for participants (cast auth.uid() to text for comparison)
  (meeting_id IS NOT NULL AND (
    receiver_id = auth.uid()::text OR 
    sender_id = auth.uid()::text OR
    receiver_id IS NULL
  ))
  OR
  -- Allow reading channel signals for participants
  (channel_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.live_channel_participants p
    WHERE p.channel_id = webrtc_signals.channel_id
    AND p.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can create signals for meetings or channels"
ON public.webrtc_signals FOR INSERT
WITH CHECK (
  -- For meetings: sender must be the current user
  (meeting_id IS NOT NULL AND sender_id = auth.uid()::text)
  OR
  -- For channels: from_user must be current user and must be in channel
  (channel_id IS NOT NULL AND 
   from_user_id = auth.uid() AND
   EXISTS (
     SELECT 1 FROM public.live_channel_participants p
     WHERE p.channel_id = webrtc_signals.channel_id
     AND p.user_id = auth.uid()
   ))
);
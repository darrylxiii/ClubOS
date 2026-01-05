-- Phase 5: Advanced Features Database Migrations (Fixed)

-- Create meeting_breakout_rooms table if not exists
CREATE TABLE IF NOT EXISTS public.meeting_breakout_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  max_participants INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  timer_end_at TIMESTAMPTZ,
  broadcast_message TEXT,
  recall_requested BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for breakout rooms
ALTER TABLE public.meeting_breakout_rooms ENABLE ROW LEVEL SECURITY;

-- RLS policies for breakout rooms
CREATE POLICY "Users can view breakout rooms for their meetings" ON public.meeting_breakout_rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_id 
      AND (m.host_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.meeting_participants mp 
        WHERE mp.meeting_id = m.id AND mp.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Hosts can manage breakout rooms" ON public.meeting_breakout_rooms
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.meetings WHERE id = meeting_id AND host_id = auth.uid())
  );

-- Create breakout_room_participants table if not exists
CREATE TABLE IF NOT EXISTS public.breakout_room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breakout_room_id UUID REFERENCES public.meeting_breakout_rooms(id) ON DELETE CASCADE,
  participant_id UUID,
  participant_name TEXT,
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  UNIQUE(breakout_room_id, participant_id)
);

-- Enable RLS for breakout participants
ALTER TABLE public.breakout_room_participants ENABLE ROW LEVEL SECURITY;

-- RLS policies for breakout participants
CREATE POLICY "Users can view breakout participants" ON public.breakout_room_participants
  FOR SELECT USING (true);

CREATE POLICY "Users can join breakout rooms" ON public.breakout_room_participants
  FOR INSERT WITH CHECK (participant_id = auth.uid());

CREATE POLICY "Users can leave breakout rooms" ON public.breakout_room_participants
  FOR UPDATE USING (participant_id = auth.uid());

-- Add survey questions to meeting_waiting_room_config if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meeting_waiting_room_config' AND column_name = 'survey_questions') THEN
    ALTER TABLE public.meeting_waiting_room_config ADD COLUMN survey_questions JSONB DEFAULT '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meeting_waiting_room_config' AND column_name = 'template_name') THEN
    ALTER TABLE public.meeting_waiting_room_config ADD COLUMN template_name TEXT;
  END IF;
END $$;

-- Add action_items to meeting_insights if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meeting_insights' AND column_name = 'action_items') THEN
    ALTER TABLE public.meeting_insights ADD COLUMN action_items JSONB DEFAULT '[]';
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meeting_breakout_rooms_meeting_id ON public.meeting_breakout_rooms(meeting_id);
CREATE INDEX IF NOT EXISTS idx_breakout_room_participants_room_id ON public.breakout_room_participants(breakout_room_id);

-- Enable realtime for breakout rooms
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_breakout_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.breakout_room_participants;
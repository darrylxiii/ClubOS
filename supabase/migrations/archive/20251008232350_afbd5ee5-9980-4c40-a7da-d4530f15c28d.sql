-- Add message reactions table
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reactions on messages they can see"
ON public.message_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_reactions.message_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add reactions"
ON public.message_reactions FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their own reactions"
ON public.message_reactions FOR DELETE
USING (user_id = auth.uid());

-- Add online presence tracking
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  custom_status TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view presence of conversation participants"
ON public.user_presence FOR SELECT
USING (true);

CREATE POLICY "Users can update their own presence"
ON public.user_presence FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert their own presence"
ON public.user_presence FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Add message pins
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES auth.users(id);

-- Add GIF and sticker support
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS gif_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sticker_url TEXT;

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
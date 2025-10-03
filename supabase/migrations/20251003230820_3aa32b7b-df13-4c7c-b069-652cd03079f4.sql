-- Phase 1-3: Enhanced Messaging System

-- Message reactions
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Message edits history
CREATE TABLE public.message_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  previous_content text NOT NULL,
  edited_by uuid REFERENCES auth.users(id) NOT NULL,
  edited_at timestamptz DEFAULT now()
);

-- Message threads
ALTER TABLE public.messages ADD COLUMN parent_message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD COLUMN reply_count integer DEFAULT 0;

-- Message status
ALTER TABLE public.messages ADD COLUMN deleted_at timestamptz;
ALTER TABLE public.messages ADD COLUMN edited_at timestamptz;

-- Conversation enhancements
ALTER TABLE public.conversations ADD COLUMN is_pinned boolean DEFAULT false;
ALTER TABLE public.conversations ADD COLUMN pinned_at timestamptz;
ALTER TABLE public.conversations ADD COLUMN archived_at timestamptz;

-- Message templates
CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  content text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Message mentions
CREATE TABLE public.message_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  mentioned_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, mentioned_user_id)
);

-- Message translations
CREATE TABLE public.message_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  language_code text NOT NULL,
  translated_content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, language_code)
);

-- Scheduled messages
CREATE TABLE public.scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) NOT NULL,
  content text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  timezone text NOT NULL,
  status text DEFAULT 'pending',
  sent_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_reactions
CREATE POLICY "Participants can view reactions"
  ON public.message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create reactions"
  ON public.message_reactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own reactions"
  ON public.message_reactions FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for message_edits
CREATE POLICY "Participants can view edit history"
  ON public.message_edits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_edits.message_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "System can create edit history"
  ON public.message_edits FOR INSERT
  WITH CHECK (true);

-- RLS Policies for message_templates
CREATE POLICY "Company members can view templates"
  ON public.message_templates FOR SELECT
  USING (
    company_id IS NULL OR 
    is_company_member(auth.uid(), company_id) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Company members can create templates"
  ON public.message_templates FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    (company_id IS NULL OR is_company_member(auth.uid(), company_id))
  );

CREATE POLICY "Creators can update their templates"
  ON public.message_templates FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Creators can delete their templates"
  ON public.message_templates FOR DELETE
  USING (created_by = auth.uid());

-- RLS Policies for message_mentions
CREATE POLICY "Mentioned users can view mentions"
  ON public.message_mentions FOR SELECT
  USING (mentioned_user_id = auth.uid());

CREATE POLICY "Participants can view all mentions"
  ON public.message_mentions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_mentions.message_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "System can create mentions"
  ON public.message_mentions FOR INSERT
  WITH CHECK (true);

-- RLS Policies for message_translations
CREATE POLICY "Participants can view translations"
  ON public.message_translations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_translations.message_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "System can create translations"
  ON public.message_translations FOR INSERT
  WITH CHECK (true);

-- RLS Policies for scheduled_messages
CREATE POLICY "Senders can view their scheduled messages"
  ON public.scheduled_messages FOR SELECT
  USING (sender_id = auth.uid());

CREATE POLICY "Users can create scheduled messages"
  ON public.scheduled_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Senders can update their scheduled messages"
  ON public.scheduled_messages FOR UPDATE
  USING (sender_id = auth.uid() AND status = 'pending');

CREATE POLICY "Senders can delete their scheduled messages"
  ON public.scheduled_messages FOR DELETE
  USING (sender_id = auth.uid() AND status = 'pending');

-- Indexes for performance
CREATE INDEX idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON public.message_reactions(user_id);
CREATE INDEX idx_message_edits_message_id ON public.message_edits(message_id);
CREATE INDEX idx_messages_parent_message_id ON public.messages(parent_message_id);
CREATE INDEX idx_message_mentions_mentioned_user ON public.message_mentions(mentioned_user_id);
CREATE INDEX idx_message_translations_message_id ON public.message_translations(message_id);
CREATE INDEX idx_scheduled_messages_scheduled_for ON public.scheduled_messages(scheduled_for);

-- Triggers
CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update reply count
CREATE OR REPLACE FUNCTION update_reply_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_message_id IS NOT NULL THEN
    UPDATE public.messages
    SET reply_count = reply_count + 1
    WHERE id = NEW.parent_message_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_message_id IS NOT NULL THEN
    UPDATE public.messages
    SET reply_count = GREATEST(reply_count - 1, 0)
    WHERE id = OLD.parent_message_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_message_reply_count
  AFTER INSERT OR DELETE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_reply_count();
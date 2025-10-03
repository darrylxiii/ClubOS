-- Create conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'muted', 'closed', 'archived')),
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create conversation_participants table
CREATE TABLE public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('candidate', 'hiring_manager', 'strategist', 'observer')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  is_muted BOOLEAN DEFAULT FALSE,
  UNIQUE(conversation_id, user_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'ai_generated', 'escalation')),
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create message_attachments table
CREATE TABLE public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create message_notifications table
CREATE TABLE public.message_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, message_id)
);

-- Create conversation_stats table for tracking engagement
CREATE TABLE public.conversation_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE UNIQUE,
  total_messages INTEGER DEFAULT 0,
  candidate_messages INTEGER DEFAULT 0,
  hiring_manager_messages INTEGER DEFAULT 0,
  strategist_messages INTEGER DEFAULT 0,
  avg_response_time_minutes INTEGER,
  last_candidate_message_at TIMESTAMP WITH TIME ZONE,
  last_hiring_manager_message_at TIMESTAMP WITH TIME ZONE,
  needs_response_reminder BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create audit_log table for message security
CREATE TABLE public.message_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view conversations they participate in"
ON public.conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id
    AND cp.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'strategist')
);

CREATE POLICY "System can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Participants can update conversations"
ON public.conversations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id
    AND cp.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- RLS Policies for conversation_participants
CREATE POLICY "Users can view their own participation"
ON public.conversation_participants FOR SELECT
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'strategist')
);

CREATE POLICY "System can create participants"
ON public.conversation_participants FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own participation settings"
ON public.conversation_participants FOR UPDATE
USING (user_id = auth.uid());

-- RLS Policies for messages
CREATE POLICY "Participants can view messages in their conversations"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
    AND cp.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'strategist')
);

CREATE POLICY "Participants can send messages"
ON public.messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_id
    AND cp.user_id = auth.uid()
  )
  AND sender_id = auth.uid()
);

CREATE POLICY "Sender can update their own messages"
ON public.messages FOR UPDATE
USING (sender_id = auth.uid());

-- RLS Policies for message_attachments
CREATE POLICY "Participants can view attachments"
ON public.message_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_attachments.message_id
    AND cp.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can create attachments for their messages"
ON public.message_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_id
    AND m.sender_id = auth.uid()
  )
);

-- RLS Policies for message_notifications
CREATE POLICY "Users can view their own notifications"
ON public.message_notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
ON public.message_notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
ON public.message_notifications FOR UPDATE
USING (user_id = auth.uid());

-- RLS Policies for conversation_stats
CREATE POLICY "Participants can view conversation stats"
ON public.conversation_stats FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_stats.conversation_id
    AND cp.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'strategist')
);

CREATE POLICY "System can manage conversation stats"
ON public.conversation_stats FOR ALL
USING (true)
WITH CHECK (true);

-- RLS Policies for audit_log
CREATE POLICY "Admins can view audit logs"
ON public.message_audit_log FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can create audit logs"
ON public.message_audit_log FOR INSERT
WITH CHECK (true);

-- Create function to update conversation last_message_at
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- Create trigger for updating conversation timestamp
CREATE TRIGGER update_conversation_timestamp
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_last_message();

-- Create function to update conversation stats
CREATE OR REPLACE FUNCTION public.update_conversation_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_role TEXT;
BEGIN
  -- Get sender role
  SELECT cp.role INTO sender_role
  FROM public.conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id
  AND cp.user_id = NEW.sender_id;

  -- Insert or update stats
  INSERT INTO public.conversation_stats (conversation_id, total_messages)
  VALUES (NEW.conversation_id, 1)
  ON CONFLICT (conversation_id)
  DO UPDATE SET
    total_messages = conversation_stats.total_messages + 1,
    candidate_messages = CASE WHEN sender_role = 'candidate' 
      THEN conversation_stats.candidate_messages + 1 
      ELSE conversation_stats.candidate_messages END,
    hiring_manager_messages = CASE WHEN sender_role = 'hiring_manager' 
      THEN conversation_stats.hiring_manager_messages + 1 
      ELSE conversation_stats.hiring_manager_messages END,
    strategist_messages = CASE WHEN sender_role = 'strategist' 
      THEN conversation_stats.strategist_messages + 1 
      ELSE conversation_stats.strategist_messages END,
    last_candidate_message_at = CASE WHEN sender_role = 'candidate' 
      THEN NEW.created_at 
      ELSE conversation_stats.last_candidate_message_at END,
    last_hiring_manager_message_at = CASE WHEN sender_role = 'hiring_manager' 
      THEN NEW.created_at 
      ELSE conversation_stats.last_hiring_manager_message_at END,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Create trigger for updating stats
CREATE TRIGGER update_stats_on_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_stats();

-- Create function to create notifications for new messages
CREATE OR REPLACE FUNCTION public.create_message_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create notifications for all participants except sender
  INSERT INTO public.message_notifications (user_id, message_id)
  SELECT cp.user_id, NEW.id
  FROM public.conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id
  AND cp.user_id != NEW.sender_id
  AND cp.notifications_enabled = true
  AND cp.is_muted = false;

  RETURN NEW;
END;
$$;

-- Create trigger for creating notifications
CREATE TRIGGER create_notifications_on_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.create_message_notifications();

-- Create indexes for performance
CREATE INDEX idx_conversations_application_id ON public.conversations(application_id);
CREATE INDEX idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_message_notifications_user_id ON public.message_notifications(user_id);
CREATE INDEX idx_message_notifications_is_read ON public.message_notifications(is_read);
CREATE INDEX idx_conversation_stats_conversation_id ON public.conversation_stats(conversation_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
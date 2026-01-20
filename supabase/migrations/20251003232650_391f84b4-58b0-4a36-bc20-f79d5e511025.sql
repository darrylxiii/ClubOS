-- Make application_id nullable in conversations table
ALTER TABLE public.conversations ALTER COLUMN application_id DROP NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);

-- Add message priority and sentiment fields for Phase 5
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sentiment_score real;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_urgent boolean DEFAULT false;

-- Add voice/video message support
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'text';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_duration integer;

-- Add read receipts table for Phase 4
CREATE TABLE IF NOT EXISTS public.message_read_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  read_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Add conversation analytics table
CREATE TABLE IF NOT EXISTS public.conversation_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  avg_response_time_seconds integer,
  total_messages integer DEFAULT 0,
  sentiment_trend jsonb DEFAULT '[]'::jsonb,
  peak_activity_hours jsonb DEFAULT '[]'::jsonb,
  last_calculated_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id)
);

-- Add message retention policy
CREATE TABLE IF NOT EXISTS public.message_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  retention_days integer NOT NULL DEFAULT 365,
  auto_archive boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_retention_policies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for read receipts
CREATE POLICY "Participants can view read receipts"
  ON public.message_read_receipts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_read_receipts.message_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own read receipts"
  ON public.message_read_receipts FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for analytics
CREATE POLICY "Participants can view conversation analytics"
  ON public.conversation_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_analytics.conversation_id 
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage analytics"
  ON public.conversation_analytics FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for retention policies
CREATE POLICY "Company members can view retention policies"
  ON public.message_retention_policies FOR SELECT
  USING (
    company_id IS NULL OR 
    is_company_member(auth.uid(), company_id) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Company admins can manage retention policies"
  ON public.message_retention_policies FOR ALL
  USING (
    has_company_role(auth.uid(), company_id, 'owner'::text) OR 
    has_company_role(auth.uid(), company_id, 'admin'::text) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_read_receipts_message ON public.message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_user ON public.message_read_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_priority ON public.messages(priority) WHERE is_urgent = true;
CREATE INDEX IF NOT EXISTS idx_messages_media_type ON public.messages(media_type);

-- Trigger for read receipts
CREATE OR REPLACE FUNCTION create_read_receipt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create read receipt when notification is marked as read
  IF NEW.is_read = true AND OLD.is_read = false THEN
    INSERT INTO public.message_read_receipts (message_id, user_id, read_at)
    VALUES (NEW.message_id, NEW.user_id, NEW.read_at)
    ON CONFLICT (message_id, user_id) DO UPDATE
    SET read_at = NEW.read_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_read_receipt_on_notification
  AFTER UPDATE ON public.message_notifications
  FOR EACH ROW
  EXECUTE FUNCTION create_read_receipt();

-- Trigger to update conversation analytics
CREATE OR REPLACE FUNCTION update_conversation_analytics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.conversation_analytics (
    conversation_id,
    total_messages,
    last_calculated_at
  )
  VALUES (
    NEW.conversation_id,
    1,
    NOW()
  )
  ON CONFLICT (conversation_id)
  DO UPDATE SET
    total_messages = conversation_analytics.total_messages + 1,
    last_calculated_at = NOW();
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_analytics_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_analytics();
-- ============================================================================
-- Phase 3: SMS Integration & Phase 2: Auto-Task Generation from Communications
-- ============================================================================

-- SMS Messages Table (without contacts reference)
CREATE TABLE IF NOT EXISTS public.sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES candidate_profiles(id) ON DELETE SET NULL,
  prospect_id uuid REFERENCES crm_prospects(id) ON DELETE SET NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  phone_number text NOT NULL,
  direction text NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  content text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'received')),
  twilio_sid text,
  sent_at timestamptz,
  delivered_at timestamptz,
  sentiment_score decimal(3,2),
  intent_classification text,
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for SMS
CREATE POLICY "Users can view SMS they own or are assigned to" ON public.sms_messages
  FOR SELECT USING (
    auth.uid() = owner_id OR
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'strategist'))
  );

CREATE POLICY "Users can create SMS messages" ON public.sms_messages
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id OR
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'strategist'))
  );

CREATE POLICY "Users can update their own SMS" ON public.sms_messages
  FOR UPDATE USING (
    auth.uid() = owner_id OR
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'strategist'))
  );

-- Indexes for SMS
CREATE INDEX IF NOT EXISTS idx_sms_phone ON public.sms_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_candidate ON public.sms_messages(candidate_id);
CREATE INDEX IF NOT EXISTS idx_sms_prospect ON public.sms_messages(prospect_id);
CREATE INDEX IF NOT EXISTS idx_sms_owner ON public.sms_messages(owner_id);
CREATE INDEX IF NOT EXISTS idx_sms_created ON public.sms_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_direction ON public.sms_messages(direction);

-- Communication Task Extraction Queue
CREATE TABLE IF NOT EXISTS public.communication_task_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  processing_status text DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  priority integer DEFAULT 5,
  error_message text,
  result jsonb,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Enable RLS
ALTER TABLE public.communication_task_queue ENABLE ROW LEVEL SECURITY;

-- Admin-only access for queue
CREATE POLICY "Admins can manage task queue" ON public.communication_task_queue
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')
  );

-- Index for queue processing
CREATE INDEX IF NOT EXISTS idx_comm_task_queue_status ON public.communication_task_queue(processing_status, priority DESC, created_at);

-- Function to queue communications for task extraction
CREATE OR REPLACE FUNCTION public.queue_communication_for_task_extraction()
RETURNS TRIGGER AS $$
BEGIN
  -- Queue inbound messages with high-intent or request patterns for task extraction
  IF NEW.direction = 'inbound' THEN
    -- Check for WhatsApp messages
    IF TG_TABLE_NAME = 'whatsapp_messages' THEN
      IF NEW.intent_classification IN ('request', 'question', 'urgent', 'follow_up', 'complaint') OR
         (NEW.sentiment_score IS NOT NULL AND NEW.sentiment_score < -0.3) THEN
        INSERT INTO public.communication_task_queue (source_table, source_id, priority)
        VALUES (TG_TABLE_NAME, NEW.id, 
          CASE 
            WHEN NEW.intent_classification = 'urgent' THEN 9
            WHEN NEW.sentiment_score < -0.5 THEN 8
            WHEN NEW.intent_classification = 'request' THEN 7
            ELSE 5
          END
        );
      END IF;
    END IF;
    
    -- Check for SMS messages
    IF TG_TABLE_NAME = 'sms_messages' THEN
      IF NEW.intent_classification IN ('request', 'question', 'urgent', 'follow_up') OR
         (NEW.sentiment_score IS NOT NULL AND NEW.sentiment_score < -0.3) THEN
        INSERT INTO public.communication_task_queue (source_table, source_id, priority)
        VALUES (TG_TABLE_NAME, NEW.id,
          CASE 
            WHEN NEW.intent_classification = 'urgent' THEN 9
            WHEN NEW.sentiment_score < -0.5 THEN 8
            ELSE 6
          END
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for task extraction
DROP TRIGGER IF EXISTS trigger_whatsapp_task_extraction ON public.whatsapp_messages;
CREATE TRIGGER trigger_whatsapp_task_extraction
  AFTER INSERT ON public.whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_communication_for_task_extraction();

DROP TRIGGER IF EXISTS trigger_sms_task_extraction ON public.sms_messages;
CREATE TRIGGER trigger_sms_task_extraction
  AFTER INSERT ON public.sms_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_communication_for_task_extraction();

-- Function to sync SMS to unified_communications
CREATE OR REPLACE FUNCTION public.sync_sms_to_unified()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.unified_communications (
    source,
    source_id,
    direction,
    content,
    subject,
    from_identifier,
    to_identifier,
    candidate_id,
    company_id,
    owner_id,
    sentiment_score,
    status,
    occurred_at
  ) VALUES (
    'sms',
    NEW.id,
    NEW.direction,
    NEW.content,
    NULL,
    CASE WHEN NEW.direction = 'inbound' THEN NEW.phone_number ELSE 'TQC' END,
    CASE WHEN NEW.direction = 'outbound' THEN NEW.phone_number ELSE 'TQC' END,
    NEW.candidate_id,
    NEW.company_id,
    NEW.owner_id,
    NEW.sentiment_score,
    NEW.status,
    COALESCE(NEW.sent_at, NEW.created_at)
  )
  ON CONFLICT (source, source_id) DO UPDATE SET
    content = EXCLUDED.content,
    sentiment_score = EXCLUDED.sentiment_score,
    status = EXCLUDED.status,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-sync SMS to unified communications
DROP TRIGGER IF EXISTS trigger_sms_unified_sync ON public.sms_messages;
CREATE TRIGGER trigger_sms_unified_sync
  AFTER INSERT OR UPDATE ON public.sms_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_sms_to_unified();

-- Enable realtime for SMS
ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_messages;
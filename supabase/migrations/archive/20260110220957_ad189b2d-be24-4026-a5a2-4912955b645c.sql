-- =====================================================
-- PHASE 1: Universal Communication Sync System
-- Auto-sync all communication channels to unified_communications
-- =====================================================

-- 1. Create intelligence_queue table if not exists (for embedding generation)
CREATE TABLE IF NOT EXISTS intelligence_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  processing_type TEXT NOT NULL,
  priority INTEGER DEFAULT 5,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Index for processing queue efficiently
CREATE INDEX IF NOT EXISTS idx_intelligence_queue_status_priority 
  ON intelligence_queue(status, priority DESC, created_at ASC);

-- 2. Add unique constraint to unified_communications if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unified_communications_source_unique'
  ) THEN
    ALTER TABLE unified_communications 
    ADD CONSTRAINT unified_communications_source_unique 
    UNIQUE (source_table, source_id);
  END IF;
EXCEPTION WHEN duplicate_table THEN
  NULL;
END $$;

-- 3. Create the master sync function
CREATE OR REPLACE FUNCTION sync_to_unified_communications()
RETURNS TRIGGER AS $$
DECLARE
  v_entity_type TEXT;
  v_entity_id UUID;
  v_channel TEXT;
  v_direction TEXT;
  v_subject TEXT;
  v_content_preview TEXT;
  v_sentiment NUMERIC;
  v_original_timestamp TIMESTAMPTZ;
  v_sender_id UUID;
  v_unified_id UUID;
BEGIN
  -- Route based on source table
  CASE TG_TABLE_NAME
    WHEN 'emails' THEN
      v_entity_type := 'candidate';
      v_entity_id := NEW.user_id;
      v_channel := 'email';
      v_direction := CASE WHEN NEW.inbox_type = 'sent' THEN 'outbound' ELSE 'inbound' END;
      v_subject := NEW.subject;
      v_content_preview := LEFT(NEW.snippet, 500);
      v_original_timestamp := COALESCE(NEW.email_date, NEW.created_at);
      v_sender_id := NEW.user_id;
      
    WHEN 'whatsapp_messages' THEN
      -- Lookup entity from conversation
      SELECT 
        CASE 
          WHEN wc.candidate_id IS NOT NULL THEN 'candidate' 
          WHEN wc.prospect_id IS NOT NULL THEN 'prospect'
          ELSE 'stakeholder'
        END,
        COALESCE(wc.candidate_id, wc.prospect_id, wc.stakeholder_id)
      INTO v_entity_type, v_entity_id
      FROM whatsapp_conversations wc 
      WHERE wc.id = NEW.conversation_id;
      
      v_channel := 'whatsapp';
      v_direction := COALESCE(NEW.direction, 'inbound');
      v_content_preview := LEFT(NEW.content, 500);
      v_sentiment := NEW.sentiment_score;
      v_original_timestamp := COALESCE(NEW.created_at, now());
      v_sender_id := NEW.sender_id;
      
    WHEN 'sms_messages' THEN
      v_entity_type := CASE 
        WHEN NEW.candidate_id IS NOT NULL THEN 'candidate'
        WHEN NEW.prospect_id IS NOT NULL THEN 'prospect'
        ELSE 'stakeholder'
      END;
      v_entity_id := COALESCE(NEW.candidate_id, NEW.prospect_id);
      v_channel := 'sms';
      v_direction := COALESCE(NEW.direction::TEXT, 'outbound');
      v_content_preview := LEFT(NEW.content, 500);
      v_sentiment := NEW.sentiment_score;
      v_original_timestamp := COALESCE(NEW.sent_at, NEW.created_at, now());
      v_sender_id := NEW.sender_id;
      
    WHEN 'messages' THEN
      v_entity_type := 'internal';
      v_entity_id := NEW.conversation_id;
      v_channel := 'chat';
      v_direction := 'mutual';
      v_content_preview := LEFT(NEW.content, 500);
      v_original_timestamp := COALESCE(NEW.created_at, now());
      v_sender_id := NEW.sender_id;
      
    WHEN 'dm_messages' THEN
      v_entity_type := 'internal';
      v_entity_id := NEW.conversation_id;
      v_channel := 'dm';
      v_direction := 'mutual';
      v_content_preview := LEFT(NEW.content, 500);
      v_original_timestamp := COALESCE(NEW.created_at, now());
      v_sender_id := NEW.sender_id;
      
    WHEN 'meetings' THEN
      v_entity_type := CASE 
        WHEN NEW.candidate_id IS NOT NULL THEN 'candidate'
        WHEN NEW.prospect_id IS NOT NULL THEN 'prospect'
        ELSE 'internal'
      END;
      v_entity_id := COALESCE(NEW.candidate_id, NEW.prospect_id, NEW.user_id);
      v_channel := 'meeting';
      v_direction := 'mutual';
      v_subject := NEW.title;
      v_content_preview := LEFT(COALESCE(NEW.description, NEW.notes), 500);
      v_original_timestamp := COALESCE(NEW.start_time, NEW.created_at, now());
      v_sender_id := NEW.user_id;
      
    ELSE
      -- Unknown table, skip
      RETURN NEW;
  END CASE;

  -- Skip if no entity_id (can't map to anyone)
  IF v_entity_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Insert/Update unified record
  INSERT INTO unified_communications (
    entity_type, 
    entity_id, 
    channel, 
    source_table, 
    source_id,
    direction, 
    subject, 
    content_preview, 
    sentiment_score, 
    original_timestamp,
    sender_id
  ) VALUES (
    v_entity_type, 
    v_entity_id, 
    v_channel, 
    TG_TABLE_NAME, 
    NEW.id,
    v_direction, 
    v_subject, 
    v_content_preview, 
    v_sentiment, 
    v_original_timestamp,
    v_sender_id
  )
  ON CONFLICT (source_table, source_id) DO UPDATE SET
    content_preview = EXCLUDED.content_preview,
    sentiment_score = EXCLUDED.sentiment_score,
    subject = EXCLUDED.subject,
    updated_at = now()
  RETURNING id INTO v_unified_id;

  -- Queue for embedding generation (higher priority for external comms)
  INSERT INTO intelligence_queue (
    entity_type, 
    entity_id, 
    processing_type, 
    priority, 
    metadata
  ) VALUES (
    'communication', 
    v_unified_id,
    'generate_embedding',
    CASE v_channel 
      WHEN 'email' THEN 8 
      WHEN 'whatsapp' THEN 9 
      WHEN 'sms' THEN 8
      WHEN 'meeting' THEN 7 
      ELSE 5 
    END,
    jsonb_build_object(
      'channel', v_channel, 
      'entity_type', v_entity_type,
      'source_table', TG_TABLE_NAME,
      'source_id', NEW.id
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the original insert
  RAISE WARNING 'sync_to_unified_communications failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Drop existing triggers if they exist (for idempotency)
DROP TRIGGER IF EXISTS trigger_sync_email_to_unified ON emails;
DROP TRIGGER IF EXISTS trigger_sync_whatsapp_to_unified ON whatsapp_messages;
DROP TRIGGER IF EXISTS trigger_sync_sms_to_unified ON sms_messages;
DROP TRIGGER IF EXISTS trigger_sync_messages_to_unified ON messages;
DROP TRIGGER IF EXISTS trigger_sync_dm_to_unified ON dm_messages;
DROP TRIGGER IF EXISTS trigger_sync_meetings_to_unified ON meetings;

-- 5. Create triggers for all communication tables

-- Email sync trigger
CREATE TRIGGER trigger_sync_email_to_unified
  AFTER INSERT OR UPDATE ON emails
  FOR EACH ROW EXECUTE FUNCTION sync_to_unified_communications();

-- WhatsApp sync trigger  
CREATE TRIGGER trigger_sync_whatsapp_to_unified
  AFTER INSERT ON whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION sync_to_unified_communications();

-- SMS sync trigger
CREATE TRIGGER trigger_sync_sms_to_unified
  AFTER INSERT ON sms_messages
  FOR EACH ROW EXECUTE FUNCTION sync_to_unified_communications();

-- Internal messages sync trigger
CREATE TRIGGER trigger_sync_messages_to_unified
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION sync_to_unified_communications();

-- DM messages sync trigger
CREATE TRIGGER trigger_sync_dm_to_unified
  AFTER INSERT ON dm_messages
  FOR EACH ROW EXECUTE FUNCTION sync_to_unified_communications();

-- Meetings sync trigger
CREATE TRIGGER trigger_sync_meetings_to_unified
  AFTER INSERT OR UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION sync_to_unified_communications();

-- 6. Add RLS policies for intelligence_queue
ALTER TABLE intelligence_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage intelligence_queue"
  ON intelligence_queue FOR ALL
  USING (true)
  WITH CHECK (true);

-- 7. Grant permissions
GRANT SELECT, INSERT, UPDATE ON intelligence_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE ON intelligence_queue TO service_role;
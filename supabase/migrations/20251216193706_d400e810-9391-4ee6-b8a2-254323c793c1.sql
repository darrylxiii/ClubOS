-- WhatsApp Business API Integration Schema

-- WhatsApp Business Account Configuration
CREATE TABLE whatsapp_business_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  phone_number_id TEXT NOT NULL,
  business_account_id TEXT NOT NULL,
  display_phone_number TEXT,
  verified_name TEXT,
  quality_rating TEXT, -- 'GREEN' | 'YELLOW' | 'RED'
  messaging_limit TEXT, -- 'TIER_1K' | 'TIER_10K' | 'TIER_100K' | 'UNLIMITED'
  is_active BOOLEAN DEFAULT true,
  webhook_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Message Templates (synced from Meta)
CREATE TABLE whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES whatsapp_business_accounts(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_category TEXT NOT NULL, -- 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
  language_code TEXT DEFAULT 'en',
  components JSONB, -- Header, body, footer, buttons
  example_values JSONB, -- Example parameter values
  approval_status TEXT DEFAULT 'PENDING', -- 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISABLED'
  rejection_reason TEXT,
  meta_template_id TEXT,
  quality_score NUMERIC(3,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, template_name, language_code)
);

-- WhatsApp Conversations (threads with candidates)
CREATE TABLE whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES whatsapp_business_accounts(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE SET NULL,
  candidate_phone TEXT NOT NULL,
  candidate_name TEXT,
  profile_picture_url TEXT,
  conversation_status TEXT DEFAULT 'active', -- 'active' | 'closed' | 'expired' | 'blocked'
  messaging_window_expires_at TIMESTAMPTZ, -- 24h window after last inbound message
  assigned_strategist_id UUID REFERENCES profiles(id),
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  last_message_direction TEXT, -- 'inbound' | 'outbound'
  unread_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, candidate_phone)
);

-- WhatsApp Messages
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES whatsapp_business_accounts(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE SET NULL,
  interaction_id UUID REFERENCES company_interactions(id) ON DELETE SET NULL,
  direction TEXT NOT NULL, -- 'inbound' | 'outbound'
  message_type TEXT NOT NULL, -- 'text' | 'template' | 'image' | 'document' | 'audio' | 'video' | 'sticker' | 'location' | 'contacts' | 'interactive' | 'reaction'
  wa_message_id TEXT UNIQUE,
  content TEXT, -- Text content or caption
  template_name TEXT,
  template_params JSONB,
  media_id TEXT,
  media_url TEXT,
  media_mime_type TEXT,
  media_filename TEXT,
  media_sha256 TEXT,
  reaction_emoji TEXT,
  reaction_message_id TEXT,
  context_message_id TEXT, -- Reply to message
  status TEXT DEFAULT 'pending', -- 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  status_timestamp TIMESTAMPTZ,
  error_code TEXT,
  error_message TEXT,
  sent_by UUID REFERENCES profiles(id), -- Who sent this (for outbound)
  is_automated BOOLEAN DEFAULT false,
  automation_trigger TEXT, -- What triggered the automation
  sentiment_score NUMERIC(3,2), -- AI-analyzed sentiment (-1 to 1)
  intent_classification TEXT, -- 'interested' | 'not_interested' | 'question' | 'reschedule' | 'confirm' | 'other'
  ai_analysis JSONB, -- Full AI analysis
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp Broadcast Campaigns
CREATE TABLE whatsapp_broadcast_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES whatsapp_business_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_id UUID REFERENCES whatsapp_templates(id),
  target_audience JSONB, -- Filter criteria for candidates
  recipient_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  replied_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft', -- 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused' | 'cancelled'
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Broadcast Recipients
CREATE TABLE whatsapp_broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES whatsapp_broadcast_campaigns(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES whatsapp_conversations(id),
  candidate_id UUID REFERENCES candidate_profiles(id),
  phone_number TEXT NOT NULL,
  template_params JSONB, -- Personalized params for this recipient
  message_id UUID REFERENCES whatsapp_messages(id),
  status TEXT DEFAULT 'pending', -- 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp Automation Rules
CREATE TABLE whatsapp_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES whatsapp_business_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- 'pipeline_stage_change' | 'interview_scheduled' | 'application_received' | 'offer_extended' | 'inactivity' | 'keyword_match' | 'time_based'
  trigger_config JSONB NOT NULL, -- Trigger-specific configuration
  action_type TEXT NOT NULL, -- 'send_template' | 'send_message' | 'assign_strategist' | 'create_task' | 'add_tag'
  action_config JSONB NOT NULL, -- Action-specific configuration
  template_id UUID REFERENCES whatsapp_templates(id),
  delay_minutes INTEGER DEFAULT 0, -- Delay before executing action
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Higher = runs first
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp Analytics (aggregated daily)
CREATE TABLE whatsapp_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES whatsapp_business_accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  messages_sent INTEGER DEFAULT 0,
  messages_delivered INTEGER DEFAULT 0,
  messages_read INTEGER DEFAULT 0,
  messages_failed INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  conversations_started INTEGER DEFAULT 0,
  conversations_closed INTEGER DEFAULT 0,
  templates_sent JSONB DEFAULT '{}', -- {template_name: count}
  avg_response_time_minutes NUMERIC,
  unique_contacts_reached INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, date)
);

-- Indexes for performance
CREATE INDEX idx_whatsapp_conversations_account ON whatsapp_conversations(account_id);
CREATE INDEX idx_whatsapp_conversations_candidate ON whatsapp_conversations(candidate_id);
CREATE INDEX idx_whatsapp_conversations_phone ON whatsapp_conversations(candidate_phone);
CREATE INDEX idx_whatsapp_conversations_status ON whatsapp_conversations(conversation_status);
CREATE INDEX idx_whatsapp_conversations_last_message ON whatsapp_conversations(last_message_at DESC);
CREATE INDEX idx_whatsapp_messages_conversation ON whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_messages_wa_id ON whatsapp_messages(wa_message_id);
CREATE INDEX idx_whatsapp_messages_direction ON whatsapp_messages(direction);
CREATE INDEX idx_whatsapp_messages_created ON whatsapp_messages(created_at DESC);
CREATE INDEX idx_whatsapp_templates_account ON whatsapp_templates(account_id);
CREATE INDEX idx_whatsapp_templates_status ON whatsapp_templates(approval_status);
CREATE INDEX idx_whatsapp_broadcast_status ON whatsapp_broadcast_campaigns(status);

-- Enable RLS
ALTER TABLE whatsapp_business_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_broadcast_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_broadcast_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin and strategist can manage WhatsApp accounts"
  ON whatsapp_business_accounts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admin and strategist can manage templates"
  ON whatsapp_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admin and strategist can access conversations"
  ON whatsapp_conversations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admin and strategist can access messages"
  ON whatsapp_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admin and strategist can manage broadcasts"
  ON whatsapp_broadcast_campaigns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admin and strategist can access broadcast recipients"
  ON whatsapp_broadcast_recipients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admin and strategist can manage automation rules"
  ON whatsapp_automation_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Admin and strategist can view analytics"
  ON whatsapp_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'strategist')
    )
  );

-- Enable Realtime for conversations and messages
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;

-- Trigger to update conversation on new message
CREATE OR REPLACE FUNCTION update_whatsapp_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE whatsapp_conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    last_message_direction = NEW.direction,
    unread_count = CASE 
      WHEN NEW.direction = 'inbound' THEN unread_count + 1 
      ELSE unread_count 
    END,
    messaging_window_expires_at = CASE 
      WHEN NEW.direction = 'inbound' THEN NEW.created_at + INTERVAL '24 hours'
      ELSE messaging_window_expires_at
    END,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_conversation_on_message();

-- Function to create interaction record for WhatsApp messages
CREATE OR REPLACE FUNCTION create_whatsapp_interaction()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_interaction_id UUID;
BEGIN
  -- Get company_id from account
  SELECT wba.company_id INTO v_company_id
  FROM whatsapp_business_accounts wba
  WHERE wba.id = NEW.account_id;
  
  IF v_company_id IS NOT NULL THEN
    INSERT INTO company_interactions (
      company_id,
      interaction_type,
      interaction_date,
      direction,
      summary,
      raw_content,
      status,
      is_manually_entered,
      source_metadata
    ) VALUES (
      v_company_id,
      'whatsapp',
      NEW.created_at,
      NEW.direction,
      CASE WHEN NEW.template_name IS NOT NULL 
        THEN 'Template: ' || NEW.template_name 
        ELSE LEFT(NEW.content, 200) 
      END,
      NEW.content,
      'active',
      false,
      jsonb_build_object(
        'wa_message_id', NEW.wa_message_id,
        'message_type', NEW.message_type,
        'conversation_id', NEW.conversation_id
      )
    ) RETURNING id INTO v_interaction_id;
    
    -- Update the message with interaction_id
    UPDATE whatsapp_messages SET interaction_id = v_interaction_id WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_create_whatsapp_interaction
  AFTER INSERT ON whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION create_whatsapp_interaction();

-- Updated_at triggers
CREATE TRIGGER update_whatsapp_accounts_updated_at
  BEFORE UPDATE ON whatsapp_business_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_whatsapp_conversations_updated_at
  BEFORE UPDATE ON whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_whatsapp_messages_updated_at
  BEFORE UPDATE ON whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_whatsapp_campaigns_updated_at
  BEFORE UPDATE ON whatsapp_broadcast_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_whatsapp_automation_updated_at
  BEFORE UPDATE ON whatsapp_automation_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
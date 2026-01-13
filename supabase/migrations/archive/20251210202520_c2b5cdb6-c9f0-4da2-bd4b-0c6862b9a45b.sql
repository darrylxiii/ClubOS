
-- =============================================================================
-- Enterprise CRM System - Phase 1 Database Schema
-- =============================================================================

-- CRM Campaigns table - Track email campaigns from Instantly.ai or other sources
CREATE TABLE public.crm_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'instantly', -- instantly, linkedin, manual, other
  external_id TEXT, -- Instantly.ai campaign ID
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  target_persona TEXT,
  target_industry TEXT[],
  target_company_size TEXT[],
  sequence_steps INTEGER DEFAULT 0,
  total_prospects INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_opens INTEGER DEFAULT 0,
  total_replies INTEGER DEFAULT 0,
  total_bounces INTEGER DEFAULT 0,
  reply_rate NUMERIC(5,2) DEFAULT 0,
  open_rate NUMERIC(5,2) DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  owner_id UUID REFERENCES public.profiles(id),
  company_id UUID REFERENCES public.companies(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- CRM Prospects table - Core prospect management
CREATE TABLE public.crm_prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Contact Information
  first_name TEXT,
  last_name TEXT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  email_status TEXT DEFAULT 'valid' CHECK (email_status IN ('valid', 'invalid', 'catch_all', 'unknown', 'bounced')),
  phone TEXT,
  linkedin_url TEXT,
  job_title TEXT,
  -- Company Information
  company_name TEXT,
  company_id UUID REFERENCES public.companies(id),
  company_domain TEXT,
  company_size TEXT,
  industry TEXT,
  location TEXT,
  country TEXT,
  -- CRM Fields
  stage TEXT NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'contacted', 'opened', 'replied', 'qualified', 'meeting_booked', 'proposal_sent', 'negotiation', 'closed_won', 'closed_lost', 'nurture', 'unsubscribed')),
  source TEXT NOT NULL DEFAULT 'instantly' CHECK (source IN ('instantly', 'linkedin', 'referral', 'website', 'event', 'cold_call', 'manual', 'import', 'other')),
  campaign_id UUID REFERENCES public.crm_campaigns(id),
  -- Engagement Tracking
  lead_score INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  emails_replied INTEGER DEFAULT 0,
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  last_opened_at TIMESTAMP WITH TIME ZONE,
  last_replied_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  next_followup_at TIMESTAMP WITH TIME ZONE,
  -- Qualification
  reply_sentiment TEXT CHECK (reply_sentiment IN ('hot', 'warm', 'neutral', 'cold', 'negative', 'out_of_office', 'referral', 'objection', 'unsubscribe')),
  qualified_reason TEXT,
  disqualified_reason TEXT,
  deal_value NUMERIC(12,2),
  currency TEXT DEFAULT 'EUR',
  close_probability INTEGER DEFAULT 0,
  expected_close_date DATE,
  -- Assignment
  owner_id UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  notes TEXT,
  external_id TEXT, -- Instantly.ai lead ID
  -- Linking
  stakeholder_id UUID REFERENCES public.company_stakeholders(id),
  contact_id UUID, -- Link to crm_contacts if exists
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- CRM Touchpoints table - Multi-channel interaction tracking
CREATE TABLE public.crm_touchpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID NOT NULL REFERENCES public.crm_prospects(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.crm_campaigns(id),
  -- Touchpoint Details
  channel TEXT NOT NULL CHECK (channel IN ('email', 'linkedin', 'phone', 'whatsapp', 'meeting', 'website', 'chat', 'other')),
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  touchpoint_type TEXT NOT NULL, -- sent, opened, clicked, replied, call, message, meeting, note
  -- Content
  subject TEXT,
  content TEXT,
  content_preview TEXT,
  -- Email Specific
  email_sequence_step INTEGER,
  email_template_id UUID,
  message_id TEXT, -- Email message ID for threading
  thread_id TEXT,
  -- Metrics
  opened BOOLEAN DEFAULT false,
  clicked BOOLEAN DEFAULT false,
  replied BOOLEAN DEFAULT false,
  bounced BOOLEAN DEFAULT false,
  bounce_type TEXT CHECK (bounce_type IN ('hard', 'soft', 'spam', 'invalid')),
  -- Response Analysis
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'out_of_office')),
  intent TEXT CHECK (intent IN ('interested', 'not_interested', 'maybe', 'referral', 'meeting_request', 'question', 'objection', 'unsubscribe')),
  ai_analysis JSONB DEFAULT '{}',
  -- Metadata
  performed_by UUID REFERENCES public.profiles(id),
  metadata JSONB DEFAULT '{}',
  external_id TEXT, -- Instantly.ai activity ID
  -- Timestamps
  performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- CRM Email Replies table - Detailed reply storage with AI analysis
CREATE TABLE public.crm_email_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID NOT NULL REFERENCES public.crm_prospects(id) ON DELETE CASCADE,
  touchpoint_id UUID REFERENCES public.crm_touchpoints(id),
  campaign_id UUID REFERENCES public.crm_campaigns(id),
  -- Email Content
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_email TEXT,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  body_preview TEXT,
  message_id TEXT,
  thread_id TEXT,
  in_reply_to TEXT,
  -- AI Classification
  classification TEXT NOT NULL DEFAULT 'unclassified' CHECK (classification IN ('hot_lead', 'warm_lead', 'interested', 'objection', 'not_interested', 'out_of_office', 'auto_reply', 'bounce', 'unsubscribe', 'referral', 'question', 'spam', 'unclassified')),
  sentiment_score NUMERIC(3,2) DEFAULT 0, -- -1 to 1
  confidence_score NUMERIC(3,2) DEFAULT 0, -- 0 to 1
  urgency TEXT CHECK (urgency IN ('high', 'medium', 'low')),
  -- AI Extracted Data
  extracted_data JSONB DEFAULT '{}', -- Names, dates, objections, referrals
  suggested_action TEXT,
  suggested_reply TEXT,
  ai_summary TEXT,
  ai_analysis JSONB DEFAULT '{}',
  -- Status
  is_read BOOLEAN DEFAULT false,
  is_actioned BOOLEAN DEFAULT false,
  actioned_at TIMESTAMP WITH TIME ZONE,
  actioned_by UUID REFERENCES public.profiles(id),
  action_taken TEXT,
  is_archived BOOLEAN DEFAULT false,
  is_spam BOOLEAN DEFAULT false,
  -- Metadata
  labels TEXT[] DEFAULT '{}',
  priority INTEGER DEFAULT 0,
  external_id TEXT,
  metadata JSONB DEFAULT '{}',
  -- Timestamps
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  analyzed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- CRM Assignment Rules table - Territory and round-robin assignment
CREATE TABLE public.crm_assignment_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('round_robin', 'territory', 'capacity', 'skill_based', 'manual')),
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  -- Rule Conditions (JSONB for flexibility)
  conditions JSONB DEFAULT '{}', -- industry, company_size, location, source, etc.
  -- Assignment Target
  assign_to_user_id UUID REFERENCES public.profiles(id),
  assign_to_team TEXT,
  assign_to_role TEXT,
  -- Round Robin State
  round_robin_queue UUID[] DEFAULT '{}',
  round_robin_index INTEGER DEFAULT 0,
  -- Capacity Limits
  max_prospects_per_user INTEGER,
  max_prospects_per_day INTEGER,
  -- Metadata
  created_by UUID REFERENCES public.profiles(id),
  company_id UUID REFERENCES public.companies(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- CRM Suppression List table - GDPR-compliant never-contact list
CREATE TABLE public.crm_suppression_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  domain TEXT,
  reason TEXT NOT NULL CHECK (reason IN ('unsubscribe', 'bounce', 'spam_complaint', 'manual', 'gdpr_request', 'legal', 'competitor', 'do_not_contact')),
  source TEXT,
  -- Request Details
  requested_by TEXT, -- Who requested suppression
  gdpr_request_id TEXT,
  -- Metadata
  company_id UUID REFERENCES public.companies(id),
  added_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  -- Timestamps
  suppressed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE, -- NULL = permanent
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- CRM Import Logs table - Track CSV imports
CREATE TABLE public.crm_import_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_type TEXT NOT NULL CHECK (import_type IN ('instantly_campaign', 'instantly_replies', 'csv_prospects', 'csv_companies', 'other')),
  file_name TEXT,
  file_size INTEGER,
  -- Import Stats
  total_rows INTEGER DEFAULT 0,
  imported_rows INTEGER DEFAULT 0,
  skipped_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  duplicate_rows INTEGER DEFAULT 0,
  -- Mapping
  field_mapping JSONB DEFAULT '{}',
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  errors JSONB DEFAULT '[]',
  -- Metadata
  campaign_id UUID REFERENCES public.crm_campaigns(id),
  imported_by UUID REFERENCES public.profiles(id),
  company_id UUID REFERENCES public.companies(id),
  metadata JSONB DEFAULT '{}',
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_crm_campaigns_status ON public.crm_campaigns(status);
CREATE INDEX idx_crm_campaigns_owner ON public.crm_campaigns(owner_id);
CREATE INDEX idx_crm_campaigns_company ON public.crm_campaigns(company_id);

CREATE INDEX idx_crm_prospects_email ON public.crm_prospects(email);
CREATE INDEX idx_crm_prospects_stage ON public.crm_prospects(stage);
CREATE INDEX idx_crm_prospects_owner ON public.crm_prospects(owner_id);
CREATE INDEX idx_crm_prospects_campaign ON public.crm_prospects(campaign_id);
CREATE INDEX idx_crm_prospects_company ON public.crm_prospects(company_id);
CREATE INDEX idx_crm_prospects_lead_score ON public.crm_prospects(lead_score DESC);
CREATE INDEX idx_crm_prospects_last_activity ON public.crm_prospects(last_activity_at DESC);
CREATE INDEX idx_crm_prospects_source ON public.crm_prospects(source);

CREATE INDEX idx_crm_touchpoints_prospect ON public.crm_touchpoints(prospect_id);
CREATE INDEX idx_crm_touchpoints_campaign ON public.crm_touchpoints(campaign_id);
CREATE INDEX idx_crm_touchpoints_channel ON public.crm_touchpoints(channel);
CREATE INDEX idx_crm_touchpoints_performed_at ON public.crm_touchpoints(performed_at DESC);

CREATE INDEX idx_crm_email_replies_prospect ON public.crm_email_replies(prospect_id);
CREATE INDEX idx_crm_email_replies_classification ON public.crm_email_replies(classification);
CREATE INDEX idx_crm_email_replies_is_read ON public.crm_email_replies(is_read);
CREATE INDEX idx_crm_email_replies_is_actioned ON public.crm_email_replies(is_actioned);
CREATE INDEX idx_crm_email_replies_received_at ON public.crm_email_replies(received_at DESC);

CREATE INDEX idx_crm_suppression_email ON public.crm_suppression_list(email);
CREATE INDEX idx_crm_suppression_domain ON public.crm_suppression_list(domain);

CREATE INDEX idx_crm_import_logs_status ON public.crm_import_logs(status);
CREATE INDEX idx_crm_import_logs_type ON public.crm_import_logs(import_type);

-- Enable Row Level Security
ALTER TABLE public.crm_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_email_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_suppression_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_import_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for CRM Campaigns
CREATE POLICY "Admins and strategists can manage campaigns"
  ON public.crm_campaigns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Users can view campaigns they own"
  ON public.crm_campaigns FOR SELECT
  USING (owner_id = auth.uid());

-- RLS Policies for CRM Prospects
CREATE POLICY "Admins and strategists can manage prospects"
  ON public.crm_prospects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Users can view prospects they own"
  ON public.crm_prospects FOR SELECT
  USING (owner_id = auth.uid());

-- RLS Policies for CRM Touchpoints
CREATE POLICY "Admins and strategists can manage touchpoints"
  ON public.crm_touchpoints FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Users can view touchpoints for their prospects"
  ON public.crm_touchpoints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.crm_prospects 
      WHERE crm_prospects.id = crm_touchpoints.prospect_id 
      AND crm_prospects.owner_id = auth.uid()
    )
  );

-- RLS Policies for CRM Email Replies
CREATE POLICY "Admins and strategists can manage replies"
  ON public.crm_email_replies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'strategist')
    )
  );

CREATE POLICY "Users can view replies for their prospects"
  ON public.crm_email_replies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.crm_prospects 
      WHERE crm_prospects.id = crm_email_replies.prospect_id 
      AND crm_prospects.owner_id = auth.uid()
    )
  );

-- RLS Policies for Assignment Rules
CREATE POLICY "Only admins can manage assignment rules"
  ON public.crm_assignment_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Strategists can view assignment rules"
  ON public.crm_assignment_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'strategist')
    )
  );

-- RLS Policies for Suppression List
CREATE POLICY "Admins and strategists can manage suppression list"
  ON public.crm_suppression_list FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'strategist')
    )
  );

-- RLS Policies for Import Logs
CREATE POLICY "Users can view their own imports"
  ON public.crm_import_logs FOR SELECT
  USING (imported_by = auth.uid());

CREATE POLICY "Admins and strategists can manage imports"
  ON public.crm_import_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'strategist')
    )
  );

-- Update timestamp triggers
CREATE TRIGGER update_crm_campaigns_updated_at
  BEFORE UPDATE ON public.crm_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_prospects_updated_at
  BEFORE UPDATE ON public.crm_prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_email_replies_updated_at
  BEFORE UPDATE ON public.crm_email_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_assignment_rules_updated_at
  BEFORE UPDATE ON public.crm_assignment_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check suppression list before sending
CREATE OR REPLACE FUNCTION public.is_email_suppressed(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_suppressed BOOLEAN;
  check_domain TEXT;
BEGIN
  -- Extract domain from email
  check_domain := split_part(check_email, '@', 2);
  
  -- Check if email or domain is suppressed
  SELECT EXISTS (
    SELECT 1 FROM public.crm_suppression_list
    WHERE (email = lower(check_email) OR domain = lower(check_domain))
    AND (expires_at IS NULL OR expires_at > now())
  ) INTO is_suppressed;
  
  RETURN is_suppressed;
END;
$$;

-- Function to auto-update prospect stats after touchpoint
CREATE OR REPLACE FUNCTION public.update_prospect_after_touchpoint()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update last activity
  UPDATE public.crm_prospects
  SET 
    last_activity_at = NEW.performed_at,
    last_contacted_at = CASE WHEN NEW.direction = 'outbound' AND NEW.touchpoint_type = 'sent' THEN NEW.performed_at ELSE last_contacted_at END,
    last_opened_at = CASE WHEN NEW.opened = true THEN NEW.performed_at ELSE last_opened_at END,
    last_replied_at = CASE WHEN NEW.replied = true THEN NEW.performed_at ELSE last_replied_at END,
    emails_sent = emails_sent + CASE WHEN NEW.touchpoint_type = 'sent' THEN 1 ELSE 0 END,
    emails_opened = emails_opened + CASE WHEN NEW.opened = true THEN 1 ELSE 0 END,
    emails_replied = emails_replied + CASE WHEN NEW.replied = true THEN 1 ELSE 0 END,
    stage = CASE 
      WHEN NEW.replied = true AND stage = 'contacted' THEN 'replied'
      WHEN NEW.opened = true AND stage = 'new' THEN 'opened'
      WHEN NEW.touchpoint_type = 'sent' AND stage = 'new' THEN 'contacted'
      ELSE stage
    END,
    updated_at = now()
  WHERE id = NEW.prospect_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_prospect_after_touchpoint
  AFTER INSERT ON public.crm_touchpoints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_prospect_after_touchpoint();

-- Function to auto-update campaign stats
CREATE OR REPLACE FUNCTION public.update_campaign_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.campaign_id IS NOT NULL THEN
    UPDATE public.crm_campaigns
    SET 
      total_prospects = (SELECT COUNT(*) FROM public.crm_prospects WHERE campaign_id = NEW.campaign_id),
      total_sent = (SELECT SUM(emails_sent) FROM public.crm_prospects WHERE campaign_id = NEW.campaign_id),
      total_opens = (SELECT SUM(emails_opened) FROM public.crm_prospects WHERE campaign_id = NEW.campaign_id),
      total_replies = (SELECT SUM(emails_replied) FROM public.crm_prospects WHERE campaign_id = NEW.campaign_id),
      reply_rate = CASE 
        WHEN (SELECT SUM(emails_sent) FROM public.crm_prospects WHERE campaign_id = NEW.campaign_id) > 0 
        THEN ((SELECT SUM(emails_replied) FROM public.crm_prospects WHERE campaign_id = NEW.campaign_id)::NUMERIC / 
              (SELECT SUM(emails_sent) FROM public.crm_prospects WHERE campaign_id = NEW.campaign_id)::NUMERIC * 100)
        ELSE 0 
      END,
      open_rate = CASE 
        WHEN (SELECT SUM(emails_sent) FROM public.crm_prospects WHERE campaign_id = NEW.campaign_id) > 0 
        THEN ((SELECT SUM(emails_opened) FROM public.crm_prospects WHERE campaign_id = NEW.campaign_id)::NUMERIC / 
              (SELECT SUM(emails_sent) FROM public.crm_prospects WHERE campaign_id = NEW.campaign_id)::NUMERIC * 100)
        ELSE 0 
      END,
      updated_at = now()
    WHERE id = NEW.campaign_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_campaign_stats
  AFTER INSERT OR UPDATE ON public.crm_prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_campaign_stats();

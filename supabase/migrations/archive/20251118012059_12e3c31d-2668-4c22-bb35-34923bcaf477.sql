-- Priority 1: Enterprise Compliance & Support Infrastructure
-- Cookie Consent, Support Tickets, CSM Assignments, Knowledge Base

-- Cookie consent management
CREATE TABLE cookie_consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  consent_version TEXT NOT NULL DEFAULT 'v1.0',
  necessary_cookies BOOLEAN DEFAULT true,
  functional_cookies BOOLEAN DEFAULT false,
  analytics_cookies BOOLEAN DEFAULT false,
  marketing_cookies BOOLEAN DEFAULT false,
  third_party_cookies BOOLEAN DEFAULT false,
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '12 months'),
  withdrawn_at TIMESTAMPTZ,
  geo_location TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Support SLA policies
CREATE TABLE support_sla_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_tier TEXT NOT NULL,
  priority_level TEXT NOT NULL,
  target_first_response_minutes INTEGER NOT NULL,
  target_resolution_hours INTEGER NOT NULL,
  channels_available TEXT[] DEFAULT ARRAY['in_app', 'email'],
  business_hours_only BOOLEAN DEFAULT false,
  escalation_after_minutes INTEGER,
  auto_escalate_to_csm BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_tier, priority_level)
);

-- Support tickets
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES profiles(id),
  company_id UUID REFERENCES companies(id),
  created_by_email TEXT,
  category TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  assigned_to UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT false,
  sla_target_response_minutes INTEGER,
  sla_target_resolution_hours INTEGER,
  actual_response_minutes INTEGER,
  actual_resolution_hours INTEGER,
  channel TEXT DEFAULT 'in_app',
  tags TEXT[],
  metadata JSONB,
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  satisfaction_feedback TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ticket messages
CREATE TABLE support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id),
  sender_email TEXT,
  sender_type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  attachments JSONB,
  read_by_customer BOOLEAN DEFAULT false,
  read_by_agent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Customer Success Manager assignments
CREATE TABLE csm_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  csm_user_id UUID REFERENCES profiles(id) NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES profiles(id),
  is_primary BOOLEAN DEFAULT true,
  account_value_tier TEXT DEFAULT 'standard',
  handoff_notes TEXT,
  next_check_in_date DATE,
  health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
  risk_level TEXT DEFAULT 'low',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CSM activity log
CREATE TABLE csm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  csm_user_id UUID REFERENCES profiles(id),
  activity_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  notes TEXT,
  outcome TEXT,
  follow_up_date DATE,
  attendees JSONB,
  duration_minutes INTEGER,
  meeting_recording_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Knowledge base articles
CREATE TABLE knowledge_base_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  author_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'draft',
  visibility TEXT DEFAULT 'public',
  featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  search_keywords TEXT[],
  related_articles UUID[],
  last_reviewed_by UUID REFERENCES profiles(id),
  last_reviewed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- KB article feedback
CREATE TABLE kb_article_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES knowledge_base_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  session_id TEXT,
  was_helpful BOOLEAN NOT NULL,
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_cookie_consent_user ON cookie_consent_records(user_id);
CREATE INDEX idx_cookie_consent_session ON cookie_consent_records(session_id);
CREATE INDEX idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_company ON support_tickets(company_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX idx_ticket_messages_ticket ON support_ticket_messages(ticket_id);
CREATE INDEX idx_csm_assignments_company ON csm_assignments(company_id);
CREATE INDEX idx_csm_assignments_csm ON csm_assignments(csm_user_id);
CREATE INDEX idx_csm_activities_company ON csm_activities(company_id);
CREATE INDEX idx_kb_articles_slug ON knowledge_base_articles(slug);
CREATE INDEX idx_kb_articles_status ON knowledge_base_articles(status);
CREATE INDEX idx_kb_articles_category ON knowledge_base_articles(category);

-- RLS Policies

-- Cookie consent: users manage their own
ALTER TABLE cookie_consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cookie consent"
  ON cookie_consent_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cookie consent"
  ON cookie_consent_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cookie consent"
  ON cookie_consent_records FOR UPDATE
  USING (auth.uid() = user_id);

-- Support SLA policies: public read, admin write
ALTER TABLE support_sla_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view SLA policies"
  ON support_sla_policies FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage SLA policies"
  ON support_sla_policies FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Support tickets: users see their own, assigned agents see theirs, admins see all
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  USING (
    auth.uid() = user_id OR
    auth.uid() = assigned_to OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'strategist'::app_role)
  );

CREATE POLICY "Users can create tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents and admins can update tickets"
  ON support_tickets FOR UPDATE
  USING (
    auth.uid() = assigned_to OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'strategist'::app_role)
  );

-- Ticket messages: inherit ticket access
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ticket participants can view messages"
  ON support_ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id = ticket_id
      AND (
        st.user_id = auth.uid() OR
        st.assigned_to = auth.uid() OR
        has_role(auth.uid(), 'admin'::app_role) OR
        has_role(auth.uid(), 'strategist'::app_role)
      )
    )
  );

CREATE POLICY "Ticket participants can send messages"
  ON support_ticket_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id = ticket_id
      AND (
        st.user_id = auth.uid() OR
        st.assigned_to = auth.uid() OR
        has_role(auth.uid(), 'admin'::app_role) OR
        has_role(auth.uid(), 'strategist'::app_role)
      )
    )
  );

-- CSM assignments: admins see all, partners see their own, CSMs see their accounts
ALTER TABLE csm_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage CSM assignments"
  ON csm_assignments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "CSMs can view their assignments"
  ON csm_assignments FOR SELECT
  USING (
    csm_user_id = auth.uid() OR
    has_role(auth.uid(), 'strategist'::app_role)
  );

CREATE POLICY "Partners can view their CSM"
  ON csm_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.company_id = csm_assignments.company_id
      AND cm.user_id = auth.uid()
      AND cm.is_active = true
    )
  );

-- CSM activities: similar to assignments
ALTER TABLE csm_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and CSMs can manage activities"
  ON csm_activities FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    csm_user_id = auth.uid()
  );

CREATE POLICY "Partners can view their company activities"
  ON csm_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.company_id = csm_activities.company_id
      AND cm.user_id = auth.uid()
      AND cm.is_active = true
    )
  );

-- Knowledge base: public can view published, admins manage all
ALTER TABLE knowledge_base_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published public articles"
  ON knowledge_base_articles FOR SELECT
  USING (
    status = 'published' AND visibility = 'public'
  );

CREATE POLICY "Partners can view partner articles"
  ON knowledge_base_articles FOR SELECT
  USING (
    status = 'published' AND
    (visibility = 'public' OR 
     (visibility = 'partner_only' AND has_role(auth.uid(), 'partner'::app_role)))
  );

CREATE POLICY "Admins can manage all articles"
  ON knowledge_base_articles FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'strategist'::app_role)
  );

-- KB feedback: users can submit feedback
ALTER TABLE kb_article_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit article feedback"
  ON kb_article_feedback FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all feedback"
  ON kb_article_feedback FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'strategist'::app_role)
  );

-- Functions and Triggers

-- Generate ticket number
CREATE OR REPLACE FUNCTION generate_support_ticket_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_number
  FROM support_tickets
  WHERE ticket_number ~ '^TQC-[0-9]+$';
  
  RETURN 'TQC-' || LPAD(next_number::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-generate ticket number on insert
CREATE OR REPLACE FUNCTION set_support_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_support_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER support_ticket_number_trigger
BEFORE INSERT ON support_tickets
FOR EACH ROW
EXECUTE FUNCTION set_support_ticket_number();

-- Track SLA compliance
CREATE OR REPLACE FUNCTION check_support_ticket_sla()
RETURNS TRIGGER AS $$
DECLARE
  sla_policy RECORD;
  company_tier TEXT;
BEGIN
  -- Get company tier if company_id exists
  IF NEW.company_id IS NOT NULL THEN
    SELECT COALESCE(c.membership_tier, 'standard') INTO company_tier
    FROM companies c
    WHERE c.id = NEW.company_id;
  ELSE
    company_tier := 'standard';
  END IF;
  
  -- Get SLA policy
  SELECT * INTO sla_policy
  FROM support_sla_policies
  WHERE customer_tier = company_tier
  AND priority_level = NEW.priority;
  
  IF FOUND THEN
    NEW.sla_target_response_minutes := sla_policy.target_first_response_minutes;
    NEW.sla_target_resolution_hours := sla_policy.target_resolution_hours;
    
    -- Check if first response SLA breached
    IF NEW.first_response_at IS NOT NULL AND OLD.first_response_at IS NULL THEN
      NEW.actual_response_minutes := EXTRACT(EPOCH FROM (NEW.first_response_at - NEW.created_at)) / 60;
      IF NEW.actual_response_minutes > NEW.sla_target_response_minutes THEN
        NEW.sla_breached := true;
      END IF;
    END IF;
    
    -- Check if resolution SLA breached
    IF NEW.resolved_at IS NOT NULL AND OLD.resolved_at IS NULL THEN
      NEW.actual_resolution_hours := EXTRACT(EPOCH FROM (NEW.resolved_at - NEW.created_at)) / 3600;
      IF NEW.actual_resolution_hours > NEW.sla_target_resolution_hours THEN
        NEW.sla_breached := true;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER support_ticket_sla_check
BEFORE INSERT OR UPDATE ON support_tickets
FOR EACH ROW
EXECUTE FUNCTION check_support_ticket_sla();

-- Update timestamps
CREATE TRIGGER support_tickets_updated_at
BEFORE UPDATE ON support_tickets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER csm_assignments_updated_at
BEFORE UPDATE ON csm_assignments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER kb_articles_updated_at
BEFORE UPDATE ON knowledge_base_articles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Increment KB article view count
CREATE OR REPLACE FUNCTION increment_kb_article_views()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE knowledge_base_articles
  SET view_count = view_count + 1
  WHERE id = NEW.article_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update KB helpful counts
CREATE OR REPLACE FUNCTION update_kb_helpful_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.was_helpful THEN
    UPDATE knowledge_base_articles
    SET helpful_count = helpful_count + 1
    WHERE id = NEW.article_id;
  ELSE
    UPDATE knowledge_base_articles
    SET not_helpful_count = not_helpful_count + 1
    WHERE id = NEW.article_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER kb_feedback_update_counts
AFTER INSERT ON kb_article_feedback
FOR EACH ROW
EXECUTE FUNCTION update_kb_helpful_counts();

-- Insert default SLA policies
INSERT INTO support_sla_policies (customer_tier, priority_level, target_first_response_minutes, target_resolution_hours, channels_available) VALUES
  ('enterprise', 'critical', 15, 4, ARRAY['in_app', 'email', 'phone', 'slack']),
  ('enterprise', 'urgent', 30, 8, ARRAY['in_app', 'email', 'phone', 'slack']),
  ('enterprise', 'high', 60, 24, ARRAY['in_app', 'email', 'slack']),
  ('enterprise', 'medium', 120, 48, ARRAY['in_app', 'email']),
  ('enterprise', 'low', 240, 120, ARRAY['in_app', 'email']),
  ('growth', 'critical', 30, 8, ARRAY['in_app', 'email']),
  ('growth', 'urgent', 60, 12, ARRAY['in_app', 'email']),
  ('growth', 'high', 120, 48, ARRAY['in_app', 'email']),
  ('growth', 'medium', 240, 72, ARRAY['in_app', 'email']),
  ('growth', 'low', 480, 168, ARRAY['in_app', 'email']),
  ('standard', 'critical', 60, 24, ARRAY['in_app', 'email']),
  ('standard', 'urgent', 120, 48, ARRAY['in_app', 'email']),
  ('standard', 'high', 240, 72, ARRAY['in_app', 'email']),
  ('standard', 'medium', 480, 120, ARRAY['in_app', 'email']),
  ('standard', 'low', 720, 240, ARRAY['in_app', 'email']);
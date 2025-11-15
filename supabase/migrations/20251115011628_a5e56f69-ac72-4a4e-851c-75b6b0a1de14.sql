-- Create company_stakeholders table
CREATE TABLE company_stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) NULL,
  
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  job_title TEXT,
  department TEXT,
  
  role_type TEXT CHECK (role_type IN (
    'decision_maker', 'influencer', 'gatekeeper', 
    'end_user', 'champion', 'blocker', 'unknown'
  )),
  seniority_level TEXT,
  
  communication_style TEXT,
  response_time_avg_hours NUMERIC,
  preferred_channel TEXT,
  timezone TEXT,
  working_hours JSONB,
  
  first_contacted_at TIMESTAMP,
  last_contacted_at TIMESTAMP,
  total_interactions INTEGER DEFAULT 0,
  sentiment_score NUMERIC,
  engagement_score NUMERIC,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stakeholders_company ON company_stakeholders(company_id);
CREATE INDEX idx_stakeholders_email ON company_stakeholders(email);
CREATE INDEX idx_stakeholders_role ON company_stakeholders(role_type);

-- Create company_interactions table
CREATE TABLE company_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) NULL,
  
  interaction_type TEXT NOT NULL CHECK (interaction_type IN (
    'whatsapp', 'email', 'phone_call', 'zoom_meeting', 
    'linkedin_message', 'in_person', 'other'
  )),
  interaction_subtype TEXT,
  
  interaction_date TIMESTAMP NOT NULL,
  duration_minutes INTEGER,
  
  direction TEXT CHECK (direction IN ('inbound', 'outbound', 'mutual')),
  initiated_by_stakeholder_id UUID REFERENCES company_stakeholders(id),
  our_participant_id UUID REFERENCES profiles(id),
  
  subject TEXT,
  summary TEXT,
  raw_content TEXT,
  key_topics TEXT[],
  mentioned_roles TEXT[],
  mentioned_candidates UUID[],
  
  sentiment_score NUMERIC,
  urgency_score NUMERIC,
  deal_stage_hint TEXT,
  next_action TEXT,
  
  attachment_urls TEXT[],
  external_id TEXT,
  source_metadata JSONB,
  
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  is_manually_entered BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_interactions_company ON company_interactions(company_id);
CREATE INDEX idx_interactions_date ON company_interactions(interaction_date DESC);
CREATE INDEX idx_interactions_type ON company_interactions(interaction_type);
CREATE INDEX idx_interactions_job ON company_interactions(job_id);

-- Create interaction_participants table
CREATE TABLE interaction_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID REFERENCES company_interactions(id) ON DELETE CASCADE,
  stakeholder_id UUID REFERENCES company_stakeholders(id) ON DELETE CASCADE,
  
  participation_type TEXT CHECK (participation_type IN (
    'sender', 'recipient', 'cc', 'bcc', 'attendee', 'organizer'
  )),
  
  mentioned_only BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_participants_interaction ON interaction_participants(interaction_id);
CREATE INDEX idx_participants_stakeholder ON interaction_participants(stakeholder_id);

-- Create interaction_messages table
CREATE TABLE interaction_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID REFERENCES company_interactions(id) ON DELETE CASCADE,
  
  sender_stakeholder_id UUID REFERENCES company_stakeholders(id),
  sender_name TEXT NOT NULL,
  
  message_content TEXT NOT NULL,
  message_timestamp TIMESTAMP NOT NULL,
  message_index INTEGER,
  
  sentiment_score NUMERIC,
  contains_question BOOLEAN,
  urgency_markers TEXT[],
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_interaction ON interaction_messages(interaction_id);
CREATE INDEX idx_messages_timestamp ON interaction_messages(message_timestamp);

-- Create interaction_insights table
CREATE TABLE interaction_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID REFERENCES company_interactions(id) ON DELETE CASCADE,
  
  insight_type TEXT CHECK (insight_type IN (
    'hiring_urgency', 'budget_signal', 'decision_timeline',
    'stakeholder_preference', 'competitor_mention', 
    'pain_point', 'red_flag', 'positive_signal'
  )),
  
  insight_text TEXT NOT NULL,
  confidence_score NUMERIC,
  evidence_quotes TEXT[],
  
  extracted_date DATE,
  extracted_budget NUMERIC,
  extracted_headcount INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_insights_interaction ON interaction_insights(interaction_id);
CREATE INDEX idx_insights_type ON interaction_insights(insight_type);

-- Create stakeholder_relationships table
CREATE TABLE stakeholder_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  stakeholder_a_id UUID REFERENCES company_stakeholders(id) ON DELETE CASCADE,
  stakeholder_b_id UUID REFERENCES company_stakeholders(id) ON DELETE CASCADE,
  
  relationship_type TEXT CHECK (relationship_type IN (
    'reports_to', 'works_with', 'influences', 'opposes'
  )),
  
  relationship_strength NUMERIC,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(stakeholder_a_id, stakeholder_b_id, relationship_type)
);

CREATE INDEX idx_relationships_a ON stakeholder_relationships(stakeholder_a_id);
CREATE INDEX idx_relationships_b ON stakeholder_relationships(stakeholder_b_id);

-- Create whatsapp_imports table
CREATE TABLE whatsapp_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  company_id UUID REFERENCES companies(id),
  uploaded_by UUID REFERENCES profiles(id),
  
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  
  total_messages INTEGER,
  date_range_start DATE,
  date_range_end DATE,
  participants_detected TEXT[],
  
  stakeholders_matched INTEGER,
  stakeholders_created INTEGER,
  
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'parsing', 'completed', 'failed'
  )),
  error_message TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Create interaction_ml_features table
CREATE TABLE interaction_ml_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  entity_type TEXT CHECK (entity_type IN ('company', 'job', 'stakeholder')),
  entity_id UUID NOT NULL,
  
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  features JSONB NOT NULL,
  
  computed_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(entity_type, entity_id, period_start, period_end)
);

CREATE INDEX idx_ml_features_entity ON interaction_ml_features(entity_type, entity_id);

-- RLS Policies for all tables
ALTER TABLE company_stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholder_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_ml_features ENABLE ROW LEVEL SECURITY;

-- Admins and strategists can view all interaction data
CREATE POLICY "Admins and strategists can view stakeholders"
ON company_stakeholders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "Admins can manage stakeholders"
ON company_stakeholders FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins and strategists can view interactions"
ON company_interactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "Admins and strategists can manage interactions"
ON company_interactions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "Admins and strategists can view participants"
ON interaction_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "Admins and strategists can view messages"
ON interaction_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "Admins and strategists can view insights"
ON interaction_insights FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "Admins and strategists can view relationships"
ON stakeholder_relationships FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "Admins can view imports"
ON whatsapp_imports FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view ml features"
ON interaction_ml_features FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));
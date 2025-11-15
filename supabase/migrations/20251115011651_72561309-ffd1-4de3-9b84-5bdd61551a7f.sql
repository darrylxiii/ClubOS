-- Create table for company email domains
CREATE TABLE company_email_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  domain TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  added_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, domain)
);

CREATE INDEX idx_company_email_domains_company ON company_email_domains(company_id);
CREATE INDEX idx_company_email_domains_domain ON company_email_domains(domain) WHERE is_active = true;

-- RLS policies for company_email_domains
ALTER TABLE company_email_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and strategists can view domains"
ON company_email_domains FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "Admins can manage domains"
ON company_email_domains FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Create table for forwarded email learning
CREATE TABLE email_learning_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  received_at TIMESTAMP DEFAULT NOW(),
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP,
  company_id UUID REFERENCES companies(id),
  interaction_id UUID REFERENCES company_interactions(id),
  processing_error TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_learning_queue_processed ON email_learning_queue(processed, received_at);
CREATE INDEX idx_email_learning_queue_from ON email_learning_queue(from_email);

-- RLS for email_learning_queue
ALTER TABLE email_learning_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email learning queue"
ON email_learning_queue FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_company_email_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_company_email_domains_updated_at
BEFORE UPDATE ON company_email_domains
FOR EACH ROW
EXECUTE FUNCTION update_company_email_domains_updated_at();
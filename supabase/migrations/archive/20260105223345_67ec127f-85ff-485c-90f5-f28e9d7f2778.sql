-- Strategist placements for manual matching
CREATE TABLE IF NOT EXISTS strategist_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategist_id UUID REFERENCES profiles(id),
  project_id UUID REFERENCES marketplace_projects(id),
  freelancer_id UUID REFERENCES profiles(id),
  placement_type TEXT DEFAULT 'recommended',
  notes TEXT,
  status TEXT DEFAULT 'pending',
  commission_percentage NUMERIC(5,2) DEFAULT 5.00,
  commission_earned NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE strategist_placements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all placements" ON strategist_placements;
DROP POLICY IF EXISTS "Strategists can create placements" ON strategist_placements;
DROP POLICY IF EXISTS "Strategists can update their placements" ON strategist_placements;

-- Strategists and admins can view all placements
CREATE POLICY "Admins can view all placements"
  ON strategist_placements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'strategist')
    )
  );

CREATE POLICY "Strategists can create placements"
  ON strategist_placements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'strategist')
    )
  );

CREATE POLICY "Strategists can update their placements"
  ON strategist_placements FOR UPDATE
  USING (strategist_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Retainer contracts for ongoing relationships
CREATE TABLE IF NOT EXISTS retainer_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id),
  freelancer_id UUID REFERENCES profiles(id),
  monthly_hours INT NOT NULL,
  monthly_rate NUMERIC(10,2) NOT NULL,
  hourly_rate NUMERIC(10,2),
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'pending',
  stripe_subscription_id TEXT,
  auto_renew BOOLEAN DEFAULT true,
  terms TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE retainer_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their retainer contracts" ON retainer_contracts;
DROP POLICY IF EXISTS "Clients can create retainer contracts" ON retainer_contracts;
DROP POLICY IF EXISTS "Contract parties can update contracts" ON retainer_contracts;

CREATE POLICY "Users can view their retainer contracts"
  ON retainer_contracts FOR SELECT
  USING (client_id = auth.uid() OR freelancer_id = auth.uid());

CREATE POLICY "Clients can create retainer contracts"
  ON retainer_contracts FOR INSERT
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Contract parties can update contracts"
  ON retainer_contracts FOR UPDATE
  USING (client_id = auth.uid() OR freelancer_id = auth.uid());

-- Retainer hours tracking
CREATE TABLE IF NOT EXISTS retainer_hours_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retainer_id UUID REFERENCES retainer_contracts(id) ON DELETE CASCADE,
  logged_date DATE NOT NULL,
  hours NUMERIC(5,2) NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE retainer_hours_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view retainer hours" ON retainer_hours_log;
DROP POLICY IF EXISTS "Freelancers can log hours" ON retainer_hours_log;
DROP POLICY IF EXISTS "Clients can update hours status" ON retainer_hours_log;

CREATE POLICY "Users can view retainer hours"
  ON retainer_hours_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM retainer_contracts rc
      WHERE rc.id = retainer_id
      AND (rc.client_id = auth.uid() OR rc.freelancer_id = auth.uid())
    )
  );

CREATE POLICY "Freelancers can log hours"
  ON retainer_hours_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM retainer_contracts rc
      WHERE rc.id = retainer_id
      AND rc.freelancer_id = auth.uid()
    )
  );

CREATE POLICY "Clients can update hours status"
  ON retainer_hours_log FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM retainer_contracts rc
      WHERE rc.id = retainer_id
      AND rc.client_id = auth.uid()
    )
  );

-- Contract templates
CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view system templates" ON contract_templates;
DROP POLICY IF EXISTS "Admins can create templates" ON contract_templates;

CREATE POLICY "Everyone can view system templates"
  ON contract_templates FOR SELECT
  USING (is_system = true OR created_by = auth.uid());

CREATE POLICY "Admins can create templates"
  ON contract_templates FOR INSERT
  WITH CHECK (
    is_system = false OR
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );
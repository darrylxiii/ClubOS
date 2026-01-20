-- Create company_departments table
CREATE TABLE IF NOT EXISTS company_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  department_type TEXT NOT NULL DEFAULT 'core',
  color_hex TEXT DEFAULT '#C9A24E',
  icon_name TEXT DEFAULT 'Users',
  display_order INTEGER DEFAULT 0,
  parent_department_id UUID REFERENCES company_departments(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for company_departments
CREATE INDEX IF NOT EXISTS idx_company_departments_company ON company_departments(company_id);
CREATE INDEX IF NOT EXISTS idx_company_departments_parent ON company_departments(parent_department_id);

-- Enable RLS for company_departments
ALTER TABLE company_departments ENABLE ROW LEVEL SECURITY;

-- RLS policies for company_departments
CREATE POLICY "Company members can view their company's departments"
  ON company_departments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = company_departments.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.is_active = true
    )
  );

CREATE POLICY "Company admins can manage departments"
  ON company_departments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = company_departments.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.role IN ('owner', 'admin')
      AND company_members.is_active = true
    )
  );

-- Add new columns to company_members if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_members' AND column_name = 'department_id') THEN
    ALTER TABLE company_members ADD COLUMN department_id UUID REFERENCES company_departments(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_members' AND column_name = 'reports_to_member_id') THEN
    ALTER TABLE company_members ADD COLUMN reports_to_member_id UUID REFERENCES company_members(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_members' AND column_name = 'job_title') THEN
    ALTER TABLE company_members ADD COLUMN job_title TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_members' AND column_name = 'employment_type') THEN
    ALTER TABLE company_members ADD COLUMN employment_type TEXT DEFAULT 'full_time';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_members' AND column_name = 'start_date') THEN
    ALTER TABLE company_members ADD COLUMN start_date DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_members' AND column_name = 'location') THEN
    ALTER TABLE company_members ADD COLUMN location TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_members' AND column_name = 'is_people_manager') THEN
    ALTER TABLE company_members ADD COLUMN is_people_manager BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_members' AND column_name = 'visibility_in_org_chart') THEN
    ALTER TABLE company_members ADD COLUMN visibility_in_org_chart TEXT DEFAULT 'full';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_members' AND column_name = 'bio') THEN
    ALTER TABLE company_members ADD COLUMN bio TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_members' AND column_name = 'linkedin_url') THEN
    ALTER TABLE company_members ADD COLUMN linkedin_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_members' AND column_name = 'display_order_in_dept') THEN
    ALTER TABLE company_members ADD COLUMN display_order_in_dept INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add indexes for company_members new columns
CREATE INDEX IF NOT EXISTS idx_company_members_department ON company_members(department_id);
CREATE INDEX IF NOT EXISTS idx_company_members_reports_to ON company_members(reports_to_member_id);

-- Create org_chart_candidate_placements table
CREATE TABLE IF NOT EXISTS org_chart_candidate_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  department_id UUID REFERENCES company_departments(id) ON DELETE SET NULL,
  proposed_job_title TEXT NOT NULL,
  proposed_reports_to_member_id UUID REFERENCES company_members(id) ON DELETE SET NULL,
  placement_status TEXT DEFAULT 'considering',
  placement_notes TEXT,
  visibility TEXT DEFAULT 'internal_only',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for org_chart_candidate_placements
CREATE INDEX IF NOT EXISTS idx_org_placements_company ON org_chart_candidate_placements(company_id);
CREATE INDEX IF NOT EXISTS idx_org_placements_candidate ON org_chart_candidate_placements(candidate_user_id);
CREATE INDEX IF NOT EXISTS idx_org_placements_department ON org_chart_candidate_placements(department_id);

-- Enable RLS for org_chart_candidate_placements
ALTER TABLE org_chart_candidate_placements ENABLE ROW LEVEL SECURITY;

-- RLS policies for org_chart_candidate_placements
CREATE POLICY "Company members can view placements"
  ON org_chart_candidate_placements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = org_chart_candidate_placements.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.is_active = true
    )
  );

CREATE POLICY "Company admins can manage placements"
  ON org_chart_candidate_placements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = org_chart_candidate_placements.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.role IN ('owner', 'admin', 'recruiter')
      AND company_members.is_active = true
    )
  );

-- Create function to prevent circular reporting
CREATE OR REPLACE FUNCTION check_circular_reporting()
RETURNS TRIGGER AS $$
DECLARE
  current_id UUID;
  visited_ids UUID[] := ARRAY[]::UUID[];
  max_depth INTEGER := 50;
  depth INTEGER := 0;
BEGIN
  IF NEW.reports_to_member_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  current_id := NEW.reports_to_member_id;
  visited_ids := ARRAY[NEW.id];
  
  WHILE current_id IS NOT NULL AND depth < max_depth LOOP
    IF current_id = ANY(visited_ids) THEN
      RAISE EXCEPTION 'Circular reporting relationship detected';
    END IF;
    
    visited_ids := visited_ids || current_id;
    depth := depth + 1;
    
    SELECT reports_to_member_id INTO current_id
    FROM company_members
    WHERE id = current_id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for circular reporting prevention
DROP TRIGGER IF EXISTS prevent_circular_reporting ON company_members;
CREATE TRIGGER prevent_circular_reporting
  BEFORE INSERT OR UPDATE OF reports_to_member_id ON company_members
  FOR EACH ROW
  EXECUTE FUNCTION check_circular_reporting();

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers for updated_at columns
DROP TRIGGER IF EXISTS update_company_departments_updated_at ON company_departments;
CREATE TRIGGER update_company_departments_updated_at
  BEFORE UPDATE ON company_departments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_org_placements_updated_at ON org_chart_candidate_placements;
CREATE TRIGGER update_org_placements_updated_at
  BEFORE UPDATE ON org_chart_candidate_placements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create helper function to get org chart tree
CREATE OR REPLACE FUNCTION get_org_chart_tree(p_company_id UUID)
RETURNS TABLE (
  member_id UUID,
  user_id UUID,
  reports_to_member_id UUID,
  job_title TEXT,
  department_id UUID,
  level INTEGER,
  path UUID[]
) AS $$
WITH RECURSIVE org_tree AS (
  -- Root level (members with no manager)
  SELECT 
    cm.id as member_id,
    cm.user_id,
    cm.reports_to_member_id,
    cm.job_title,
    cm.department_id,
    0 as level,
    ARRAY[cm.id] as path
  FROM company_members cm
  WHERE cm.company_id = p_company_id
    AND cm.is_active = true
    AND cm.reports_to_member_id IS NULL
  
  UNION ALL
  
  -- Recursive: members who report to someone
  SELECT 
    cm.id,
    cm.user_id,
    cm.reports_to_member_id,
    cm.job_title,
    cm.department_id,
    ot.level + 1,
    ot.path || cm.id
  FROM company_members cm
  INNER JOIN org_tree ot ON cm.reports_to_member_id = ot.member_id
  WHERE cm.company_id = p_company_id
    AND cm.is_active = true
    AND NOT (cm.id = ANY(ot.path)) -- Prevent infinite loops
)
SELECT * FROM org_tree
ORDER BY level, job_title;
$$ LANGUAGE sql STABLE;

-- Create helper function to get department hierarchy
CREATE OR REPLACE FUNCTION get_department_hierarchy(p_company_id UUID)
RETURNS TABLE (
  department_id UUID,
  department_name TEXT,
  parent_department_id UUID,
  level INTEGER,
  path UUID[]
) AS $$
WITH RECURSIVE dept_tree AS (
  -- Root level departments
  SELECT 
    cd.id as department_id,
    cd.name as department_name,
    cd.parent_department_id,
    0 as level,
    ARRAY[cd.id] as path
  FROM company_departments cd
  WHERE cd.company_id = p_company_id
    AND cd.is_active = true
    AND cd.parent_department_id IS NULL
  
  UNION ALL
  
  -- Recursive: child departments
  SELECT 
    cd.id,
    cd.name,
    cd.parent_department_id,
    dt.level + 1,
    dt.path || cd.id
  FROM company_departments cd
  INNER JOIN dept_tree dt ON cd.parent_department_id = dt.department_id
  WHERE cd.company_id = p_company_id
    AND cd.is_active = true
    AND NOT (cd.id = ANY(dt.path))
)
SELECT * FROM dept_tree
ORDER BY level, department_name;
$$ LANGUAGE sql STABLE;
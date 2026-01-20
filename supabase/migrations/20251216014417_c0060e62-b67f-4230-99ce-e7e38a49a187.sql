-- Enhance page_templates table for comprehensive template management
ALTER TABLE page_templates ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'system' CHECK (visibility IN ('system', 'company', 'personal'));
ALTER TABLE page_templates ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE page_templates ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE page_templates ADD COLUMN IF NOT EXISTS usage_count integer DEFAULT 0;
ALTER TABLE page_templates ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE page_templates ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'manual' CHECK (source_type IN ('manual', 'notion', 'import'));

-- Create template_assignments table for distributing templates to specific users
CREATE TABLE IF NOT EXISTS template_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES page_templates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  assigned_by uuid,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(template_id, user_id)
);

-- Enable RLS on template_assignments
ALTER TABLE template_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for template_assignments
CREATE POLICY "Users can view their assigned templates"
ON template_assignments FOR SELECT
USING (user_id = auth.uid() OR assigned_by = auth.uid());

CREATE POLICY "Admins and strategists can manage template assignments"
ON template_assignments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'strategist')
  )
);

-- Update RLS on page_templates to include visibility
DROP POLICY IF EXISTS "Anyone can view system templates" ON page_templates;
DROP POLICY IF EXISTS "Users can manage their templates" ON page_templates;

CREATE POLICY "Anyone can view system templates"
ON page_templates FOR SELECT
USING (
  visibility = 'system' 
  OR created_by = auth.uid()
  OR (visibility = 'company' AND company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ))
);

CREATE POLICY "Users can manage their own templates"
ON page_templates FOR ALL
USING (created_by = auth.uid());

CREATE POLICY "Admins can manage all templates"
ON page_templates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Function to increment template usage
CREATE OR REPLACE FUNCTION increment_template_usage(template_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE page_templates 
  SET usage_count = COALESCE(usage_count, 0) + 1,
      updated_at = now()
  WHERE id = template_id;
END;
$$;
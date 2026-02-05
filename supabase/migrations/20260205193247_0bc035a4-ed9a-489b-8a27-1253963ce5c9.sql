
-- Add recurrence support columns to crm_activities
ALTER TABLE crm_activities 
ADD COLUMN IF NOT EXISTS recurrence_rule text,
ADD COLUMN IF NOT EXISTS recurrence_end_date date,
ADD COLUMN IF NOT EXISTS parent_activity_id uuid REFERENCES crm_activities(id) ON DELETE CASCADE;

-- Create activity templates table
CREATE TABLE IF NOT EXISTS crm_activity_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  activity_type text NOT NULL,
  subject_template text NOT NULL,
  description_template text,
  default_priority int DEFAULT 0,
  default_duration_minutes int DEFAULT 30,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on templates
ALTER TABLE crm_activity_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for activity templates (view all, create own)
CREATE POLICY "Anyone can view activity templates"
  ON crm_activity_templates
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create activity templates"
  ON crm_activity_templates
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own activity templates"
  ON crm_activity_templates
  FOR UPDATE
  USING (created_by = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_crm_activities_parent_id ON crm_activities(parent_activity_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_recurrence ON crm_activities(recurrence_rule) WHERE recurrence_rule IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_activity_templates_type ON crm_activity_templates(activity_type);

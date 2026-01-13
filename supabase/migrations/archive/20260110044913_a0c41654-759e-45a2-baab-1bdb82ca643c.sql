-- Add projected fields to revenue_milestones for pipeline integration
ALTER TABLE revenue_milestones 
ADD COLUMN IF NOT EXISTS projected_unlock_date DATE,
ADD COLUMN IF NOT EXISTS pipeline_boost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_notification_sent_at TIMESTAMPTZ;

-- Add contribution_role to milestone_contributions for enhanced attribution
ALTER TABLE milestone_contributions
ADD COLUMN IF NOT EXISTS contribution_role TEXT DEFAULT 'owner'
  CHECK (contribution_role IN ('sourcer', 'closer', 'adder', 'referrer', 'owner', 'manager'));

-- Add milestone notification preferences if they don't exist
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS milestone_unlocked BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS milestone_approaching BOOLEAN DEFAULT true;
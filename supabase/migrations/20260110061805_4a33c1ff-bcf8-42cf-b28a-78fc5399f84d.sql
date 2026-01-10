-- Add performance indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_placement_fees_hired_date ON placement_fees(hired_date);
CREATE INDEX IF NOT EXISTS idx_placement_fees_sourced_by ON placement_fees(sourced_by);
CREATE INDEX IF NOT EXISTS idx_placement_fees_closed_by ON placement_fees(closed_by);
CREATE INDEX IF NOT EXISTS idx_milestone_contributions_user_id ON milestone_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_milestone_contributions_attributed_at ON milestone_contributions(attributed_at);
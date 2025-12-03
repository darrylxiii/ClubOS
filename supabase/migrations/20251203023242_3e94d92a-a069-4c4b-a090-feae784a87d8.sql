-- Add missing columns to user_page_analytics table
ALTER TABLE user_page_analytics 
ADD COLUMN IF NOT EXISTS referrer TEXT,
ADD COLUMN IF NOT EXISTS viewport_width INTEGER,
ADD COLUMN IF NOT EXISTS viewport_height INTEGER;

-- Create index for referrer queries
CREATE INDEX IF NOT EXISTS idx_user_page_analytics_referrer 
ON user_page_analytics(referrer) WHERE referrer IS NOT NULL;
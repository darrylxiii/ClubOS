-- Add missing expires_at column to notifications table
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Create index for efficient querying of expiring notifications
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at 
ON notifications(expires_at) WHERE expires_at IS NOT NULL;
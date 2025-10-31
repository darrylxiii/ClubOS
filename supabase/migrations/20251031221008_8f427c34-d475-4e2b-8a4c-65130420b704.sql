-- Add avatar URL field to emails table
ALTER TABLE emails ADD COLUMN IF NOT EXISTS from_avatar_url TEXT;

-- Create index for faster lookups by sender email
CREATE INDEX IF NOT EXISTS idx_emails_from_email ON emails(from_email);
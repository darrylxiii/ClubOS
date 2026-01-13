-- Add missing values to communication_channel enum
ALTER TYPE communication_channel ADD VALUE IF NOT EXISTS 'chat';
ALTER TYPE communication_channel ADD VALUE IF NOT EXISTS 'internal_message';
ALTER TYPE communication_channel ADD VALUE IF NOT EXISTS 'sms';
ALTER TYPE communication_channel ADD VALUE IF NOT EXISTS 'dm';
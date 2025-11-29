-- Phase 2: Just fix the foreign key first

-- Drop the old foreign key constraint to auth.users
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'live_channel_participants_user_id_fkey'
    AND table_name = 'live_channel_participants'
  ) THEN
    ALTER TABLE live_channel_participants 
    DROP CONSTRAINT live_channel_participants_user_id_fkey;
  END IF;
END $$;

-- Add new foreign key from live_channel_participants to profiles
ALTER TABLE live_channel_participants 
ADD CONSTRAINT fk_live_channel_participants_user 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
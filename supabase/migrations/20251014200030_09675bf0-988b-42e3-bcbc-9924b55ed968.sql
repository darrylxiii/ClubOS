-- Fix module_chat_messages to reference profiles instead of auth.users
ALTER TABLE module_chat_messages DROP CONSTRAINT IF EXISTS module_chat_messages_user_id_fkey;
ALTER TABLE module_chat_messages ADD CONSTRAINT module_chat_messages_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
-- Update the check constraint to allow 'club_ai' conversation type
ALTER TABLE public.ai_conversations 
DROP CONSTRAINT IF EXISTS ai_conversations_conversation_type_check;

ALTER TABLE public.ai_conversations
ADD CONSTRAINT ai_conversations_conversation_type_check 
CHECK (conversation_type = ANY (ARRAY['career_advisor'::text, 'email_generator'::text, 'match_explainer'::text, 'copilot'::text, 'club_ai'::text]));
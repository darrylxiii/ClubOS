-- Add video and transcript support to modules
ALTER TABLE modules ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS video_duration_seconds INTEGER;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS transcript JSONB DEFAULT '[]';

-- Module shared chat
CREATE TABLE IF NOT EXISTS module_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  is_instructor BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE module_chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies for module chat
CREATE POLICY "Anyone can view module chat" ON module_chat_messages FOR SELECT USING (true);
CREATE POLICY "Enrolled users can send messages" ON module_chat_messages FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND (
      -- Check if user is enrolled in course containing this module
      EXISTS (
        SELECT 1 FROM path_enrollments pe
        JOIN learning_paths lp ON lp.id = pe.learning_path_id
        JOIN courses c ON c.learning_path_id = lp.id
        WHERE c.id = (SELECT course_id FROM modules WHERE id = module_chat_messages.module_id)
        AND pe.user_id = auth.uid()
      )
      OR
      -- Or is an instructor/expert
      EXISTS (
        SELECT 1 FROM expert_profiles WHERE user_id = auth.uid()
      )
      OR
      has_role(auth.uid(), 'admin')
    )
  );

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE module_chat_messages;

-- Trigger
CREATE TRIGGER update_module_chat_timestamp BEFORE UPDATE ON module_chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
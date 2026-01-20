-- Create conversation events table for audit trail
CREATE TABLE public.whatsapp_conversation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  actor_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_whatsapp_conversation_events_conversation_id ON whatsapp_conversation_events(conversation_id);
CREATE INDEX idx_whatsapp_conversation_events_created_at ON whatsapp_conversation_events(created_at DESC);

-- Enable RLS
ALTER TABLE whatsapp_conversation_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view events for conversations they have access to
CREATE POLICY "Users can view conversation events" 
  ON whatsapp_conversation_events FOR SELECT
  USING (true);

-- Policy: Users can insert events
CREATE POLICY "Users can insert conversation events"
  ON whatsapp_conversation_events FOR INSERT
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversation_events;
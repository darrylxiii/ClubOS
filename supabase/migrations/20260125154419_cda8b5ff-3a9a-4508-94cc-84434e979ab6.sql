-- Phase 2: 360° Participant Dossiers
CREATE TABLE participant_dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  meeting_id UUID,
  participant_type TEXT CHECK (participant_type IN ('host', 'guest', 'attendee')),
  participant_email TEXT NOT NULL,
  participant_name TEXT,
  dossier_content JSONB NOT NULL DEFAULT '{}',
  linkedin_data JSONB,
  interaction_history JSONB DEFAULT '[]',
  company_intel JSONB,
  personality_insights JSONB,
  suggested_talking_points TEXT[] DEFAULT '{}',
  ice_breakers TEXT[] DEFAULT '{}',
  things_to_avoid TEXT[] DEFAULT '{}',
  red_flags TEXT[] DEFAULT '{}',
  mutual_connections TEXT[] DEFAULT '{}',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_participant_dossiers_booking ON participant_dossiers(booking_id);
CREATE INDEX idx_participant_dossiers_email ON participant_dossiers(participant_email);

ALTER TABLE participant_dossiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view dossiers" ON participant_dossiers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "System can insert dossiers" ON participant_dossiers FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update dossiers" ON participant_dossiers FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_participant_dossiers_updated_at BEFORE UPDATE ON participant_dossiers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE participant_dossiers;
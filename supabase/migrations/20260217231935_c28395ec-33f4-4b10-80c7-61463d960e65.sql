ALTER TABLE meeting_recordings_extended
  DROP CONSTRAINT meeting_recordings_extended_source_type_check;

ALTER TABLE meeting_recordings_extended
  ADD CONSTRAINT meeting_recordings_extended_source_type_check
  CHECK (source_type = ANY (ARRAY['tqc_meeting','live_hub','conversation_call','fathom','fireflies']));
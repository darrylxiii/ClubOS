-- Clean up legacy stage notes that contain raw candidate templates
-- This migration updates applications that have the old template format in their notes

UPDATE applications
SET stages = (
  SELECT jsonb_agg(
    CASE 
      -- If the note starts with 'Candidate:' it's the old template format, set to null
      WHEN stage->>'notes' IS NOT NULL AND stage->>'notes' LIKE 'Candidate:%' THEN
        stage - 'notes' || jsonb_build_object('notes', NULL)
      ELSE
        stage
    END
  )
  FROM jsonb_array_elements(stages::jsonb) AS stage
)
WHERE stages::text LIKE '%"notes":"Candidate:%';
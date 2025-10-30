-- Update existing QUIN Notetaker bot to Club AI Notetaker
UPDATE public.meeting_bots 
SET display_name = 'Club AI Notetaker'
WHERE bot_type = 'notetaker' AND display_name = 'QUIN Notetaker';
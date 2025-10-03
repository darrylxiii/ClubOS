-- Create meeting_recordings table
CREATE TABLE public.meeting_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  company_name TEXT,
  position TEXT,
  meeting_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER,
  recording_url TEXT,
  thumbnail_url TEXT,
  meeting_type TEXT, -- 'screening', 'technical', 'behavioral', 'final', 'other'
  participants JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.meeting_recordings ENABLE ROW LEVEL SECURITY;

-- Create policies for meeting_recordings
CREATE POLICY "Users can view their own recordings"
ON public.meeting_recordings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recordings"
ON public.meeting_recordings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recordings"
ON public.meeting_recordings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recordings"
ON public.meeting_recordings
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_meeting_recordings_user_id ON public.meeting_recordings(user_id);
CREATE INDEX idx_meeting_recordings_meeting_date ON public.meeting_recordings(meeting_date DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_meeting_recordings_updated_at
BEFORE UPDATE ON public.meeting_recordings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for meeting recordings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'meeting-recordings',
  'meeting-recordings',
  false,
  524288000, -- 500MB limit per file
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'audio/mpeg', 'audio/wav', 'audio/webm']
);

-- Create storage policies for meeting recordings
CREATE POLICY "Users can view their own meeting recordings"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'meeting-recordings' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own meeting recordings"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'meeting-recordings' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own meeting recordings"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'meeting-recordings' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own meeting recordings"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'meeting-recordings' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
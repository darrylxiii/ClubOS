
-- Voice Memos table
CREATE TABLE public.voice_memos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  audio_url text NOT NULL,
  transcript text,
  duration_seconds integer,
  title text,
  status text NOT NULL DEFAULT 'recorded',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_memos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own voice memos"
  ON public.voice_memos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own voice memos"
  ON public.voice_memos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice memos"
  ON public.voice_memos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice memos"
  ON public.voice_memos FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_voice_memos_user_id ON public.voice_memos(user_id);

-- Voice memos storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-memos', 'voice-memos', false);

-- Storage policies for voice memos
CREATE POLICY "Users can upload their own voice memos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'voice-memos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own voice memos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'voice-memos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own voice memos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'voice-memos' AND auth.uid()::text = (storage.foldername(name))[1]);

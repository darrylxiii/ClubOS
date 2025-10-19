-- Create storage buckets for music and covers
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('music-tracks', 'music-tracks', true, 20971520, ARRAY['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a']),
  ('track-covers', 'track-covers', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for music tracks
CREATE POLICY "Admins can upload music tracks"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'music-tracks' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update music tracks"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'music-tracks' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete music tracks"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'music-tracks' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Anyone can view music tracks"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'music-tracks');

-- Storage policies for track covers
CREATE POLICY "Admins can upload track covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'track-covers' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update track covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'track-covers' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete track covers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'track-covers' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Anyone can view track covers"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'track-covers');

-- Create playlists table
CREATE TABLE public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  is_live BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

-- Create tracks table
CREATE TABLE public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT,
  file_url TEXT NOT NULL,
  cover_image_url TEXT,
  duration_seconds INTEGER,
  tags JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

-- Create playlist_tracks junction table
CREATE TABLE public.playlist_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID REFERENCES public.playlists(id) ON DELETE CASCADE NOT NULL,
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(playlist_id, track_id)
);

ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;

-- Create DJ queue table for live mixing
CREATE TABLE public.dj_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE NOT NULL,
  playlist_id UUID REFERENCES public.playlists(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  is_playing BOOLEAN DEFAULT false,
  played_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.dj_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for playlists
CREATE POLICY "Admins can manage playlists"
ON public.playlists FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view published playlists"
ON public.playlists FOR SELECT
TO authenticated
USING (is_published = true OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for tracks
CREATE POLICY "Admins can manage tracks"
ON public.tracks FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view tracks"
ON public.tracks FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for playlist_tracks
CREATE POLICY "Admins can manage playlist tracks"
ON public.playlist_tracks FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view playlist tracks"
ON public.playlist_tracks FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for dj_queue
CREATE POLICY "Admins can manage DJ queue"
ON public.dj_queue FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view DJ queue"
ON public.dj_queue FOR SELECT
TO authenticated
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_playlists_created_by ON public.playlists(created_by);
CREATE INDEX idx_playlists_published ON public.playlists(is_published);
CREATE INDEX idx_playlists_live ON public.playlists(is_live);
CREATE INDEX idx_tracks_created_by ON public.tracks(created_by);
CREATE INDEX idx_playlist_tracks_playlist ON public.playlist_tracks(playlist_id);
CREATE INDEX idx_playlist_tracks_track ON public.playlist_tracks(track_id);
CREATE INDEX idx_dj_queue_position ON public.dj_queue(position);
CREATE INDEX idx_dj_queue_playing ON public.dj_queue(is_playing);

-- Enable realtime for DJ features
ALTER PUBLICATION supabase_realtime ADD TABLE public.dj_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.playlists;
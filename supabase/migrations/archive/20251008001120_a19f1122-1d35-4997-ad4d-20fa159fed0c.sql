-- Add Spotify and Apple Music integration fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS spotify_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS spotify_user_id TEXT,
ADD COLUMN IF NOT EXISTS spotify_playlists JSONB,
ADD COLUMN IF NOT EXISTS apple_music_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS apple_music_user_id TEXT,
ADD COLUMN IF NOT EXISTS apple_music_playlists JSONB;

-- Create index for faster queries on music connections
CREATE INDEX IF NOT EXISTS idx_profiles_spotify ON public.profiles(spotify_connected) WHERE spotify_connected = true;
CREATE INDEX IF NOT EXISTS idx_profiles_apple_music ON public.profiles(apple_music_connected) WHERE apple_music_connected = true;
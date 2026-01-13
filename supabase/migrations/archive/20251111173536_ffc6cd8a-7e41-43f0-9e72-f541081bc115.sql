-- Phase 1: Extend playlists table for Spotify integration
ALTER TABLE playlists 
  ADD COLUMN IF NOT EXISTS playlist_type TEXT DEFAULT 'uploaded' CHECK (playlist_type IN ('uploaded', 'spotify')),
  ADD COLUMN IF NOT EXISTS spotify_playlist_id TEXT,
  ADD COLUMN IF NOT EXISTS spotify_embed_url TEXT,
  ADD COLUMN IF NOT EXISTS mood_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS genre TEXT,
  ADD COLUMN IF NOT EXISTS energy_level TEXT CHECK (energy_level IN ('low', 'medium', 'high', 'very_high')),
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS play_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Add helpful comments
COMMENT ON COLUMN playlists.playlist_type IS 'Type of playlist: uploaded (AI tracks) or spotify (streaming)';
COMMENT ON COLUMN playlists.spotify_playlist_id IS 'Spotify playlist ID extracted from URL';
COMMENT ON COLUMN playlists.spotify_embed_url IS 'Full Spotify embed URL for iframe';
COMMENT ON COLUMN playlists.mood_tags IS 'Array of mood/feeling tags: energetic, focused, chill, romantic, motivated, etc.';
COMMENT ON COLUMN playlists.genre IS 'Music genre: electronic, hip-hop, jazz, classical, rock, etc.';
COMMENT ON COLUMN playlists.energy_level IS 'Energy level for filtering: low (chill), medium (steady), high (upbeat), very_high (intense)';

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_playlists_type ON playlists(playlist_type);
CREATE INDEX IF NOT EXISTS idx_playlists_mood_tags ON playlists USING GIN(mood_tags);
CREATE INDEX IF NOT EXISTS idx_playlists_genre ON playlists(genre);
CREATE INDEX IF NOT EXISTS idx_playlists_energy_level ON playlists(energy_level);
CREATE INDEX IF NOT EXISTS idx_playlists_featured ON playlists(is_featured) WHERE is_featured = true;

-- Add constraint to ensure Spotify playlists have required fields
ALTER TABLE playlists 
  DROP CONSTRAINT IF EXISTS check_spotify_fields;
  
ALTER TABLE playlists 
  ADD CONSTRAINT check_spotify_fields 
  CHECK (
    playlist_type = 'uploaded' OR 
    (playlist_type = 'spotify' AND spotify_playlist_id IS NOT NULL AND spotify_embed_url IS NOT NULL)
  );
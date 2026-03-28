/**
 * DJ Set types.
 *
 * Sets are full-length DJ performances (30min–3h+) that can include
 * both audio and 4K video. They're curated by admins and browsed
 * by members in a Netflix/Boiler Room–style archive.
 *
 * Video hosting strategy:
 * - Primary: Cloudflare Stream (automatic 4K transcoding + adaptive bitrate)
 * - Fallback: Direct URL (YouTube, Vimeo, or any HLS/MP4 URL)
 * - Audio-only: Supabase Storage (same as tracks)
 *
 * Database table: `dj_sets` (admin creates in Supabase)
 */

export interface DJSet {
  id: string;
  title: string;
  description: string | null;
  dj_name: string;
  dj_avatar_url: string | null;
  dj_id: string | null;

  // Media
  video_url: string | null;          // MP4/HLS URL or Cloudflare Stream URL
  video_embed_url: string | null;    // YouTube/Vimeo embed URL
  audio_url: string | null;          // Audio-only fallback
  thumbnail_url: string | null;      // Preview image / poster
  cover_image_url: string | null;    // High-res cover art

  // Metadata
  duration_seconds: number;
  recorded_at: string | null;        // When the set was performed
  venue: string | null;
  genre: string | null;
  tags: string[];
  tracklist: TracklistEntry[] | null;

  // Stats
  play_count: number;
  like_count: number;
  is_featured: boolean;
  is_published: boolean;

  // Quality
  has_video: boolean;
  video_quality: '720p' | '1080p' | '4k' | null;

  created_at: string;
  updated_at: string;
}

export interface TracklistEntry {
  time: string;      // "00:12:30"
  title: string;
  artist: string;
}

export interface DJSetFormData {
  title: string;
  description: string;
  dj_name: string;
  dj_id: string | null;
  video_url: string;
  video_embed_url: string;
  audio_url: string;
  thumbnail_url: string;
  cover_image_url: string;
  duration_seconds: number;
  recorded_at: string;
  venue: string;
  genre: string;
  tags: string[];
  tracklist: TracklistEntry[];
  video_quality: '720p' | '1080p' | '4k' | null;
  is_featured: boolean;
}

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Play, Pause, Heart, Share2, Clock, MapPin, Music,
  Video, Volume2, VolumeX, Maximize, List, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import type { DJSet, TracklistEntry } from '@/components/radio/sets/types';
import { LiveChat } from '@/components/radio/LiveChat';
import { FloatingReactions } from '@/components/radio/FloatingReactions';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

const QUALITY_LABELS: Record<string, string> = {
  '4k': '4K Ultra HD',
  '1080p': '1080p Full HD',
  '720p': '720p HD',
};

// ── Tracklist Panel ────────────────────────────────────────────────────────────

function Tracklist({ tracks, currentTime, onSeek }: {
  tracks: TracklistEntry[];
  currentTime: number;
  onSeek: (time: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const parseTime = (t: string): number => {
    const parts = t.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  };

  // Find current track
  let currentIdx = -1;
  for (let i = tracks.length - 1; i >= 0; i--) {
    if (tracks[i].time && currentTime >= parseTime(tracks[i].time)) {
      currentIdx = i;
      break;
    }
  }

  const shown = expanded ? tracks : tracks.slice(0, 5);

  return (
    <div className="rounded-2xl bg-black/30 backdrop-blur-xl border border-white/10 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <List className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Tracklist</span>
          <Badge variant="secondary" className="text-[10px]">{tracks.length} tracks</Badge>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      <div className="px-4 pb-3 space-y-0.5">
        {shown.map((track, i) => (
          <button
            key={i}
            onClick={() => track.time && onSeek(parseTime(track.time))}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
              i === currentIdx
                ? 'bg-primary/15 text-primary'
                : 'hover:bg-white/5 text-foreground/80'
            }`}
          >
            {track.time && (
              <span className="text-[11px] font-mono text-muted-foreground w-14 flex-shrink-0">
                {track.time}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <span className="text-sm truncate block">{track.artist} — {track.title}</span>
            </div>
            {i === currentIdx && (
              <div className="flex gap-0.5">
                {[0, 1, 2].map((j) => (
                  <motion.div
                    key={j}
                    className="w-0.5 bg-primary rounded-full"
                    animate={{ height: ['4px', '12px', '6px'] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: j * 0.15 }}
                  />
                ))}
              </div>
            )}
          </button>
        ))}

        {!expanded && tracks.length > 5 && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full text-center text-xs text-muted-foreground py-2 hover:text-foreground transition-colors"
          >
            Show all {tracks.length} tracks
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Set Player Page ───────────────────────────────────────────────────────

export default function SetPlayer() {
  const { setId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data: set } = useQuery({
    queryKey: ['dj-set', setId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dj_sets' as any)
        .select('*')
        .eq('id', setId)
        .single();
      if (error) throw error;
      return data as unknown as DJSet;
    },
    enabled: !!setId,
  });

  // Increment play count
  useEffect(() => {
    if (set && setId) {
      supabase
        .from('dj_sets' as any)
        .update({ play_count: (set.play_count || 0) + 1 })
        .eq('id', setId)
        .then(() => {});
    }
  }, [setId]);

  // Sync volume
  useEffect(() => {
    const el = videoRef.current || audioRef.current;
    if (el) el.volume = volume / 100;
  }, [volume]);

  // Time tracking
  useEffect(() => {
    const el = videoRef.current || audioRef.current;
    if (!el) return;

    const onTime = () => setCurrentTime(el.currentTime);
    const onDur = () => setDuration(el.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onDur);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);

    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onDur);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
    };
  }, [set]);

  const togglePlay = () => {
    const el = videoRef.current || audioRef.current;
    if (!el) return;
    if (isPlaying) el.pause();
    else el.play().catch(console.error);
  };

  const seek = (time: number) => {
    const el = videoRef.current || audioRef.current;
    if (el) el.currentTime = time;
  };

  const toggleFullscreen = () => {
    const container = document.getElementById('set-video-container');
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!set) return;
      const { error } = await supabase
        .from('dj_sets' as any)
        .update({ like_count: (set.like_count || 0) + 1 })
        .eq('id', setId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dj-set', setId] });
      toast.success('Liked!');
    },
  });

  if (!set) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Music className="h-12 w-12 text-primary/30 animate-pulse" />
      </div>
    );
  }

  const hasVideo = set.has_video && (set.video_url || set.video_embed_url);
  const isEmbed = !!set.video_embed_url;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full min-h-screen">
      {/* Ambient background */}
      {(set.thumbnail_url || set.cover_image_url) && (
        <div
          className="fixed inset-0 opacity-10 blur-3xl pointer-events-none -z-10"
          style={{
            backgroundImage: `url(${set.thumbnail_url || set.cover_image_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto space-y-6">
        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate('/radio')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {/* Video / Audio Player */}
        <div id="set-video-container" className="relative rounded-2xl overflow-hidden bg-black">
          {hasVideo ? (
            isEmbed ? (
              /* YouTube/Vimeo embed */
              <div className="aspect-video">
                <iframe
                  src={`${set.video_embed_url}?autoplay=0&rel=0&modestbranding=1`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  title={set.title}
                />
              </div>
            ) : (
              /* Direct video */
              <div className="aspect-video relative group">
                <video
                  ref={videoRef}
                  src={set.video_url || ''}
                  className="w-full h-full object-contain bg-black"
                  playsInline
                  preload="metadata"
                  poster={set.thumbnail_url || set.cover_image_url || undefined}
                />

                {/* Custom controls overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Progress bar */}
                  <Slider
                    value={[progress]}
                    onValueChange={([v]) => seek((v / 100) * duration)}
                    max={100}
                    step={0.1}
                    className="mb-3"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button onClick={togglePlay}>
                        {isPlaying ? <Pause className="h-5 w-5 text-white" fill="white" /> : <Play className="h-5 w-5 text-white" fill="white" />}
                      </button>
                      <button onClick={() => setVolume(volume > 0 ? 0 : 80)}>
                        {volume === 0 ? <VolumeX className="h-4 w-4 text-white/70" /> : <Volume2 className="h-4 w-4 text-white/70" />}
                      </button>
                      <Slider
                        value={[volume]}
                        onValueChange={([v]) => setVolume(v)}
                        max={100}
                        className="w-20"
                      />
                      <span className="text-xs text-white/60 font-mono">
                        {formatDuration(currentTime)} / {formatDuration(duration)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {set.video_quality && (
                        <Badge variant="outline" className="text-[10px] text-white/60 border-white/20">
                          {QUALITY_LABELS[set.video_quality] || set.video_quality}
                        </Badge>
                      )}
                      <button onClick={toggleFullscreen}>
                        <Maximize className="h-4 w-4 text-white/70 hover:text-white transition-colors" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Center play button (paused state) */}
                {!isPlaying && (
                  <button
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors">
                      <Play className="h-8 w-8 text-white ml-1" fill="white" />
                    </div>
                  </button>
                )}
              </div>
            )
          ) : (
            /* Audio-only: cover art + controls */
            <div className="aspect-video relative flex items-center justify-center bg-gradient-to-br from-primary/10 to-black">
              {set.cover_image_url && (
                <img
                  src={set.cover_image_url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-30 blur-lg"
                />
              )}
              <div className="relative text-center space-y-6">
                {set.cover_image_url ? (
                  <img src={set.cover_image_url} alt="" className="w-48 h-48 rounded-2xl object-cover mx-auto shadow-2xl" />
                ) : (
                  <Music className="h-24 w-24 text-primary/30 mx-auto" />
                )}
                <button
                  onClick={togglePlay}
                  className="h-16 w-16 mx-auto rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  {isPlaying ? <Pause className="h-7 w-7 text-white" fill="white" /> : <Play className="h-7 w-7 text-white ml-1" fill="white" />}
                </button>
              </div>
              <audio ref={audioRef} src={set.audio_url || ''} preload="metadata" />
            </div>
          )}
        </div>

        {/* Set Info + Actions */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold">{set.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{set.dj_name}</span>
              {set.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {set.venue}
                </span>
              )}
              {set.recorded_at && <span>{formatDate(set.recorded_at)}</span>}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(set.duration_seconds)}
              </span>
              {set.genre && <Badge variant="secondary">{set.genre}</Badge>}
              {set.video_quality && (
                <Badge variant="outline" className="gap-1">
                  <Video className="h-3 w-3" />
                  {QUALITY_LABELS[set.video_quality] || set.video_quality}
                </Badge>
              )}
            </div>
            {set.description && (
              <p className="text-sm text-muted-foreground max-w-2xl">{set.description}</p>
            )}
            {set.tags && set.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {set.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => likeMutation.mutate()}
              disabled={likeMutation.isPending}
              className="gap-2"
            >
              <Heart className="h-4 w-4" />
              {set.like_count || 0}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success('Link copied!');
              }}
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </div>

        {/* Tracklist + Social */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tracklist */}
          {set.tracklist && set.tracklist.length > 0 && (
            <Tracklist
              tracks={set.tracklist}
              currentTime={currentTime}
              onSeek={seek}
            />
          )}

          {/* Social */}
          <div className="space-y-4">
            {setId && <FloatingReactions sessionId={setId} />}
            {setId && <LiveChat sessionId={setId} />}
          </div>
        </div>
      </div>
    </div>
  );
}

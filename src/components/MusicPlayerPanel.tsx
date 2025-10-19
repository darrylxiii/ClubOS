import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAudioManager } from '@/hooks/useAudioManager';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function MusicPlayerPanel() {
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  const { play: managedPlay, pause: managedPause } = useAudioManager('preview');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([75]);
  const [currentTrackUrl, setCurrentTrackUrl] = useState<string>("");
  const [progress, setProgress] = useState(0);

  // Fetch active live session
  const { data: liveSession } = useQuery({
    queryKey: ['active-live-session'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_sessions')
        .select(`
          *,
          tracks:current_track_id (
            id,
            title,
            artist,
            file_url,
            cover_image_url,
            duration_seconds
          )
        `)
        .eq('is_active', true)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;

      // Get DJ profile if session exists
      if (data) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', data.dj_id)
          .single();
        
        return { ...data, profile };
      }
      
      return null;
    },
    refetchInterval: 3000,
  });

  // Subscribe to realtime updates for live sessions
  useEffect(() => {
    const channel = supabase
      .channel('music-player-live-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_sessions'
        },
        () => {
          // Refetch will happen automatically due to refetchInterval
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume[0] / 100;
    }
  }, [volume]);

  // Handle track changes
  useEffect(() => {
    if (liveSession?.tracks?.file_url && liveSession.tracks.file_url !== currentTrackUrl) {
      setCurrentTrackUrl(liveSession.tracks.file_url);
      
      if (audioRef.current) {
        audioRef.current.src = liveSession.tracks.file_url;
        audioRef.current.load();
        
        // Auto-play if already playing
        if (isPlaying) {
          managedPlay(audioRef.current).catch((err) => {
            console.error('Play error:', err);
            setIsPlaying(false);
          });
        }
      }
    }
  }, [liveSession?.tracks?.file_url, currentTrackUrl, isPlaying, managedPlay]);

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      toast.error('Failed to load audio');
      setIsPlaying(false);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const togglePlay = async () => {
    if (!audioRef.current || !liveSession) return;

    if (isPlaying) {
      managedPause(audioRef.current);
    } else {
      try {
        await managedPlay(audioRef.current);
      } catch (err) {
        console.error('Play error:', err);
        toast.error('Failed to play audio');
      }
    }
  };

  const handleViewFullPlayer = () => {
    if (liveSession?.id) {
      navigate(`/radio/${liveSession.id}`);
    } else {
      navigate('/radio');
    }
  };

  // Show message if no live session
  if (!liveSession) {
    return (
      <div className="rounded-3xl shadow-2xl overflow-hidden bg-card/30 backdrop-blur-[var(--blur-glass)] border border-border/20">
        <div className="px-5 py-4 flex items-center gap-2 border-b border-border/20">
          <Radio className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">The Quantum Club Radio</h2>
        </div>
        <div className="p-8 text-center">
          <Radio className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Live Broadcast</h3>
          <p className="text-sm text-muted-foreground mb-4">
            No DJs are currently broadcasting. Check back later!
          </p>
          <Button onClick={handleViewFullPlayer} variant="glass" className="w-full">
            View Radio Schedule
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl shadow-2xl overflow-hidden bg-card/30 backdrop-blur-[var(--blur-glass)] border border-border/20">
      {/* Header with Live Indicator */}
      <div className="px-5 py-4 flex items-center gap-2 border-b border-border/20">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <Radio className="h-5 w-5 text-red-500" />
        </div>
        <h2 className="text-base font-semibold text-foreground">LIVE: The Quantum Club Radio</h2>
      </div>

      {/* Now Playing Section */}
      <div className="p-5">
        <div className="relative">
          {/* DJ Profile */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-12 w-12 ring-2 ring-red-500 ring-offset-2">
              <AvatarImage src={liveSession.profile?.avatar_url} />
              <AvatarFallback>
                {liveSession.profile?.full_name?.[0] || 'DJ'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs text-muted-foreground">DJ</p>
              <p className="font-semibold text-sm">{liveSession.profile?.full_name || 'Anonymous DJ'}</p>
            </div>
          </div>

          {/* Track Cover */}
          <div className="relative">
            {liveSession.tracks?.cover_image_url ? (
              <img
                src={liveSession.tracks.cover_image_url}
                alt={liveSession.tracks.title}
                className="w-full aspect-square rounded-2xl object-cover shadow-lg"
              />
            ) : (
              <div className="w-full aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Radio className="h-24 w-24 text-primary/40" />
              </div>
            )}
          </div>
          
          {/* Track Info */}
          <div className="mt-4">
            {liveSession.tracks ? (
              <>
                <h3 className="font-semibold text-base truncate text-foreground">
                  {liveSession.tracks.title}
                </h3>
                {liveSession.tracks.artist && (
                  <p className="text-sm text-muted-foreground truncate">
                    {liveSession.tracks.artist}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Waiting for track...</p>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <Slider
              value={[progress]}
              max={100}
              step={1}
              className="w-full"
              disabled
            />
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <Button
              size="icon"
              className="h-12 w-12 rounded-full bg-red-500 hover:bg-red-600"
              onClick={togglePlay}
              disabled={!liveSession.tracks}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-0.5" />
              )}
            </Button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2 mt-4">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={volume}
              onValueChange={setVolume}
              max={100}
              step={1}
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border/20 mx-5" />

      {/* View Full Player */}
      <div className="p-5">
        <Button 
          onClick={handleViewFullPlayer}
          variant="glass"
          className="w-full"
        >
          View Full Radio Player
        </Button>
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => {
          const audio = e.currentTarget;
          if (audio.duration) {
            setProgress((audio.currentTime / audio.duration) * 100);
          }
        }}
      />
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipForward, Radio, Volume2, List } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export function DJMixer() {
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [volume, setVolume] = useState([75]);
  const [progress, setProgress] = useState(0);
  const [isLive, setIsLive] = useState(false);

  const { data: queue } = useQuery({
    queryKey: ['dj-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dj_queue')
        .select(`
          *,
          tracks (
            id,
            title,
            artist,
            file_url,
            cover_image_url,
            duration_seconds
          )
        `)
        .order('position');
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  const { data: livePlaylist } = useQuery({
    queryKey: ['live-playlist'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('is_live', true)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  const playNextMutation = useMutation({
    mutationFn: async () => {
      if (!queue || queue.length === 0) return;

      const nextTrack = queue[0];
      
      // Mark current as played
      if (currentTrack) {
        await supabase
          .from('dj_queue')
          .update({ is_playing: false, played_at: new Date().toISOString() })
          .eq('id', currentTrack.id);
      }

      // Mark next as playing
      await supabase
        .from('dj_queue')
        .update({ is_playing: true })
        .eq('id', nextTrack.id);

      setCurrentTrack(nextTrack);
      return nextTrack;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dj-queue'] });
    },
  });

  const goLiveMutation = useMutation({
    mutationFn: async () => {
      // Turn off any other live playlists
      await supabase
        .from('playlists')
        .update({ is_live: false })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      const { error } = await supabase
        .from('playlists')
        .update({ is_live: !isLive })
        .eq('id', livePlaylist?.id || '');

      if (error) throw error;
      return !isLive;
    },
    onSuccess: (newState) => {
      setIsLive(newState);
      toast.success(newState ? 'You are now LIVE!' : 'Stopped live broadcast');
      queryClient.invalidateQueries({ queryKey: ['live-playlist'] });
    },
    onError: () => {
      toast.error('Failed to toggle live status');
    },
  });

  useEffect(() => {
    if (livePlaylist?.is_live) {
      setIsLive(true);
    }
  }, [livePlaylist]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume[0] / 100;
    }
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      toast.error('Failed to load audio track');
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

  useEffect(() => {
    if (currentTrack?.tracks && audioRef.current) {
      const audio = audioRef.current;
      audio.src = currentTrack.tracks.file_url;
      audio.load();
      
      if (isPlaying) {
        audio.play().catch(err => {
          console.error('Play error:', err);
          toast.error('Failed to play track');
          setIsPlaying(false);
        });
      }
    }
  }, [currentTrack]);

  const togglePlay = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      if (!currentTrack && queue && queue.length > 0) {
        playNextMutation.mutate();
      } else if (audioRef.current.src) {
        try {
          await audioRef.current.play();
        } catch (err) {
          console.error('Play error:', err);
          toast.error('Failed to play track');
        }
      }
    }
  };

  const skipTrack = () => {
    playNextMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Live Status Banner */}
      <AnimatePresence>
        {isLive && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="rounded-3xl bg-gradient-to-r from-red-500/20 to-pink-500/20 backdrop-blur-xl border border-red-500/30 p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                <div>
                  <h3 className="text-xl font-bold">DJ Now Live!</h3>
                  <p className="text-sm text-muted-foreground">
                    Broadcasting to The Quantum Club Radio
                  </p>
                </div>
              </div>
              <Button
                onClick={() => goLiveMutation.mutate()}
                variant="outline"
                className="border-red-500/50 hover:bg-red-500/20"
              >
                Stop Broadcast
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player */}
      <div className="rounded-3xl bg-black/20 backdrop-blur-xl border border-white/10 p-6 space-y-6">
        {/* Now Playing */}
        {currentTrack?.tracks ? (
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex-shrink-0">
              {currentTrack.tracks.cover_image_url ? (
                <img
                  src={currentTrack.tracks.cover_image_url}
                  alt={currentTrack.tracks.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Radio className="h-10 w-10 text-primary/40" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg truncate">{currentTrack.tracks.title}</h3>
              {currentTrack.tracks.artist && (
                <p className="text-sm text-muted-foreground truncate">
                  {currentTrack.tracks.artist}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Radio className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No track selected</p>
          </div>
        )}

        {/* Progress */}
        <Slider
          value={[progress]}
          max={100}
          step={1}
          className="w-full"
          disabled
        />

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            size="icon"
            className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90"
            onClick={togglePlay}
            disabled={!queue || queue.length === 0}
          >
            {isPlaying ? (
              <Pause className="h-8 w-8" />
            ) : (
              <Play className="h-8 w-8 ml-1" />
            )}
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-12 w-12 rounded-full"
            onClick={skipTrack}
            disabled={!queue || queue.length === 0}
          >
            <SkipForward className="h-6 w-6" />
          </Button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-3">
          <Volume2 className="h-5 w-5 text-muted-foreground" />
          <Slider
            value={volume}
            onValueChange={setVolume}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground w-12 text-right">
            {volume[0]}%
          </span>
        </div>

        {/* Go Live Button */}
        {!isLive && (
          <Button
            onClick={() => goLiveMutation.mutate()}
            className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
          >
            <Radio className="h-4 w-4 mr-2" />
            Go Live
          </Button>
        )}
      </div>

      {/* Queue */}
      <div className="rounded-3xl bg-black/20 backdrop-blur-xl border border-white/10 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <List className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-lg">Queue</h3>
          <span className="text-sm text-muted-foreground ml-auto">
            {queue?.length || 0} tracks
          </span>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {queue && queue.length > 0 ? (
            queue.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  item.is_playing
                    ? 'bg-primary/20 border border-primary/30'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <span className="text-sm font-bold text-muted-foreground w-6">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.tracks.title}</p>
                  {item.tracks.artist && (
                    <p className="text-xs text-muted-foreground truncate">
                      {item.tracks.artist}
                    </p>
                  )}
                </div>
                {item.is_playing && (
                  <Radio className="h-4 w-4 text-primary animate-pulse" />
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Queue is empty</p>
              <p className="text-sm mt-1">Add tracks to playlists to populate the queue</p>
            </div>
          )}
        </div>
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => {
          const audio = e.currentTarget;
          setProgress((audio.currentTime / audio.duration) * 100);
        }}
        onEnded={skipTrack}
      />
    </div>
  );
}

import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Volume2, Radio } from "lucide-react";
import { toast } from "sonner";
import { useAudioManager } from "@/hooks/useAudioManager";

export default function RadioListen() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  const { play: managedPlay } = useAudioManager('dj');
  const [volume, setVolume] = useState([75]);
  const [currentTrackUrl, setCurrentTrackUrl] = useState<string>("");

  const { data: session } = useQuery({
    queryKey: ['live-session', sessionId],
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
            cover_image_url
          )
        `)
        .eq('id', sessionId)
        .single();
      
      if (error) throw error;

      // Get DJ profile separately
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', data.dj_id)
        .single();

      return { ...data, profile };
    },
    refetchInterval: 3000,
  });

  // Subscribe to realtime updates for track changes
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`live-session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          console.log('Session updated:', payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume[0] / 100;
    }
  }, [volume]);

  // Handle track changes
  useEffect(() => {
    if (session?.tracks?.file_url && session.tracks.file_url !== currentTrackUrl) {
      setCurrentTrackUrl(session.tracks.file_url);
      
      if (audioRef.current) {
        audioRef.current.src = session.tracks.file_url;
        audioRef.current.load();
        managedPlay(audioRef.current).catch((err) => {
          console.error('Play error:', err);
          toast.error('Failed to play track');
        });
      }
    }
  }, [session?.tracks?.file_url, currentTrackUrl, managedPlay]);

  // Check if session is still active
  useEffect(() => {
    if (session && !session.is_active) {
      toast.error('This broadcast has ended');
      navigate('/radio');
    }
  }, [session, navigate]);

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Radio className="h-16 w-16 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading broadcast...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/radio')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Radio
        </Button>

        <div className="rounded-3xl bg-black/20 backdrop-blur-xl border border-white/10 p-8 space-y-6">
          {/* Live Indicator */}
          <div className="flex items-center justify-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-bold text-red-500 uppercase">Live Broadcast</span>
          </div>

          {/* Track Cover */}
          <div className="aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            {session.tracks?.cover_image_url ? (
              <img
                src={session.tracks.cover_image_url}
                alt={session.tracks.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <Radio className="h-24 w-24 text-primary/40" />
            )}
          </div>

          {/* Track Info */}
          <div className="text-center space-y-2">
            {session.tracks ? (
              <>
                <h2 className="text-2xl font-bold">{session.tracks.title}</h2>
                {session.tracks.artist && (
                  <p className="text-lg text-muted-foreground">{session.tracks.artist}</p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Waiting for track...</p>
            )}
          </div>

          {/* DJ Info */}
          <div className="flex items-center justify-center gap-3 pt-4 border-t border-white/10">
            <Avatar className="h-10 w-10">
              <AvatarImage src={session.profile?.avatar_url} />
              <AvatarFallback>
                {session.profile?.full_name?.[0] || 'DJ'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">Hosted by</p>
              <p className="font-medium">{session.profile?.full_name || 'Anonymous DJ'}</p>
            </div>
          </div>

          {/* Volume Control */}
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
        </div>

        {/* Hidden Audio Element */}
        <audio ref={audioRef} />
      </div>
    </div>
  );
}

import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Volume2, Radio, Heart } from "lucide-react";
import { toast } from "sonner";
import { useAudioManager } from "@/hooks/useAudioManager";
import { SpotifyEmbed } from "@/components/feed/SpotifyEmbed";

export default function RadioListen() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  const { play: managedPlay } = useAudioManager('dj');
  const [volume, setVolume] = useState([75]);
  const [currentTrackUrl, setCurrentTrackUrl] = useState<string>("");
  const queryClient = useQueryClient();
  const [listenerId, setListenerId] = useState<string | null>(null);

  const { data: session } = useQuery({
    queryKey: ['radio-session', sessionId],
    queryFn: async () => {
      // Try playlist first
      const { data: playlist } = await supabase
        .from('playlists')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (playlist) {
        return { type: 'playlist' as const, data: playlist };
      }

      // Otherwise fetch live session
      const { data: liveSession, error } = await supabase
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

      // Get DJ profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', liveSession.dj_id)
        .single();

      return { type: 'live' as const, data: { ...liveSession, profile } };
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    staleTime: 15000,
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

  // Register as listener for live sessions
  useEffect(() => {
    if (session?.type !== 'live' || !sessionId) return;

    const registerAsListener = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data, error } = await supabase.rpc('register_listener', {
          p_session_id: sessionId,
          p_user_id: user?.id || null,
          p_ip_address: null, // Could use a service to get IP if needed
        });

        if (error) {
          console.error('Failed to register as listener:', error);
        } else {
          setListenerId(data);
          console.log('Registered as listener:', data);
        }
      } catch (err) {
        console.error('Error registering listener:', err);
      }
    };

    registerAsListener();

    // Cleanup: unregister on unmount
    return () => {
      if (sessionId) {
        supabase.auth.getUser().then(({ data: { user } }) => {
          supabase.rpc('unregister_listener', {
            p_session_id: sessionId,
            p_user_id: user?.id || null,
            p_ip_address: null,
          }).then(({ error }) => {
            if (error) console.error('Failed to unregister:', error);
          });
        });
      }
    };
  }, [session?.type, sessionId]);

  // Increment play count on load (for playlists)
  useEffect(() => {
    if (session?.type === 'playlist') {
      supabase
        .from('playlists')
        .update({ play_count: (session.data.play_count || 0) + 1 })
        .eq('id', sessionId)
        .then(() => console.log('Play count incremented'));
    }
  }, [session?.type, sessionId]);

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (session?.type !== 'playlist') return;
      
      const { error } = await supabase
        .from('playlists')
        .update({ like_count: (session.data.like_count || 0) + 1 })
        .eq('id', sessionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radio-session', sessionId] });
      toast.success('Liked playlist!');
    },
  });

  // Handle track changes (for live sessions)
  useEffect(() => {
    if (session?.type === 'live' && session.data.tracks?.file_url && session.data.tracks.file_url !== currentTrackUrl) {
      setCurrentTrackUrl(session.data.tracks.file_url);
      
      if (audioRef.current) {
        audioRef.current.src = session.data.tracks.file_url;
        audioRef.current.load();
        managedPlay(audioRef.current).catch((err) => {
          console.error('Play error:', err);
          toast.error('Failed to play track');
        });
      }
    }
  }, [session?.type, session?.data, currentTrackUrl, managedPlay]);

  // Check if live session is still active
  useEffect(() => {
    if (session?.type === 'live' && !session.data.is_active) {
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

        {session?.type === 'playlist' ? (
          // Spotify Playlist View
          <div className="rounded-3xl bg-black/20 backdrop-blur-xl border border-white/10 p-8 space-y-6">
            {/* Playlist Info */}
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold">{session.data.name}</h2>
              {session.data.description && (
                <p className="text-muted-foreground">{session.data.description}</p>
              )}
              
              {/* Mood Tags */}
              {session.data.mood_tags && session.data.mood_tags.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {session.data.mood_tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Genre & Energy */}
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                {session.data.genre && <span>Genre: {session.data.genre}</span>}
                {session.data.energy_level && (
                  <span>Energy: {session.data.energy_level}</span>
                )}
              </div>
            </div>

            {/* Spotify Embed */}
            <SpotifyEmbed 
              type="playlist"
              spotifyId={session.data.spotify_playlist_id}
              url={session.data.spotify_embed_url}
              className="h-[380px]"
            />

            {/* Like Button */}
            <div className="flex items-center justify-center gap-4 pt-4 border-t border-white/10">
              <Button
                onClick={() => likeMutation.mutate()}
                variant="outline"
                disabled={likeMutation.isPending}
              >
                <Heart className="mr-2 h-4 w-4" />
                Like Playlist ({session.data.like_count || 0})
              </Button>
            </div>
          </div>
        ) : (
          // Live DJ Session View
          <div className="rounded-3xl bg-black/20 backdrop-blur-xl border border-white/10 p-8 space-y-6">
            {/* Live Indicator */}
            <div className="flex items-center justify-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-bold text-red-500 uppercase">Live Broadcast</span>
            </div>

            {/* Track Cover */}
            <div className="aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              {session?.data?.tracks?.cover_image_url ? (
                <img
                  src={session.data.tracks.cover_image_url}
                  alt={session.data.tracks.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Radio className="h-24 w-24 text-primary/40" />
              )}
            </div>

            {/* Track Info */}
            <div className="text-center space-y-2">
              {session?.data?.tracks ? (
                <>
                  <h2 className="text-2xl font-bold">{session.data.tracks.title}</h2>
                  {session.data.tracks.artist && (
                    <p className="text-lg text-muted-foreground">{session.data.tracks.artist}</p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Waiting for track...</p>
              )}
            </div>

            {/* DJ Info & Listener Count */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={session?.data?.profile?.avatar_url} />
                  <AvatarFallback>
                    {session?.data?.profile?.full_name?.[0] || 'DJ'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-muted-foreground">Hosted by</p>
                  <p className="font-medium">{session?.data?.profile?.full_name || 'Anonymous DJ'}</p>
                </div>
              </div>
              {session?.data?.listener_count !== undefined && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{session.data.listener_count}</p>
                  <p className="text-xs text-muted-foreground">Listening Now</p>
                </div>
              )}
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
        )}

        {/* Hidden Audio Element (for live DJ only) */}
        {session?.type === 'live' && <audio ref={audioRef} />}
      </div>
    </div>
  );
}

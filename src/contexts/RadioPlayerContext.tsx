import { createContext, useContext, useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ── Types ──────────────────────────────────────────────────────────────────────

interface TrackInfo {
  id: string;
  title: string;
  artist: string | null;
  file_url: string;
  cover_image_url: string | null;
}

interface DJProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface LiveSession {
  id: string;
  dj_id: string;
  is_active: boolean;
  listener_count: number | null;
  tracks: TrackInfo | null;
  profile: DJProfile | null;
}

interface PlaylistSession {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  spotify_playlist_id: string | null;
  spotify_embed_url: string | null;
  mood_tags: string[] | null;
  genre: string | null;
  energy_level: string | null;
  play_count: number | null;
  like_count: number | null;
}

type RadioSession =
  | { type: 'live'; data: LiveSession }
  | { type: 'playlist'; data: PlaylistSession };

interface ListenerPresence {
  user_id: string;
  avatar_url: string | null;
  display_name: string | null;
  online_at: string;
}

interface RadioPlayerState {
  session: RadioSession | null;
  isPlaying: boolean;
  volume: number;
  listeners: ListenerPresence[];
  listenerCount: number;
}

interface AudioAnalysis {
  bass: number;
  mid: number;
  treble: number;
  rms: number;
}

interface RadioPlayerContextType extends RadioPlayerState {
  tuneIn: (sessionId: string, type: 'live' | 'playlist') => Promise<void>;
  disconnect: () => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setVolume: (v: number) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  /** True when connected to a LiveKit room (real-time DJ stream) */
  isLiveKitStream: boolean;
  /** Real-time audio frequency analysis for visualizations */
  analysis: AudioAnalysis;
}

const RadioPlayerContext = createContext<RadioPlayerContextType | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────

export function RadioPlayerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [session, setSession] = useState<RadioSession | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(75);
  const [listeners, setListeners] = useState<ListenerPresence[]>([]);
  const [listenerCount, setListenerCount] = useState(0);
  const [currentTrackUrl, setCurrentTrackUrl] = useState('');
  const [isLiveKitStream, setIsLiveKitStream] = useState(false);
  const liveKitRoomRef = useRef<any>(null);
  const [analysis, setAnalysis] = useState<AudioAnalysis>({ bass: 0, mid: 0, treble: 0, rms: 0 });
  const analyserCtxRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const analyserRafRef = useRef<number>(0);

  // ── Audio analysis loop (connects to audioRef) ──────────────────────────
  useEffect(() => {
    if (!isPlaying || !audioRef.current) {
      setAnalysis({ bass: 0, mid: 0, treble: 0, rms: 0 });
      return;
    }

    // Only create AudioContext once
    if (!analyserCtxRef.current) {
      try {
        const ctx = new AudioContext();
        const source = ctx.createMediaElementSource(audioRef.current);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        analyser.connect(ctx.destination);
        analyserCtxRef.current = ctx;
        analyserNodeRef.current = analyser;
      } catch {
        // MediaElementSource may already be created — skip
        return;
      }
    }

    const analyser = analyserNodeRef.current;
    if (!analyser) return;

    if (analyserCtxRef.current?.state === 'suspended') {
      analyserCtxRef.current.resume();
    }

    const bins = new Uint8Array(analyser.frequencyBinCount);

    const loop = () => {
      analyser.getByteFrequencyData(bins);
      const binCount = bins.length;
      const bassEnd = Math.floor(binCount * 0.15);
      const midEnd = Math.floor(binCount * 0.5);
      let bassSum = 0, midSum = 0, trebleSum = 0, rmsSum = 0;
      for (let i = 0; i < binCount; i++) {
        const v = bins[i] / 255;
        if (i < bassEnd) bassSum += v;
        else if (i < midEnd) midSum += v;
        else trebleSum += v;
        rmsSum += v * v;
      }
      setAnalysis({
        bass: bassSum / bassEnd,
        mid: midSum / (midEnd - bassEnd),
        treble: trebleSum / (binCount - midEnd),
        rms: Math.sqrt(rmsSum / binCount),
      });
      analyserRafRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(analyserRafRef.current);
    };
  }, [isPlaying]);

  // ── Volume sync ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.max(0, Math.min(100, v)));
  }, []);

  // ── Play / pause ─────────────────────────────────────────────────────────
  const play = useCallback(() => {
    if (audioRef.current && audioRef.current.src) {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  // ── Tune in to a session ─────────────────────────────────────────────────
  const tuneIn = useCallback(async (sessionId: string, type: 'live' | 'playlist') => {
    // Stop existing playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setIsPlaying(false);
    setCurrentTrackUrl('');

    if (type === 'playlist') {
      const { data: playlist, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error || !playlist) return;

      setSession({ type: 'playlist', data: playlist as PlaylistSession });
      setListenerCount(0);
    } else {
      const { data: liveSession, error } = await supabase
        .from('live_sessions')
        .select(`
          *,
          tracks:current_track_id (
            id, title, artist, file_url, cover_image_url
          )
        `)
        .eq('id', sessionId)
        .single();

      if (error || !liveSession) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', liveSession.dj_id)
        .single();

      const sessionData: LiveSession = {
        ...liveSession,
        tracks: liveSession.tracks as unknown as TrackInfo | null,
        profile: profile || null,
      };

      setSession({ type: 'live', data: sessionData });
      setListenerCount(liveSession.listener_count || 0);

      // Try connecting to LiveKit stream first (real-time DJ audio)
      let connectedToLiveKit = false;
      try {
        const roomName = `dj-live-${sessionId}`;
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        if (currentUser) {
          const { data: tokenData } = await supabase.functions.invoke('livekit-token', {
            body: {
              roomName,
              participantName: currentUser.email?.split('@')[0] || 'Listener',
              participantId: currentUser.id,
              isHost: false,
              canPublish: false,
              canSubscribe: true,
            },
          });

          if (tokenData?.token) {
            const { Room, RoomEvent } = await import('livekit-client');
            const room = new Room();

            // Auto-play received audio tracks
            room.on(RoomEvent.TrackSubscribed, (track) => {
              if (track.kind === 'audio') {
                const audioEl = track.attach();
                audioEl.volume = volume / 100;
                document.body.appendChild(audioEl);
                setIsPlaying(true);
                setIsLiveKitStream(true);
              }
            });

            room.on(RoomEvent.Disconnected, () => {
              setIsLiveKitStream(false);
            });

            await room.connect('wss://thequantumclub-os.livekit.cloud', tokenData.token);
            liveKitRoomRef.current = room;
            connectedToLiveKit = true;
          }
        }
      } catch {
        // LiveKit not available for this session — fall back to file playback
      }

      // Fallback: play track file directly if no LiveKit stream
      if (!connectedToLiveKit && sessionData.tracks?.file_url && audioRef.current) {
        audioRef.current.src = sessionData.tracks.file_url;
        setCurrentTrackUrl(sessionData.tracks.file_url);
        audioRef.current.load();
        audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
      }

      // Register as listener
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        supabase.rpc('register_listener', {
          p_session_id: sessionId,
          p_user_id: currentUser.id,
          p_ip_address: null,
        }).catch(console.error);
      }
    }
  }, [volume]);

  // ── Disconnect ───────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    // Disconnect from LiveKit room
    if (liveKitRoomRef.current) {
      liveKitRoomRef.current.disconnect().catch(() => {});
      liveKitRoomRef.current = null;
      setIsLiveKitStream(false);
    }

    // Unregister from live session
    if (session?.type === 'live') {
      supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
        if (currentUser && session.data.id) {
          supabase.rpc('unregister_listener', {
            p_session_id: session.data.id,
            p_user_id: currentUser.id,
            p_ip_address: null,
          }).catch(console.error);
        }
      });
    }

    setSession(null);
    setIsPlaying(false);
    setCurrentTrackUrl('');
    setListeners([]);
    setListenerCount(0);
  }, [session]);

  // ── Realtime: Track changes for live sessions ────────────────────────────
  useEffect(() => {
    if (session?.type !== 'live') return;
    const sessionId = session.data.id;

    const channel = supabase
      .channel(`radio-player-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_sessions',
          filter: `id=eq.${sessionId}`,
        },
        async (payload) => {
          const updated = payload.new as any;

          // Session ended
          if (!updated.is_active) {
            disconnect();
            return;
          }

          setListenerCount(updated.listener_count || 0);

          // Track changed — fetch new track info
          if (updated.current_track_id) {
            const { data: track } = await supabase
              .from('tracks')
              .select('id, title, artist, file_url, cover_image_url')
              .eq('id', updated.current_track_id)
              .single();

            if (track) {
              setSession((prev) => {
                if (prev?.type !== 'live') return prev;
                return { type: 'live', data: { ...prev.data, tracks: track as TrackInfo } };
              });

              if (track.file_url && track.file_url !== currentTrackUrl && audioRef.current) {
                audioRef.current.src = track.file_url;
                setCurrentTrackUrl(track.file_url);
                audioRef.current.load();
                audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.type, session?.type === 'live' ? session.data.id : null, currentTrackUrl, disconnect]);

  // ── Presence: Who's listening ────────────────────────────────────────────
  useEffect(() => {
    if (!session) {
      setListeners([]);
      return;
    }

    const sessionId = session.data.id;
    const channelName = `radio-presence-${sessionId}`;

    const presenceChannel = supabase.channel(channelName, {
      config: { presence: { key: user?.id || 'anon' } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState<ListenerPresence>();
        const allListeners: ListenerPresence[] = [];
        for (const key of Object.keys(state)) {
          const presences = state[key];
          if (presences.length > 0) {
            allListeners.push(presences[0]);
          }
        }
        setListeners(allListeners);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url, full_name')
            .eq('id', user.id)
            .single();

          await presenceChannel.track({
            user_id: user.id,
            avatar_url: profile?.avatar_url || null,
            display_name: profile?.full_name || user.email?.split('@')[0] || null,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [session?.data?.id, user?.id]);

  return (
    <RadioPlayerContext.Provider
      value={{
        session,
        isPlaying,
        volume,
        listeners,
        listenerCount,
        tuneIn,
        disconnect,
        play,
        pause,
        togglePlay,
        setVolume,
        audioRef,
        isLiveKitStream,
        analysis,
      }}
    >
      {children}
      {/* Global audio element — persists across all pages */}
      <audio
        ref={audioRef}
        preload="auto"
        style={{ display: 'none' }}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />
    </RadioPlayerContext.Provider>
  );
}

export function useRadioPlayer() {
  const ctx = useContext(RadioPlayerContext);
  if (!ctx) throw new Error('useRadioPlayer must be used within RadioPlayerProvider');
  return ctx;
}

import { useTranslation } from 'react-i18next';
import { useState, useEffect, RefObject, lazy, Suspense } from 'react';
import { Play, Pause, Volume2, VolumeX, Radio, Video, Music, Heart, Users, ChevronRight, Sparkles, ExternalLink, Headphones, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAudioManager } from '@/hooks/useAudioManager';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { DJSet } from '@/components/radio/sets/types';

// ── Tabs ───────────────────────────────────────────────────────────────────────

type PanelTab = 'live' | 'sets' | 'playlists';

interface MusicPlayerPanelProps {
  audioRef: RefObject<HTMLAudioElement>;
}

// ── Mini EQ Bars ───────────────────────────────────────────────────────────────

function MiniEqBars() {
  return (
    <div className="flex items-end gap-[2px] h-3">
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="w-[2px] rounded-full bg-red-400"
          animate={{ height: ['20%', '100%', '40%', '80%', '30%'] }}
          transition={{ duration: 1 + i * 0.15, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: i * 0.1 }}
        />
      ))}
    </div>
  );
}

// ── Set Card (compact for popup) ───────────────────────────────────────────────

function MiniSetCard({ set, onClick }: { set: DJSet; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors text-left group"
    >
      <div className="h-12 w-16 rounded-lg overflow-hidden bg-black/30 flex-shrink-0 relative">
        {set.thumbnail_url || set.cover_image_url ? (
          <img src={set.thumbnail_url || set.cover_image_url || ''} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {set.has_video ? <Video className="h-4 w-4 text-white/20" /> : <Music className="h-4 w-4 text-white/20" />}
          </div>
        )}
        {set.has_video && set.video_quality && (
          <span className="absolute bottom-0.5 right-0.5 text-[8px] bg-black/70 text-white/80 px-1 rounded font-mono">
            {set.video_quality === '4k' ? '4K' : set.video_quality}
          </span>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
          <Play className="h-4 w-4 text-white" fill="white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{set.title}</p>
        <p className="text-[10px] text-muted-foreground truncate">{set.dj_name}</p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70 mt-0.5">
          {set.genre && <span>{set.genre}</span>}
          {set.duration_seconds > 0 && (
            <span>{Math.floor(set.duration_seconds / 60)}m</span>
          )}
        </div>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors flex-shrink-0" />
    </button>
  );
}

// ── Playlist Card (compact for popup) ──────────────────────────────────────────

function MiniPlaylistCard({ playlist, onClick }: { playlist: any; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors text-left group"
    >
      <div className="h-12 w-12 rounded-lg overflow-hidden bg-black/30 flex-shrink-0">
        {playlist.cover_image_url ? (
          <img src={playlist.cover_image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Music className="h-4 w-4 text-primary/40" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{playlist.name}</p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70 mt-0.5">
          {playlist.genre && <span>{playlist.genre}</span>}
          {playlist.mood_tags?.[0] && <span>{playlist.mood_tags[0]}</span>}
        </div>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors flex-shrink-0" />
    </button>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────────

export function MusicPlayerPanel({ audioRef }: MusicPlayerPanelProps) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { play: managedPlay, pause: managedPause } = useAudioManager('preview');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([75]);
  const [currentTrackUrl, setCurrentTrackUrl] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<PanelTab>('live');

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: liveSession } = useQuery({
    queryKey: ['active-live-session'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_sessions')
        .select(`*, tracks:current_track_id (id, title, artist, file_url, cover_image_url, duration_seconds)`)
        .eq('is_active', true)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
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
    refetchInterval: 15000,
    staleTime: 7000,
  });

  const { data: djSets } = useQuery({
    queryKey: ['popup-dj-sets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dj_sets' as any)
        .select('*')
        .eq('is_published', true)
        .order('is_featured', { ascending: false })
        .order('play_count', { ascending: false })
        .limit(8);
      if (error) return [];
      return (data || []) as unknown as DJSet[];
    },
    staleTime: 120000,
  });

  const { data: playlists } = useQuery({
    queryKey: ['popup-playlists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('playlist_type', 'spotify')
        .eq('is_published', true)
        .order('is_featured', { ascending: false })
        .order('play_count', { ascending: false })
        .limit(6);
      if (error) return [];
      return data || [];
    },
    staleTime: 120000,
  });

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('music-player-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_sessions' }, () => {})
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Volume ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume[0] / 100;
  }, [volume]);

  // ── Track changes ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (liveSession?.tracks?.file_url && liveSession.tracks.file_url !== currentTrackUrl) {
      setCurrentTrackUrl(liveSession.tracks.file_url);
      if (audioRef.current) {
        audioRef.current.src = liveSession.tracks.file_url;
        audioRef.current.load();
        if (isPlaying) {
          managedPlay(audioRef.current).catch(() => setIsPlaying(false));
        }
      }
    }
  }, [liveSession?.tracks?.file_url, currentTrackUrl, isPlaying, managedPlay]);

  // ── Audio events ──────────────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = () => { if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100); };
    const onError = () => { toast.error('Failed to load audio'); setIsPlaying(false); };
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('error', onError);
    };
  }, []);

  const togglePlay = async () => {
    if (!audioRef.current || !liveSession) return;
    if (isPlaying) managedPause(audioRef.current);
    else {
      try { await managedPlay(audioRef.current); } catch { toast.error('Failed to play'); }
    }
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current?.duration) return;
    audioRef.current.currentTime = (value[0] / 100) * audioRef.current.duration;
    setProgress(value[0]);
  };

  // ── Auto-switch to live tab when DJ goes live ─────────────────────────────
  useEffect(() => {
    if (liveSession) setActiveTab('live');
  }, [!!liveSession]);

  const totalSets = djSets?.length || 0;
  const totalPlaylists = playlists?.length || 0;

  return (
    <div className="rounded-3xl shadow-2xl overflow-hidden bg-card/30 backdrop-blur-[var(--blur-glass)] border border-border/20">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border/20">
        <div className="flex items-center gap-2">
          {liveSession && <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
          <Radio className={`h-4 w-4 ${liveSession ? 'text-red-500' : 'text-muted-foreground'}`} />
          <h2 className="text-sm font-semibold">{t('radio.quantumClubRadio', 'Quantum Club Radio')}</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/radio')}
          className="text-xs gap-1 h-7 px-2"
        >
          Open <ExternalLink className="h-3 w-3" />
        </Button>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-border/20">
        {([
          { key: 'live' as const, label: 'Live', icon: Radio, badge: liveSession ? 'LIVE' : null },
          { key: 'sets' as const, label: 'Sets', icon: Video, badge: totalSets > 0 ? String(totalSets) : null },
          { key: 'playlists' as const, label: 'Playlists', icon: Music, badge: totalPlaylists > 0 ? String(totalPlaylists) : null },
        ]).map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all relative ${
              activeTab === key
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground/70'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {badge && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                badge === 'LIVE' ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-muted-foreground'
              }`}>
                {badge}
              </span>
            )}
            {activeTab === key && (
              <motion.div
                layoutId="panel-tab-indicator"
                className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {/* ── LIVE TAB ──────────────────────────────────────────────────────── */}
        {activeTab === 'live' && (
          <motion.div
            key="live"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.15 }}
          >
            {liveSession ? (
              <div className="p-4 space-y-4">
                {/* DJ + Track */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10 ring-2 ring-red-500/50">
                      <AvatarImage src={liveSession.profile?.avatar_url} />
                      <AvatarFallback>{liveSession.profile?.full_name?.[0] || 'DJ'}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-background animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">DJ</p>
                    <p className="text-sm font-semibold truncate">{liveSession.profile?.full_name || 'Anonymous DJ'}</p>
                  </div>
                  {liveSession.listener_count > 0 && (
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <Users className="h-3 w-3" />
                      {liveSession.listener_count}
                    </Badge>
                  )}
                </div>

                {/* Cover + Track Info */}
                <div className="flex gap-3">
                  <div className="h-20 w-20 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex-shrink-0">
                    {liveSession.tracks?.cover_image_url ? (
                      <img src={liveSession.tracks.cover_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Radio className="h-8 w-8 text-primary/30" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    {liveSession.tracks ? (
                      <>
                        <div className="flex items-center gap-2">
                          {isPlaying && <MiniEqBars />}
                          <h3 className="text-sm font-semibold truncate">{liveSession.tracks.title}</h3>
                        </div>
                        {liveSession.tracks.artist && (
                          <p className="text-xs text-muted-foreground truncate">{liveSession.tracks.artist}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">{t('radio.waitingForTrack', 'Waiting for track...')}</p>
                    )}
                  </div>
                </div>

                {/* Progress */}
                <Slider value={[progress]} onValueChange={handleSeek} max={100} step={0.1} className="w-full" />

                {/* Controls */}
                <div className="flex items-center gap-3">
                  <button onClick={() => setVolume(v => [v[0] > 0 ? 0 : 75])}>
                    {volume[0] === 0 ? <VolumeX className="h-4 w-4 text-muted-foreground" /> : <Volume2 className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  <Slider value={volume} onValueChange={setVolume} max={100} step={1} className="w-16" />

                  <div className="flex-1" />

                  <button
                    onClick={togglePlay}
                    disabled={!liveSession.tracks}
                    className="h-10 w-10 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors disabled:opacity-40"
                  >
                    {isPlaying ? <Pause className="h-4 w-4 text-white" fill="white" /> : <Play className="h-4 w-4 text-white ml-0.5" fill="white" />}
                  </button>

                  <div className="flex-1" />

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/radio/${liveSession.id}`)}
                    className="text-xs h-8 gap-1"
                  >
                    Full View
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center space-y-3">
                <div className="mx-auto w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center">
                  <Headphones className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-sm font-medium">{t('radio.noDjLive', 'No DJ Live')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('radio.checkOutSets', 'Check out sets or playlists below')}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/radio')} className="text-xs">
                  View Radio Schedule
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── SETS TAB ──────────────────────────────────────────────────────── */}
        {activeTab === 'sets' && (
          <motion.div
            key="sets"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className="max-h-[360px] overflow-y-auto"
          >
            {djSets && djSets.length > 0 ? (
              <div className="p-2 space-y-0.5">
                {djSets.map((set) => (
                  <MiniSetCard
                    key={set.id}
                    set={set}
                    onClick={() => navigate(`/radio/set/${set.id}`)}
                  />
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/sets')}
                  className="w-full text-xs mt-1"
                >
                  View All Sets
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            ) : (
              <div className="p-6 text-center">
                <Video className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">{t('radio.noSetsYet', 'No sets yet')}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── PLAYLISTS TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'playlists' && (
          <motion.div
            key="playlists"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className="max-h-[360px] overflow-y-auto"
          >
            {playlists && playlists.length > 0 ? (
              <div className="p-2 space-y-0.5">
                {playlists.map((pl: any) => (
                  <MiniPlaylistCard
                    key={pl.id}
                    playlist={pl}
                    onClick={() => navigate(`/radio/playlist/${pl.id}`)}
                  />
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/radio')}
                  className="w-full text-xs mt-1"
                >
                  View All Playlists
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            ) : (
              <div className="p-6 text-center">
                <Music className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">{t('radio.noPlaylistsYet', 'No playlists yet')}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

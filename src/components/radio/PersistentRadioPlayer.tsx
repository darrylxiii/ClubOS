import { memo, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, X, Volume2, VolumeX, Radio, ChevronUp, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { useRadioPlayer } from '@/contexts/RadioPlayerContext';
import { cn } from '@/lib/utils';

// ── Animated Equalizer Bars ────────────────────────────────────────────────────

function EqBars({ isPlaying, audioRef }: { isPlaying: boolean; audioRef: React.RefObject<HTMLAudioElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const audio = audioRef.current;
    const canvas = canvasRef.current;
    if (!audio || !canvas) return;

    // Only create AudioContext once per audio element
    if (!ctxRef.current) {
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      ctxRef.current = ctx;
      sourceRef.current = source;
      analyserRef.current = analyser;
    }

    const analyser = analyserRef.current!;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvasCtx = canvas.getContext('2d')!;
    const barCount = 5;
    const barGap = 2;

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const w = canvas!.width;
      const h = canvas!.height;
      canvasCtx.clearRect(0, 0, w, h);

      const barWidth = (w - barGap * (barCount - 1)) / barCount;

      for (let i = 0; i < barCount; i++) {
        // Sample from different parts of the frequency spectrum
        const idx = Math.floor((i / barCount) * bufferLength * 0.6) + 1;
        const val = dataArray[idx] / 255;
        const barHeight = Math.max(val * h, 2);

        canvasCtx.fillStyle = `rgba(168, 85, 247, ${0.5 + val * 0.5})`;
        canvasCtx.beginPath();
        canvasCtx.roundRect(
          i * (barWidth + barGap),
          h - barHeight,
          barWidth,
          barHeight,
          1
        );
        canvasCtx.fill();
      }
    }

    if (isPlaying) {
      if (ctxRef.current.state === 'suspended') {
        ctxRef.current.resume();
      }
      draw();
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, audioRef]);

  // Fallback CSS bars when no audio source connected yet
  if (!isPlaying) return null;

  return (
    <canvas
      ref={canvasRef}
      width={24}
      height={20}
      className="flex-shrink-0"
    />
  );
}

// ── CSS Fallback Bars (for Spotify playlists with no audio element) ────────────

function CssEqBars() {
  return (
    <div className="flex items-end gap-[2px] h-4 flex-shrink-0">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-primary/70"
          animate={{
            height: ['30%', '100%', '50%', '80%', '40%'],
          }}
          transition={{
            duration: 1.2 + i * 0.15,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
            delay: i * 0.1,
          }}
        />
      ))}
    </div>
  );
}

// ── Listener Avatars ───────────────────────────────────────────────────────────

function ListenerAvatars({ listeners, count }: { listeners: { user_id: string; avatar_url: string | null; display_name: string | null }[]; count: number }) {
  const shown = listeners.slice(0, 5);
  const extra = Math.max(0, count - shown.length);

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((l) => (
          <Avatar key={l.user_id} className="h-6 w-6 ring-2 ring-background">
            <AvatarImage src={l.avatar_url || undefined} />
            <AvatarFallback className="text-[10px] bg-primary/20">
              {l.display_name?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      {extra > 0 && (
        <span className="text-xs text-muted-foreground ml-1.5">+{extra}</span>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export const PersistentRadioPlayer = memo(function PersistentRadioPlayer() {
  const {
    session,
    isPlaying,
    volume,
    listeners,
    listenerCount,
    togglePlay,
    setVolume,
    disconnect,
    audioRef,
    analysis,
  } = useRadioPlayer();

  const navigate = useNavigate();
  const [showVolume, setShowVolume] = useState(false);
  const prevVolume = useRef(75);

  if (!session) return null;

  const isLive = session.type === 'live';
  const title = isLive ? session.data.tracks?.title : session.data.name;
  const artist = isLive ? session.data.tracks?.artist : session.data.genre;
  const coverUrl = isLive ? session.data.tracks?.cover_image_url : session.data.cover_image_url;
  const djName = isLive ? session.data.profile?.full_name : null;
  const totalListeners = isLive ? (session.data.listener_count || listenerCount) : listeners.length;

  const toggleMute = () => {
    if (volume > 0) {
      prevVolume.current = volume;
      setVolume(0);
    } else {
      setVolume(prevVolume.current || 75);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 md:left-28 z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Ambient glow from cover art */}
        {coverUrl && (
          <div
            className="absolute inset-0 opacity-20 blur-3xl pointer-events-none -z-10"
            style={{
              backgroundImage: `url(${coverUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        )}

        <div
          className="mx-2 mb-2 md:mx-4 md:mb-3 rounded-2xl bg-background/80 backdrop-blur-2xl border border-white/10 transition-shadow duration-150"
          style={{
            boxShadow: isPlaying
              ? `0 -4px 32px rgba(0,0,0,0.3), 0 0 ${20 + analysis.bass * 40}px rgba(168, 85, 247, ${0.05 + analysis.bass * 0.15})`
              : '0 -4px 32px rgba(0,0,0,0.3)',
          }}
        >
          <div className="flex items-center gap-3 px-3 py-2.5 md:px-4 md:py-3">
            {/* Cover Art */}
            <button
              onClick={() => navigate(`/radio/${session.data.id}`)}
              className="relative flex-shrink-0 group"
            >
              <motion.div
                animate={isPlaying ? { scale: [1, 1 + analysis.bass * 0.08, 1] } : { scale: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="h-12 w-12 rounded-lg overflow-hidden bg-gradient-to-br from-primary/30 to-primary/5 ring-1 ring-white/10"
              >
                {coverUrl ? (
                  <img src={coverUrl} alt={title || ''} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Radio className="h-5 w-5 text-primary/60" />
                  </div>
                )}
              </motion.div>
              {isLive && (
                <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-pulse ring-2 ring-background" />
              )}
            </button>

            {/* Track Info */}
            <button
              onClick={() => navigate(isLive ? `/radio/${session.data.id}` : `/radio/${session.data.id}`)}
              className="flex-1 min-w-0 text-left"
            >
              <div className="flex items-center gap-2">
                {isPlaying && (isLive ? <EqBars isPlaying={isPlaying} audioRef={audioRef} /> : <CssEqBars />)}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{title || 'No track'}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {djName ? `${djName} · ${artist || ''}` : (artist || '')}
                  </p>
                </div>
              </div>
            </button>

            {/* Listeners */}
            {(listeners.length > 0 || totalListeners > 0) && (
              <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                {listeners.length > 0 ? (
                  <ListenerAvatars listeners={listeners} count={totalListeners} />
                ) : (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{totalListeners}</span>
                  </div>
                )}
              </div>
            )}

            {/* Volume */}
            <div className="hidden md:flex items-center gap-2 flex-shrink-0">
              <button onClick={toggleMute} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
                {volume === 0 ? (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <Slider
                value={[volume]}
                onValueChange={([v]) => setVolume(v)}
                max={100}
                step={1}
                className="w-20"
              />
            </div>

            {/* Play / Pause (only for live — Spotify manages its own playback) */}
            {isLive && (
              <button
                onClick={togglePlay}
                className="flex-shrink-0 h-10 w-10 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 text-primary-foreground" fill="currentColor" />
                ) : (
                  <Play className="h-4 w-4 text-primary-foreground ml-0.5" fill="currentColor" />
                )}
              </button>
            )}

            {/* Close */}
            <button
              onClick={disconnect}
              className="flex-shrink-0 p-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

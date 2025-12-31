import { useEffect, useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Mic, MicOff, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AudioLevelIndicatorProps {
  stream: MediaStream | null;
  isEnabled: boolean;
  className?: string;
  showWarning?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'bar' | 'circle' | 'compact';
}

export function AudioLevelIndicator({
  stream,
  isEnabled,
  className,
  showWarning = true,
  size = 'md',
  variant = 'bar'
}: AudioLevelIndicatorProps) {
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSilent, setIsSilent] = useState(false);
  const [silenceDuration, setSilenceDuration] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const silenceStartRef = useRef<number | null>(null);

  const SILENCE_THRESHOLD = 0.03;
  const SILENCE_WARNING_MS = 10000; // 10 seconds

  const cleanup = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch (e) {
        // Already disconnected
      }
      sourceRef.current = null;
    }
    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch (e) {
        // Already disconnected
      }
      analyserRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!stream || !isEnabled) {
      cleanup();
      setAudioLevel(0);
      setIsSilent(false);
      setSilenceDuration(0);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      return;
    }

    // Setup audio analysis
    const setupAnalyzer = async () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass({ sampleRate: 44100 });
        
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        sourceRef.current = source;

        // Animation loop for audio level
        const updateLevel = () => {
          if (!analyserRef.current) return;

          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);

          // Calculate RMS for more accurate level
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);
          const normalizedLevel = Math.min(rms / 128, 1);

          setAudioLevel(prev => prev * 0.7 + normalizedLevel * 0.3);

          // Track silence
          const currentlySilent = normalizedLevel < SILENCE_THRESHOLD;
          
          if (currentlySilent) {
            if (!silenceStartRef.current) {
              silenceStartRef.current = Date.now();
            }
            const duration = Date.now() - silenceStartRef.current;
            setSilenceDuration(duration);
            setIsSilent(duration > SILENCE_WARNING_MS);
          } else {
            silenceStartRef.current = null;
            setSilenceDuration(0);
            setIsSilent(false);
          }

          rafRef.current = requestAnimationFrame(updateLevel);
        };

        updateLevel();
      } catch (err) {
        console.error('[AudioLevel] Failed to setup analyzer:', err);
      }
    };

    setupAnalyzer();

    return cleanup;
  }, [stream, isEnabled, cleanup]);

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20
  };

  if (!isEnabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('flex items-center gap-2', className)}>
              <MicOff className="text-destructive" size={iconSizes[size]} />
              {variant !== 'compact' && (
                <div className={cn('w-16 bg-muted rounded-full overflow-hidden', sizeClasses[size])}>
                  <div className="h-full w-0 bg-muted-foreground/30" />
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Microphone is muted</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === 'circle') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('relative', className)}>
              <motion.div
                className={cn(
                  'rounded-full flex items-center justify-center',
                  size === 'sm' && 'w-6 h-6',
                  size === 'md' && 'w-8 h-8',
                  size === 'lg' && 'w-10 h-10',
                  isSilent ? 'bg-destructive/20' : 'bg-primary/20'
                )}
                animate={{
                  scale: 1 + audioLevel * 0.3,
                }}
                transition={{ duration: 0.1 }}
              >
                {isSilent ? (
                  <AlertTriangle className="text-destructive" size={iconSizes[size]} />
                ) : (
                  <Mic className="text-primary" size={iconSizes[size]} />
                )}
              </motion.div>
              
              {/* Ripple effect when speaking */}
              <AnimatePresence>
                {audioLevel > 0.1 && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary"
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                )}
              </AnimatePresence>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {isSilent 
              ? `No audio detected for ${Math.round(silenceDuration / 1000)}s - check your microphone`
              : 'Microphone is working'
            }
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-2', className)}>
            {isSilent ? (
              <AlertTriangle className="text-destructive animate-pulse" size={iconSizes[size]} />
            ) : (
              <Mic className="text-primary" size={iconSizes[size]} />
            )}
            
            {variant !== 'compact' && (
              <div className={cn(
                'w-20 bg-muted rounded-full overflow-hidden border',
                sizeClasses[size],
                isSilent ? 'border-destructive/50' : 'border-transparent'
              )}>
                <motion.div
                  className={cn(
                    'h-full rounded-full',
                    isSilent 
                      ? 'bg-destructive' 
                      : 'bg-gradient-to-r from-primary to-primary/70'
                  )}
                  animate={{ width: `${audioLevel * 100}%` }}
                  transition={{ duration: 0.1, ease: 'linear' }}
                />
              </div>
            )}

            {showWarning && isSilent && (
              <span className="text-xs text-destructive animate-pulse">
                No audio
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {isSilent ? (
            <div className="text-center">
              <p className="font-medium text-destructive">No audio detected</p>
              <p className="text-xs text-muted-foreground">
                Check your microphone settings or speak louder
              </p>
            </div>
          ) : (
            <p>Microphone is working</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

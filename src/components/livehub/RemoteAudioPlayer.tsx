import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

interface RemoteAudioPlayerProps {
  userId: string;
  stream: MediaStream;
  volume?: number;
  isDeafened?: boolean;
  onAudioLevelChange?: (level: number) => void;
}

// Singleton AudioContext for all remote audio - prevents browser limits
let sharedAudioContext: AudioContext | null = null;

const getSharedAudioContext = async (): Promise<AudioContext> => {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioContext({ 
      latencyHint: 'interactive',
      sampleRate: 48000
    });
    console.log('[RemoteAudio] Created shared AudioContext', {
      latency: sharedAudioContext.baseLatency,
      sampleRate: sharedAudioContext.sampleRate
    });
  }
  
  if (sharedAudioContext.state === 'suspended') {
    try {
      await sharedAudioContext.resume();
      console.log('[RemoteAudio] Resumed shared AudioContext');
    } catch (e) {
      console.warn('[RemoteAudio] Could not resume AudioContext:', e);
    }
  }
  
  return sharedAudioContext;
};

export function RemoteAudioPlayer({ 
  userId, 
  stream, 
  volume = 1, 
  isDeafened = false,
  onAudioLevelChange 
}: RemoteAudioPlayerProps) {
  // HTML Audio element as PRIMARY playback (most compatible)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // AudioContext for gain control and monitoring
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioContextUsedRef = useRef<AudioContext | null>(null);
  
  // State tracking
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasSetup, setHasSetup] = useState(false);
  const streamIdRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 5;
  
  // Audio level monitoring interval
  const levelMonitorRef = useRef<number | null>(null);

  // Create audio element on mount
  useEffect(() => {
    const audio = new Audio();
    audio.autoplay = true;
    audioRef.current = audio;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.srcObject = null;
        audioRef.current = null;
      }
    };
  }, []);

  // Cleanup function for AudioContext nodes
  const cleanupAudioNodes = useCallback(() => {
    if (levelMonitorRef.current) {
      clearInterval(levelMonitorRef.current);
      levelMonitorRef.current = null;
    }
    
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
      sourceNodeRef.current = null;
    }
    
    if (gainNodeRef.current) {
      try {
        gainNodeRef.current.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
      gainNodeRef.current = null;
    }
    
    if (analyzerRef.current) {
      try {
        analyzerRef.current.disconnect();
      } catch (e) {
        // Ignore disconnect errors  
      }
      analyzerRef.current = null;
    }
    
    audioContextUsedRef.current = null;
  }, []);

  // Setup audio playback with fallback strategy
  const setupAudioPlayback = useCallback(async () => {
    if (!stream || !audioRef.current) {
      console.log(`[RemoteAudio] No stream or audio element for ${userId}`);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.log(`[RemoteAudio] No audio tracks in stream for ${userId}`);
      return;
    }

    // Check if this is the same stream we already setup
    if (streamIdRef.current === stream.id && hasSetup) {
      console.log(`[RemoteAudio] Already setup for stream ${stream.id}`);
      return;
    }

    console.log(`[RemoteAudio] Setting up audio for ${userId}`, {
      streamId: stream.id,
      audioTracks: audioTracks.length,
      trackLabels: audioTracks.map(t => t.label),
      trackStates: audioTracks.map(t => ({ enabled: t.enabled, readyState: t.readyState }))
    });

    // Cleanup previous setup
    cleanupAudioNodes();
    streamIdRef.current = stream.id;

    try {
      // STRATEGY 1: HTML Audio Element (most compatible - PRIMARY)
      const audio = audioRef.current;
      audio.srcObject = stream;
      audio.volume = isDeafened ? 0 : volume;
      
      // Enable audio tracks
      audioTracks.forEach(track => {
        if (!track.enabled) {
          console.log(`[RemoteAudio] Enabling audio track for ${userId}`);
          track.enabled = true;
        }
      });

      // Try to play
      try {
        await audio.play();
        setIsPlaying(true);
        setHasSetup(true);
        retryCountRef.current = 0;
        console.log(`[RemoteAudio] HTML Audio playing for ${userId}`);
      } catch (playError: any) {
        console.warn(`[RemoteAudio] HTML Audio play failed for ${userId}:`, playError.message);
        
        if (playError.name === 'NotAllowedError') {
          if (retryCountRef.current === 0) {
            toast.info('Click anywhere to enable audio from other participants', {
              id: 'audio-autoplay-blocked',
              duration: 5000,
            });
          }
        }
      }

      // STRATEGY 2: AudioContext for gain control and monitoring (supplementary)
      try {
        const audioContext = await getSharedAudioContext();
        audioContextUsedRef.current = audioContext;
        
        // Create new source node for this stream
        const source = audioContext.createMediaStreamSource(stream);
        sourceNodeRef.current = source;
        
        // Create gain node for volume control
        const gainNode = audioContext.createGain();
        gainNode.gain.value = isDeafened ? 0 : volume;
        gainNodeRef.current = gainNode;
        
        // Create analyzer for audio level monitoring
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 256;
        analyzer.smoothingTimeConstant = 0.5;
        analyzerRef.current = analyzer;
        
        // Connect: source -> analyzer (monitoring only, not to destination to avoid double audio)
        source.connect(analyzer);
        
        // Setup audio level monitoring
        if (onAudioLevelChange) {
          const dataArray = new Uint8Array(analyzer.frequencyBinCount);
          
          levelMonitorRef.current = window.setInterval(() => {
            if (!analyzerRef.current || !audioContextUsedRef.current) return;
            
            analyzer.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            const normalizedLevel = Math.min(average / 128, 1);
            onAudioLevelChange(normalizedLevel);
            
            // Log if audio is detected
            if (normalizedLevel > 0.05 && !isPlaying) {
              console.log(`[RemoteAudio] Audio detected for ${userId}, level: ${normalizedLevel.toFixed(2)}`);
            }
          }, 100);
        }
        
        console.log(`[RemoteAudio] AudioContext setup complete for ${userId}`);
      } catch (acError) {
        console.warn(`[RemoteAudio] AudioContext setup failed for ${userId}:`, acError);
        // This is okay - HTML Audio is primary, AudioContext is optional
      }

    } catch (err: any) {
      console.error(`[RemoteAudio] Error setting up audio for ${userId}:`, err);
      
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const delay = 500 * retryCountRef.current;
        console.log(`[RemoteAudio] Retrying in ${delay}ms (attempt ${retryCountRef.current})`);
        setTimeout(() => setupAudioPlayback(), delay);
      }
    }
  }, [stream, userId, volume, isDeafened, cleanupAudioNodes, hasSetup, onAudioLevelChange, isPlaying]);

  // Setup audio when stream changes
  useEffect(() => {
    if (!stream) return;

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.log(`[RemoteAudio] Stream has no audio tracks for ${userId}`);
      return;
    }

    // Reset setup state for new stream
    if (streamIdRef.current !== stream.id) {
      setHasSetup(false);
      streamIdRef.current = null;
    }

    setupAudioPlayback();

    // Handle track events
    const handleTrackEnded = () => {
      console.log(`[RemoteAudio] Audio track ended for ${userId}`);
      setIsPlaying(false);
    };

    const handleTrackMute = () => {
      console.log(`[RemoteAudio] Audio track muted for ${userId}`);
    };

    const handleTrackUnmute = () => {
      console.log(`[RemoteAudio] Audio track unmuted for ${userId}`);
    };

    audioTracks.forEach(track => {
      track.addEventListener('ended', handleTrackEnded);
      track.addEventListener('mute', handleTrackMute);
      track.addEventListener('unmute', handleTrackUnmute);
    });

    return () => {
      audioTracks.forEach(track => {
        track.removeEventListener('ended', handleTrackEnded);
        track.removeEventListener('mute', handleTrackMute);
        track.removeEventListener('unmute', handleTrackUnmute);
      });
      
      cleanupAudioNodes();
      setHasSetup(false);
      setIsPlaying(false);
      streamIdRef.current = null;
    };
  }, [stream, userId, setupAudioPlayback, cleanupAudioNodes]);

  // Update volume for HTML Audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isDeafened ? 0 : volume;
    }
    
    // Also update gain node if using AudioContext
    if (gainNodeRef.current && audioContextUsedRef.current) {
      const targetVolume = isDeafened ? 0 : volume;
      gainNodeRef.current.gain.setTargetAtTime(
        targetVolume, 
        audioContextUsedRef.current.currentTime, 
        0.01
      );
    }
  }, [volume, isDeafened]);

  // Handle user interaction to enable audio
  useEffect(() => {
    const handleUserInteraction = async () => {
      if (!isPlaying && audioRef.current && stream) {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
          console.log(`[RemoteAudio] Started playing after user interaction for ${userId}`);
        } catch (e) {
          console.warn(`[RemoteAudio] Still cannot play after interaction for ${userId}:`, e);
        }
      }
      
      // Also resume AudioContext
      if (sharedAudioContext?.state === 'suspended') {
        try {
          await sharedAudioContext.resume();
        } catch (e) {
          // Ignore
        }
      }
    };

    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('keydown', handleUserInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [isPlaying, stream, userId]);

  // Resume audio context on visibility change
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        if (sharedAudioContext?.state === 'suspended') {
          try {
            await sharedAudioContext.resume();
            console.log(`[RemoteAudio] Resumed AudioContext on visibility change`);
          } catch (e) {
            console.warn(`[RemoteAudio] Could not resume AudioContext:`, e);
          }
        }
        
        // Try to resume HTML audio playback
        if (audioRef.current && !isPlaying && stream) {
          try {
            await audioRef.current.play();
            setIsPlaying(true);
          } catch (e) {
            // Ignore
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPlaying, stream]);

  // No DOM element needed - using programmatic Audio element
  return null;
}

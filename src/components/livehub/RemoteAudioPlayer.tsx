import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

interface RemoteAudioPlayerProps {
  userId: string;
  stream: MediaStream;
  volume?: number;
  isDeafened?: boolean;
}

// Singleton AudioContext for all remote audio - prevents browser limits
let sharedAudioContext: AudioContext | null = null;

const getSharedAudioContext = async (): Promise<AudioContext> => {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioContext({ 
      latencyHint: 'interactive',  // Lowest latency mode
      sampleRate: 48000            // Opus native rate
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

export function RemoteAudioPlayer({ userId, stream, volume = 1, isDeafened = false }: RemoteAudioPlayerProps) {
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [setupFailed, setSetupFailed] = useState(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const isSetupRef = useRef(false);

  // Handle user interaction requirement for audio playback
  const handleUserInteraction = useCallback(() => {
    setHasInteracted(true);
    document.removeEventListener('click', handleUserInteraction);
    document.removeEventListener('keydown', handleUserInteraction);
  }, []);

  useEffect(() => {
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [handleUserInteraction]);

  // Setup low-latency AudioContext for playback
  const setupAudioPlayback = useCallback(async () => {
    if (!stream || isSetupRef.current) return;

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.log(`[RemoteAudio] No audio tracks in stream for ${userId}`);
      return;
    }

    try {
      // Cleanup existing nodes first (but don't close shared context)
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }

      // Get shared AudioContext
      const audioContext = await getSharedAudioContext();

      // Create source from remote stream
      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      // Create gain node for volume control
      const gainNode = audioContext.createGain();
      gainNode.gain.value = isDeafened ? 0 : volume;
      gainNodeRef.current = gainNode;

      // Connect: source -> gain -> output
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);

      isSetupRef.current = true;
      setSetupFailed(false);
      retryCountRef.current = 0;
      
      console.log(`[RemoteAudio] Low-latency audio setup complete for ${userId}`, {
        latency: audioContext.baseLatency,
        sampleRate: audioContext.sampleRate,
        state: audioContext.state,
        trackCount: audioTracks.length
      });

    } catch (err: any) {
      console.error(`[RemoteAudio] Error setting up audio for ${userId}:`, err);
      
      if (err.name === 'NotAllowedError') {
        setSetupFailed(true);
        if (retryCountRef.current === 0) {
          toast.info('Click anywhere to enable audio from other participants', {
            id: 'audio-autoplay-blocked',
            duration: 5000,
          });
        }
      } else if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        setTimeout(() => setupAudioPlayback(), 500 * retryCountRef.current);
      }
    }
  }, [stream, userId, volume, isDeafened]);

  // Setup audio when stream changes
  useEffect(() => {
    if (!stream) return;

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.log(`[RemoteAudio] No audio tracks in stream for ${userId}`);
      return;
    }

    console.log(`[RemoteAudio] Setting up low-latency audio for ${userId}, tracks:`, audioTracks.length);
    isSetupRef.current = false; // Reset so we can setup again
    setupAudioPlayback();

    // Handle track ended
    const handleTrackEnded = () => {
      console.log(`[RemoteAudio] Audio track ended for ${userId}`);
    };

    audioTracks.forEach(track => {
      track.addEventListener('ended', handleTrackEnded);
    });

    return () => {
      audioTracks.forEach(track => {
        track.removeEventListener('ended', handleTrackEnded);
      });
      
      // Cleanup nodes (but don't close shared context)
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }
      isSetupRef.current = false;
    };
  }, [stream, userId, setupAudioPlayback]);

  // Retry setup when user interacts (if previously failed)
  useEffect(() => {
    if (hasInteracted && setupFailed) {
      isSetupRef.current = false;
      setupAudioPlayback();
    }
  }, [hasInteracted, setupFailed, setupAudioPlayback]);

  // Update gain for volume/deafen changes
  useEffect(() => {
    if (gainNodeRef.current && sharedAudioContext) {
      const targetVolume = isDeafened ? 0 : volume;
      // Smooth volume transition to avoid clicks
      gainNodeRef.current.gain.setTargetAtTime(
        targetVolume, 
        sharedAudioContext.currentTime, 
        0.01 // 10ms time constant for smooth transition
      );
    }
  }, [volume, isDeafened]);

  // Resume audio context if it gets suspended
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && sharedAudioContext?.state === 'suspended') {
        try {
          await sharedAudioContext.resume();
          console.log(`[RemoteAudio] Resumed shared AudioContext on visibility change`);
        } catch (e) {
          console.warn(`[RemoteAudio] Could not resume AudioContext:`, e);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // No DOM element needed - AudioContext handles playback directly
  return null;
}

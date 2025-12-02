import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

interface RemoteAudioPlayerProps {
  userId: string;
  stream: MediaStream;
  volume?: number;
  isDeafened?: boolean;
}

export function RemoteAudioPlayer({ userId, stream, volume = 1, isDeafened = false }: RemoteAudioPlayerProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [setupFailed, setSetupFailed] = useState(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

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
    if (!stream) return;

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.log(`[RemoteAudioPlayer] No audio tracks in stream for ${userId}`);
      return;
    }

    try {
      // Close existing context if any
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        await audioContextRef.current.close();
      }

      // Create low-latency AudioContext optimized for voice
      const audioContext = new AudioContext({ 
        latencyHint: 'interactive',  // Lowest latency mode
        sampleRate: 48000            // Opus native rate
      });
      audioContextRef.current = audioContext;

      // Resume context if suspended (autoplay policy)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

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

      setSetupFailed(false);
      retryCountRef.current = 0;
      console.log(`[RemoteAudioPlayer] Low-latency audio setup complete for ${userId}`, {
        latency: audioContext.baseLatency,
        sampleRate: audioContext.sampleRate,
        state: audioContext.state
      });

    } catch (err: any) {
      console.error(`[RemoteAudioPlayer] Error setting up audio for ${userId}:`, err);
      
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
      console.log(`[RemoteAudioPlayer] No audio tracks in stream for ${userId}`);
      return;
    }

    console.log(`[RemoteAudioPlayer] Setting up low-latency audio for ${userId}, tracks:`, audioTracks.length);
    setupAudioPlayback();

    // Handle track ended
    const handleTrackEnded = () => {
      console.log(`[RemoteAudioPlayer] Audio track ended for ${userId}`);
    };

    audioTracks.forEach(track => {
      track.addEventListener('ended', handleTrackEnded);
    });

    return () => {
      audioTracks.forEach(track => {
        track.removeEventListener('ended', handleTrackEnded);
      });
      
      // Cleanup audio context
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [stream, userId, setupAudioPlayback]);

  // Retry setup when user interacts (if previously failed)
  useEffect(() => {
    if (hasInteracted && setupFailed) {
      setupAudioPlayback();
    }
  }, [hasInteracted, setupFailed, setupAudioPlayback]);

  // Update gain for volume/deafen changes
  useEffect(() => {
    if (gainNodeRef.current) {
      const targetVolume = isDeafened ? 0 : volume;
      // Smooth volume transition to avoid clicks
      gainNodeRef.current.gain.setTargetAtTime(
        targetVolume, 
        audioContextRef.current?.currentTime || 0, 
        0.01 // 10ms time constant for smooth transition
      );
    }
  }, [volume, isDeafened]);

  // Resume audio context if it gets suspended
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && audioContextRef.current?.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
          console.log(`[RemoteAudioPlayer] Resumed audio context for ${userId}`);
        } catch (e) {
          console.warn(`[RemoteAudioPlayer] Could not resume audio context:`, e);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userId]);

  // No DOM element needed - AudioContext handles playback directly
  return null;
}

/**
 * Dedicated component for playing remote audio tracks
 * Handles autoplay restrictions and browser audio contexts
 * 
 * CRITICAL: Video elements don't automatically play remote audio in WebRTC.
 * A separate audio element is required for remote participant audio playback.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useAudioUnlock } from '@/hooks/useAudioUnlock';
import { logger } from '@/lib/logger';

interface RemoteAudioRendererProps {
  stream: MediaStream;
  participantId: string;
  participantName: string;
  volume?: number;
}

export function RemoteAudioRenderer({ 
  stream, 
  participantId, 
  participantName,
  volume = 1.0 
}: RemoteAudioRendererProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { registerAudioElement } = useAudioUnlock();
  const playAttemptRef = useRef(0);
  const maxRetries = 5;

  const attemptPlay = useCallback(async (audio: HTMLAudioElement): Promise<boolean> => {
    try {
      await audio.play();
      logger.info(`[RemoteAudio] ✅ Playing audio for ${participantName}`, {
        componentName: 'RemoteAudioRenderer',
        participantId,
        volume: audio.volume
      });
      return true;
    } catch (err: any) {
      if (err.name === 'NotAllowedError' && playAttemptRef.current < maxRetries) {
        playAttemptRef.current++;
        logger.warn(`[RemoteAudio] ⚠️ Autoplay blocked for ${participantName}, retry ${playAttemptRef.current}/${maxRetries}`, {
          componentName: 'RemoteAudioRenderer',
          error: err.message
        });
        // Retry after a short delay - user interaction may unlock audio
        await new Promise(resolve => setTimeout(resolve, 500 * playAttemptRef.current));
        return attemptPlay(audio);
      }
      
      logger.warn(`[RemoteAudio] ⚠️ Failed to play audio for ${participantName}:`, {
        componentName: 'RemoteAudioRenderer',
        error: err.message,
        attempts: playAttemptRef.current
      });
      return false;
    }
  }, [participantId, participantName]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !stream) {
      logger.debug(`[RemoteAudio] No audio element or stream for ${participantName}`, {
        componentName: 'RemoteAudioRenderer',
        hasAudio: !!audio,
        hasStream: !!stream
      });
      return;
    }

    const audioTracks = stream.getAudioTracks();
    logger.info(`[RemoteAudio] Setting up audio for ${participantName}`, {
      componentName: 'RemoteAudioRenderer',
      streamId: stream.id,
      audioTrackCount: audioTracks.length,
      trackStates: audioTracks.map(t => ({
        id: t.id.slice(0, 8),
        enabled: t.enabled,
        readyState: t.readyState,
        muted: t.muted
      }))
    });

    // Check if we have valid audio tracks
    if (audioTracks.length === 0) {
      logger.warn(`[RemoteAudio] ⚠️ No audio tracks in stream for ${participantName}`, {
        componentName: 'RemoteAudioRenderer'
      });
      return;
    }

    // Check track readyState
    const liveAudioTrack = audioTracks.find(t => t.readyState === 'live');
    if (!liveAudioTrack) {
      logger.warn(`[RemoteAudio] ⚠️ No live audio tracks for ${participantName}, waiting...`, {
        componentName: 'RemoteAudioRenderer',
        trackStates: audioTracks.map(t => t.readyState)
      });
      
      // Wait for track to become live
      const onTrackLive = () => {
        logger.info(`[RemoteAudio] ✅ Audio track now live for ${participantName}`, {
          componentName: 'RemoteAudioRenderer'
        });
        setupAudio();
      };
      
      audioTracks.forEach(track => {
        track.addEventListener('unmute', onTrackLive, { once: true });
      });
      
      return () => {
        audioTracks.forEach(track => {
          track.removeEventListener('unmute', onTrackLive);
        });
      };
    }

    const setupAudio = () => {
      // Attach stream to audio element
      audio.srcObject = stream;
      audio.volume = volume;
      
      // Reset retry counter
      playAttemptRef.current = 0;

      // Register with autoplay unlock system
      const unregister = registerAudioElement(audio);

      // Attempt to play
      attemptPlay(audio);

      return unregister;
    };

    const unregister = setupAudio();

    // Monitor audio track state changes
    const handleTrackEnded = () => {
      logger.warn(`[RemoteAudio] ⚠️ Audio track ended for ${participantName}`, {
        componentName: 'RemoteAudioRenderer'
      });
    };

    const handleTrackMuted = () => {
      logger.debug(`[RemoteAudio] Audio track muted for ${participantName}`, {
        componentName: 'RemoteAudioRenderer'
      });
    };

    const handleTrackUnmuted = () => {
      logger.debug(`[RemoteAudio] Audio track unmuted for ${participantName}`, {
        componentName: 'RemoteAudioRenderer'
      });
      // Re-attempt play if audio was paused
      if (audio.paused && audio.srcObject) {
        attemptPlay(audio);
      }
    };

    audioTracks.forEach(track => {
      track.addEventListener('ended', handleTrackEnded);
      track.addEventListener('mute', handleTrackMuted);
      track.addEventListener('unmute', handleTrackUnmuted);
    });

    return () => {
      audio.pause();
      audio.srcObject = null;
      if (unregister) unregister();
      
      audioTracks.forEach(track => {
        track.removeEventListener('ended', handleTrackEnded);
        track.removeEventListener('mute', handleTrackMuted);
        track.removeEventListener('unmute', handleTrackUnmuted);
      });
    };
  }, [stream, participantId, participantName, volume, registerAudioElement, attemptPlay]);

  // Update volume when prop changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  return (
    <audio
      ref={audioRef}
      autoPlay
      playsInline
      style={{ display: 'none' }}
      data-participant-id={participantId}
      data-participant-name={participantName}
    />
  );
}

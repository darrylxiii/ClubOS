import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

interface RemoteAudioPlayerProps {
  userId: string;
  stream: MediaStream;
  volume?: number;
  isDeafened?: boolean;
}

export function RemoteAudioPlayer({ userId, stream, volume = 1, isDeafened = false }: RemoteAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Handle user interaction requirement for autoplay
  const handleUserInteraction = useCallback(() => {
    setHasInteracted(true);
    // Remove listeners after first interaction
    document.removeEventListener('click', handleUserInteraction);
    document.removeEventListener('keydown', handleUserInteraction);
  }, []);

  useEffect(() => {
    // Listen for any user interaction to enable autoplay
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [handleUserInteraction]);

  // Attempt to play audio with retry logic
  const attemptPlay = useCallback(async () => {
    if (!audioRef.current || !stream) return;

    try {
      // Set the stream source
      audioRef.current.srcObject = stream;
      audioRef.current.volume = isDeafened ? 0 : volume;
      
      await audioRef.current.play();
      setPlaybackFailed(false);
      retryCountRef.current = 0;
      console.log(`[RemoteAudioPlayer] Playing audio for user ${userId}`);
    } catch (err: any) {
      console.error(`[RemoteAudioPlayer] Error playing audio for ${userId}:`, err);
      
      if (err.name === 'NotAllowedError') {
        // Autoplay was blocked - wait for user interaction
        setPlaybackFailed(true);
        if (retryCountRef.current === 0) {
          toast.info('Click anywhere to enable audio from other participants', {
            id: 'audio-autoplay-blocked',
            duration: 5000,
          });
        }
      } else if (err.name === 'AbortError' || err.name === 'NotSupportedError') {
        // Stream might not be ready, retry
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          setTimeout(() => attemptPlay(), 500 * retryCountRef.current);
        }
      }
    }
  }, [stream, userId, volume, isDeafened]);

  // Setup and play when stream changes
  useEffect(() => {
    if (!stream) return;

    // Check if stream has audio tracks
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.log(`[RemoteAudioPlayer] No audio tracks in stream for ${userId}`);
      return;
    }

    console.log(`[RemoteAudioPlayer] Setting up audio for ${userId}, tracks:`, audioTracks.length);

    // Attempt to play
    attemptPlay();

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
    };
  }, [stream, userId, attemptPlay]);

  // Retry playback when user interacts (if previously failed)
  useEffect(() => {
    if (hasInteracted && playbackFailed) {
      attemptPlay();
    }
  }, [hasInteracted, playbackFailed, attemptPlay]);

  // Update volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isDeafened ? 0 : volume;
    }
  }, [volume, isDeafened]);

  // NOTE: Do NOT use muted attribute - it conflicts with autoplay and volume control
  // Volume is already set to 0 when deafened via audioRef.current.volume
  return (
    <audio
      ref={audioRef}
      autoPlay
      playsInline
      style={{ display: 'none' }}
      data-user-id={userId}
    />
  );
}

import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface UseMutedSpeakingDetectorProps {
  localStream: MediaStream | null;
  isAudioEnabled: boolean;
  enabled: boolean;
}

/**
 * Detects when a user tries to speak while muted and shows a notification.
 */
export function useMutedSpeakingDetector({
  localStream,
  isAudioEnabled,
  enabled,
}: UseMutedSpeakingDetectorProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastToastRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (sourceRef.current) sourceRef.current.disconnect();
    if (analyserRef.current) analyserRef.current.disconnect();
    sourceRef.current = null;
    analyserRef.current = null;
  }, []);

  useEffect(() => {
    // Only monitor when muted and stream exists
    if (!enabled || isAudioEnabled || !localStream) {
      cleanup();
      return;
    }

    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) return;

    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext({ latencyHint: 'interactive' });
      }

      // Create a new stream with enabled tracks for analysis
      const rawStream = new MediaStream();
      audioTracks.forEach((t) => {
        const clone = t.clone();
        clone.enabled = true; // Re-enable to actually read levels
        rawStream.addTrack(clone);
      });

      const source = audioContextRef.current.createMediaStreamSource(rawStream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);

      sourceRef.current = source;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      intervalRef.current = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i];
        const rms = Math.sqrt(sum / dataArray.length);
        const level = rms / 128;

        if (level > 0.08) {
          const now = Date.now();
          if (now - lastToastRef.current > 5000) {
            lastToastRef.current = now;
            toast.info('You are muted. Press M to unmute.', { duration: 3000 });
          }
        }
      }, 200);
    } catch {
      // AudioContext not supported
    }

    return cleanup;
  }, [enabled, isAudioEnabled, localStream, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [cleanup]);
}

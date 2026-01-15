/**
 * Audio Ducking
 * Reduce background audio when someone speaks
 * Automatic volume adjustment for screen share audio
 * Configurable ducking sensitivity
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface AudioSource {
  id: string;
  stream: MediaStream;
  type: 'local' | 'remote' | 'screenshare' | 'background';
  gainNode?: GainNode;
}

interface UseAudioDuckingProps {
  enabled?: boolean;
  duckingAmount?: number; // 0-1, how much to reduce volume (default 0.3 = 70% reduction)
  attackTime?: number; // ms to start ducking
  releaseTime?: number; // ms to release ducking
  threshold?: number; // Audio level threshold to trigger ducking (0-1)
}

export function useAudioDucking({
  enabled = true,
  duckingAmount = 0.3,
  attackTime = 100,
  releaseTime = 500,
  threshold = 0.02
}: UseAudioDuckingProps = {}) {
  const [isDucking, setIsDucking] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [audioSources, setAudioSources] = useState<Map<string, AudioSource>>(new Map());
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analysersRef = useRef<Map<string, AnalyserNode>>(new Map());
  const gainNodesRef = useRef<Map<string, GainNode>>(new Map());
  const animationFrameRef = useRef<number | null>(null);
  const duckingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio context
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  // Register an audio source for ducking
  const registerAudioSource = useCallback((
    id: string,
    stream: MediaStream,
    type: AudioSource['type']
  ) => {
    if (!enabled) return;

    const audioContext = getAudioContext();
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    try {
      // Create source and nodes
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;

      // Connect: source -> analyser -> gain -> destination
      source.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Store references
      analysersRef.current.set(id, analyser);
      gainNodesRef.current.set(id, gainNode);

      setAudioSources(prev => {
        const newMap = new Map(prev);
        newMap.set(id, { id, stream, type, gainNode });
        return newMap;
      });

      console.log('[AudioDucking] Registered audio source:', id, type);
    } catch (_e) {
      console.error('[AudioDucking] Failed to register source:', id, e);
    }
  }, [enabled, getAudioContext]);

  // Unregister an audio source
  const unregisterAudioSource = useCallback((id: string) => {
    analysersRef.current.delete(id);
    gainNodesRef.current.delete(id);
    
    setAudioSources(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });

    console.log('[AudioDucking] Unregistered audio source:', id);
  }, []);

  // Get current audio level for a source
  const getAudioLevel = useCallback((analyser: AnalyserNode): number => {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate RMS
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);
    
    // Normalize to 0-1
    return rms / 255;
  }, []);

  // Apply ducking to background sources
  const applyDucking = useCallback((speakerId: string | null) => {
    gainNodesRef.current.forEach((gainNode, id) => {
      const source = audioSources.get(id);
      if (!source) return;

      // Don't duck the active speaker or non-background sources
      if (id === speakerId || source.type === 'local' || source.type === 'remote') {
        // Gradually restore volume
        gainNode.gain.setTargetAtTime(
          1.0,
          audioContextRef.current?.currentTime || 0,
          releaseTime / 1000
        );
      } else if (source.type === 'screenshare' || source.type === 'background') {
        // Duck background/screenshare audio
        const targetGain = speakerId ? duckingAmount : 1.0;
        gainNode.gain.setTargetAtTime(
          targetGain,
          audioContextRef.current?.currentTime || 0,
          (speakerId ? attackTime : releaseTime) / 1000
        );
      }
    });
  }, [audioSources, duckingAmount, attackTime, releaseTime]);

  // Monitor audio levels and detect active speaker
  const monitorAudioLevels = useCallback(() => {
    if (!enabled) return;

    let highestLevel = 0;
    let newActiveSpeaker: string | null = null;

    analysersRef.current.forEach((analyser, id) => {
      const source = audioSources.get(id);
      if (!source) return;

      // Only monitor local and remote participants for speaking
      if (source.type !== 'local' && source.type !== 'remote') return;

      const level = getAudioLevel(analyser);
      
      if (level > threshold && level > highestLevel) {
        highestLevel = level;
        newActiveSpeaker = id;
      }
    });

    // Update active speaker if changed
    if (newActiveSpeaker !== activeSpeaker) {
      setActiveSpeaker(newActiveSpeaker);
      setIsDucking(!!newActiveSpeaker);
      applyDucking(newActiveSpeaker);

      // Clear previous timeout
      if (duckingTimeoutRef.current) {
        clearTimeout(duckingTimeoutRef.current);
      }

      // Set release timeout
      if (newActiveSpeaker) {
        duckingTimeoutRef.current = setTimeout(() => {
          if (getAudioLevel(analysersRef.current.get(newActiveSpeaker)!) < threshold) {
            setActiveSpeaker(null);
            setIsDucking(false);
            applyDucking(null);
          }
        }, releaseTime);
      }
    }

    // Continue monitoring
    animationFrameRef.current = requestAnimationFrame(monitorAudioLevels);
  }, [enabled, audioSources, activeSpeaker, threshold, releaseTime, getAudioLevel, applyDucking]);

  // Start/stop monitoring
  useEffect(() => {
    if (enabled && audioSources.size > 0) {
      animationFrameRef.current = requestAnimationFrame(monitorAudioLevels);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (duckingTimeoutRef.current) {
        clearTimeout(duckingTimeoutRef.current);
      }
    };
  }, [enabled, audioSources.size, monitorAudioLevels]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Manual volume control for a source
  const setSourceVolume = useCallback((id: string, volume: number) => {
    const gainNode = gainNodesRef.current.get(id);
    if (gainNode && audioContextRef.current) {
      gainNode.gain.setTargetAtTime(
        Math.max(0, Math.min(1, volume)),
        audioContextRef.current.currentTime,
        0.05
      );
    }
  }, []);

  // Toggle ducking
  const toggleDucking = useCallback((newEnabled: boolean) => {
    if (!newEnabled) {
      // Restore all volumes
      gainNodesRef.current.forEach(gainNode => {
        if (audioContextRef.current) {
          gainNode.gain.setTargetAtTime(
            1.0,
            audioContextRef.current.currentTime,
            0.1
          );
        }
      });
      setIsDucking(false);
      setActiveSpeaker(null);
    }
  }, []);

  return {
    isDucking,
    activeSpeaker,
    audioSources: Array.from(audioSources.values()),
    registerAudioSource,
    unregisterAudioSource,
    setSourceVolume,
    toggleDucking
  };
}

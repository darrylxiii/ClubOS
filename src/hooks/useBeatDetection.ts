import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Real-time beat detection using spectral flux analysis.
 * Triggers a callback on each detected beat and optionally
 * vibrates the device for haptic feedback.
 *
 * Algorithm:
 * 1. Compare energy of current frame vs running average
 * 2. If current energy exceeds average * threshold → beat detected
 * 3. Enforce minimum gap between beats (based on BPM range)
 */

interface BeatDetectionState {
  bpm: number;
  isBeat: boolean;
  beatCount: number;
  energy: number;
  hapticEnabled: boolean;
}

interface BeatDetectionOptions {
  /** Sensitivity multiplier for beat threshold (default 1.3) */
  sensitivity?: number;
  /** Enable haptic vibration on detected beats */
  haptics?: boolean;
  /** Haptic vibration duration in ms (default 30) */
  hapticDuration?: number;
}

export function useBeatDetection(
  analysis: { bass: number; rms: number } | null,
  options: BeatDetectionOptions = {}
) {
  const {
    sensitivity = 1.3,
    haptics = true,
    hapticDuration = 30,
  } = options;

  const [state, setState] = useState<BeatDetectionState>({
    bpm: 0,
    isBeat: false,
    beatCount: 0,
    energy: 0,
    hapticEnabled: haptics && 'vibrate' in navigator,
  });

  const energyHistoryRef = useRef<number[]>([]);
  const lastBeatTimeRef = useRef(0);
  const beatTimesRef = useRef<number[]>([]);
  const beatResetRef = useRef<ReturnType<typeof setTimeout>>();

  // Process audio data on each frame
  useEffect(() => {
    if (!analysis) return;

    const now = performance.now();
    // Use bass energy as primary beat signal
    const energy = analysis.bass * 0.7 + analysis.rms * 0.3;

    // Maintain rolling history (last ~30 frames)
    const history = energyHistoryRef.current;
    history.push(energy);
    if (history.length > 30) history.shift();

    // Calculate average energy
    const avgEnergy = history.reduce((a, b) => a + b, 0) / history.length;

    // Beat detection: energy exceeds threshold AND enough time has passed
    const threshold = avgEnergy * sensitivity;
    const minGap = 250; // Max ~240 BPM
    const timeSinceLastBeat = now - lastBeatTimeRef.current;

    if (energy > threshold && energy > 0.15 && timeSinceLastBeat > minGap) {
      lastBeatTimeRef.current = now;

      // Track beat times for BPM calculation
      const beatTimes = beatTimesRef.current;
      beatTimes.push(now);
      if (beatTimes.length > 12) beatTimes.shift();

      // Calculate BPM from beat intervals
      let bpm = 0;
      if (beatTimes.length >= 4) {
        const intervals: number[] = [];
        for (let i = 1; i < beatTimes.length; i++) {
          intervals.push(beatTimes[i] - beatTimes[i - 1]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        bpm = Math.round(60000 / avgInterval);
        // Sanity check BPM range
        if (bpm < 60 || bpm > 200) bpm = 0;
      }

      // Haptic feedback
      if (haptics && 'vibrate' in navigator) {
        try { navigator.vibrate(hapticDuration); } catch {}
      }

      setState((prev) => ({
        bpm: bpm || prev.bpm,
        isBeat: true,
        beatCount: prev.beatCount + 1,
        energy,
        hapticEnabled: prev.hapticEnabled,
      }));

      // Reset isBeat after short delay
      clearTimeout(beatResetRef.current);
      beatResetRef.current = setTimeout(() => {
        setState((prev) => ({ ...prev, isBeat: false }));
      }, 80);
    } else {
      setState((prev) => ({ ...prev, energy, isBeat: false }));
    }
  }, [analysis?.bass, analysis?.rms, sensitivity, haptics, hapticDuration]);

  const toggleHaptics = useCallback(() => {
    setState((prev) => ({ ...prev, hapticEnabled: !prev.hapticEnabled }));
  }, []);

  return { ...state, toggleHaptics };
}

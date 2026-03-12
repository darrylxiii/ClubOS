import { useCallback, useRef } from 'react';

const STORAGE_KEY = 'sound-effects-enabled';

function isEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Procedural micro-sounds using Web Audio API.
 * No audio files needed. Opt-in via localStorage flag.
 */
export function useMicroSounds() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const playTone = useCallback(
    (frequency: number, duration: number, gain: number, type: OscillatorType = 'sine') => {
      if (!isEnabled()) return;
      try {
        const ctx = getCtx();
        const osc = ctx.createOscillator();
        const vol = ctx.createGain();
        osc.type = type;
        osc.frequency.value = frequency;
        vol.gain.value = gain;
        vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
        osc.connect(vol);
        vol.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration / 1000);
      } catch {
        // Audio API failures are non-critical
      }
    },
    [getCtx]
  );

  const playClick = useCallback(() => {
    playTone(800, 50, 0.03, 'sine');
  }, [playTone]);

  const playSuccess = useCallback(() => {
    if (!isEnabled()) return;
    try {
      const ctx = getCtx();
      // Two ascending tones
      [600, 900].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const vol = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        vol.gain.value = 0.04;
        vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (i * 0.08) + 0.08);
        osc.connect(vol);
        vol.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + (i * 0.08) + 0.08);
      });
    } catch { /* non-critical */ }
  }, [getCtx]);

  const playToggle = useCallback(() => {
    playTone(1000, 20, 0.02, 'square');
  }, [playTone]);

  return { playClick, playSuccess, playToggle, isEnabled };
}

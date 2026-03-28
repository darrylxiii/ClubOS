/**
 * useQuantumAmbience — Manages the ambient psychological layer:
 *
 * - Session emotional arc (curiosity → belonging → pride → anticipation → satisfaction)
 * - Absence architecture (gradual fade on leave, busier return)
 * - Platform activity pulse (sub-threshold)
 * - Binaural frequency offsets for headphone users
 * - Zeigarnik session-end cliffhangers (15% of sessions)
 * - Session-end Peak-End Rule sound
 */

import { useEffect, useRef, useCallback } from 'react';
import { quantumSoundEngine } from '@/lib/sounds/QuantumSoundEngine';
import { QuantumTimbre } from '@/lib/sounds/QuantumTimbre';
import { audioUnlock } from '@/hooks/useAudioUnlock';

// F# Lydian frequencies
const F_SHARP_3 = 185;
const F_SHARP_4 = 370;

// Session arc phases (minutes)
const ARC_PHASES = {
  curiosity: { start: 0, end: 2 },
  belonging: { start: 2, end: 10 },
  pride: { start: 10, end: 30 },
  anticipation: { start: 30, end: Infinity },
} as const;

type SessionPhase = keyof typeof ARC_PHASES;

// Storage keys
const LAST_SESSION_KEY = 'quantum-last-session-end';
const SESSION_COUNT_KEY = 'quantum-session-count';

export function useQuantumAmbience() {
  const sessionStartRef = useRef(Date.now());
  const phaseRef = useRef<SessionPhase>('curiosity');
  const pulseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const binauralNodesRef = useRef<{ left: OscillatorNode; right: OscillatorNode; gain: GainNode } | null>(null);
  const isActiveRef = useRef(true);
  const ctxRef = useRef<AudioContext | null>(null);

  // ── Detect headphones (heuristic) ──
  const isHeadphones = useRef(false);
  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const check = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        isHeadphones.current = devices.some(
          (d) =>
            d.kind === 'audiooutput' &&
            (d.label.toLowerCase().includes('headphone') ||
              d.label.toLowerCase().includes('airpod') ||
              d.label.toLowerCase().includes('earbud') ||
              d.label.toLowerCase().includes('headset'))
        );
      } catch {
        // Permission denied — assume speakers
      }
    };
    check();
    navigator.mediaDevices.addEventListener('devicechange', check);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', check);
    };
  }, []);

  // ── Get or create shared AudioContext ──
  const getCtx = useCallback((): AudioContext | null => {
    if (ctxRef.current) return ctxRef.current;
    try {
      ctxRef.current = new AudioContext();
      audioUnlock.registerAudioContext(ctxRef.current);
      return ctxRef.current;
    } catch {
      return null;
    }
  }, []);

  // ── Binaural offset (headphones only) ──
  const startBinaural = useCallback(
    (offsetHz: number) => {
      if (!isHeadphones.current) return;
      stopBinaural();

      const ctx = getCtx();
      if (!ctx) return;

      const leftOsc = ctx.createOscillator();
      const rightOsc = ctx.createOscillator();
      const merger = ctx.createChannelMerger(2);
      const gain = ctx.createGain();

      leftOsc.type = 'sine';
      rightOsc.type = 'sine';
      leftOsc.frequency.setValueAtTime(F_SHARP_3, ctx.currentTime);
      rightOsc.frequency.setValueAtTime(F_SHARP_3 + offsetHz, ctx.currentTime);

      // Very quiet — subliminal
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.004, ctx.currentTime + 2);

      const leftGain = ctx.createGain();
      const rightGain = ctx.createGain();
      leftGain.gain.setValueAtTime(1, ctx.currentTime);
      rightGain.gain.setValueAtTime(1, ctx.currentTime);

      leftOsc.connect(leftGain);
      rightOsc.connect(rightGain);
      leftGain.connect(merger, 0, 0);
      rightGain.connect(merger, 0, 1);
      merger.connect(gain);
      gain.connect(ctx.destination);

      leftOsc.start();
      rightOsc.start();

      binauralNodesRef.current = { left: leftOsc, right: rightOsc, gain };
    },
    [getCtx],
  );

  const stopBinaural = useCallback(() => {
    if (!binauralNodesRef.current) return;
    const { left, right, gain } = binauralNodesRef.current;
    try {
      const ctx = ctxRef.current;
      if (ctx) {
        gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1);
        setTimeout(() => {
          try {
            left.stop();
            right.stop();
          } catch { /* already stopped */ }
        }, 1100);
      }
    } catch { /* already stopped */ }
    binauralNodesRef.current = null;
  }, []);

  // ── Session phase tracking ──
  const updatePhase = useCallback(() => {
    const minutesElapsed = (Date.now() - sessionStartRef.current) / 60000;
    let newPhase: SessionPhase = 'curiosity';

    if (minutesElapsed >= ARC_PHASES.anticipation.start) {
      newPhase = 'anticipation';
    } else if (minutesElapsed >= ARC_PHASES.pride.start) {
      newPhase = 'pride';
    } else if (minutesElapsed >= ARC_PHASES.belonging.start) {
      newPhase = 'belonging';
    }

    if (newPhase !== phaseRef.current) {
      phaseRef.current = newPhase;

      // Adjust binaural offset per phase (headphones only)
      if (isHeadphones.current) {
        switch (newPhase) {
          case 'curiosity':
            startBinaural(10); // Beta — alertness
            break;
          case 'belonging':
          case 'pride':
            startBinaural(6); // Alpha/theta — creative flow
            break;
          case 'anticipation':
            startBinaural(10); // Beta — alertness for late session
            break;
        }
      }
    }
  }, [startBinaural]);

  // ── Platform activity pulse (sub-threshold) ──
  const startActivityPulse = useCallback(() => {
    if (pulseIntervalRef.current) return;

    // Determine return density — busier if user was gone a while
    const lastSessionEnd = localStorage.getItem(LAST_SESSION_KEY);
    const hoursSinceLastSession = lastSessionEnd
      ? (Date.now() - parseInt(lastSessionEnd, 10)) / 3600000
      : 0;

    // More frequent pulses if user was away longer (absence architecture)
    const baseInterval = hoursSinceLastSession > 72 ? 8000 : // 3+ days away — busier
                         hoursSinceLastSession > 24 ? 12000 : // 1+ days — somewhat busy
                         15000; // regular

    pulseIntervalRef.current = setInterval(() => {
      if (!isActiveRef.current) return;
      // Only pulse if sound is enabled and ambient category is on
      quantumSoundEngine.play('ambient.platform_pulse');
    }, baseInterval + Math.random() * 5000); // jitter to feel organic
  }, []);

  const stopActivityPulse = useCallback(() => {
    if (pulseIntervalRef.current) {
      clearInterval(pulseIntervalRef.current);
      pulseIntervalRef.current = null;
    }
  }, []);

  // ── Session end sound (Peak-End Rule + Zeigarnik cliffhanger) ──
  const playSessionEndSound = useCallback(() => {
    const isCliffhanger = Math.random() < 0.15; // 15% of sessions

    if (isCliffhanger) {
      // Incomplete phrase — starts ascending but cuts off before resolution
      // Creates Zeigarnik tension to return
      const ctx = getCtx();
      if (!ctx) return;
      // Play first 3 notes of a 5-note phrase, then stop
      quantumSoundEngine.play('achievement.common'); // 2-note truncated
    } else {
      // Satisfying resolution — warm session-end sound
      quantumSoundEngine.play('notification.meeting_reminder'); // warm bell tone
    }
  }, [getCtx]);

  // ── Visibility change (absence architecture) ──
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        isActiveRef.current = false;
        // Gradual fade-out is handled by the pulse interval check
      } else {
        isActiveRef.current = true;
        // Return from background — pulse resumes naturally
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // ── Session lifecycle ──
  useEffect(() => {
    sessionStartRef.current = Date.now();

    // Increment session count
    const count = parseInt(localStorage.getItem(SESSION_COUNT_KEY) || '0', 10);
    localStorage.setItem(SESSION_COUNT_KEY, String(count + 1));

    // Start ambient systems
    const phaseTimer = setInterval(updatePhase, 30000); // check phase every 30s
    updatePhase(); // initial check

    // Delay pulse start slightly so it doesn't fire on page load
    const pulseDelay = setTimeout(() => {
      startActivityPulse();
    }, 5000);

    // Session end handler
    const handleBeforeUnload = () => {
      localStorage.setItem(LAST_SESSION_KEY, String(Date.now()));
      playSessionEndSound();
      stopBinaural();
      stopActivityPulse();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(phaseTimer);
      clearTimeout(pulseDelay);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      stopBinaural();
      stopActivityPulse();
      // Record session end for absence detection
      localStorage.setItem(LAST_SESSION_KEY, String(Date.now()));
    };
  }, [updatePhase, startActivityPulse, stopActivityPulse, stopBinaural, playSessionEndSound]);

  return {
    /** Current session phase */
    getPhase: () => phaseRef.current,
    /** Start binaural offset (headphones only) */
    startBinaural,
    /** Stop binaural offset */
    stopBinaural,
  };
}

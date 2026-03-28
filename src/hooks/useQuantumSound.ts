/**
 * useQuantumSound — React hook for The Quantum Club sound system.
 *
 * Provides access to the singleton QuantumSoundEngine with proper
 * React lifecycle integration.
 *
 * @example
 *   const { play } = useQuantumSound();
 *   play('notification.message_received');
 */

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  quantumSoundEngine,
  type SoundPreferences,
  type SoundPreset,
} from '@/lib/sounds/QuantumSoundEngine';
import type { SoundCategory } from '@/lib/sounds/SoundScheduler';

// Simple event emitter for preference changes
let prefsVersion = 0;
const listeners = new Set<() => void>();
function notifyPrefsChanged() {
  prefsVersion++;
  listeners.forEach((l) => l());
}

function subscribePrefs(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getPrefsSnapshot(): number {
  return prefsVersion;
}

export function useQuantumSound() {
  // Re‑render when prefs change
  useSyncExternalStore(subscribePrefs, getPrefsSnapshot);

  const play = useCallback((soundId: string) => {
    quantumSoundEngine.play(soundId);
  }, []);

  const preview = useCallback((soundId: string) => {
    quantumSoundEngine.preview(soundId);
  }, []);

  const stopContinuous = useCallback((soundId: string) => {
    quantumSoundEngine.stopContinuous(soundId);
  }, []);

  /** Play a user's unique Sonic DNA signature */
  const playUserSignature = useCallback((userId: string, gain?: number) => {
    quantumSoundEngine.playUserSignature(userId, gain);
  }, []);

  const setMasterVolume = useCallback((vol: number) => {
    quantumSoundEngine.setMasterVolume(vol);
    notifyPrefsChanged();
  }, []);

  const setCategoryEnabled = useCallback(
    (category: SoundCategory, enabled: boolean) => {
      quantumSoundEngine.setCategoryEnabled(category, enabled);
      notifyPrefsChanged();
    },
    [],
  );

  const setCategoryVolume = useCallback(
    (category: SoundCategory, vol: number) => {
      quantumSoundEngine.setCategoryVolume(category, vol);
      notifyPrefsChanged();
    },
    [],
  );

  const setPreset = useCallback((preset: SoundPreset) => {
    quantumSoundEngine.setPreset(preset);
    notifyPrefsChanged();
  }, []);

  const updatePreferences = useCallback(
    (update: Partial<SoundPreferences>) => {
      quantumSoundEngine.updatePreferences(update);
      notifyPrefsChanged();
    },
    [],
  );

  const preferences = useMemo(
    () => quantumSoundEngine.getPreferences(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prefsVersion],
  );

  return {
    play,
    preview,
    stopContinuous,
    playUserSignature,
    preferences,
    setMasterVolume,
    setCategoryEnabled,
    setCategoryVolume,
    setPreset,
    updatePreferences,
  };
}

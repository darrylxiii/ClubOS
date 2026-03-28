/**
 * QuantumSoundInit — Connects the Quantum Sound Engine to the
 * RadioPlayerContext (for ducking), the haptics system, and the
 * ambient psychological layer (session arc, binaural, absence).
 *
 * Must be rendered inside <RadioPlayerProvider>.
 */

import { useEffect } from 'react';
import { useRadioPlayer } from '@/contexts/RadioPlayerContext';
import { useHaptics } from '@/hooks/useHaptics';
import { quantumSoundEngine } from '@/lib/sounds/QuantumSoundEngine';
import { useQuantumAmbience } from '@/hooks/useQuantumAmbience';

export function QuantumSoundInit() {
  const { audioRef } = useRadioPlayer();
  const haptics = useHaptics();

  // Activate the ambient psychological layer
  useQuantumAmbience();

  useEffect(() => {
    // Connect radio audio element for ducking
    if (audioRef.current) {
      quantumSoundEngine.setRadioAudioRef(audioRef.current);
    }
  }, [audioRef]);

  useEffect(() => {
    // Connect haptic feedback (fires 50ms before audio)
    quantumSoundEngine.setHapticFn((type) => {
      switch (type) {
        case 'light':
        case 'medium':
        case 'heavy':
          haptics.impact(type);
          break;
        case 'success':
        case 'warning':
        case 'error':
          haptics.notification(type);
          break;
      }
    });
  }, [haptics]);

  return null;
}

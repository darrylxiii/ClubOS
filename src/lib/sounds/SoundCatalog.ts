/**
 * SoundCatalog — 36 procedural sounds for The Quantum Club.
 *
 * All rooted in F# Lydian (F#‑G#‑A#‑B#‑C#‑D#‑E#).
 * Every sound is a QuantumTimbre.synthesize() call with different params.
 *
 * Frequency reference (Hz):
 *   F#3=185  G#3=208  A#3=233  B#3=247
 *   F#4=370  G#4=415  A#4=466  B#4=494  C#5=554  D#5=622  E#5=659
 *   F#5=740  G#5=831  A#5=932  C#6=1108
 */

import type { TimbreParams } from './QuantumTimbre';
import type { SoundCategory, SoundPriority } from './SoundScheduler';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RewardTier = 'common' | 'uncommon' | 'rare' | 'jackpot' | 'near_miss';

export interface SoundDef {
  id: string;
  category: SoundCategory;
  priority: SoundPriority;
  /** Whether this is a multi‑note sequence (scheduled via audioContext.currentTime) */
  sequence?: boolean;
  /** For sequences: array of { delayMs, params } */
  notes?: Array<{ delayMs: number; params: Partial<TimbreParams> }>;
  /** For single‑shot sounds: params */
  params?: Partial<TimbreParams>;
  /** If true this is a looping ambient sound — caller must call stop() */
  continuous?: boolean;
  /** Haptic style to fire 50ms before audio */
  haptic?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const F_SHARP_3 = 185;
const F_SHARP_4 = 370;
const G_SHARP_4 = 415;
const A_SHARP_4 = 466;
const B_SHARP_4 = 494;
const C_SHARP_5 = 554;
const D_SHARP_5 = 622;
const E_SHARP_5 = 659;
const F_SHARP_5 = 740;
const G_SHARP_5 = 831;
const C_SHARP_6 = 1108;

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export const SOUND_CATALOG: Record<string, SoundDef> = {
  // =========================================================================
  // NOTIFICATION SOUNDS
  // =========================================================================

  'notification.message_received': {
    id: 'notification.message_received',
    category: 'notification',
    priority: 3,
    haptic: 'medium',
    sequence: true,
    notes: [
      {
        delayMs: 0,
        params: {
          frequency: F_SHARP_4,
          modIndex: 0.3,
          numPartials: 3,
          detuneRange: 10,
          attackMs: 80,
          decayMs: 80,
          sustainLevel: 0.2,
          releaseMs: 100,
          noiseOnsetMs: 12,
          gain: 0.10,
          pan: 0.08,
          reverbDuration: 0.3,
          reverbDecay: 0.15,
        },
      },
      {
        delayMs: 120,
        params: {
          frequency: C_SHARP_5,
          modIndex: 0.3,
          numPartials: 3,
          detuneRange: 10,
          attackMs: 80,
          decayMs: 100,
          sustainLevel: 0.15,
          releaseMs: 120,
          noiseOnsetMs: 0,
          gain: 0.10,
          pan: 0.08,
          reverbDuration: 0.3,
          reverbDecay: 0.15,
        },
      },
    ],
  },

  'notification.message_sent': {
    id: 'notification.message_sent',
    category: 'notification',
    priority: 2,
    haptic: 'light',
    params: {
      frequency: F_SHARP_5,
      modIndex: 0.1,
      numPartials: 1,
      detuneRange: 5,
      attackMs: 30,
      decayMs: 30,
      sustainLevel: 0.1,
      releaseMs: 40,
      noiseOnsetMs: 15,
      gain: 0.05,
      pan: 0,
    },
  },

  'notification.mention': {
    id: 'notification.mention',
    category: 'notification',
    priority: 3,
    haptic: 'medium',
    sequence: true,
    notes: [
      { delayMs: 0, params: { frequency: F_SHARP_4, gain: 0.08, attackMs: 50, decayMs: 60, releaseMs: 80, numPartials: 2, pan: -0.10 } },
      { delayMs: 100, params: { frequency: A_SHARP_4, gain: 0.08, attackMs: 50, decayMs: 60, releaseMs: 80, numPartials: 2, pan: 0 } },
      { delayMs: 200, params: { frequency: C_SHARP_5, gain: 0.08, attackMs: 50, decayMs: 60, releaseMs: 80, numPartials: 2, pan: 0.10 } },
    ],
  },

  'notification.high_priority': {
    id: 'notification.high_priority',
    category: 'notification',
    priority: 5,
    haptic: 'heavy',
    sequence: true,
    notes: [
      {
        delayMs: 0,
        params: {
          frequency: F_SHARP_4,
          modIndex: 0.5,
          numPartials: 4,
          detuneRange: 15,
          attackMs: 40,
          decayMs: 100,
          sustainLevel: 0.3,
          releaseMs: 100,
          noiseOnsetMs: 20,
          gain: 0.14,
          filterCenter: 2000,
          pan: 0,
        },
      },
      {
        delayMs: 150,
        params: {
          frequency: F_SHARP_5,
          modIndex: 0.5,
          numPartials: 4,
          detuneRange: 15,
          attackMs: 40,
          decayMs: 100,
          sustainLevel: 0.3,
          releaseMs: 100,
          noiseOnsetMs: 0,
          gain: 0.14,
          filterCenter: 4000,
          pan: 0,
        },
      },
    ],
  },

  'notification.meeting_reminder': {
    id: 'notification.meeting_reminder',
    category: 'notification',
    priority: 4,
    haptic: 'medium',
    params: {
      frequency: F_SHARP_4,
      modIndex: 0.15,
      numPartials: 2,
      detuneRange: 8,
      attackMs: 120,
      decayMs: 200,
      sustainLevel: 0.2,
      releaseMs: 200,
      noiseOnsetMs: 10,
      gain: 0.09,
      reverbDuration: 0.4,
      reverbDecay: 0.2,
      pan: 0,
    },
  },

  // =========================================================================
  // ACHIEVEMENT SOUNDS
  // =========================================================================

  'achievement.common': {
    id: 'achievement.common',
    category: 'achievement',
    priority: 3,
    haptic: 'light',
    sequence: true,
    notes: [
      { delayMs: 0, params: { frequency: F_SHARP_4, gain: 0.08, attackMs: 60, decayMs: 80, releaseMs: 80, numPartials: 0, modIndex: 0.15, noiseOnsetMs: 10 } },
      { delayMs: 100, params: { frequency: C_SHARP_5, gain: 0.08, attackMs: 60, decayMs: 80, releaseMs: 80, numPartials: 0, modIndex: 0.15, noiseOnsetMs: 0 } },
    ],
  },

  'achievement.rare': {
    id: 'achievement.rare',
    category: 'achievement',
    priority: 4,
    haptic: 'medium',
    sequence: true,
    notes: [
      { delayMs: 0, params: { frequency: F_SHARP_4, gain: 0.09, attackMs: 70, decayMs: 100, releaseMs: 100, numPartials: 2, detuneRange: 8, modIndex: 0.2, reverbDuration: 0.3, reverbDecay: 0.15 } },
      { delayMs: 100, params: { frequency: A_SHARP_4, gain: 0.09, attackMs: 70, decayMs: 100, releaseMs: 100, numPartials: 2, detuneRange: 8, modIndex: 0.2, reverbDuration: 0.3, reverbDecay: 0.15 } },
      { delayMs: 200, params: { frequency: C_SHARP_5, gain: 0.09, attackMs: 70, decayMs: 120, releaseMs: 120, numPartials: 2, detuneRange: 8, modIndex: 0.2, reverbDuration: 0.3, reverbDecay: 0.15 } },
    ],
  },

  'achievement.epic': {
    id: 'achievement.epic',
    category: 'achievement',
    priority: 4,
    haptic: 'success',
    sequence: true,
    notes: [
      { delayMs: 0, params: { frequency: F_SHARP_4, gain: 0.10, attackMs: 80, decayMs: 120, releaseMs: 120, numPartials: 4, detuneRange: 12, modIndex: 0.35, reverbDuration: 0.4, reverbDecay: 0.2, pan: -0.08 } },
      { delayMs: 120, params: { frequency: A_SHARP_4, gain: 0.10, attackMs: 80, decayMs: 120, releaseMs: 120, numPartials: 4, detuneRange: 12, modIndex: 0.35, reverbDuration: 0.4, reverbDecay: 0.2, pan: -0.03 } },
      { delayMs: 240, params: { frequency: C_SHARP_5, gain: 0.10, attackMs: 80, decayMs: 120, releaseMs: 120, numPartials: 4, detuneRange: 12, modIndex: 0.35, reverbDuration: 0.4, reverbDecay: 0.2, pan: 0.03 } },
      { delayMs: 360, params: { frequency: E_SHARP_5, gain: 0.10, attackMs: 80, decayMs: 150, releaseMs: 150, numPartials: 4, detuneRange: 12, modIndex: 0.35, reverbDuration: 0.4, reverbDecay: 0.2, pan: 0.08 } },
    ],
  },

  'achievement.legendary': {
    id: 'achievement.legendary',
    category: 'achievement',
    priority: 4,
    haptic: 'success',
    sequence: true,
    notes: [
      { delayMs: 0, params: { frequency: F_SHARP_4, gain: 0.12, attackMs: 100, decayMs: 150, releaseMs: 150, numPartials: 5, detuneRange: 15, modIndex: 0.4, noiseOnsetMs: 20, reverbDuration: 1.2, reverbDecay: 0.4, pan: -0.12 } },
      { delayMs: 150, params: { frequency: G_SHARP_4, gain: 0.11, attackMs: 100, decayMs: 150, releaseMs: 150, numPartials: 5, detuneRange: 15, modIndex: 0.4, reverbDuration: 1.2, reverbDecay: 0.4, pan: -0.06 } },
      { delayMs: 300, params: { frequency: A_SHARP_4, gain: 0.12, attackMs: 100, decayMs: 150, releaseMs: 150, numPartials: 5, detuneRange: 15, modIndex: 0.4, reverbDuration: 1.2, reverbDecay: 0.4, pan: 0 } },
      { delayMs: 450, params: { frequency: C_SHARP_5, gain: 0.12, attackMs: 100, decayMs: 150, releaseMs: 150, numPartials: 5, detuneRange: 15, modIndex: 0.4, reverbDuration: 1.2, reverbDecay: 0.4, pan: 0.06 } },
      { delayMs: 600, params: { frequency: F_SHARP_5, gain: 0.14, attackMs: 150, decayMs: 200, releaseMs: 250, numPartials: 5, detuneRange: 15, modIndex: 0.4, reverbDuration: 1.2, reverbDecay: 0.4, pan: 0.12 } },
    ],
  },

  'achievement.quantum': {
    id: 'achievement.quantum',
    category: 'achievement',
    priority: 4,
    haptic: 'success',
    sequence: true,
    notes: [
      // Six oscillator spectral chord with beating patterns
      { delayMs: 0, params: { frequency: F_SHARP_3, gain: 0.14, attackMs: 200, decayMs: 300, sustainLevel: 0.4, releaseMs: 400, numPartials: 6, detuneRange: 15, modIndex: 0.5, noiseOnsetMs: 25, reverbDuration: 1.2, reverbDecay: 0.4, pan: -0.12 } },
      { delayMs: 100, params: { frequency: F_SHARP_4, gain: 0.12, attackMs: 200, decayMs: 300, sustainLevel: 0.4, releaseMs: 400, numPartials: 6, detuneRange: 15, modIndex: 0.45, reverbDuration: 1.2, reverbDecay: 0.4, pan: -0.06 } },
      { delayMs: 200, params: { frequency: A_SHARP_4, gain: 0.11, attackMs: 200, decayMs: 300, sustainLevel: 0.4, releaseMs: 400, numPartials: 6, detuneRange: 15, modIndex: 0.45, reverbDuration: 1.2, reverbDecay: 0.4, pan: 0 } },
      { delayMs: 300, params: { frequency: C_SHARP_5, gain: 0.11, attackMs: 200, decayMs: 300, sustainLevel: 0.4, releaseMs: 400, numPartials: 6, detuneRange: 15, modIndex: 0.45, reverbDuration: 1.2, reverbDecay: 0.4, pan: 0.06 } },
      { delayMs: 400, params: { frequency: E_SHARP_5, gain: 0.10, attackMs: 200, decayMs: 300, sustainLevel: 0.4, releaseMs: 400, numPartials: 6, detuneRange: 15, modIndex: 0.45, reverbDuration: 1.2, reverbDecay: 0.4, pan: 0.12 } },
      { delayMs: 500, params: { frequency: F_SHARP_5, gain: 0.14, attackMs: 250, decayMs: 350, sustainLevel: 0.5, releaseMs: 500, numPartials: 6, detuneRange: 15, modIndex: 0.5, reverbDuration: 1.2, reverbDecay: 0.4, pan: 0 } },
    ],
  },

  'achievement.near_miss': {
    id: 'achievement.near_miss',
    category: 'achievement',
    priority: 4,
    haptic: 'success',
    sequence: true,
    notes: [
      // Starts identical to legendary for first 4 notes…
      { delayMs: 0, params: { frequency: F_SHARP_4, gain: 0.12, attackMs: 100, decayMs: 150, releaseMs: 150, numPartials: 5, detuneRange: 15, modIndex: 0.4, noiseOnsetMs: 20, reverbDuration: 1.2, reverbDecay: 0.4, pan: -0.12 } },
      { delayMs: 150, params: { frequency: G_SHARP_4, gain: 0.11, attackMs: 100, decayMs: 150, releaseMs: 150, numPartials: 5, detuneRange: 15, modIndex: 0.4, reverbDuration: 1.2, reverbDecay: 0.4, pan: -0.06 } },
      { delayMs: 300, params: { frequency: A_SHARP_4, gain: 0.12, attackMs: 100, decayMs: 150, releaseMs: 150, numPartials: 5, detuneRange: 15, modIndex: 0.4, reverbDuration: 1.2, reverbDecay: 0.4, pan: 0 } },
      { delayMs: 450, params: { frequency: C_SHARP_5, gain: 0.12, attackMs: 100, decayMs: 150, releaseMs: 150, numPartials: 5, detuneRange: 15, modIndex: 0.4, reverbDuration: 1.2, reverbDecay: 0.4, pan: 0.06 } },
      // …then resolves to a slightly FLAT note instead of F#5 (detuned −30 cents)
      { delayMs: 600, params: { frequency: F_SHARP_5 * 0.983, gain: 0.08, attackMs: 100, decayMs: 80, sustainLevel: 0.1, releaseMs: 100, numPartials: 2, detuneRange: 5, modIndex: 0.2, reverbDuration: 0.3, reverbDecay: 0.1, pan: 0 } },
    ],
  },

  'achievement.xp_earned': {
    id: 'achievement.xp_earned',
    category: 'achievement',
    priority: 2,
    haptic: 'light',
    params: {
      frequency: C_SHARP_5,
      modIndex: 0.6, // high mod index = metallic sparkle
      numPartials: 3,
      detuneRange: 12,
      attackMs: 30,
      decayMs: 40,
      sustainLevel: 0.05,
      releaseMs: 50,
      noiseOnsetMs: 8,
      gain: 0.05,
      pan: 0,
    },
  },

  'achievement.level_up': {
    id: 'achievement.level_up',
    category: 'achievement',
    priority: 4,
    haptic: 'success',
    sequence: true,
    notes: [
      { delayMs: 0, params: { frequency: F_SHARP_4, gain: 0.10, attackMs: 80, decayMs: 100, releaseMs: 100, numPartials: 3, modIndex: 0.3, reverbDuration: 0.5, reverbDecay: 0.2 } },
      { delayMs: 100, params: { frequency: A_SHARP_4, gain: 0.10, attackMs: 80, decayMs: 100, releaseMs: 100, numPartials: 3, modIndex: 0.3, reverbDuration: 0.5, reverbDecay: 0.2 } },
      { delayMs: 200, params: { frequency: C_SHARP_5, gain: 0.10, attackMs: 80, decayMs: 100, releaseMs: 100, numPartials: 3, modIndex: 0.3, reverbDuration: 0.5, reverbDecay: 0.2 } },
      { delayMs: 300, params: { frequency: F_SHARP_5, gain: 0.12, attackMs: 120, decayMs: 200, releaseMs: 200, numPartials: 4, modIndex: 0.35, reverbDuration: 0.5, reverbDecay: 0.2 } },
    ],
  },

  'achievement.streak_maintained': {
    id: 'achievement.streak_maintained',
    category: 'achievement',
    priority: 3,
    haptic: 'light',
    sequence: true,
    notes: [
      { delayMs: 0, params: { frequency: F_SHARP_4, gain: 0.06, attackMs: 40, decayMs: 50, releaseMs: 60, numPartials: 2, detuneRange: 8 } },
      { delayMs: 80, params: { frequency: F_SHARP_4, gain: 0.06, attackMs: 40, decayMs: 50, releaseMs: 60, numPartials: 2, detuneRange: 8 } },
      { delayMs: 160, params: { frequency: F_SHARP_4, gain: 0.06, attackMs: 40, decayMs: 50, releaseMs: 60, numPartials: 2, detuneRange: 8 } },
    ],
  },

  'achievement.streak_at_risk': {
    id: 'achievement.streak_at_risk',
    category: 'achievement',
    priority: 3,
    haptic: 'warning',
    params: {
      frequency: F_SHARP_4,
      modIndex: 0.25,
      numPartials: 2,
      detuneRange: 6,
      attackMs: 100,
      decayMs: 150,
      sustainLevel: 0.3,
      releaseMs: 200,
      noiseOnsetMs: 0,
      gain: 0.07,
      filterCenter: 1500, // filter closing — unsettling but not dissonant
      filterQ: 3,
      pan: 0,
    },
  },

  // =========================================================================
  // SOCIAL SOUNDS
  // =========================================================================

  'social.reaction_received': {
    id: 'social.reaction_received',
    category: 'social',
    priority: 2,
    haptic: 'light',
    params: {
      frequency: C_SHARP_6,
      modIndex: 0.7, // high mod = crystalline sparkle
      numPartials: 2,
      detuneRange: 12,
      attackMs: 20,
      decayMs: 20,
      sustainLevel: 0.05,
      releaseMs: 30,
      noiseOnsetMs: 5,
      gain: 0.03,
      pan: 0,
    },
  },

  'social.connection_accepted': {
    id: 'social.connection_accepted',
    category: 'social',
    priority: 3,
    haptic: 'medium',
    sequence: true,
    notes: [
      { delayMs: 0, params: { frequency: F_SHARP_4, gain: 0.07, attackMs: 100, decayMs: 100, releaseMs: 120, numPartials: 2, reverbDuration: 0.3, reverbDecay: 0.15 } },
      { delayMs: 120, params: { frequency: B_SHARP_4, gain: 0.07, attackMs: 100, decayMs: 120, releaseMs: 150, numPartials: 2, reverbDuration: 0.3, reverbDecay: 0.15 } },
    ],
  },

  'social.connection_request': {
    id: 'social.connection_request',
    category: 'social',
    priority: 3,
    haptic: 'light',
    sequence: true,
    notes: [
      { delayMs: 0, params: { frequency: F_SHARP_4, gain: 0.05, attackMs: 40, decayMs: 40, releaseMs: 60, numPartials: 1 } },
      { delayMs: 80, params: { frequency: G_SHARP_4, gain: 0.05, attackMs: 40, decayMs: 40, releaseMs: 60, numPartials: 1 } },
    ],
  },

  'social.profile_viewed': {
    id: 'social.profile_viewed',
    category: 'social',
    priority: 1,
    params: {
      frequency: F_SHARP_4,
      modIndex: 0.1,
      numPartials: 0,
      detuneRange: 0,
      attackMs: 30,
      decayMs: 20,
      sustainLevel: 0,
      releaseMs: 20,
      noiseOnsetMs: 0,
      gain: 0.015,
      pan: 0,
    },
  },

  'social.rival_activity': {
    id: 'social.rival_activity',
    category: 'social',
    priority: 1,
    params: {
      frequency: F_SHARP_3,
      modIndex: 0.1,
      numPartials: 0,
      detuneRange: 0,
      attackMs: 50,
      decayMs: 30,
      sustainLevel: 0,
      releaseMs: 40,
      noiseOnsetMs: 0,
      gain: 0.02,
      pan: 0,
    },
  },

  // =========================================================================
  // PIPELINE / BUSINESS SOUNDS
  // =========================================================================

  'pipeline.stage_advanced': {
    id: 'pipeline.stage_advanced',
    category: 'pipeline',
    priority: 3,
    haptic: 'light',
    params: {
      frequency: F_SHARP_4,
      modIndex: 0.25,
      numPartials: 2,
      detuneRange: 8,
      attackMs: 60,
      decayMs: 80,
      sustainLevel: 0.15,
      releaseMs: 100,
      noiseOnsetMs: 15,
      gain: 0.08,
      filterCenter: 2000, // will sweep conceptually via the filter
      pan: 0,
    },
  },

  'pipeline.new_application': {
    id: 'pipeline.new_application',
    category: 'pipeline',
    priority: 3,
    haptic: 'medium',
    sequence: true,
    notes: [
      { delayMs: 0, params: { frequency: F_SHARP_5, gain: 0.08, attackMs: 50, decayMs: 60, releaseMs: 80, numPartials: 2, modIndex: 0.2 } },
      { delayMs: 80, params: { frequency: C_SHARP_5, gain: 0.08, attackMs: 50, decayMs: 80, releaseMs: 100, numPartials: 2, modIndex: 0.2 } },
    ],
  },

  'pipeline.interview_scheduled': {
    id: 'pipeline.interview_scheduled',
    category: 'pipeline',
    priority: 3,
    haptic: 'light',
    params: {
      frequency: A_SHARP_4,
      modIndex: 0.2,
      numPartials: 1,
      detuneRange: 6,
      attackMs: 80,
      decayMs: 100,
      sustainLevel: 0.15,
      releaseMs: 120,
      gain: 0.06,
      reverbDuration: 0.3,
      reverbDecay: 0.15,
      pan: 0,
    },
  },

  'pipeline.offer_extended': {
    id: 'pipeline.offer_extended',
    category: 'pipeline',
    priority: 4,
    haptic: 'success',
    sequence: true,
    notes: [
      { delayMs: 0, params: { frequency: F_SHARP_4, gain: 0.10, attackMs: 150, decayMs: 150, releaseMs: 150, numPartials: 3, modIndex: 0.3, reverbDuration: 0.4, reverbDecay: 0.2 } },
      { delayMs: 50, params: { frequency: A_SHARP_4, gain: 0.09, attackMs: 150, decayMs: 150, releaseMs: 150, numPartials: 3, modIndex: 0.3, reverbDuration: 0.4, reverbDecay: 0.2 } },
      { delayMs: 100, params: { frequency: C_SHARP_5, gain: 0.09, attackMs: 150, decayMs: 150, releaseMs: 150, numPartials: 3, modIndex: 0.3, reverbDuration: 0.4, reverbDecay: 0.2 } },
      { delayMs: 150, params: { frequency: E_SHARP_5, gain: 0.10, attackMs: 150, decayMs: 200, releaseMs: 200, numPartials: 3, modIndex: 0.3, reverbDuration: 0.4, reverbDecay: 0.2 } },
    ],
  },

  'pipeline.placement_made': {
    id: 'pipeline.placement_made',
    category: 'pipeline',
    priority: 4,
    haptic: 'success',
    sequence: true,
    notes: [
      { delayMs: 0, params: { frequency: F_SHARP_4, gain: 0.14, attackMs: 100, decayMs: 120, releaseMs: 120, numPartials: 4, modIndex: 0.35, reverbDuration: 0.6, reverbDecay: 0.25, pan: -0.10 } },
      { delayMs: 100, params: { frequency: A_SHARP_4, gain: 0.13, attackMs: 100, decayMs: 120, releaseMs: 120, numPartials: 4, modIndex: 0.35, reverbDuration: 0.6, reverbDecay: 0.25, pan: -0.05 } },
      { delayMs: 200, params: { frequency: C_SHARP_5, gain: 0.13, attackMs: 100, decayMs: 120, releaseMs: 120, numPartials: 4, modIndex: 0.35, reverbDuration: 0.6, reverbDecay: 0.25, pan: 0 } },
      { delayMs: 300, params: { frequency: E_SHARP_5, gain: 0.13, attackMs: 100, decayMs: 120, releaseMs: 120, numPartials: 4, modIndex: 0.35, reverbDuration: 0.6, reverbDecay: 0.25, pan: 0.05 } },
      { delayMs: 400, params: { frequency: F_SHARP_5, gain: 0.16, attackMs: 150, decayMs: 200, releaseMs: 250, numPartials: 5, modIndex: 0.4, reverbDuration: 0.6, reverbDecay: 0.25, pan: 0.10 } },
    ],
  },

  'pipeline.deal_won': {
    id: 'pipeline.deal_won',
    category: 'pipeline',
    priority: 4,
    haptic: 'success',
    sequence: true,
    notes: [
      { delayMs: 0, params: { frequency: F_SHARP_4, gain: 0.14, attackMs: 120, decayMs: 150, releaseMs: 150, numPartials: 4, modIndex: 0.35, reverbDuration: 0.6, reverbDecay: 0.25, pan: -0.10 } },
      { delayMs: 80, params: { frequency: A_SHARP_4, gain: 0.13, attackMs: 120, decayMs: 150, releaseMs: 150, numPartials: 4, modIndex: 0.35, reverbDuration: 0.6, reverbDecay: 0.25, pan: 0 } },
      { delayMs: 160, params: { frequency: C_SHARP_5, gain: 0.13, attackMs: 120, decayMs: 150, releaseMs: 150, numPartials: 4, modIndex: 0.35, reverbDuration: 0.6, reverbDecay: 0.25, pan: 0.10 } },
      // Octave jump for triumph
      { delayMs: 300, params: { frequency: F_SHARP_5, gain: 0.16, attackMs: 200, decayMs: 250, releaseMs: 300, numPartials: 5, modIndex: 0.4, reverbDuration: 0.6, reverbDecay: 0.25, pan: 0 } },
    ],
  },

  // =========================================================================
  // MICRO‑INTERACTION SOUNDS
  // =========================================================================

  'micro.click': {
    id: 'micro.click',
    category: 'micro',
    priority: 1,
    params: {
      frequency: F_SHARP_5,
      modIndex: 0.15,
      numPartials: 0,
      detuneRange: 0,
      attackMs: 30,
      decayMs: 20,
      sustainLevel: 0,
      releaseMs: 20,
      noiseOnsetMs: 8,
      gain: 0.04,
      pan: 0,
      filterCenter: 3000,
      filterQ: 2,
    },
  },

  'micro.toggle': {
    id: 'micro.toggle',
    category: 'micro',
    priority: 1,
    params: {
      frequency: G_SHARP_5,
      modIndex: 0.1,
      numPartials: 0,
      detuneRange: 0,
      attackMs: 25,
      decayMs: 15,
      sustainLevel: 0,
      releaseMs: 15,
      noiseOnsetMs: 5,
      gain: 0.03,
      carrierType: 'triangle',
      pan: 0,
    },
  },

  'micro.form_success': {
    id: 'micro.form_success',
    category: 'micro',
    priority: 2,
    haptic: 'light',
    sequence: true,
    notes: [
      { delayMs: 0, params: { frequency: F_SHARP_4, gain: 0.05, attackMs: 35, decayMs: 40, releaseMs: 50, numPartials: 1, modIndex: 0.15, noiseOnsetMs: 8 } },
      { delayMs: 80, params: { frequency: C_SHARP_5, gain: 0.05, attackMs: 35, decayMs: 50, releaseMs: 60, numPartials: 1, modIndex: 0.15, noiseOnsetMs: 0 } },
    ],
  },

  'micro.nav_switch': {
    id: 'micro.nav_switch',
    category: 'micro',
    priority: 1,
    params: {
      frequency: F_SHARP_5,
      modIndex: 0.05,
      numPartials: 0,
      detuneRange: 0,
      attackMs: 20,
      decayMs: 15,
      sustainLevel: 0,
      releaseMs: 15,
      noiseOnsetMs: 20, // prominent noise burst — "whoosh"
      gain: 0.02,
      filterCenter: 4000,
      filterQ: 1.5,
      pan: 0,
    },
  },

  'micro.drag_drop': {
    id: 'micro.drag_drop',
    category: 'micro',
    priority: 1,
    params: {
      frequency: F_SHARP_3,
      modIndex: 0.2,
      numPartials: 0,
      detuneRange: 0,
      attackMs: 20,
      decayMs: 15,
      sustainLevel: 0,
      releaseMs: 15,
      noiseOnsetMs: 10,
      gain: 0.05,
      pan: 0,
    },
  },

  'micro.search_activate': {
    id: 'micro.search_activate',
    category: 'micro',
    priority: 1,
    params: {
      frequency: F_SHARP_4,
      modIndex: 0.3,
      numPartials: 1,
      detuneRange: 5,
      attackMs: 25,
      decayMs: 25,
      sustainLevel: 0,
      releaseMs: 30,
      noiseOnsetMs: 10,
      gain: 0.03,
      filterCenter: 2500,
      pan: 0,
    },
  },

  'micro.error': {
    id: 'micro.error',
    category: 'micro',
    priority: 2,
    haptic: 'warning',
    params: {
      frequency: F_SHARP_4,
      modIndex: 0.35,
      numPartials: 1,
      detuneRange: 8,
      attackMs: 40,
      decayMs: 50,
      sustainLevel: 0.1,
      releaseMs: 60,
      noiseOnsetMs: 15,
      gain: 0.06,
      filterCenter: 1200, // darker filter = unsettling
      filterQ: 3,
      pan: 0,
    },
  },

  // =========================================================================
  // AMBIENT / STATUS SOUNDS
  // =========================================================================

  'ambient.ai_thinking': {
    id: 'ambient.ai_thinking',
    category: 'ambient',
    priority: 1,
    continuous: true,
    params: {
      frequency: F_SHARP_3,
      modIndex: 0.1,
      numPartials: 0,
      detuneRange: 0,
      attackMs: 500,
      decayMs: 2000,
      sustainLevel: 0.8,
      releaseMs: 500,
      noiseOnsetMs: 0,
      gain: 0.008,
      pan: 0,
    },
  },

  'ambient.ai_ready': {
    id: 'ambient.ai_ready',
    category: 'ambient',
    priority: 2,
    haptic: 'light',
    params: {
      frequency: C_SHARP_5,
      modIndex: 0.2,
      numPartials: 2,
      detuneRange: 8,
      attackMs: 50,
      decayMs: 60,
      sustainLevel: 0.1,
      releaseMs: 80,
      noiseOnsetMs: 8,
      gain: 0.06,
      reverbDuration: 0.3,
      reverbDecay: 0.15,
      pan: 0,
    },
  },

  'ambient.upload_complete': {
    id: 'ambient.upload_complete',
    category: 'ambient',
    priority: 2,
    haptic: 'light',
    params: {
      frequency: F_SHARP_5,
      modIndex: 0.2,
      numPartials: 4,
      detuneRange: 10,
      attackMs: 60,
      decayMs: 80,
      sustainLevel: 0.1,
      releaseMs: 100,
      noiseOnsetMs: 10,
      gain: 0.05,
      pan: 0,
    },
  },

  'ambient.platform_pulse': {
    id: 'ambient.platform_pulse',
    category: 'ambient',
    priority: 1,
    params: {
      frequency: F_SHARP_4,
      modIndex: 0.05,
      numPartials: 0,
      detuneRange: 0,
      attackMs: 40,
      decayMs: 20,
      sustainLevel: 0,
      releaseMs: 20,
      noiseOnsetMs: 0,
      gain: 0.005,
      pan: 0,
    },
  },

  'ambient.sync_complete': {
    id: 'ambient.sync_complete',
    category: 'ambient',
    priority: 1,
    params: {
      frequency: D_SHARP_5,
      modIndex: 0.15,
      numPartials: 1,
      detuneRange: 6,
      attackMs: 50,
      decayMs: 50,
      sustainLevel: 0.05,
      releaseMs: 60,
      noiseOnsetMs: 0,
      gain: 0.03,
      pan: 0,
    },
  },
};

// ---------------------------------------------------------------------------
// Variable‑ratio reward tier selector
// ---------------------------------------------------------------------------

/**
 * Pick a reward tier using the 4‑tier + near‑miss schedule:
 *   common 60%, uncommon 25%, rare 12%, jackpot 3%, near_miss 8%
 * (Total > 100% — near_miss replaces common in ~8% of cases)
 */
export function pickRewardTier(): RewardTier {
  const r = Math.random();
  if (r < 0.03) return 'jackpot';
  if (r < 0.11) return 'near_miss'; // 8%
  if (r < 0.23) return 'rare'; // 12%
  if (r < 0.48) return 'uncommon'; // 25%
  return 'common'; // ~52% (remaining)
}

/**
 * Map a reward tier to a sound ID for achievements.
 * The base rarity (from the achievement itself) is overridden by the variable
 * tier for XP / generic reward moments.
 */
export function rewardTierToSoundId(tier: RewardTier): string {
  switch (tier) {
    case 'jackpot':
      return 'achievement.legendary';
    case 'near_miss':
      return 'achievement.near_miss';
    case 'rare':
      return 'achievement.epic';
    case 'uncommon':
      return 'achievement.rare';
    case 'common':
    default:
      return 'achievement.common';
  }
}

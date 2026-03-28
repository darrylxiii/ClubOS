/**
 * SoundThemes — Unlockable sound palettes tied to user level milestones.
 *
 * Each theme modifies the synthesis parameters of all sounds:
 * - Different FM modulation characteristics
 * - Different filter responses
 * - Different reverb qualities
 * - Different probability partial behaviour
 *
 * Themes are audible status symbols — higher-level users SOUND different.
 */

import type { TimbreParams } from './QuantumTimbre';

export interface SoundTheme {
  id: string;
  name: string;
  description: string;
  unlockLevel: number;
  /** Parameter overrides applied to every sound */
  overrides: Partial<TimbreParams>;
  /** Visual accent color (for UI display) */
  accentColor: string;
}

export const SOUND_THEMES: SoundTheme[] = [
  {
    id: 'origin',
    name: 'Origin',
    description: 'Clean F# Lydian fundamentals. Where every journey begins.',
    unlockLevel: 0,
    overrides: {
      // Default — no modifications
    },
    accentColor: 'hsl(0 0% 60%)',
  },
  {
    id: 'nebula',
    name: 'Nebula',
    description: 'Wider stereo field, deeper reverb. Space is opening up.',
    unlockLevel: 10,
    overrides: {
      reverbDuration: 0.5,
      reverbDecay: 0.25,
      detuneRange: 12,
      filterQ: 3,
    },
    accentColor: 'hsl(250 40% 60%)',
  },
  {
    id: 'dark_matter',
    name: 'Dark Matter',
    description: 'Rich FM harmonics, metallic shimmer. The invisible force.',
    unlockLevel: 25,
    overrides: {
      modIndex: 0.45,
      numPartials: 4,
      detuneRange: 14,
      filterCenter: 3500,
      filterQ: 3.5,
      reverbDuration: 0.4,
      reverbDecay: 0.2,
    },
    accentColor: 'hsl(270 30% 40%)',
  },
  {
    id: 'singularity',
    name: 'Singularity',
    description: 'Maximum harmonic density. Every sound is an event horizon.',
    unlockLevel: 50,
    overrides: {
      modIndex: 0.55,
      numPartials: 5,
      detuneRange: 15,
      filterCenter: 4000,
      filterQ: 4,
      reverbDuration: 0.6,
      reverbDecay: 0.3,
      noiseOnsetMs: 20,
    },
    accentColor: 'hsl(200 50% 50%)',
  },
  {
    id: 'quantum_field',
    name: 'Quantum Field',
    description: 'The ultimate sonic identity. Probability partials at maximum. Reality bends.',
    unlockLevel: 75,
    overrides: {
      modIndex: 0.65,
      modRatio: 2.0,
      numPartials: 6,
      detuneRange: 18,
      filterCenter: 4500,
      filterQ: 4.5,
      reverbDuration: 0.8,
      reverbDecay: 0.35,
      noiseOnsetMs: 25,
    },
    accentColor: 'hsl(45 60% 55%)',
  },
];

const THEME_STORAGE_KEY = 'quantum-sound-theme';

/**
 * Get the highest theme a user has unlocked based on their level.
 */
export function getUnlockedThemes(userLevel: number): SoundTheme[] {
  return SOUND_THEMES.filter((t) => t.unlockLevel <= userLevel);
}

/**
 * Get the user's currently active theme.
 */
export function getActiveTheme(): SoundTheme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) {
      const theme = SOUND_THEMES.find((t) => t.id === stored);
      if (theme) return theme;
    }
  } catch { /* use default */ }
  return SOUND_THEMES[0];
}

/**
 * Set the user's active theme.
 */
export function setActiveTheme(themeId: string): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch { /* non-critical */ }
}

/**
 * Apply theme overrides to a set of timbre params.
 * Theme overrides are merged on top of the sound's base params.
 */
export function applyTheme(
  baseParams: Partial<TimbreParams>,
  theme?: SoundTheme,
): Partial<TimbreParams> {
  const activeTheme = theme || getActiveTheme();
  if (!activeTheme.overrides || Object.keys(activeTheme.overrides).length === 0) {
    return baseParams;
  }
  return { ...baseParams, ...activeTheme.overrides };
}

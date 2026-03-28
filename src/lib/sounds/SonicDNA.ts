/**
 * SonicDNA — Generates a unique procedural sound signature from any string
 * (typically a user ID). Two different IDs will always produce different sounds.
 * The same ID will always produce the same sound.
 *
 * Used for:
 * - Personal notification signature (you recognize YOUR sound)
 * - Contact-specific tones (you learn who messages you by sound alone)
 * - Cocktail Party Effect — your unique tone cuts through noise
 */

import { QuantumTimbre, type TimbreParams } from './QuantumTimbre';

// F# Lydian scale frequencies (Hz) across multiple octaves
const LYDIAN_FREQS = [
  185, 208, 233, 247, 277, 311, 330, // F#3 octave
  370, 415, 466, 494, 554, 622, 659, // F#4 octave
  740, 831, 932, 988, 1108, 1244, 1318, // F#5 octave
];

/**
 * Simple deterministic hash from string → number.
 * Not cryptographic — just needs to be consistent and well-distributed.
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Derive a value from a hash in a given range.
 */
function derive(hash: number, seed: number, min: number, max: number): number {
  const h = hashString(`${hash}:${seed}`);
  return min + (h % 10000) / 10000 * (max - min);
}

/**
 * Derive an integer index from a hash.
 */
function deriveIndex(hash: number, seed: number, max: number): number {
  const h = hashString(`${hash}:${seed}`);
  return h % max;
}

export interface SonicDNAProfile {
  /** Two-note signature interval */
  freq1: number;
  freq2: number;
  /** FM modulation depth (personality brightness) */
  modIndex: number;
  /** Number of probability partials (personality richness) */
  numPartials: number;
  /** Detune range (personality uniqueness) */
  detuneRange: number;
  /** Stereo pan tendency */
  pan: number;
  /** Attack time (personality speed) */
  attackMs: number;
}

/**
 * Generate a SonicDNA profile from any identifier string.
 * Deterministic: same input → same profile every time.
 */
export function generateSonicDNA(identifier: string): SonicDNAProfile {
  const hash = hashString(identifier);

  // Pick two frequencies from the Lydian scale (always different)
  const idx1 = deriveIndex(hash, 1, LYDIAN_FREQS.length);
  let idx2 = deriveIndex(hash, 2, LYDIAN_FREQS.length - 1);
  if (idx2 >= idx1) idx2++; // ensure different

  return {
    freq1: LYDIAN_FREQS[idx1],
    freq2: LYDIAN_FREQS[idx2],
    modIndex: derive(hash, 3, 0.1, 0.5),
    numPartials: Math.floor(derive(hash, 4, 1, 5)),
    detuneRange: derive(hash, 5, 5, 15),
    pan: derive(hash, 6, -0.12, 0.12),
    attackMs: derive(hash, 7, 40, 120),
  };
}

/**
 * Play a user's Sonic DNA signature.
 * Two-note ascending chime with their unique timbre.
 */
export function playSonicDNA(
  ctx: AudioContext,
  destination: AudioNode,
  profile: SonicDNAProfile,
  gain: number = 0.08,
): void {
  // Note 1
  QuantumTimbre.synthesize(ctx, destination, {
    frequency: profile.freq1,
    modIndex: profile.modIndex,
    numPartials: profile.numPartials,
    detuneRange: profile.detuneRange,
    attackMs: profile.attackMs,
    decayMs: 80,
    sustainLevel: 0.15,
    releaseMs: 100,
    noiseOnsetMs: 10,
    filterCenter: 3000,
    filterQ: 2.5,
    reverbDuration: 0.3,
    reverbDecay: 0.15,
    pan: profile.pan,
    gain,
  });

  // Note 2 (delayed)
  setTimeout(() => {
    QuantumTimbre.synthesize(ctx, destination, {
      frequency: profile.freq2,
      modIndex: profile.modIndex,
      numPartials: profile.numPartials,
      detuneRange: profile.detuneRange,
      attackMs: profile.attackMs,
      decayMs: 100,
      sustainLevel: 0.1,
      releaseMs: 120,
      noiseOnsetMs: 0,
      filterCenter: 3000,
      filterQ: 2.5,
      reverbDuration: 0.3,
      reverbDecay: 0.15,
      pan: profile.pan,
      gain,
    });
  }, 100 + profile.attackMs);
}

// Cache profiles to avoid recomputation
const profileCache = new Map<string, SonicDNAProfile>();

/**
 * Get or create a cached SonicDNA profile.
 */
export function getSonicDNA(identifier: string): SonicDNAProfile {
  let profile = profileCache.get(identifier);
  if (!profile) {
    profile = generateSonicDNA(identifier);
    profileCache.set(identifier, profile);
    // Keep cache bounded
    if (profileCache.size > 200) {
      const firstKey = profileCache.keys().next().value;
      if (firstKey) profileCache.delete(firstKey);
    }
  }
  return profile;
}

/**
 * QuantumSoundEngine — The Quantum Club's unified sound system.
 *
 * Single AudioContext · master bus with compressor + limiter ·
 * per‑category submixes · priority scheduling · radio ducking ·
 * haptic sync · preference management · accessibility.
 */

import { QuantumTimbre, getSoftClipCurve } from './QuantumTimbre';
import { SOUND_CATALOG, type SoundDef } from './SoundCatalog';
import { SoundScheduler, type SoundCategory } from './SoundScheduler';
import { audioUnlock } from '@/hooks/useAudioUnlock';
import { applyTheme } from './SoundThemes';
import { getSonicDNA, playSonicDNA } from './SonicDNA';
import { connectVisualizer } from '@/components/sound/QuantumSoundVisualizer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SoundPreset = 'minimal' | 'balanced' | 'immersive';

export interface SoundPreferences {
  masterVolume: number; // 0‑1
  preset: SoundPreset;
  categories: Record<SoundCategory, { enabled: boolean; volume: number }>;
  radioDucking: boolean;
  duckingAmount: number; // 0‑1
  quietHoursStart: string | null; // HH:mm
  quietHoursEnd: string | null;
}

type HapticFn = (
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error',
) => void;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'sound-preferences';
const MASTER_MUTE_KEY = 'sound-effects-enabled';

const PRESET_CATEGORIES: Record<SoundPreset, SoundCategory[]> = {
  minimal: ['micro', 'notification'],
  balanced: ['micro', 'notification', 'achievement', 'pipeline'],
  immersive: ['micro', 'notification', 'achievement', 'pipeline', 'social', 'ambient'],
};

const DEFAULT_PREFS: SoundPreferences = {
  masterVolume: 0.6,
  preset: 'balanced',
  categories: {
    notification: { enabled: true, volume: 0.8 },
    achievement: { enabled: true, volume: 0.8 },
    social: { enabled: false, volume: 0.5 },
    pipeline: { enabled: true, volume: 0.7 },
    micro: { enabled: true, volume: 0.5 },
    ambient: { enabled: false, volume: 0.3 },
  },
  radioDucking: true,
  duckingAmount: 0.7,
  quietHoursStart: null,
  quietHoursEnd: null,
};

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

class QuantumSoundEngineImpl {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private limiter: WaveShaperNode | null = null;
  private categoryGains = new Map<SoundCategory, GainNode>();
  private prefs: SoundPreferences;
  private scheduler: SoundScheduler;
  private radioRef: HTMLAudioElement | null = null;
  private radioOriginalVolume: number | null = null;
  private radioDuckTimer: ReturnType<typeof setTimeout> | null = null;
  private hapticFn: HapticFn | null = null;
  private activeContinuous = new Map<string, { stop: () => void }>();
  private prefersReducedMotion = false;

  constructor() {
    this.prefs = this.loadPrefs();
    this.scheduler = new SoundScheduler((soundId) => this.synthesize(soundId));

    // Respect prefers‑reduced‑motion
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.prefersReducedMotion = mq.matches;
      mq.addEventListener('change', (e) => {
        this.prefersReducedMotion = e.matches;
      });
    }
  }

  // -----------------------------------------------------------------------
  // Initialisation (lazy — only creates AudioContext on first play)
  // -----------------------------------------------------------------------

  private ensureContext(): AudioContext {
    if (this.ctx) return this.ctx;

    this.ctx = new AudioContext();

    // Register with the global audio unlock system
    audioUnlock.registerAudioContext(this.ctx);

    // Build master bus: categoryGains → compressor → limiter → masterGain → destination
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.prefs.masterVolume * 0.5, this.ctx.currentTime);

    this.limiter = this.ctx.createWaveShaper();
    this.limiter.curve = getSoftClipCurve();
    this.limiter.oversample = '2x';

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-24, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.1, this.ctx.currentTime);

    // Wire: compressor → limiter → masterGain → destination
    this.compressor.connect(this.limiter);
    this.limiter.connect(this.masterGain);

    // Connect the visualizer to the master output
    connectVisualizer(this.ctx, this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Create per‑category submix gains
    const categories: SoundCategory[] = [
      'notification', 'achievement', 'social', 'pipeline', 'micro', 'ambient',
    ];
    for (const cat of categories) {
      const gain = this.ctx.createGain();
      const catPrefs = this.prefs.categories[cat];
      gain.gain.setValueAtTime(
        catPrefs.enabled ? catPrefs.volume : 0,
        this.ctx.currentTime,
      );
      gain.connect(this.compressor);
      this.categoryGains.set(cat, gain);
    }

    return this.ctx;
  }

  // -----------------------------------------------------------------------
  // Preference management
  // -----------------------------------------------------------------------

  private loadPrefs(): SoundPreferences {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
      }
    } catch { /* use defaults */ }
    return { ...DEFAULT_PREFS };
  }

  private savePrefs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.prefs));
    } catch { /* non‑critical */ }
  }

  private isMasterMuted(): boolean {
    try {
      const val = localStorage.getItem(MASTER_MUTE_KEY);
      // Default ON: null means enabled
      return val === 'false';
    } catch {
      return false;
    }
  }

  private isQuietHours(): boolean {
    if (!this.prefs.quietHoursStart || !this.prefs.quietHoursEnd) return false;
    const now = new Date();
    const current = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const start = this.prefs.quietHoursStart;
    const end = this.prefs.quietHoursEnd;
    if (start > end) return current >= start || current <= end;
    return current >= start && current <= end;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Play a sound by ID. Respects preferences, quiet hours, and scheduling. */
  play(soundId: string): void {
    if (this.isMasterMuted()) return;
    if (this.isQuietHours()) {
      // Allow only P5 (critical) during quiet hours
      const def = SOUND_CATALOG[soundId];
      if (!def || def.priority < 5) return;
    }

    const def = SOUND_CATALOG[soundId];
    if (!def) return;

    // Check category enabled
    const catPrefs = this.prefs.categories[def.category];
    if (!catPrefs?.enabled) {
      // In 'balanced' or 'minimal' preset, respect enabled categories
      const presetCats = PRESET_CATEGORIES[this.prefs.preset];
      if (!presetCats.includes(def.category)) return;
    }

    // Haptic sync: fire 50ms before audio
    if (def.haptic && this.hapticFn) {
      this.hapticFn(def.haptic);
    }

    // Schedule through priority queue
    this.scheduler.schedule(soundId, def.priority, def.category);
  }

  /** Preview a sound (bypasses quiet hours and mute for settings UI). */
  preview(soundId: string): void {
    this.synthesize(soundId);
  }

  /**
   * Play a user's unique Sonic DNA signature.
   * Each user ID produces a deterministic, unique two-note chime.
   */
  playUserSignature(userId: string, gain: number = 0.08): void {
    if (this.isMasterMuted() || this.isQuietHours()) return;
    try {
      const ctx = this.ensureContext();
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const catGain = this.categoryGains.get('social');
      if (!catGain) return;
      const profile = getSonicDNA(userId);
      playSonicDNA(ctx, catGain, profile, gain);
    } catch { /* non-critical */ }
  }

  /** Stop a continuous/looping sound. */
  stopContinuous(soundId: string): void {
    const active = this.activeContinuous.get(soundId);
    if (active) {
      active.stop();
      this.activeContinuous.delete(soundId);
    }
  }

  /** Set master volume 0‑1. */
  setMasterVolume(vol: number): void {
    this.prefs.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.prefs.masterVolume * 0.5,
        this.ctx.currentTime,
        0.05,
      );
    }
    this.savePrefs();
  }

  /** Enable/disable a sound category. */
  setCategoryEnabled(category: SoundCategory, enabled: boolean): void {
    this.prefs.categories[category].enabled = enabled;
    const gain = this.categoryGains.get(category);
    if (gain && this.ctx) {
      gain.gain.setTargetAtTime(
        enabled ? this.prefs.categories[category].volume : 0,
        this.ctx.currentTime,
        0.05,
      );
    }
    this.savePrefs();
  }

  /** Set a category's volume 0‑1. */
  setCategoryVolume(category: SoundCategory, vol: number): void {
    this.prefs.categories[category].volume = Math.max(0, Math.min(1, vol));
    const gain = this.categoryGains.get(category);
    if (gain && this.ctx && this.prefs.categories[category].enabled) {
      gain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
    }
    this.savePrefs();
  }

  /** Switch preset. */
  setPreset(preset: SoundPreset): void {
    this.prefs.preset = preset;
    const enabledCats = PRESET_CATEGORIES[preset];
    const allCats: SoundCategory[] = ['notification', 'achievement', 'social', 'pipeline', 'micro', 'ambient'];
    for (const cat of allCats) {
      this.setCategoryEnabled(cat, enabledCats.includes(cat));
    }
    this.savePrefs();
  }

  /** Get current preferences (read‑only copy). */
  getPreferences(): Readonly<SoundPreferences> {
    return { ...this.prefs };
  }

  /** Update multiple preferences at once. */
  updatePreferences(update: Partial<SoundPreferences>): void {
    if (update.masterVolume !== undefined) this.setMasterVolume(update.masterVolume);
    if (update.preset !== undefined) this.setPreset(update.preset);
    if (update.quietHoursStart !== undefined) this.prefs.quietHoursStart = update.quietHoursStart;
    if (update.quietHoursEnd !== undefined) this.prefs.quietHoursEnd = update.quietHoursEnd;
    if (update.radioDucking !== undefined) this.prefs.radioDucking = update.radioDucking;
    if (update.duckingAmount !== undefined) this.prefs.duckingAmount = update.duckingAmount;
    if (update.categories) {
      for (const [cat, val] of Object.entries(update.categories)) {
        if (val.enabled !== undefined) this.setCategoryEnabled(cat as SoundCategory, val.enabled);
        if (val.volume !== undefined) this.setCategoryVolume(cat as SoundCategory, val.volume);
      }
    }
    this.savePrefs();
  }

  /** Provide a reference to the radio player's HTMLAudioElement for ducking. */
  setRadioAudioRef(el: HTMLAudioElement | null): void {
    this.radioRef = el;
  }

  /** Provide a haptic callback (called 50ms before audio). */
  setHapticFn(fn: HapticFn): void {
    this.hapticFn = fn;
  }

  // -----------------------------------------------------------------------
  // Internal synthesis
  // -----------------------------------------------------------------------

  private synthesize(soundId: string): void {
    const def = SOUND_CATALOG[soundId];
    if (!def) return;

    try {
      const ctx = this.ensureContext();

      // Resume if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Get the category submix gain node
      const catGain = this.categoryGains.get(def.category);
      if (!catGain) return;

      // Reduced motion: simplify to single‑shot, shorter duration
      const effectiveDef = this.prefersReducedMotion
        ? this.simplifyForAccessibility(def)
        : def;

      // Duck radio if needed
      if (this.prefs.radioDucking && this.radioRef) {
        this.duckRadio(effectiveDef);
      }

      if (effectiveDef.sequence && effectiveDef.notes) {
        // Multi‑note sequence — use sample‑accurate scheduling
        for (const note of effectiveDef.notes) {
          // Apply active sound theme overrides to each note
          const themedParams = applyTheme(note.params || {});
          if (note.delayMs === 0) {
            QuantumTimbre.synthesize(ctx, catGain, themedParams);
          } else {
            setTimeout(() => {
              if (ctx.state !== 'closed') {
                QuantumTimbre.synthesize(ctx, catGain, themedParams);
              }
            }, note.delayMs);
          }
        }
      } else if (effectiveDef.continuous) {
        // Continuous ambient sound (themes don't apply to ambient)
        const result = QuantumTimbre.synthesize(ctx, catGain, effectiveDef.params);
        this.activeContinuous.set(soundId, result);
      } else {
        // Single‑shot sound — apply active theme overrides
        const themedParams = applyTheme(effectiveDef.params || {});
        QuantumTimbre.synthesize(ctx, catGain, themedParams);
      }
    } catch {
      // Audio failures are non‑critical — never break the app
    }
  }

  private simplifyForAccessibility(def: SoundDef): SoundDef {
    if (def.sequence && def.notes && def.notes.length > 0) {
      // Reduce to single note — the first one with shorter duration
      return {
        ...def,
        sequence: false,
        notes: undefined,
        params: {
          ...def.notes[0].params,
          decayMs: 60,
          releaseMs: 60,
          numPartials: 0,
          reverbDuration: 0,
        },
      };
    }
    return def;
  }

  private duckRadio(def: SoundDef): void {
    const el = this.radioRef;
    if (!el || el.paused) return;

    // Calculate approximate sound duration
    let durationMs = 300;
    if (def.sequence && def.notes) {
      const lastNote = def.notes[def.notes.length - 1];
      durationMs = lastNote.delayMs + 400; // last note offset + ~400ms for its envelope
    } else if (def.params) {
      durationMs = (def.params.attackMs || 80) + (def.params.decayMs || 200) + (def.params.releaseMs || 150);
    }

    const targetVolume = el.volume * (1 - this.prefs.duckingAmount);

    if (this.radioDuckTimer) clearTimeout(this.radioDuckTimer);

    // Store original volume only if not already ducked
    if (this.radioOriginalVolume === null) {
      this.radioOriginalVolume = el.volume;
    }

    // Ramp down over 50ms
    const steps = 5;
    const rampDownStep = (this.radioOriginalVolume - targetVolume) / steps;
    let step = 0;
    const rampDown = setInterval(() => {
      step++;
      el.volume = Math.max(targetVolume, this.radioOriginalVolume! - rampDownStep * step);
      if (step >= steps) clearInterval(rampDown);
    }, 10);

    // Restore after sound
    this.radioDuckTimer = setTimeout(() => {
      const origVol = this.radioOriginalVolume ?? 1;
      let restoreStep = 0;
      const rampUp = setInterval(() => {
        restoreStep++;
        el.volume = Math.min(origVol, targetVolume + (origVol - targetVolume) * (restoreStep / 10));
        if (restoreStep >= 10) {
          clearInterval(rampUp);
          this.radioOriginalVolume = null;
        }
      }, 30);
    }, durationMs + 100);
  }
}

// ---------------------------------------------------------------------------
// Export singleton
// ---------------------------------------------------------------------------

export const quantumSoundEngine = new QuantumSoundEngineImpl();

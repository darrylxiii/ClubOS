/**
 * QuantumTimbre — The Quantum Club's signature synthesis engine.
 *
 * Every sound on the platform derives from this single "Probability Chimes" technique:
 *   carrier (filtered triangle) + FM modulator + N randomised detuned partials
 *   + optional noise‑burst onset + glass‑resonance bandpass + convolution reverb.
 *
 * All frequencies are rooted in F# Lydian (F#‑G#‑A#‑B#‑C#‑D#‑E#).
 * The probability partials shift +/‑ 5‑15 cents on every call — the sound is
 * never exactly the same twice, like a quantum measurement.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimbreParams {
  /** Carrier fundamental in Hz */
  frequency: number;
  /** FM modulation depth 0‑1 (0 = pure carrier, 1 = aggressive metallic) */
  modIndex: number;
  /** How many probability partials (0‑6) */
  numPartials: number;
  /** Max random detune per partial in cents */
  detuneRange: number;
  /** Attack time ms */
  attackMs: number;
  /** Decay time ms */
  decayMs: number;
  /** Sustain level 0‑1 */
  sustainLevel: number;
  /** Release time ms */
  releaseMs: number;
  /** Duration of filtered‑noise onset burst ms (0 = none) */
  noiseOnsetMs: number;
  /** Glass‑resonance bandpass center Hz */
  filterCenter: number;
  /** Glass‑resonance bandpass Q */
  filterQ: number;
  /** Convolution reverb impulse duration s (0 = dry) */
  reverbDuration: number;
  /** Reverb decay constant s */
  reverbDecay: number;
  /** Stereo pan −0.15 … +0.15 */
  pan: number;
  /** Peak gain (will be ramped via envelope) */
  gain: number;
  /** Oscillator waveform for carrier */
  carrierType?: OscillatorType;
  /** FM modulator frequency ratio relative to carrier */
  modRatio?: number;
}

export const DEFAULT_PARAMS: TimbreParams = {
  frequency: 370, // F#4
  modIndex: 0.2,
  numPartials: 3,
  detuneRange: 10,
  attackMs: 80,
  decayMs: 200,
  sustainLevel: 0.3,
  releaseMs: 150,
  noiseOnsetMs: 15,
  filterCenter: 3000,
  filterQ: 2.5,
  reverbDuration: 0,
  reverbDecay: 0.15,
  pan: 0,
  gain: 0.08,
  carrierType: 'triangle',
  modRatio: 1.5,
};

// ---------------------------------------------------------------------------
// Impulse response cache (one per unique duration+decay pair)
// ---------------------------------------------------------------------------

const impulseCache = new Map<string, AudioBuffer>();

function getOrCreateImpulse(
  ctx: AudioContext,
  duration: number,
  decay: number,
): AudioBuffer {
  const key = `${duration}:${decay}`;
  const cached = impulseCache.get(key);
  if (cached && cached.sampleRate === ctx.sampleRate) return cached;

  const length = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] =
        (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * decay));
    }
  }
  impulseCache.set(key, buffer);
  return buffer;
}

// ---------------------------------------------------------------------------
// Soft‑clipper curve (tanh) for WaveShaperNode
// ---------------------------------------------------------------------------

let tanhCurve: Float32Array | null = null;

export function getSoftClipCurve(): Float32Array {
  if (tanhCurve) return tanhCurve;
  const n = 8192;
  tanhCurve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    tanhCurve[i] = Math.tanh(x);
  }
  return tanhCurve;
}

// ---------------------------------------------------------------------------
// QuantumTimbre class
// ---------------------------------------------------------------------------

export class QuantumTimbre {
  /**
   * Synthesise one "probability chime" and connect it to `destination`.
   * Returns the total duration in seconds so the caller can schedule cleanup.
   */
  static synthesize(
    ctx: AudioContext,
    destination: AudioNode,
    overrides: Partial<TimbreParams> = {},
  ): { durationSec: number; stop: () => void } {
    const p: TimbreParams = { ...DEFAULT_PARAMS, ...overrides };
    const now = ctx.currentTime;
    const nodes: AudioNode[] = [];

    // Total envelope duration in seconds
    const totalSec =
      (p.attackMs + p.decayMs + p.releaseMs) / 1000;

    // ---- Optional convolution reverb node ----
    let reverbNode: ConvolverNode | null = null;
    if (p.reverbDuration > 0) {
      reverbNode = ctx.createConvolver();
      reverbNode.buffer = getOrCreateImpulse(
        ctx,
        p.reverbDuration,
        p.reverbDecay,
      );
      nodes.push(reverbNode);
    }

    // ---- Stereo panner ----
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(p.pan, now);
    nodes.push(panner);

    // ---- Glass resonance bandpass ----
    const glassFilter = ctx.createBiquadFilter();
    glassFilter.type = 'bandpass';
    glassFilter.frequency.setValueAtTime(p.filterCenter, now);
    glassFilter.Q.setValueAtTime(p.filterQ, now);
    nodes.push(glassFilter);

    // ---- ADSR gain envelope ----
    const envGain = ctx.createGain();
    envGain.gain.setValueAtTime(0, now);
    // Attack
    envGain.gain.linearRampToValueAtTime(p.gain, now + p.attackMs / 1000);
    // Decay → sustain
    envGain.gain.linearRampToValueAtTime(
      p.gain * p.sustainLevel,
      now + (p.attackMs + p.decayMs) / 1000,
    );
    // Release → near‑zero (avoid discontinuity — ramp to 0.0001, then set 0)
    const releaseStart = now + (p.attackMs + p.decayMs) / 1000;
    envGain.gain.setValueAtTime(p.gain * p.sustainLevel, releaseStart);
    envGain.gain.exponentialRampToValueAtTime(
      0.0001,
      releaseStart + p.releaseMs / 1000,
    );
    envGain.gain.setValueAtTime(0, releaseStart + p.releaseMs / 1000 + 0.001);
    nodes.push(envGain);

    // Wire: envGain → glassFilter → panner → reverb? → destination
    envGain.connect(glassFilter);
    glassFilter.connect(panner);
    if (reverbNode) {
      // Dry/wet mix: 70% dry, 30% wet
      const dryGain = ctx.createGain();
      dryGain.gain.setValueAtTime(0.7, now);
      const wetGain = ctx.createGain();
      wetGain.gain.setValueAtTime(0.3, now);
      nodes.push(dryGain, wetGain);

      panner.connect(dryGain);
      panner.connect(reverbNode);
      reverbNode.connect(wetGain);
      dryGain.connect(destination);
      wetGain.connect(destination);
    } else {
      panner.connect(destination);
    }

    // ---- FM Modulator ----
    const modFreq = p.frequency * (p.modRatio ?? 1.5);
    const modOsc = ctx.createOscillator();
    modOsc.type = 'sine';
    modOsc.frequency.setValueAtTime(modFreq, now);
    const modDepth = ctx.createGain();
    // Modulation depth in Hz — higher modIndex = brighter/more metallic
    modDepth.gain.setValueAtTime(p.frequency * p.modIndex, now);
    modOsc.connect(modDepth);
    nodes.push(modOsc, modDepth);

    // ---- Carrier ----
    const carrier = ctx.createOscillator();
    carrier.type = p.carrierType ?? 'triangle';
    carrier.frequency.setValueAtTime(p.frequency, now);
    // FM: modulator output → carrier frequency
    modDepth.connect(carrier.frequency);
    carrier.connect(envGain);
    nodes.push(carrier);

    // ---- Probability Partials (randomised detuned sines) ----
    const partials: OscillatorNode[] = [];
    for (let i = 0; i < p.numPartials; i++) {
      const partial = ctx.createOscillator();
      partial.type = 'sine';
      // Harmonic ratio: 1, 2, 3… but detuned randomly
      const harmonicRatio = i + 2; // starts at 2nd harmonic
      const detuneAmount =
        (Math.random() * 2 - 1) * p.detuneRange; // ±detuneRange cents
      partial.frequency.setValueAtTime(p.frequency * harmonicRatio, now);
      partial.detune.setValueAtTime(detuneAmount, now);

      // Partials are quieter — drop by 6dB per harmonic
      const partialGain = ctx.createGain();
      const partialLevel = 0.15 / harmonicRatio;
      partialGain.gain.setValueAtTime(partialLevel, now);
      partial.connect(partialGain);
      partialGain.connect(envGain);

      partial.start(now);
      partial.stop(now + totalSec + 0.01);
      partials.push(partial);
      nodes.push(partial, partialGain);
    }

    // ---- Noise onset burst ----
    if (p.noiseOnsetMs > 0) {
      const bufferSize = Math.ceil(ctx.sampleRate * (p.noiseOnsetMs / 1000));
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      // Bandpass the noise around the carrier frequency
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(p.frequency * 2, now);
      noiseFilter.Q.setValueAtTime(1.5, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(p.gain * 0.4, now);
      noiseGain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + p.noiseOnsetMs / 1000,
      );

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(envGain);
      noiseSource.start(now);
      nodes.push(noiseFilter, noiseGain);
    }

    // ---- Schedule start / stop ----
    modOsc.start(now);
    carrier.start(now);
    modOsc.stop(now + totalSec + 0.02);
    carrier.stop(now + totalSec + 0.02);

    const stop = () => {
      try {
        const t = ctx.currentTime;
        envGain.gain.cancelScheduledValues(t);
        envGain.gain.setValueAtTime(envGain.gain.value, t);
        envGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      } catch {
        // already stopped
      }
    };

    return { durationSec: totalSec + (p.reverbDuration || 0), stop };
  }
}

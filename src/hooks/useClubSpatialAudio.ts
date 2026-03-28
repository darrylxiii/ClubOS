import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Club spatial audio — transforms flat stereo into an immersive 3D room.
 *
 * Uses HRTF PannerNode to position the DJ ahead of the listener,
 * ConvolverNode for room reverb, and optional crowd ambience panned around.
 *
 * Three room modes:
 * - intimate: Small club, close to the DJ, dry sound
 * - club: Medium room, balanced reverb, standard distance
 * - arena: Large venue, heavy reverb, distant and epic
 */

type RoomMode = 'intimate' | 'club' | 'arena';

interface ClubSpatialAudioState {
  isEnabled: boolean;
  isSupported: boolean;
  roomMode: RoomMode;
}

const ROOM_PRESETS: Record<RoomMode, { decay: number; wetMix: number; distance: number; label: string }> = {
  intimate: { decay: 0.4, wetMix: 0.10, distance: 2,  label: 'Intimate' },
  club:     { decay: 0.8, wetMix: 0.22, distance: 5,  label: 'Club' },
  arena:    { decay: 1.5, wetMix: 0.40, distance: 12, label: 'Arena' },
};

function makeImpulse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * duration);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (rate * decay));
    }
  }
  return buf;
}

export function useClubSpatialAudio() {
  const [state, setState] = useState<ClubSpatialAudioState>({
    isEnabled: false,
    isSupported: typeof AudioContext !== 'undefined',
    roomMode: 'club',
  });

  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const pannerRef = useRef<PannerNode | null>(null);
  const convolverRef = useRef<ConvolverNode | null>(null);
  const dryRef = useRef<GainNode | null>(null);
  const wetRef = useRef<GainNode | null>(null);

  const enable = useCallback((audioEl: HTMLAudioElement, roomMode?: RoomMode) => {
    if (ctxRef.current) return; // Already enabled

    try {
      const mode = roomMode || state.roomMode;
      const preset = ROOM_PRESETS[mode];
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(audioEl);

      // HRTF Panner — DJ positioned ahead
      const panner = new PannerNode(ctx, {
        panningModel: 'HRTF',
        distanceModel: 'inverse',
        refDistance: 1,
        maxDistance: 100,
        rolloffFactor: 1,
        positionX: 0,
        positionY: 0.5,
        positionZ: -preset.distance,
      });

      // Reverb
      const convolver = ctx.createConvolver();
      convolver.buffer = makeImpulse(ctx, 2.5, preset.decay);

      const dry = ctx.createGain();
      dry.gain.value = 1 - preset.wetMix;
      const wet = ctx.createGain();
      wet.gain.value = preset.wetMix;

      // Wire: source → panner → [dry → dest] + [convolver → wet → dest]
      source.connect(panner);
      panner.connect(dry);
      dry.connect(ctx.destination);
      panner.connect(convolver);
      convolver.connect(wet);
      wet.connect(ctx.destination);

      ctxRef.current = ctx;
      sourceRef.current = source;
      pannerRef.current = panner;
      convolverRef.current = convolver;
      dryRef.current = dry;
      wetRef.current = wet;

      setState((prev) => ({ ...prev, isEnabled: true, roomMode: mode }));
    } catch (err) {
      console.warn('Spatial audio init failed:', err);
    }
  }, [state.roomMode]);

  const disable = useCallback(() => {
    if (!ctxRef.current) return;

    try {
      sourceRef.current?.disconnect();
      pannerRef.current?.disconnect();
      convolverRef.current?.disconnect();
      dryRef.current?.disconnect();
      wetRef.current?.disconnect();
      // Reconnect source directly
      sourceRef.current?.connect(ctxRef.current.destination);
    } catch {}

    ctxRef.current.close().catch(() => {});
    ctxRef.current = null;
    sourceRef.current = null;

    setState((prev) => ({ ...prev, isEnabled: false }));
  }, []);

  const toggle = useCallback((audioEl: HTMLAudioElement) => {
    if (state.isEnabled) disable();
    else enable(audioEl);
  }, [state.isEnabled, enable, disable]);

  const setRoomMode = useCallback((mode: RoomMode) => {
    const preset = ROOM_PRESETS[mode];
    setState((prev) => ({ ...prev, roomMode: mode }));

    if (ctxRef.current && convolverRef.current && pannerRef.current) {
      convolverRef.current.buffer = makeImpulse(ctxRef.current, 2.5, preset.decay);
      if (dryRef.current) dryRef.current.gain.value = 1 - preset.wetMix;
      if (wetRef.current) wetRef.current.gain.value = preset.wetMix;
      pannerRef.current.positionZ.value = -preset.distance;
    }
  }, []);

  useEffect(() => {
    return () => { ctxRef.current?.close().catch(() => {}); };
  }, []);

  return { ...state, enable, disable, toggle, setRoomMode, roomPresets: ROOM_PRESETS };
}

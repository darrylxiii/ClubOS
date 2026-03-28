import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * MIDI control data from the XDJ-AZ (or any MIDI DJ controller).
 * Values are normalized 0-1 unless noted.
 */
export interface DJControlState {
  crossfader: number;     // 0 = Deck A, 1 = Deck B
  volumeA: number;        // Deck A channel fader
  volumeB: number;        // Deck B channel fader
  eqHighA: number;        // Deck A treble
  eqMidA: number;         // Deck A mid
  eqLowA: number;         // Deck A bass
  eqHighB: number;
  eqMidB: number;
  eqLowB: number;
  filterA: number;        // Deck A filter (0.5 = center)
  filterB: number;
  isPlayingA: boolean;
  isPlayingB: boolean;
  bpmA: number;           // Raw BPM value (0-300)
  bpmB: number;
}

const DEFAULT_STATE: DJControlState = {
  crossfader: 0.5,
  volumeA: 0.75, volumeB: 0.75,
  eqHighA: 0.5, eqMidA: 0.5, eqLowA: 0.5,
  eqHighB: 0.5, eqMidB: 0.5, eqLowB: 0.5,
  filterA: 0.5, filterB: 0.5,
  isPlayingA: false, isPlayingB: false,
  bpmA: 0, bpmB: 0,
};

// Common Pioneer/AlphaTheta MIDI CC mappings (varies by model)
// These will need calibration per device — these are best-guess defaults
const CC_MAP: Record<number, keyof DJControlState> = {
  // Crossfader
  31: 'crossfader',
  // Channel faders (Deck A = CH1, Deck B = CH2)
  19: 'volumeA',
  23: 'volumeB',
  // EQ High
  7: 'eqHighA',
  11: 'eqHighB',
  // EQ Mid
  8: 'eqMidA',
  12: 'eqMidB',
  // EQ Low
  9: 'eqLowA',
  13: 'eqLowB',
  // Filter
  22: 'filterA',
  26: 'filterB',
};

/**
 * Captures MIDI messages from a connected DJ controller and:
 * 1. Updates local state for DJ's own UI
 * 2. Broadcasts control state to listeners via Supabase Realtime
 */
export function useWebMIDI(sessionId?: string | null) {
  const [controls, setControls] = useState<DJControlState>(DEFAULT_STATE);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<any>(null);
  const lastBroadcast = useRef(0);

  // Set up broadcast channel for sharing controls with listeners
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase.channel(`dj-controls-${sessionId}`);
    channel.subscribe();
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  // Broadcast control state to listeners (throttled to 15fps)
  const broadcastControls = useCallback((state: DJControlState) => {
    const now = Date.now();
    if (now - lastBroadcast.current < 66) return; // ~15fps
    lastBroadcast.current = now;

    channelRef.current?.send({
      type: 'broadcast',
      event: 'controls',
      payload: state,
    });
  }, []);

  // Connect to MIDI
  useEffect(() => {
    if (!navigator.requestMIDIAccess) {
      console.warn('Web MIDI API not supported');
      return;
    }

    let cleanup: (() => void) | null = null;

    navigator.requestMIDIAccess({ sysex: false })
      .then((midiAccess) => {
        const handleMessage = (event: MIDIMessageEvent) => {
          const [status, data1, data2] = event.data!;
          const messageType = status & 0xf0;
          const value = data2 / 127; // Normalize to 0-1

          if (messageType === 0xb0) {
            // Control Change
            const control = CC_MAP[data1];
            if (control) {
              setControls((prev) => {
                const next = { ...prev, [control]: value };
                broadcastControls(next);
                return next;
              });
            }
          } else if (messageType === 0x90) {
            // Note On — detect play buttons
            // Pioneer typically uses note 11 (play/pause) on different channels
            const channel = status & 0x0f;
            if (data1 === 11 || data1 === 0x0b) {
              if (channel === 0) {
                setControls((prev) => {
                  const next = { ...prev, isPlayingA: data2 > 0 };
                  broadcastControls(next);
                  return next;
                });
              } else if (channel === 1) {
                setControls((prev) => {
                  const next = { ...prev, isPlayingB: data2 > 0 };
                  broadcastControls(next);
                  return next;
                });
              }
            }
          }
        };

        // Find and connect to DJ controller
        for (const input of midiAccess.inputs.values()) {
          const name = input.name || '';
          // Match common DJ controller names
          if (
            name.includes('XDJ') ||
            name.includes('DDJ') ||
            name.includes('CDJ') ||
            name.includes('DJM') ||
            name.includes('Pioneer') ||
            name.includes('AlphaTheta') ||
            name.includes('MIDI')
          ) {
            input.onmidimessage = handleMessage;
            setDeviceName(name);
            setIsConnected(true);
            break;
          }
        }

        // Also listen for new devices
        midiAccess.onstatechange = () => {
          for (const input of midiAccess.inputs.values()) {
            if (input.state === 'connected' && !isConnected) {
              input.onmidimessage = handleMessage;
              setDeviceName(input.name || 'Unknown MIDI');
              setIsConnected(true);
              break;
            }
          }
        };

        cleanup = () => {
          for (const input of midiAccess.inputs.values()) {
            input.onmidimessage = null;
          }
        };
      })
      .catch((err) => {
        console.warn('MIDI access denied:', err);
      });

    return () => {
      cleanup?.();
    };
  }, [broadcastControls, isConnected]);

  return {
    controls,
    deviceName,
    isConnected,
  };
}

/**
 * Receives DJ control state as a listener (subscribes to broadcast).
 */
export function useDJControlsListener(sessionId?: string | null) {
  const [controls, setControls] = useState<DJControlState>(DEFAULT_STATE);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase.channel(`dj-controls-listener-${sessionId}`);
    channel
      .on('broadcast', { event: 'controls' }, ({ payload }) => {
        setControls(payload as DJControlState);
        setHasData(true);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  return { controls, hasData };
}

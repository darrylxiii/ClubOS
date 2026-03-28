import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioDevice {
  deviceId: string;
  label: string;
}

export interface AudioAnalysis {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  bass: number;   // 0-1
  mid: number;    // 0-1
  treble: number; // 0-1
  rms: number;    // 0-1
}

interface HardwareCaptureState {
  devices: AudioDevice[];
  selectedDeviceId: string | null;
  isCapturing: boolean;
  stream: MediaStream | null;
  analysis: AudioAnalysis | null;
  error: string | null;
}

/**
 * Captures audio from a USB audio device (e.g., XDJ-AZ) and provides:
 * - Device enumeration and selection
 * - MediaStream for LiveKit publishing
 * - Real-time frequency analysis for visualization
 * - Web Audio API pipeline with AnalyserNode
 */
export function useHardwareCapture() {
  const [state, setState] = useState<HardwareCaptureState>({
    devices: [],
    selectedDeviceId: null,
    isCapturing: false,
    stream: null,
    analysis: null,
    error: null,
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const rafRef = useRef<number>(0);
  const frequencyDataRef = useRef<Uint8Array | null>(null);
  const timeDomainDataRef = useRef<Uint8Array | null>(null);

  // ── Enumerate audio input devices ────────────────────────────────────────
  const refreshDevices = useCallback(async () => {
    try {
      // Need to request permission first to get labels
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      tempStream.getTracks().forEach((t) => t.stop());

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices
        .filter((d) => d.kind === 'audioinput' && d.deviceId !== 'default')
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `Audio Input ${d.deviceId.slice(0, 8)}` }));

      setState((prev) => ({ ...prev, devices: audioInputs, error: null }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: 'Microphone permission denied. Please allow access to audio devices.',
      }));
    }
  }, []);

  // Listen for device changes (plug/unplug)
  useEffect(() => {
    const handler = () => { refreshDevices(); };
    navigator.mediaDevices.addEventListener('devicechange', handler);
    return () => navigator.mediaDevices.removeEventListener('devicechange', handler);
  }, [refreshDevices]);

  // ── Select device ────────────────────────────────────────────────────────
  const selectDevice = useCallback((deviceId: string) => {
    setState((prev) => ({ ...prev, selectedDeviceId: deviceId }));
  }, []);

  // ── Start capture ────────────────────────────────────────────────────────
  const startCapture = useCallback(async (deviceId?: string) => {
    const targetDevice = deviceId || state.selectedDeviceId;
    if (!targetDevice) {
      setState((prev) => ({ ...prev, error: 'No audio device selected' }));
      return null;
    }

    try {
      // Capture from the specific USB audio device
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: targetDevice },
          echoCancellation: false,   // CRITICAL: disable for music
          noiseSuppression: false,   // CRITICAL: disable for music
          autoGainControl: false,    // CRITICAL: disable for music
          sampleRate: 44100,
          channelCount: 2,
        },
      });

      // Set up Web Audio API pipeline
      const audioCtx = new AudioContext({ sampleRate: 44100 });
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      // Create a destination stream that LiveKit can publish
      const destination = audioCtx.createMediaStreamDestination();

      source.connect(analyser);
      analyser.connect(destination);

      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      sourceRef.current = source;
      destinationRef.current = destination;
      frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      timeDomainDataRef.current = new Uint8Array(analyser.fftSize);

      // Start analysis loop
      const analyse = () => {
        if (!analyserRef.current || !frequencyDataRef.current || !timeDomainDataRef.current) return;

        analyserRef.current.getByteFrequencyData(frequencyDataRef.current);
        analyserRef.current.getByteTimeDomainData(timeDomainDataRef.current);

        const bins = frequencyDataRef.current;
        const binCount = bins.length;

        // Split into frequency bands
        const bassEnd = Math.floor(binCount * 0.15);   // ~0-330 Hz
        const midEnd = Math.floor(binCount * 0.5);     // ~330-2.2 kHz

        let bassSum = 0, midSum = 0, trebleSum = 0, rmsSum = 0;
        for (let i = 0; i < binCount; i++) {
          const v = bins[i] / 255;
          if (i < bassEnd) bassSum += v;
          else if (i < midEnd) midSum += v;
          else trebleSum += v;
          rmsSum += v * v;
        }

        setState((prev) => ({
          ...prev,
          analysis: {
            frequencyData: new Uint8Array(frequencyDataRef.current!),
            timeDomainData: new Uint8Array(timeDomainDataRef.current!),
            bass: bassSum / bassEnd,
            mid: midSum / (midEnd - bassEnd),
            treble: trebleSum / (binCount - midEnd),
            rms: Math.sqrt(rmsSum / binCount),
          },
        }));

        rafRef.current = requestAnimationFrame(analyse);
      };
      analyse();

      setState((prev) => ({
        ...prev,
        selectedDeviceId: targetDevice,
        isCapturing: true,
        stream: destination.stream, // This is the processed stream for LiveKit
        error: null,
      }));

      return destination.stream;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to capture audio';
      setState((prev) => ({ ...prev, error: message }));
      return null;
    }
  }, [state.selectedDeviceId]);

  // ── Stop capture ─────────────────────────────────────────────────────────
  const stopCapture = useCallback(() => {
    cancelAnimationFrame(rafRef.current);

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (destinationRef.current) {
      destinationRef.current.disconnect();
      destinationRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }

    // Stop all tracks on the original input stream
    if (state.stream) {
      state.stream.getTracks().forEach((t) => t.stop());
    }

    setState((prev) => ({
      ...prev,
      isCapturing: false,
      stream: null,
      analysis: null,
    }));
  }, [state.stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  return {
    ...state,
    refreshDevices,
    selectDevice,
    startCapture,
    stopCapture,
    analyser: analyserRef.current,
  };
}

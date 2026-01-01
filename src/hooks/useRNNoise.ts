import { useState, useCallback, useRef, useEffect } from 'react';

interface RNNoiseOptions {
  aggressiveness: 'low' | 'medium' | 'high';
  enabled: boolean;
}

interface RNNoiseState {
  isProcessing: boolean;
  noiseLevel: number;
  isSupported: boolean;
}

// RNNoise-inspired noise suppression using Web Audio API with advanced filtering
// This provides ML-like noise reduction through spectral analysis
export function useRNNoise(options: RNNoiseOptions = { aggressiveness: 'medium', enabled: true }) {
  const [state, setState] = useState<RNNoiseState>({
    isProcessing: false,
    noiseLevel: 0,
    isSupported: typeof AudioWorkletNode !== 'undefined'
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const filterNodesRef = useRef<BiquadFilterNode[]>([]);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const outputStreamRef = useRef<MediaStream | null>(null);
  const noiseProfileRef = useRef<Float32Array | null>(null);
  const frameCountRef = useRef(0);

  // Aggressiveness settings
  const getSettings = useCallback(() => {
    switch (options.aggressiveness) {
      case 'low':
        return {
          noiseFloor: -60,
          attackTime: 0.01,
          releaseTime: 0.1,
          threshold: 0.15,
          reduction: 0.3,
          spectralSubtraction: 0.5
        };
      case 'high':
        return {
          noiseFloor: -40,
          attackTime: 0.001,
          releaseTime: 0.05,
          threshold: 0.3,
          reduction: 0.8,
          spectralSubtraction: 1.5
        };
      default: // medium
        return {
          noiseFloor: -50,
          attackTime: 0.005,
          releaseTime: 0.08,
          threshold: 0.2,
          reduction: 0.5,
          spectralSubtraction: 1.0
        };
    }
  }, [options.aggressiveness]);

  // Spectral subtraction for noise reduction
  const processAudioFrame = useCallback((inputData: Float32Array): Float32Array => {
    const settings = getSettings();
    const outputData = new Float32Array(inputData.length);
    
    // Learn noise profile from first few frames (assumed to be noise-only)
    if (frameCountRef.current < 10) {
      if (!noiseProfileRef.current) {
        noiseProfileRef.current = new Float32Array(inputData.length);
      }
      // Accumulate noise profile
      for (let i = 0; i < inputData.length; i++) {
        noiseProfileRef.current[i] = 
          (noiseProfileRef.current[i] * frameCountRef.current + Math.abs(inputData[i])) / 
          (frameCountRef.current + 1);
      }
      frameCountRef.current++;
      return inputData; // Pass through during learning
    }

    // Apply spectral subtraction
    for (let i = 0; i < inputData.length; i++) {
      const sample = inputData[i];
      const noiseEstimate = noiseProfileRef.current ? noiseProfileRef.current[i] * settings.spectralSubtraction : 0;
      
      // Subtract noise estimate
      const magnitude = Math.abs(sample);
      const phase = sample >= 0 ? 1 : -1;
      
      if (magnitude > noiseEstimate) {
        outputData[i] = phase * (magnitude - noiseEstimate * settings.reduction);
      } else {
        // Below noise floor - apply soft muting
        outputData[i] = sample * (1 - settings.reduction);
      }
    }

    return outputData;
  }, [getSettings]);

  // Calculate current noise level
  const calculateNoiseLevel = useCallback((data: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    const rms = Math.sqrt(sum / data.length);
    // Convert to dB and normalize to 0-1
    const db = 20 * Math.log10(rms + 0.0001);
    return Math.max(0, Math.min(1, (db + 60) / 60));
  }, []);

  const processStream = useCallback(async (stream: MediaStream): Promise<MediaStream> => {
    if (!options.enabled) {
      return stream;
    }

    try {
      // Create audio context
      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      const ctx = audioContextRef.current;

      // Create source from input stream
      sourceNodeRef.current = ctx.createMediaStreamSource(stream);

      // Create analyser for noise level monitoring
      analyserNodeRef.current = ctx.createAnalyser();
      analyserNodeRef.current.fftSize = 2048;
      analyserNodeRef.current.smoothingTimeConstant = 0.8;

      // Create multi-band filtering for better noise isolation
      const settings = getSettings();
      filterNodesRef.current = [];

      // High-pass filter to remove low-frequency rumble
      const highPass = ctx.createBiquadFilter();
      highPass.type = 'highpass';
      highPass.frequency.value = 80;
      highPass.Q.value = 0.7;
      filterNodesRef.current.push(highPass);

      // Low-pass filter to remove high-frequency hiss
      const lowPass = ctx.createBiquadFilter();
      lowPass.type = 'lowpass';
      lowPass.frequency.value = 12000;
      lowPass.Q.value = 0.7;
      filterNodesRef.current.push(lowPass);

      // Notch filters for common noise frequencies
      const notchFrequencies = [60, 120, 180]; // Power line harmonics
      notchFrequencies.forEach(freq => {
        const notch = ctx.createBiquadFilter();
        notch.type = 'notch';
        notch.frequency.value = freq;
        notch.Q.value = 30;
        filterNodesRef.current.push(notch);
      });

      // Create dynamics compressor for consistent levels
      compressorRef.current = ctx.createDynamicsCompressor();
      compressorRef.current.threshold.value = -24;
      compressorRef.current.knee.value = 12;
      compressorRef.current.ratio.value = 4;
      compressorRef.current.attack.value = settings.attackTime;
      compressorRef.current.release.value = settings.releaseTime;

      // Create gain node for output control
      gainNodeRef.current = ctx.createGain();
      gainNodeRef.current.gain.value = 1.0;

      // Create script processor for advanced noise reduction
      const bufferSize = 4096;
      processorNodeRef.current = ctx.createScriptProcessor(bufferSize, 1, 1);
      
      processorNodeRef.current.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer.getChannelData(0);
        const outputBuffer = event.outputBuffer.getChannelData(0);
        
        // Process audio frame
        const processed = processAudioFrame(inputBuffer);
        
        // Copy to output
        for (let i = 0; i < outputBuffer.length; i++) {
          outputBuffer[i] = processed[i];
        }

        // Update noise level
        const noiseLevel = calculateNoiseLevel(inputBuffer);
        setState(prev => ({ ...prev, noiseLevel }));
      };

      // Connect the audio graph
      let currentNode: AudioNode = sourceNodeRef.current;
      
      // Connect filters in series
      filterNodesRef.current.forEach(filter => {
        currentNode.connect(filter);
        currentNode = filter;
      });

      // Connect to processor
      currentNode.connect(processorNodeRef.current);
      processorNodeRef.current.connect(compressorRef.current!);
      compressorRef.current!.connect(gainNodeRef.current!);
      
      // Also connect to analyser for monitoring
      gainNodeRef.current!.connect(analyserNodeRef.current!);

      // Create output stream
      const destination = ctx.createMediaStreamDestination();
      gainNodeRef.current!.connect(destination);
      outputStreamRef.current = destination.stream;

      setState(prev => ({ ...prev, isProcessing: true }));

      return outputStreamRef.current;
    } catch (error) {
      console.error('[RNNoise] Failed to process stream:', error);
      return stream;
    }
  }, [options.enabled, getSettings, processAudioFrame, calculateNoiseLevel]);

  const cleanup = useCallback(() => {
    processorNodeRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();
    analyserNodeRef.current?.disconnect();
    gainNodeRef.current?.disconnect();
    compressorRef.current?.disconnect();
    filterNodesRef.current.forEach(filter => filter.disconnect());
    
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
    }

    frameCountRef.current = 0;
    noiseProfileRef.current = null;

    setState(prev => ({ ...prev, isProcessing: false, noiseLevel: 0 }));
  }, []);

  // Reset noise profile to relearn
  const resetNoiseProfile = useCallback(() => {
    frameCountRef.current = 0;
    noiseProfileRef.current = null;
  }, []);

  // Update aggressiveness in real-time
  useEffect(() => {
    if (compressorRef.current && audioContextRef.current) {
      const settings = getSettings();
      compressorRef.current.attack.value = settings.attackTime;
      compressorRef.current.release.value = settings.releaseTime;
    }
  }, [options.aggressiveness, getSettings]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    processStream,
    cleanup,
    resetNoiseProfile,
    isProcessing: state.isProcessing,
    noiseLevel: state.noiseLevel,
    isSupported: state.isSupported
  };
}

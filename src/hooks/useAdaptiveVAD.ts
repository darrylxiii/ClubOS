import { useState, useCallback, useRef, useEffect } from 'react';

interface AdaptiveVADOptions {
  enabled: boolean;
  initialThreshold?: number;
  minThreshold?: number;
  maxThreshold?: number;
  adaptationRate?: number;
  holdTime?: number; // ms to hold speaking state after voice stops
  calibrationTime?: number; // ms to calibrate ambient noise
}

interface VADState {
  isSpeaking: boolean;
  audioLevel: number;
  ambientLevel: number;
  threshold: number;
  isCalibrating: boolean;
  isCalibrated: boolean;
}

// Adaptive Voice Activity Detection with dynamic threshold based on ambient noise
export function useAdaptiveVAD(options: AdaptiveVADOptions = { enabled: true }) {
  const {
    enabled = true,
    initialThreshold = 0.015,
    minThreshold = 0.005,
    maxThreshold = 0.1,
    adaptationRate = 0.02,
    holdTime = 300,
    calibrationTime = 2000
  } = options;

  const [state, setState] = useState<VADState>({
    isSpeaking: false,
    audioLevel: 0,
    ambientLevel: 0,
    threshold: initialThreshold,
    isCalibrating: false,
    isCalibrated: false
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const calibrationSamplesRef = useRef<number[]>([]);
  const calibrationStartRef = useRef<number>(0);
  const adaptiveThresholdRef = useRef(initialThreshold);
  const ambientLevelRef = useRef(0);
  const speakingRef = useRef(false);
  const consecutiveSpeechFramesRef = useRef(0);
  const consecutiveSilenceFramesRef = useRef(0);
  const callbackRef = useRef<((isSpeaking: boolean, level: number) => void) | null>(null);

  // Calculate RMS level from frequency data
  const calculateLevel = useCallback((dataArray: Uint8Array): number => {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = dataArray[i] / 255;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / dataArray.length);
  }, []);

  // Spectral analysis for voice detection (voice typically 85-255 Hz fundamental, 500-4000 Hz formants)
  const calculateVoiceProbability = useCallback((dataArray: Uint8Array, sampleRate: number): number => {
    const binSize = sampleRate / (dataArray.length * 2);
    const voiceStart = Math.floor(85 / binSize);
    const voiceEnd = Math.floor(4000 / binSize);
    
    let voiceEnergy = 0;
    let totalEnergy = 0;
    
    for (let i = 0; i < dataArray.length; i++) {
      const energy = dataArray[i] / 255;
      totalEnergy += energy;
      if (i >= voiceStart && i <= voiceEnd) {
        voiceEnergy += energy;
      }
    }

    if (totalEnergy === 0) return 0;
    return voiceEnergy / totalEnergy;
  }, []);

  // Process audio frame
  const processFrame = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    const level = calculateLevel(dataArray);
    const voiceProbability = calculateVoiceProbability(dataArray, audioContextRef.current.sampleRate);
    const now = Date.now();

    // Calibration phase - collect ambient noise samples
    if (state.isCalibrating) {
      calibrationSamplesRef.current.push(level);
      
      if (now - calibrationStartRef.current >= calibrationTime) {
        // Calculate ambient level as 75th percentile of samples
        const sorted = [...calibrationSamplesRef.current].sort((a, b) => a - b);
        const percentile75 = sorted[Math.floor(sorted.length * 0.75)];
        ambientLevelRef.current = percentile75;
        
        // Set initial threshold above ambient
        adaptiveThresholdRef.current = Math.max(
          minThreshold,
          Math.min(maxThreshold, percentile75 * 2.5)
        );

        setState(prev => ({
          ...prev,
          isCalibrating: false,
          isCalibrated: true,
          ambientLevel: ambientLevelRef.current,
          threshold: adaptiveThresholdRef.current
        }));
        
        calibrationSamplesRef.current = [];
      }
    } else if (state.isCalibrated) {
      // Adaptive threshold adjustment
      // Slowly track ambient noise level during silence
      if (!speakingRef.current && level < adaptiveThresholdRef.current) {
        ambientLevelRef.current = ambientLevelRef.current * (1 - adaptationRate) + level * adaptationRate;
        
        // Adjust threshold based on ambient level
        const newThreshold = Math.max(
          minThreshold,
          Math.min(maxThreshold, ambientLevelRef.current * 2.5)
        );
        adaptiveThresholdRef.current = adaptiveThresholdRef.current * 0.99 + newThreshold * 0.01;
      }
    }

    // Voice activity detection with hysteresis
    const isAboveThreshold = level > adaptiveThresholdRef.current;
    const hasVoiceCharacteristics = voiceProbability > 0.4;
    const likelyVoice = isAboveThreshold && hasVoiceCharacteristics;

    if (likelyVoice) {
      consecutiveSpeechFramesRef.current++;
      consecutiveSilenceFramesRef.current = 0;

      // Require 3 consecutive frames to start speaking (debounce)
      if (consecutiveSpeechFramesRef.current >= 3 && !speakingRef.current) {
        speakingRef.current = true;
        if (holdTimeoutRef.current) {
          clearTimeout(holdTimeoutRef.current);
          holdTimeoutRef.current = null;
        }
        setState(prev => ({ ...prev, isSpeaking: true }));
        callbackRef.current?.(true, level);
      }
    } else {
      consecutiveSilenceFramesRef.current++;
      consecutiveSpeechFramesRef.current = 0;

      // Use hold time before stopping
      if (consecutiveSilenceFramesRef.current >= 5 && speakingRef.current) {
        if (!holdTimeoutRef.current) {
          holdTimeoutRef.current = setTimeout(() => {
            speakingRef.current = false;
            setState(prev => ({ ...prev, isSpeaking: false }));
            callbackRef.current?.(false, level);
            holdTimeoutRef.current = null;
          }, holdTime);
        }
      }
    }

    setState(prev => ({
      ...prev,
      audioLevel: level,
      threshold: adaptiveThresholdRef.current,
      ambientLevel: ambientLevelRef.current
    }));

    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [
    calculateLevel,
    calculateVoiceProbability,
    state.isCalibrating,
    state.isCalibrated,
    calibrationTime,
    adaptationRate,
    minThreshold,
    maxThreshold,
    holdTime
  ]);

  // Start VAD processing
  const startProcessing = useCallback(async (
    stream: MediaStream,
    onSpeakingChange?: (isSpeaking: boolean, level: number) => void
  ) => {
    if (!enabled) return;

    try {
      audioContextRef.current = new AudioContext();
      const ctx = audioContextRef.current;

      sourceRef.current = ctx.createMediaStreamSource(stream);
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.5;

      sourceRef.current.connect(analyserRef.current);

      callbackRef.current = onSpeakingChange || null;

      // Start calibration
      calibrationStartRef.current = Date.now();
      calibrationSamplesRef.current = [];
      
      setState(prev => ({
        ...prev,
        isCalibrating: true,
        isCalibrated: false,
        threshold: initialThreshold
      }));

      // Start processing loop
      animationFrameRef.current = requestAnimationFrame(processFrame);
    } catch (error) {
      console.error('[AdaptiveVAD] Failed to start processing:', error);
    }
  }, [enabled, initialThreshold, processFrame]);

  // Recalibrate ambient noise
  const recalibrate = useCallback(() => {
    calibrationStartRef.current = Date.now();
    calibrationSamplesRef.current = [];
    adaptiveThresholdRef.current = initialThreshold;
    
    setState(prev => ({
      ...prev,
      isCalibrating: true,
      isCalibrated: false
    }));
  }, [initialThreshold]);

  // Manually set threshold
  const setThreshold = useCallback((threshold: number) => {
    adaptiveThresholdRef.current = Math.max(minThreshold, Math.min(maxThreshold, threshold));
    setState(prev => ({ ...prev, threshold: adaptiveThresholdRef.current }));
  }, [minThreshold, maxThreshold]);

  // Cleanup
  const stopProcessing = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
    }

    speakingRef.current = false;
    consecutiveSpeechFramesRef.current = 0;
    consecutiveSilenceFramesRef.current = 0;
    
    setState({
      isSpeaking: false,
      audioLevel: 0,
      ambientLevel: 0,
      threshold: initialThreshold,
      isCalibrating: false,
      isCalibrated: false
    });
  }, [initialThreshold]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopProcessing();
    };
  }, [stopProcessing]);

  return {
    startProcessing,
    stopProcessing,
    recalibrate,
    setThreshold,
    isSpeaking: state.isSpeaking,
    audioLevel: state.audioLevel,
    ambientLevel: state.ambientLevel,
    threshold: state.threshold,
    isCalibrating: state.isCalibrating,
    isCalibrated: state.isCalibrated
  };
}

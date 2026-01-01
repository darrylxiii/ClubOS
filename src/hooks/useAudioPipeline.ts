import { useState, useEffect, useCallback, useRef } from 'react';
import { useRNNoise } from './useRNNoise';
import { useAudioNormalization } from './useAudioNormalization';
import { useAudioDucking } from './useAudioDucking';
import { useAdaptiveVAD } from './useAdaptiveVAD';
import { useBrowserCapabilities } from './useBrowserCapabilities';
import type { MeetingFeatureSettings } from './useMeetingFeatureSettings';

interface AudioPipelineConfig {
  inputStream: MediaStream | null;
  settings: MeetingFeatureSettings;
  enabled: boolean;
  onSpeakingChange?: (isSpeaking: boolean) => void;
}

interface AudioPipelineState {
  isProcessing: boolean;
  processedStream: MediaStream | null;
  audioLevel: number;
  isSpeaking: boolean;
  processingLatency: number;
  error: string | null;
}

interface UseAudioPipelineReturn extends AudioPipelineState {
  startProcessing: () => Promise<void>;
  stopProcessing: () => void;
  getProcessedStream: () => MediaStream | null;
}

export function useAudioPipeline(config: AudioPipelineConfig): UseAudioPipelineReturn {
  const { inputStream, settings, enabled, onSpeakingChange } = config;
  
  const [state, setState] = useState<AudioPipelineState>({
    isProcessing: false,
    processedStream: null,
    audioLevel: 0,
    isSpeaking: false,
    processingLatency: 0,
    error: null,
  });

  const { canUseFeature } = useBrowserCapabilities();
  const processedStreamRef = useRef<MediaStream | null>(null);

  // Noise cancellation
  const rnnoise = useRNNoise({
    enabled: enabled && settings.noiseCancellation.enabled && canUseFeature('noiseCancellation'),
    aggressiveness: settings.noiseCancellation.level,
  });

  // Audio normalization
  const normalization = useAudioNormalization({
    enabled: enabled && settings.audioNormalization.enabled,
    targetLevel: settings.audioNormalization.targetLevel / 100, // Convert to 0-1
    maxGain: 3,
    minGain: 0.5,
    attackTime: 0.01,
    releaseTime: 0.1,
  });

  // Audio ducking
  const ducking = useAudioDucking({
    enabled: enabled && settings.audioNormalization.enabled,
    duckingAmount: 0.3,
    attackTime: 100,
    releaseTime: 500,
  });

  // Voice activity detection
  const vad = useAdaptiveVAD({
    enabled,
    initialThreshold: 0.02,
    minThreshold: 0.01,
    maxThreshold: 0.1,
    adaptationRate: 0.05,
    holdTime: 300,
  });

  // Handle speaking change
  const handleSpeakingChange = useCallback((isSpeaking: boolean, level: number) => {
    setState(prev => ({ ...prev, isSpeaking, audioLevel: level }));
    onSpeakingChange?.(isSpeaking);
  }, [onSpeakingChange]);

  // Start audio processing pipeline
  const startProcessing = useCallback(async () => {
    if (!inputStream || !enabled) return;

    try {
      setState(prev => ({ ...prev, error: null }));
      const startTime = performance.now();

      let currentStream = inputStream;

      // Step 1: Apply noise cancellation if supported
      if (settings.noiseCancellation.enabled && canUseFeature('noiseCancellation')) {
        const processed = await rnnoise.processStream(inputStream);
        if (processed) {
          currentStream = processed;
        }
      }

      // Step 2: Initialize audio normalization
      if (settings.audioNormalization.enabled) {
        await normalization.initialize();
      }

      // Step 3: Start VAD on the processed stream
      vad.startProcessing(currentStream, handleSpeakingChange);

      // Step 4: Register with audio ducking
      if (settings.audioNormalization.enabled) {
        ducking.registerAudioSource('local', currentStream, 'local');
      }

      processedStreamRef.current = currentStream;
      
      const processingLatency = performance.now() - startTime;

      setState(prev => ({
        ...prev,
        isProcessing: true,
        processedStream: currentStream,
        processingLatency,
      }));

    } catch (error) {
      console.error('[AudioPipeline] Error starting processing:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start audio processing',
      }));
    }
  }, [inputStream, enabled, settings, canUseFeature, rnnoise, normalization, vad, ducking, handleSpeakingChange]);

  // Stop audio processing
  const stopProcessing = useCallback(() => {
    vad.stopProcessing();
    rnnoise.cleanup();
    normalization.cleanup();
    ducking.unregisterAudioSource('local');

    processedStreamRef.current = null;

    setState(prev => ({
      ...prev,
      isProcessing: false,
      processedStream: null,
      audioLevel: 0,
      isSpeaking: false,
    }));
  }, [vad, rnnoise, normalization, ducking]);

  // Auto-start when stream and settings change
  useEffect(() => {
    if (inputStream && enabled) {
      startProcessing();
    } else {
      stopProcessing();
    }

    return () => stopProcessing();
  }, [inputStream, enabled]);

  const getProcessedStream = useCallback(() => {
    return processedStreamRef.current;
  }, []);

  return {
    ...state,
    startProcessing,
    stopProcessing,
    getProcessedStream,
  };
}

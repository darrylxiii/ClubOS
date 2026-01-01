import { useState, useCallback, useRef, useEffect } from 'react';

interface NormalizationOptions {
  enabled: boolean;
  targetLevel: number; // Target RMS level (0-1, typically 0.2-0.3)
  maxGain: number; // Maximum gain multiplier
  minGain: number; // Minimum gain multiplier
  attackTime: number; // How fast to increase gain (seconds)
  releaseTime: number; // How fast to decrease gain (seconds)
  lookAhead: number; // Lookahead buffer for peak limiting (ms)
}

interface ParticipantNormalization {
  participantId: string;
  currentGain: number;
  averageLevel: number;
  peakLevel: number;
}

interface NormalizationState {
  isActive: boolean;
  participantGains: Map<string, number>;
}

// Audio level normalization to equalize volume across participants
export function useAudioNormalization(options: Partial<NormalizationOptions> = {}) {
  const {
    enabled = true,
    targetLevel = 0.25,
    maxGain = 4.0,
    minGain = 0.25,
    attackTime = 0.01,
    releaseTime = 0.1,
    lookAhead = 5
  } = options;

  const [state, setState] = useState<NormalizationState>({
    isActive: false,
    participantGains: new Map()
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const participantNodesRef = useRef<Map<string, {
    source: MediaStreamAudioSourceNode;
    analyser: AnalyserNode;
    gain: GainNode;
    compressor: DynamicsCompressorNode;
    limiter: DynamicsCompressorNode;
    output: MediaStreamAudioDestinationNode;
    levelHistory: number[];
    currentGain: number;
  }>>(new Map());
  const animationFrameRef = useRef<number | null>(null);

  // Initialize audio context
  const initialize = useCallback(async () => {
    if (!enabled || audioContextRef.current) return;
    
    try {
      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      setState(prev => ({ ...prev, isActive: true }));
      
      // Start processing loop
      animationFrameRef.current = requestAnimationFrame(processAllParticipants);
    } catch (error) {
      console.error('[AudioNormalization] Failed to initialize:', error);
    }
  }, [enabled]);

  // Calculate RMS level from frequency data
  const calculateRMS = useCallback((dataArray: Uint8Array): number => {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / dataArray.length);
  }, []);

  // Process all participants and adjust gains
  const processAllParticipants = useCallback(() => {
    if (!audioContextRef.current) {
      if (animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(processAllParticipants);
      }
      return;
    }

    const ctx = audioContextRef.current;
    const newGains = new Map<string, number>();

    participantNodesRef.current.forEach((nodes, participantId) => {
      const { analyser, gain, levelHistory } = nodes;
      
      // Get current level
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteTimeDomainData(dataArray);
      const currentLevel = calculateRMS(dataArray);
      
      // Update level history (keep last 50 samples for ~1 second at 60fps)
      levelHistory.push(currentLevel);
      if (levelHistory.length > 50) {
        levelHistory.shift();
      }

      // Calculate average level over history
      const averageLevel = levelHistory.reduce((a, b) => a + b, 0) / levelHistory.length;
      
      // Calculate desired gain
      let desiredGain = 1.0;
      if (averageLevel > 0.001) { // Only adjust if there's meaningful audio
        desiredGain = targetLevel / averageLevel;
      }

      // Clamp gain
      desiredGain = Math.max(minGain, Math.min(maxGain, desiredGain));

      // Smooth gain changes
      const currentGain = nodes.currentGain;
      const gainDiff = desiredGain - currentGain;
      const smoothingFactor = gainDiff > 0 ? attackTime : releaseTime;
      const newGain = currentGain + gainDiff * smoothingFactor;
      
      nodes.currentGain = newGain;
      
      // Apply gain with smooth transition
      gain.gain.setTargetAtTime(newGain, ctx.currentTime, 0.01);
      
      newGains.set(participantId, newGain);
    });

    setState(prev => ({
      ...prev,
      participantGains: newGains
    }));

    animationFrameRef.current = requestAnimationFrame(processAllParticipants);
  }, [calculateRMS, targetLevel, maxGain, minGain, attackTime, releaseTime]);

  // Add participant stream for normalization
  const addParticipant = useCallback((
    participantId: string,
    stream: MediaStream
  ): MediaStream => {
    if (!audioContextRef.current || !enabled) {
      return stream;
    }

    const ctx = audioContextRef.current;

    try {
      // Create source
      const source = ctx.createMediaStreamSource(stream);

      // Create analyser for level detection
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.3;

      // Create gain node for level adjustment
      const gain = ctx.createGain();
      gain.gain.value = 1.0;

      // Create compressor for dynamic range control
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      // Create limiter to prevent clipping
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -3;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.001;
      limiter.release.value = 0.05;

      // Create output
      const output = ctx.createMediaStreamDestination();

      // Connect: source -> analyser -> gain -> compressor -> limiter -> output
      source.connect(analyser);
      analyser.connect(gain);
      gain.connect(compressor);
      compressor.connect(limiter);
      limiter.connect(output);

      participantNodesRef.current.set(participantId, {
        source,
        analyser,
        gain,
        compressor,
        limiter,
        output,
        levelHistory: [],
        currentGain: 1.0
      });

      return output.stream;
    } catch (error) {
      console.error('[AudioNormalization] Failed to add participant:', error);
      return stream;
    }
  }, [enabled]);

  // Remove participant
  const removeParticipant = useCallback((participantId: string) => {
    const nodes = participantNodesRef.current.get(participantId);
    if (nodes) {
      nodes.source.disconnect();
      nodes.analyser.disconnect();
      nodes.gain.disconnect();
      nodes.compressor.disconnect();
      nodes.limiter.disconnect();
      participantNodesRef.current.delete(participantId);
    }
  }, []);

  // Get participant info
  const getParticipantInfo = useCallback((participantId: string): ParticipantNormalization | null => {
    const nodes = participantNodesRef.current.get(participantId);
    if (!nodes) return null;

    const { analyser, levelHistory, currentGain } = nodes;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(dataArray);

    // Calculate peak
    let peak = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const value = Math.abs((dataArray[i] - 128) / 128);
      if (value > peak) peak = value;
    }

    return {
      participantId,
      currentGain,
      averageLevel: levelHistory.length > 0 
        ? levelHistory.reduce((a, b) => a + b, 0) / levelHistory.length 
        : 0,
      peakLevel: peak
    };
  }, []);

  // Manually boost/reduce participant volume
  const setParticipantBoost = useCallback((participantId: string, boost: number) => {
    const nodes = participantNodesRef.current.get(participantId);
    if (nodes && audioContextRef.current) {
      // Apply boost as multiplier to current gain calculation
      const clampedBoost = Math.max(0.5, Math.min(2.0, boost));
      nodes.currentGain *= clampedBoost;
    }
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    participantNodesRef.current.forEach((nodes, id) => {
      removeParticipant(id);
    });

    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
    }
    audioContextRef.current = null;

    setState({
      isActive: false,
      participantGains: new Map()
    });
  }, [removeParticipant]);

  // Auto-initialize and cleanup
  useEffect(() => {
    if (enabled) {
      initialize();
    }
    return () => {
      cleanup();
    };
  }, [enabled, initialize, cleanup]);

  return {
    initialize,
    addParticipant,
    removeParticipant,
    getParticipantInfo,
    setParticipantBoost,
    cleanup,
    isActive: state.isActive,
    participantGains: state.participantGains
  };
}

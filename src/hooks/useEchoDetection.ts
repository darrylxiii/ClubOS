/**
 * Echo Detection & Warning
 * Detect audio feedback loops in real-time
 * Show warning toast with fix suggestions
 * Auto-mute if severe echo detected
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface UseEchoDetectionProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, { stream: MediaStream; name: string }>;
  enabled?: boolean;
  onEchoDetected?: (severity: 'mild' | 'moderate' | 'severe') => void;
  onAutoMute?: () => void;
}

interface EchoAnalysis {
  hasEcho: boolean;
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  confidence: number;
  correlationScore: number;
  feedbackFrequencies: number[];
}

export function useEchoDetection({
  localStream,
  remoteStreams,
  enabled = true,
  onEchoDetected,
  onAutoMute
}: UseEchoDetectionProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [echoDetected, setEchoDetected] = useState(false);
  const [echoSeverity, setEchoSeverity] = useState<'none' | 'mild' | 'moderate' | 'severe'>('none');
  const [consecutiveDetections, setConsecutiveDetections] = useState(0);
  const [hasWarnedUser, setHasWarnedUser] = useState(false);
  const [hasAutoMuted, setHasAutoMuted] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const localAnalyserRef = useRef<AnalyserNode | null>(null);
  const remoteAnalysersRef = useRef<Map<string, AnalyserNode>>(new Map());
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const echoHistoryRef = useRef<number[]>([]);
  
  // Thresholds for echo detection
  const ECHO_THRESHOLDS = {
    correlationMild: 0.3,
    correlationModerate: 0.5,
    correlationSevere: 0.7,
    frequencyMatchThreshold: 50, // Hz tolerance
    minConsecutiveForWarning: 3,
    minConsecutiveForAutoMute: 6,
    historySize: 10
  };

  // Initialize audio context and analysers
  const initializeAnalysis = useCallback(() => {
    if (!localStream || !enabled) return;

    try {
      // Create audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;

      // Setup local audio analyser
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        const localSource = ctx.createMediaStreamSource(localStream);
        const localAnalyser = ctx.createAnalyser();
        localAnalyser.fftSize = 2048;
        localAnalyser.smoothingTimeConstant = 0.5;
        localSource.connect(localAnalyser);
        localAnalyserRef.current = localAnalyser;
      }

      // Setup remote audio analysers
      remoteStreams.forEach(({ stream }, participantId) => {
        const remoteAudioTrack = stream.getAudioTracks()[0];
        if (remoteAudioTrack && !remoteAnalysersRef.current.has(participantId)) {
          const remoteSource = ctx.createMediaStreamSource(stream);
          const remoteAnalyser = ctx.createAnalyser();
          remoteAnalyser.fftSize = 2048;
          remoteAnalyser.smoothingTimeConstant = 0.5;
          remoteSource.connect(remoteAnalyser);
          remoteAnalysersRef.current.set(participantId, remoteAnalyser);
        }
      });

      setIsAnalyzing(true);
      console.log('[EchoDetection] Initialized with', remoteStreams.size, 'remote streams');
    } catch (_e) {
      console.error('[EchoDetection] Failed to initialize:', e);
    }
  }, [localStream, remoteStreams, enabled]);

  // Calculate cross-correlation between two frequency spectrums
  const calculateCorrelation = useCallback((
    localData: Uint8Array,
    remoteData: Uint8Array
  ): number => {
    if (localData.length !== remoteData.length || localData.length === 0) {
      return 0;
    }

    // Calculate means
    let localMean = 0;
    let remoteMean = 0;
    for (let i = 0; i < localData.length; i++) {
      localMean += localData[i];
      remoteMean += remoteData[i];
    }
    localMean /= localData.length;
    remoteMean /= localData.length;

    // Calculate correlation coefficient
    let numerator = 0;
    let localVar = 0;
    let remoteVar = 0;

    for (let i = 0; i < localData.length; i++) {
      const localDiff = localData[i] - localMean;
      const remoteDiff = remoteData[i] - remoteMean;
      numerator += localDiff * remoteDiff;
      localVar += localDiff * localDiff;
      remoteVar += remoteDiff * remoteDiff;
    }

    const denominator = Math.sqrt(localVar * remoteVar);
    if (denominator === 0) return 0;

    return Math.abs(numerator / denominator);
  }, []);

  // Find dominant frequencies
  const findDominantFrequencies = useCallback((
    analyser: AnalyserNode,
    topN: number = 5
  ): number[] => {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    const ctx = audioContextRef.current;
    if (!ctx) return [];

    const frequencyBinWidth = ctx.sampleRate / analyser.fftSize;

    // Find peaks
    const peaks: { freq: number; magnitude: number }[] = [];
    for (let i = 1; i < dataArray.length - 1; i++) {
      if (dataArray[i] > dataArray[i - 1] && dataArray[i] > dataArray[i + 1] && dataArray[i] > 30) {
        peaks.push({
          freq: i * frequencyBinWidth,
          magnitude: dataArray[i]
        });
      }
    }

    // Sort by magnitude and take top N
    peaks.sort((a, b) => b.magnitude - a.magnitude);
    return peaks.slice(0, topN).map(p => p.freq);
  }, []);

  // Analyze for echo
  const performEchoAnalysis = useCallback((): EchoAnalysis => {
    if (!localAnalyserRef.current || remoteAnalysersRef.current.size === 0) {
      return {
        hasEcho: false,
        severity: 'none',
        confidence: 0,
        correlationScore: 0,
        feedbackFrequencies: []
      };
    }

    const localData = new Uint8Array(localAnalyserRef.current.frequencyBinCount);
    localAnalyserRef.current.getByteFrequencyData(localData);

    // Check if local microphone is picking up significant audio
    const localLevel = localData.reduce((a, b) => a + b, 0) / localData.length;
    if (localLevel < 20) {
      // Too quiet to detect echo
      return {
        hasEcho: false,
        severity: 'none',
        confidence: 0,
        correlationScore: 0,
        feedbackFrequencies: []
      };
    }

    let maxCorrelation = 0;
    const matchingFrequencies: number[] = [];

    // Compare with each remote stream
    remoteAnalysersRef.current.forEach((remoteAnalyser) => {
      const remoteData = new Uint8Array(remoteAnalyser.frequencyBinCount);
      remoteAnalyser.getByteFrequencyData(remoteData);

      // Check if remote is outputting audio
      const remoteLevel = remoteData.reduce((a, b) => a + b, 0) / remoteData.length;
      if (remoteLevel < 20) return;

      // Calculate correlation
      const correlation = calculateCorrelation(localData, remoteData);
      maxCorrelation = Math.max(maxCorrelation, correlation);

      // Find matching frequencies (feedback loop indicator)
      const localFreqs = findDominantFrequencies(localAnalyserRef.current!);
      const remoteFreqs = findDominantFrequencies(remoteAnalyser);

      for (const localFreq of localFreqs) {
        for (const remoteFreq of remoteFreqs) {
          if (Math.abs(localFreq - remoteFreq) < ECHO_THRESHOLDS.frequencyMatchThreshold) {
            if (!matchingFrequencies.includes(localFreq)) {
              matchingFrequencies.push(localFreq);
            }
          }
        }
      }
    });

    // Determine severity
    let severity: 'none' | 'mild' | 'moderate' | 'severe' = 'none';
    let hasEcho = false;

    if (maxCorrelation >= ECHO_THRESHOLDS.correlationSevere || matchingFrequencies.length >= 3) {
      severity = 'severe';
      hasEcho = true;
    } else if (maxCorrelation >= ECHO_THRESHOLDS.correlationModerate || matchingFrequencies.length >= 2) {
      severity = 'moderate';
      hasEcho = true;
    } else if (maxCorrelation >= ECHO_THRESHOLDS.correlationMild || matchingFrequencies.length >= 1) {
      severity = 'mild';
      hasEcho = true;
    }

    // Calculate confidence based on correlation and frequency matches
    const confidence = Math.min(1, (maxCorrelation * 0.6) + (matchingFrequencies.length * 0.1));

    return {
      hasEcho,
      severity,
      confidence,
      correlationScore: maxCorrelation,
      feedbackFrequencies: matchingFrequencies
    };
  }, [calculateCorrelation, findDominantFrequencies]);

  // Handle echo detection results
  const handleEchoResult = useCallback((analysis: EchoAnalysis) => {
    setEchoDetected(analysis.hasEcho);
    setEchoSeverity(analysis.severity);

    // Track in history
    echoHistoryRef.current.push(analysis.hasEcho ? analysis.correlationScore : 0);
    if (echoHistoryRef.current.length > ECHO_THRESHOLDS.historySize) {
      echoHistoryRef.current.shift();
    }

    if (analysis.hasEcho) {
      setConsecutiveDetections(prev => prev + 1);
      onEchoDetected?.(analysis.severity as 'mild' | 'moderate' | 'severe');

      // Warning for moderate echo
      if (consecutiveDetections >= ECHO_THRESHOLDS.minConsecutiveForWarning && !hasWarnedUser) {
        setHasWarnedUser(true);
        
        const suggestions = [
          'Use headphones to prevent speakers from being picked up by your microphone',
          'Lower your speaker volume',
          'Move away from reflective surfaces'
        ];

        toast.warning('Echo detected in your audio', {
          description: suggestions[0],
          duration: 8000,
          action: {
            label: 'Got it',
            onClick: () => {}
          }
        });
      }

      // Auto-mute for severe persistent echo
      if (
        consecutiveDetections >= ECHO_THRESHOLDS.minConsecutiveForAutoMute &&
        analysis.severity === 'severe' &&
        !hasAutoMuted
      ) {
        setHasAutoMuted(true);
        onAutoMute?.();
        
        toast.error('Severe echo detected - microphone muted', {
          description: 'Please use headphones to prevent audio feedback',
          duration: 10000
        });
      }
    } else {
      // Reset consecutive counter on no echo
      setConsecutiveDetections(0);
    }
  }, [consecutiveDetections, hasWarnedUser, hasAutoMuted, onEchoDetected, onAutoMute]);

  // Start continuous analysis
  useEffect(() => {
    if (!enabled || !localStream) return;

    initializeAnalysis();

    // Run analysis every 500ms
    analysisIntervalRef.current = setInterval(() => {
      const result = performEchoAnalysis();
      handleEchoResult(result);
    }, 500);

    return () => {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
    };
  }, [enabled, localStream, remoteStreams.size, initializeAnalysis, performEchoAnalysis, handleEchoResult]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      remoteAnalysersRef.current.clear();
    };
  }, []);

  // Reset warning state (call after user addresses the issue)
  const resetWarnings = useCallback(() => {
    setHasWarnedUser(false);
    setHasAutoMuted(false);
    setConsecutiveDetections(0);
    echoHistoryRef.current = [];
  }, []);

  // Manual echo test
  const runManualTest = useCallback((): EchoAnalysis => {
    return performEchoAnalysis();
  }, [performEchoAnalysis]);

  return {
    isAnalyzing,
    echoDetected,
    echoSeverity,
    consecutiveDetections,
    hasWarnedUser,
    hasAutoMuted,
    resetWarnings,
    runManualTest,
    // Computed helpers
    getSeverityColor: (severity: string) => {
      switch (severity) {
        case 'severe': return 'text-red-500';
        case 'moderate': return 'text-orange-500';
        case 'mild': return 'text-yellow-500';
        default: return 'text-green-500';
      }
    }
  };
}

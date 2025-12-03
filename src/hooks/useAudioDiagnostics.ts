import { useState, useEffect, useCallback, useRef } from 'react';

interface AudioDiagnostics {
  userId: string;
  hasAudioTracks: boolean;
  tracksEnabled: boolean;
  tracksLive: boolean;
  audioLevel: number;
  lastActivity: number;
  isSilent: boolean;
}

interface UseAudioDiagnosticsProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, { camera: MediaStream | null; screen: MediaStream | null }>;
  currentUserId?: string;
  enabled?: boolean;
}

export function useAudioDiagnostics({
  localStream,
  remoteStreams,
  currentUserId,
  enabled = true
}: UseAudioDiagnosticsProps) {
  const [diagnostics, setDiagnostics] = useState<Map<string, AudioDiagnostics>>(new Map());
  const [hasAudioIssues, setHasAudioIssues] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzersRef = useRef<Map<string, { analyzer: AnalyserNode; source: MediaStreamAudioSourceNode }>>(new Map());
  const intervalRef = useRef<number | null>(null);
  const silenceTimeoutRef = useRef<Map<string, number>>(new Map());

  const SILENCE_THRESHOLD = 0.02;
  const SILENCE_TIMEOUT_MS = 10000; // 10 seconds of silence = potential issue

  const getOrCreateAudioContext = useCallback(async (): Promise<AudioContext> => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext({ 
        latencyHint: 'interactive',
        sampleRate: 48000 
      });
    }
    
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    
    return audioContextRef.current;
  }, []);

  const analyzeStream = useCallback(async (
    userId: string, 
    stream: MediaStream | null,
    isLocal: boolean
  ): Promise<AudioDiagnostics> => {
    const baseDiagnostics: AudioDiagnostics = {
      userId,
      hasAudioTracks: false,
      tracksEnabled: false,
      tracksLive: false,
      audioLevel: 0,
      lastActivity: 0,
      isSilent: true
    };

    if (!stream) {
      return baseDiagnostics;
    }

    const audioTracks = stream.getAudioTracks();
    baseDiagnostics.hasAudioTracks = audioTracks.length > 0;
    
    if (audioTracks.length === 0) {
      return baseDiagnostics;
    }

    baseDiagnostics.tracksEnabled = audioTracks.some(t => t.enabled);
    baseDiagnostics.tracksLive = audioTracks.some(t => t.readyState === 'live');

    // Get or create analyzer for this stream
    try {
      const audioContext = await getOrCreateAudioContext();
      let analyzerData = analyzersRef.current.get(userId);

      // Create new analyzer if stream changed
      if (!analyzerData || !analyzerData.source) {
        // Cleanup old
        if (analyzerData) {
          try {
            analyzerData.source.disconnect();
            analyzerData.analyzer.disconnect();
          } catch (e) {
            // Ignore
          }
        }

        const source = audioContext.createMediaStreamSource(stream);
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 256;
        analyzer.smoothingTimeConstant = 0.5;
        source.connect(analyzer);
        
        analyzerData = { analyzer, source };
        analyzersRef.current.set(userId, analyzerData);
      }

      // Measure audio level
      const dataArray = new Uint8Array(analyzerData.analyzer.frequencyBinCount);
      analyzerData.analyzer.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      baseDiagnostics.audioLevel = Math.min(average / 128, 1);
      baseDiagnostics.isSilent = baseDiagnostics.audioLevel < SILENCE_THRESHOLD;

      // Track silence duration
      if (!baseDiagnostics.isSilent) {
        baseDiagnostics.lastActivity = Date.now();
        silenceTimeoutRef.current.set(userId, Date.now());
      } else {
        const lastActivity = silenceTimeoutRef.current.get(userId) || Date.now();
        baseDiagnostics.lastActivity = lastActivity;
      }

    } catch (err) {
      console.warn('[AudioDiagnostics] Error analyzing stream:', err);
    }

    return baseDiagnostics;
  }, [getOrCreateAudioContext]);

  const runDiagnostics = useCallback(async () => {
    if (!enabled) return;

    const newDiagnostics = new Map<string, AudioDiagnostics>();
    let foundIssues = false;

    // Analyze local stream
    if (currentUserId && localStream) {
      const localDiag = await analyzeStream(currentUserId, localStream, true);
      newDiagnostics.set(currentUserId, localDiag);
      
      if (!localDiag.hasAudioTracks || !localDiag.tracksEnabled || !localDiag.tracksLive) {
        foundIssues = true;
        console.warn('[AudioDiagnostics] Local audio issue:', {
          hasAudioTracks: localDiag.hasAudioTracks,
          tracksEnabled: localDiag.tracksEnabled,
          tracksLive: localDiag.tracksLive
        });
      }
    }

    // Analyze remote streams
    for (const [userId, streams] of remoteStreams.entries()) {
      const stream = streams.camera;
      const remoteDiag = await analyzeStream(userId, stream, false);
      newDiagnostics.set(userId, remoteDiag);

      if (stream) {
        // Check for prolonged silence (potential issue)
        const silenceDuration = Date.now() - remoteDiag.lastActivity;
        if (silenceDuration > SILENCE_TIMEOUT_MS && remoteDiag.hasAudioTracks) {
          console.warn('[AudioDiagnostics] Prolonged silence from', userId, {
            silenceDuration: `${Math.round(silenceDuration / 1000)}s`,
            hasAudioTracks: remoteDiag.hasAudioTracks,
            tracksEnabled: remoteDiag.tracksEnabled,
            tracksLive: remoteDiag.tracksLive
          });
        }

        if (remoteDiag.hasAudioTracks && (!remoteDiag.tracksEnabled || !remoteDiag.tracksLive)) {
          foundIssues = true;
          console.warn('[AudioDiagnostics] Remote audio issue for', userId, {
            tracksEnabled: remoteDiag.tracksEnabled,
            tracksLive: remoteDiag.tracksLive
          });
        }
      }
    }

    setDiagnostics(newDiagnostics);
    setHasAudioIssues(foundIssues);
  }, [enabled, currentUserId, localStream, remoteStreams, analyzeStream]);

  // Run diagnostics periodically
  useEffect(() => {
    if (!enabled) return;

    // Initial run
    runDiagnostics();

    // Periodic check every 2 seconds
    intervalRef.current = window.setInterval(runDiagnostics, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, runDiagnostics]);

  // Cleanup analyzers on unmount
  useEffect(() => {
    return () => {
      analyzersRef.current.forEach(({ source, analyzer }) => {
        try {
          source.disconnect();
          analyzer.disconnect();
        } catch (e) {
          // Ignore
        }
      });
      analyzersRef.current.clear();
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        // Don't close shared context, just cleanup
        audioContextRef.current = null;
      }
    };
  }, []);

  const getDiagnosticsForUser = useCallback((userId: string): AudioDiagnostics | undefined => {
    return diagnostics.get(userId);
  }, [diagnostics]);

  const getAudioLevel = useCallback((userId: string): number => {
    return diagnostics.get(userId)?.audioLevel || 0;
  }, [diagnostics]);

  const isUserAudioWorking = useCallback((userId: string): boolean => {
    const diag = diagnostics.get(userId);
    if (!diag) return false;
    return diag.hasAudioTracks && diag.tracksEnabled && diag.tracksLive;
  }, [diagnostics]);

  return {
    diagnostics,
    hasAudioIssues,
    getDiagnosticsForUser,
    getAudioLevel,
    isUserAudioWorking,
    runDiagnostics
  };
}

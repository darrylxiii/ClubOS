import { useRef, useCallback, useEffect, useState } from 'react';

interface AudioLevel {
  participantId: string;
  level: number; // 0-1 normalized
  isSpeaking: boolean;
}

interface UseAudioLevelMonitorProps {
  streams: Map<string, MediaStream>;
  speakingThreshold?: number;
  smoothingTimeConstant?: number;
  updateInterval?: number;
}

export function useAudioLevelMonitor({
  streams,
  speakingThreshold = 0.05,
  smoothingTimeConstant = 0.5,
  updateInterval = 100
}: UseAudioLevelMonitorProps) {
  const [levels, setLevels] = useState<Map<string, AudioLevel>>(new Map());
  
  // Shared audio context
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzersRef = useRef<Map<string, AnalyserNode>>(new Map());
  const sourcesRef = useRef<Map<string, MediaStreamAudioSourceNode>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize audio context
  const getAudioContext = useCallback(async () => {
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
  
  // Create analyzer for a stream
  const createAnalyzer = useCallback(async (participantId: string, stream: MediaStream) => {
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;
    
    // Skip if already monitoring this stream
    if (analyzersRef.current.has(participantId)) {
      return;
    }
    
    try {
      const audioContext = await getAudioContext();
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      
      analyzer.fftSize = 256;
      analyzer.smoothingTimeConstant = smoothingTimeConstant;
      
      source.connect(analyzer);
      // Don't connect to destination - we just analyze, not play
      
      sourcesRef.current.set(participantId, source);
      analyzersRef.current.set(participantId, analyzer);
      
      console.log('[AudioLevel] Created analyzer for:', participantId);
    } catch (error) {
      console.error('[AudioLevel] Failed to create analyzer:', error);
    }
  }, [getAudioContext, smoothingTimeConstant]);
  
  // Remove analyzer for a participant
  const removeAnalyzer = useCallback((participantId: string) => {
    const source = sourcesRef.current.get(participantId);
    const analyzer = analyzersRef.current.get(participantId);
    
    if (source) {
      source.disconnect();
      sourcesRef.current.delete(participantId);
    }
    
    if (analyzer) {
      analyzer.disconnect();
      analyzersRef.current.delete(participantId);
    }
    
    setLevels(prev => {
      const next = new Map(prev);
      next.delete(participantId);
      return next;
    });
  }, []);
  
  // Update analyzers when streams change
  useEffect(() => {
    const currentIds = new Set(streams.keys());
    const monitoredIds = new Set(analyzersRef.current.keys());
    
    // Add new streams
    streams.forEach((stream, participantId) => {
      if (!monitoredIds.has(participantId)) {
        createAnalyzer(participantId, stream);
      }
    });
    
    // Remove old streams
    monitoredIds.forEach(participantId => {
      if (!currentIds.has(participantId)) {
        removeAnalyzer(participantId);
      }
    });
  }, [streams, createAnalyzer, removeAnalyzer]);
  
  // Monitor loop
  useEffect(() => {
    const updateLevels = () => {
      const newLevels = new Map<string, AudioLevel>();
      
      analyzersRef.current.forEach((analyzer, participantId) => {
        const dataArray = new Uint8Array(analyzer.frequencyBinCount);
        analyzer.getByteFrequencyData(dataArray);
        
        // Calculate RMS level
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const level = Math.min(rms / 128, 1); // Normalize to 0-1
        
        newLevels.set(participantId, {
          participantId,
          level,
          isSpeaking: level > speakingThreshold
        });
      });
      
      setLevels(newLevels);
    };
    
    intervalRef.current = setInterval(updateLevels, updateInterval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [speakingThreshold, updateInterval]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sourcesRef.current.forEach(source => source.disconnect());
      analyzersRef.current.forEach(analyzer => analyzer.disconnect());
      sourcesRef.current.clear();
      analyzersRef.current.clear();
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  // Helper to get level for a participant
  const getLevel = useCallback((participantId: string): number => {
    return levels.get(participantId)?.level || 0;
  }, [levels]);
  
  // Helper to check if participant is speaking
  const isSpeaking = useCallback((participantId: string): boolean => {
    return levels.get(participantId)?.isSpeaking || false;
  }, [levels]);
  
  return {
    levels,
    getLevel,
    isSpeaking
  };
}

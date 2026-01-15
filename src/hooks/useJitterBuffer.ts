import { useRef, useCallback, useState } from 'react';
import { logger } from '@/lib/logger';

interface JitterBufferConfig {
  minBufferMs: number;
  maxBufferMs: number;
  targetBufferMs: number;
  adaptationRate: number;
}

interface JitterStats {
  currentJitter: number;
  averageJitter: number;
  bufferSize: number;
  underruns: number;
  adaptations: number;
}

const DEFAULT_CONFIG: JitterBufferConfig = {
  minBufferMs: 20,      // Low latency floor
  maxBufferMs: 150,     // Max buffer for bad networks
  targetBufferMs: 50,   // Default target
  adaptationRate: 0.1   // How fast to adapt (0-1)
};

export function useJitterBuffer(config: Partial<JitterBufferConfig> = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  const [stats, setStats] = useState<JitterStats>({
    currentJitter: 0,
    averageJitter: 0,
    bufferSize: cfg.targetBufferMs,
    underruns: 0,
    adaptations: 0
  });
  
  const jitterSamplesRef = useRef<number[]>([]);
  const bufferSizeRef = useRef(cfg.targetBufferMs);
  const underrunCountRef = useRef(0);
  const adaptationCountRef = useRef(0);
  const lastPacketTimeRef = useRef<number>(0);
  
  // Calculate optimal buffer size based on jitter
  const calculateOptimalBuffer = useCallback((jitterMs: number): number => {
    // Buffer should be at least 2x jitter for smooth playback
    // Add headroom for packet loss recovery
    const optimalBuffer = Math.max(
      cfg.minBufferMs,
      Math.min(cfg.maxBufferMs, jitterMs * 2.5 + 10)
    );
    
    return Math.round(optimalBuffer);
  }, [cfg.minBufferMs, cfg.maxBufferMs]);
  
  // Record incoming packet timing for jitter calculation
  const recordPacketArrival = useCallback(() => {
    const now = performance.now();
    
    if (lastPacketTimeRef.current > 0) {
      const interArrival = now - lastPacketTimeRef.current;
      // Jitter is variation from expected 20ms interval (typical audio packet)
      const jitter = Math.abs(interArrival - 20);
      
      jitterSamplesRef.current.push(jitter);
      
      // Keep last 50 samples for averaging
      if (jitterSamplesRef.current.length > 50) {
        jitterSamplesRef.current.shift();
      }
      
      // Calculate average jitter
      const avgJitter = jitterSamplesRef.current.reduce((a, b) => a + b, 0) / jitterSamplesRef.current.length;
      
      // Adapt buffer size smoothly
      const optimalBuffer = calculateOptimalBuffer(avgJitter);
      const currentBuffer = bufferSizeRef.current;
      const newBuffer = currentBuffer + (optimalBuffer - currentBuffer) * cfg.adaptationRate;
      
      if (Math.abs(newBuffer - currentBuffer) > 5) {
        bufferSizeRef.current = Math.round(newBuffer);
        adaptationCountRef.current++;
        
        console.log('[JitterBuffer] Adapted buffer:', {
          jitter: jitter.toFixed(1),
          avgJitter: avgJitter.toFixed(1),
          oldBuffer: currentBuffer,
          newBuffer: bufferSizeRef.current
        });
      }
      
      setStats({
        currentJitter: jitter,
        averageJitter: avgJitter,
        bufferSize: bufferSizeRef.current,
        underruns: underrunCountRef.current,
        adaptations: adaptationCountRef.current
      });
    }
    
    lastPacketTimeRef.current = now;
  }, [calculateOptimalBuffer, cfg.adaptationRate]);
  
  // Record buffer underrun (audio glitch)
  const recordUnderrun = useCallback(() => {
    underrunCountRef.current++;
    
    // Increase buffer on underrun
    const newBuffer = Math.min(cfg.maxBufferMs, bufferSizeRef.current * 1.5);
    bufferSizeRef.current = Math.round(newBuffer);
    
    logger.warn('Buffer underrun! Increasing buffer', { componentName: 'JitterBuffer', newBuffer });
    
    setStats(prev => ({
      ...prev,
      bufferSize: bufferSizeRef.current,
      underruns: underrunCountRef.current
    }));
  }, [cfg.maxBufferMs]);
  
  // Get recommended playback delay
  const getPlaybackDelay = useCallback(() => {
    return bufferSizeRef.current;
  }, []);
  
  // Reset jitter buffer state
  const reset = useCallback(() => {
    jitterSamplesRef.current = [];
    bufferSizeRef.current = cfg.targetBufferMs;
    underrunCountRef.current = 0;
    adaptationCountRef.current = 0;
    lastPacketTimeRef.current = 0;
    
    setStats({
      currentJitter: 0,
      averageJitter: 0,
      bufferSize: cfg.targetBufferMs,
      underruns: 0,
      adaptations: 0
    });
  }, [cfg.targetBufferMs]);
  
  // Apply jitter buffer to audio context
  const createBufferedSource = useCallback((
    audioContext: AudioContext,
    stream: MediaStream
  ): { source: MediaStreamAudioSourceNode; delay: DelayNode } => {
    const source = audioContext.createMediaStreamSource(stream);
    const delay = audioContext.createDelay(cfg.maxBufferMs / 1000);
    
    // Set initial delay
    delay.delayTime.value = bufferSizeRef.current / 1000;
    
    source.connect(delay);
    
    console.log('[JitterBuffer] Created buffered source with delay:', bufferSizeRef.current, 'ms');
    
    return { source, delay };
  }, [cfg.maxBufferMs]);
  
  // Update delay node in real-time
  const updateDelay = useCallback((delayNode: DelayNode, audioContext: AudioContext) => {
    const targetDelay = bufferSizeRef.current / 1000;
    delayNode.delayTime.setTargetAtTime(targetDelay, audioContext.currentTime, 0.1);
  }, []);
  
  return {
    stats,
    recordPacketArrival,
    recordUnderrun,
    getPlaybackDelay,
    reset,
    createBufferedSource,
    updateDelay,
    currentBufferMs: bufferSizeRef.current
  };
}

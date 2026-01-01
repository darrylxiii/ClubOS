import { useState, useEffect, useCallback, useRef } from 'react';

interface PerformanceMetrics {
  fps: number;
  cpuUsage: number;
  memoryUsage: number;
  heapUsed: number;
  heapTotal: number;
  videoEncodingTime: number;
  videoDecodingTime: number;
  audioProcessingTime: number;
  networkLatency: number;
  jitterBuffer: number;
}

interface PerformanceThresholds {
  minFps: number;
  maxCpuUsage: number;
  maxMemoryUsage: number;
  maxVideoEncodingTime: number;
  maxNetworkLatency: number;
}

interface PerformanceAlert {
  type: 'fps' | 'cpu' | 'memory' | 'encoding' | 'network';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

interface PerformanceHistory {
  timestamp: number;
  metrics: PerformanceMetrics;
}

interface UsePerformanceMonitorOptions {
  sampleInterval?: number;
  historySize?: number;
  thresholds?: Partial<PerformanceThresholds>;
  onAlert?: (alert: PerformanceAlert) => void;
  onPerformanceDrop?: (metrics: PerformanceMetrics) => void;
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  minFps: 24,
  maxCpuUsage: 80,
  maxMemoryUsage: 85,
  maxVideoEncodingTime: 33,
  maxNetworkLatency: 150
};

export function usePerformanceMonitor(options: UsePerformanceMonitorOptions = {}) {
  const {
    sampleInterval = 1000,
    historySize = 60,
    thresholds = {},
    onAlert,
    onPerformanceDrop
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    cpuUsage: 0,
    memoryUsage: 0,
    heapUsed: 0,
    heapTotal: 0,
    videoEncodingTime: 0,
    videoDecodingTime: 0,
    audioProcessingTime: 0,
    networkLatency: 0,
    jitterBuffer: 0
  });

  const [history, setHistory] = useState<PerformanceHistory[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [performanceScore, setPerformanceScore] = useState(100);

  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  const rafIdRef = useRef<number>();
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const effectiveThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };

  // FPS counter
  const countFrame = useCallback(() => {
    frameCountRef.current++;
    rafIdRef.current = requestAnimationFrame(countFrame);
  }, []);

  // Check thresholds and create alerts
  const checkThresholds = useCallback((currentMetrics: PerformanceMetrics) => {
    const newAlerts: PerformanceAlert[] = [];

    if (currentMetrics.fps < effectiveThresholds.minFps) {
      newAlerts.push({
        type: 'fps',
        severity: currentMetrics.fps < effectiveThresholds.minFps * 0.5 ? 'critical' : 'warning',
        message: `Low frame rate: ${currentMetrics.fps.toFixed(1)} FPS`,
        value: currentMetrics.fps,
        threshold: effectiveThresholds.minFps,
        timestamp: Date.now()
      });
    }

    if (currentMetrics.cpuUsage > effectiveThresholds.maxCpuUsage) {
      newAlerts.push({
        type: 'cpu',
        severity: currentMetrics.cpuUsage > 95 ? 'critical' : 'warning',
        message: `High CPU usage: ${currentMetrics.cpuUsage.toFixed(1)}%`,
        value: currentMetrics.cpuUsage,
        threshold: effectiveThresholds.maxCpuUsage,
        timestamp: Date.now()
      });
    }

    if (currentMetrics.memoryUsage > effectiveThresholds.maxMemoryUsage) {
      newAlerts.push({
        type: 'memory',
        severity: currentMetrics.memoryUsage > 95 ? 'critical' : 'warning',
        message: `High memory usage: ${currentMetrics.memoryUsage.toFixed(1)}%`,
        value: currentMetrics.memoryUsage,
        threshold: effectiveThresholds.maxMemoryUsage,
        timestamp: Date.now()
      });
    }

    if (currentMetrics.videoEncodingTime > effectiveThresholds.maxVideoEncodingTime) {
      newAlerts.push({
        type: 'encoding',
        severity: currentMetrics.videoEncodingTime > 50 ? 'critical' : 'warning',
        message: `Slow video encoding: ${currentMetrics.videoEncodingTime.toFixed(1)}ms`,
        value: currentMetrics.videoEncodingTime,
        threshold: effectiveThresholds.maxVideoEncodingTime,
        timestamp: Date.now()
      });
    }

    if (currentMetrics.networkLatency > effectiveThresholds.maxNetworkLatency) {
      newAlerts.push({
        type: 'network',
        severity: currentMetrics.networkLatency > 300 ? 'critical' : 'warning',
        message: `High network latency: ${currentMetrics.networkLatency.toFixed(0)}ms`,
        value: currentMetrics.networkLatency,
        threshold: effectiveThresholds.maxNetworkLatency,
        timestamp: Date.now()
      });
    }

    if (newAlerts.length > 0) {
      setAlerts(prev => [...prev.slice(-20), ...newAlerts]);
      newAlerts.forEach(alert => onAlert?.(alert));

      if (newAlerts.some(a => a.severity === 'critical')) {
        onPerformanceDrop?.(currentMetrics);
      }
    }
  }, [effectiveThresholds, onAlert, onPerformanceDrop]);

  // Calculate performance score
  const calculateScore = useCallback((currentMetrics: PerformanceMetrics): number => {
    let score = 100;

    // FPS contribution (30 points)
    const fpsRatio = Math.min(currentMetrics.fps / 60, 1);
    score -= (1 - fpsRatio) * 30;

    // CPU contribution (25 points)
    const cpuPenalty = Math.max(0, currentMetrics.cpuUsage - 50) / 50;
    score -= cpuPenalty * 25;

    // Memory contribution (20 points)
    const memoryPenalty = Math.max(0, currentMetrics.memoryUsage - 60) / 40;
    score -= memoryPenalty * 20;

    // Network contribution (25 points)
    const latencyPenalty = Math.min(currentMetrics.networkLatency / 300, 1);
    score -= latencyPenalty * 25;

    return Math.max(0, Math.round(score));
  }, []);

  // Collect metrics
  const collectMetrics = useCallback(async () => {
    const now = performance.now();
    const elapsed = now - lastFrameTimeRef.current;
    const fps = (frameCountRef.current / elapsed) * 1000;

    frameCountRef.current = 0;
    lastFrameTimeRef.current = now;

    // Memory metrics
    let heapUsed = 0;
    let heapTotal = 0;
    let memoryUsage = 0;

    if ('memory' in performance) {
      const memory = (performance as Performance & { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      heapUsed = memory.usedJSHeapSize;
      heapTotal = memory.totalJSHeapSize;
      memoryUsage = (heapUsed / memory.jsHeapSizeLimit) * 100;
    }

    // WebRTC stats
    let videoEncodingTime = 0;
    let videoDecodingTime = 0;
    let networkLatency = 0;
    let jitterBuffer = 0;

    if (peerConnectionRef.current) {
      try {
        const stats = await peerConnectionRef.current.getStats();
        stats.forEach(report => {
          if (report.type === 'outbound-rtp' && report.kind === 'video') {
            if (report.totalEncodeTime && report.framesEncoded) {
              videoEncodingTime = (report.totalEncodeTime / report.framesEncoded) * 1000;
            }
          }
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            if (report.totalDecodeTime && report.framesDecoded) {
              videoDecodingTime = (report.totalDecodeTime / report.framesDecoded) * 1000;
            }
            if (report.jitterBufferDelay && report.jitterBufferEmittedCount) {
              jitterBuffer = (report.jitterBufferDelay / report.jitterBufferEmittedCount) * 1000;
            }
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            networkLatency = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : 0;
          }
        });
      } catch {
        // Stats collection failed
      }
    }

    // Estimate CPU usage based on frame timing
    const expectedFrameTime = 16.67; // 60 FPS
    const actualFrameTime = elapsed / Math.max(fps * (elapsed / 1000), 1);
    const cpuUsage = Math.min(100, (actualFrameTime / expectedFrameTime) * 50);

    const newMetrics: PerformanceMetrics = {
      fps,
      cpuUsage,
      memoryUsage,
      heapUsed,
      heapTotal,
      videoEncodingTime,
      videoDecodingTime,
      audioProcessingTime: 0,
      networkLatency,
      jitterBuffer
    };

    setMetrics(newMetrics);
    setPerformanceScore(calculateScore(newMetrics));

    // Add to history
    setHistory(prev => {
      const updated = [...prev, { timestamp: Date.now(), metrics: newMetrics }];
      return updated.slice(-historySize);
    });

    // Check thresholds
    checkThresholds(newMetrics);
  }, [historySize, calculateScore, checkThresholds]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);
    rafIdRef.current = requestAnimationFrame(countFrame);
  }, [isMonitoring, countFrame]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
  }, []);

  // Set peer connection for WebRTC stats
  const setPeerConnection = useCallback((pc: RTCPeerConnection | null) => {
    peerConnectionRef.current = pc;
  }, []);

  // Clear alerts
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Get performance summary
  const getPerformanceSummary = useCallback(() => {
    if (history.length === 0) {
      return null;
    }

    const avgMetrics = history.reduce((acc, h) => ({
      fps: acc.fps + h.metrics.fps / history.length,
      cpuUsage: acc.cpuUsage + h.metrics.cpuUsage / history.length,
      memoryUsage: acc.memoryUsage + h.metrics.memoryUsage / history.length,
      networkLatency: acc.networkLatency + h.metrics.networkLatency / history.length
    }), { fps: 0, cpuUsage: 0, memoryUsage: 0, networkLatency: 0 });

    return {
      averages: avgMetrics,
      score: performanceScore,
      alertCount: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
      duration: history.length > 0 ? 
        (history[history.length - 1].timestamp - history[0].timestamp) / 1000 : 0
    };
  }, [history, performanceScore, alerts]);

  // Sampling interval
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(collectMetrics, sampleInterval);
    return () => clearInterval(interval);
  }, [isMonitoring, sampleInterval, collectMetrics]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return {
    metrics,
    history,
    alerts,
    performanceScore,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    setPeerConnection,
    clearAlerts,
    getPerformanceSummary
  };
}

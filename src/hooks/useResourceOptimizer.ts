import { useState, useEffect, useCallback, useRef } from 'react';

interface ResourceState {
  videoQuality: 'high' | 'medium' | 'low' | 'off';
  audioQuality: 'high' | 'medium' | 'low';
  effectsEnabled: boolean;
  backgroundBlurEnabled: boolean;
  noiseSuppressionEnabled: boolean;
  hardwareAcceleration: boolean;
}

interface ResourceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  batteryLevel: number | null;
  isCharging: boolean | null;
  thermalState: 'nominal' | 'fair' | 'serious' | 'critical' | 'unknown';
}

interface UseResourceOptimizerOptions {
  targetCpuUsage?: number;
  targetMemoryUsage?: number;
  batteryThreshold?: number;
  onOptimizationApplied?: (state: ResourceState) => void;
}

export function useResourceOptimizer(options: UseResourceOptimizerOptions = {}) {
  const {
    targetCpuUsage = 70,
    targetMemoryUsage = 80,
    batteryThreshold = 20,
    onOptimizationApplied
  } = options;

  const [resourceState, setResourceState] = useState<ResourceState>({
    videoQuality: 'high',
    audioQuality: 'high',
    effectsEnabled: true,
    backgroundBlurEnabled: true,
    noiseSuppressionEnabled: true,
    hardwareAcceleration: true
  });

  const [metrics, setMetrics] = useState<ResourceMetrics>({
    cpuUsage: 0,
    memoryUsage: 0,
    batteryLevel: null,
    isCharging: null,
    thermalState: 'unknown'
  });

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationLevel, setOptimizationLevel] = useState(0);

  const optimizationHistoryRef = useRef<Array<{ timestamp: number; level: number }>>([]);

  // Collect resource metrics
  const collectMetrics = useCallback(async () => {
    const newMetrics: ResourceMetrics = {
      cpuUsage: metrics.cpuUsage,
      memoryUsage: 0,
      batteryLevel: null,
      isCharging: null,
      thermalState: 'unknown'
    };

    // Memory usage
    if ('memory' in performance) {
      const memory = (performance as Performance & { memory: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      newMetrics.memoryUsage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    }

    // Battery status
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as Navigator & { getBattery: () => Promise<{ level: number; charging: boolean }> }).getBattery();
        newMetrics.batteryLevel = battery.level * 100;
        newMetrics.isCharging = battery.charging;
      } catch {
        // Battery API not available
      }
    }

    setMetrics(newMetrics);
    return newMetrics;
  }, [metrics.cpuUsage]);

  // Calculate optimization level (0-4)
  const calculateOptimizationLevel = useCallback((currentMetrics: ResourceMetrics): number => {
    let level = 0;

    // CPU pressure
    if (currentMetrics.cpuUsage > targetCpuUsage) {
      level += Math.ceil((currentMetrics.cpuUsage - targetCpuUsage) / 10);
    }

    // Memory pressure
    if (currentMetrics.memoryUsage > targetMemoryUsage) {
      level += Math.ceil((currentMetrics.memoryUsage - targetMemoryUsage) / 10);
    }

    // Battery pressure
    if (currentMetrics.batteryLevel !== null && 
        !currentMetrics.isCharging && 
        currentMetrics.batteryLevel < batteryThreshold) {
      level += 2;
    }

    // Thermal pressure
    if (currentMetrics.thermalState === 'critical') {
      level = 4;
    } else if (currentMetrics.thermalState === 'serious') {
      level = Math.max(level, 3);
    }

    return Math.min(level, 4);
  }, [targetCpuUsage, targetMemoryUsage, batteryThreshold]);

  // Apply optimizations based on level
  const applyOptimizations = useCallback((level: number) => {
    const newState: ResourceState = {
      videoQuality: 'high',
      audioQuality: 'high',
      effectsEnabled: true,
      backgroundBlurEnabled: true,
      noiseSuppressionEnabled: true,
      hardwareAcceleration: true
    };

    switch (level) {
      case 1:
        // Light optimization
        newState.videoQuality = 'medium';
        newState.effectsEnabled = false;
        break;

      case 2:
        // Medium optimization
        newState.videoQuality = 'low';
        newState.effectsEnabled = false;
        newState.backgroundBlurEnabled = false;
        break;

      case 3:
        // Heavy optimization
        newState.videoQuality = 'low';
        newState.audioQuality = 'medium';
        newState.effectsEnabled = false;
        newState.backgroundBlurEnabled = false;
        newState.noiseSuppressionEnabled = false;
        break;

      case 4:
        // Maximum optimization
        newState.videoQuality = 'off';
        newState.audioQuality = 'low';
        newState.effectsEnabled = false;
        newState.backgroundBlurEnabled = false;
        newState.noiseSuppressionEnabled = false;
        newState.hardwareAcceleration = false;
        break;

      default:
        // No optimization needed
        break;
    }

    setResourceState(newState);
    setOptimizationLevel(level);
    onOptimizationApplied?.(newState);

    // Record optimization history
    optimizationHistoryRef.current.push({
      timestamp: Date.now(),
      level
    });

    // Keep last 100 entries
    if (optimizationHistoryRef.current.length > 100) {
      optimizationHistoryRef.current = optimizationHistoryRef.current.slice(-100);
    }
  }, [onOptimizationApplied]);

  // Optimize resources
  const optimize = useCallback(async () => {
    setIsOptimizing(true);

    try {
      const currentMetrics = await collectMetrics();
      const level = calculateOptimizationLevel(currentMetrics);

      // Only apply if level changed
      if (level !== optimizationLevel) {
        applyOptimizations(level);
      }
    } finally {
      setIsOptimizing(false);
    }
  }, [collectMetrics, calculateOptimizationLevel, optimizationLevel, applyOptimizations]);

  // Force specific quality
  const setVideoQuality = useCallback((quality: ResourceState['videoQuality']) => {
    setResourceState(prev => ({ ...prev, videoQuality: quality }));
  }, []);

  const setAudioQuality = useCallback((quality: ResourceState['audioQuality']) => {
    setResourceState(prev => ({ ...prev, audioQuality: quality }));
  }, []);

  const toggleEffects = useCallback((enabled: boolean) => {
    setResourceState(prev => ({ ...prev, effectsEnabled: enabled }));
  }, []);

  const toggleBackgroundBlur = useCallback((enabled: boolean) => {
    setResourceState(prev => ({ ...prev, backgroundBlurEnabled: enabled }));
  }, []);

  const toggleNoiseSuppression = useCallback((enabled: boolean) => {
    setResourceState(prev => ({ ...prev, noiseSuppressionEnabled: enabled }));
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setResourceState({
      videoQuality: 'high',
      audioQuality: 'high',
      effectsEnabled: true,
      backgroundBlurEnabled: true,
      noiseSuppressionEnabled: true,
      hardwareAcceleration: true
    });
    setOptimizationLevel(0);
  }, []);

  // Get optimization report
  const getOptimizationReport = useCallback(() => {
    const history = optimizationHistoryRef.current;
    const avgLevel = history.length > 0
      ? history.reduce((sum, h) => sum + h.level, 0) / history.length
      : 0;

    return {
      currentLevel: optimizationLevel,
      averageLevel: avgLevel,
      optimizationCount: history.length,
      currentState: resourceState,
      metrics,
      recommendations: getRecommendations()
    };

    function getRecommendations(): string[] {
      const recs: string[] = [];

      if (metrics.cpuUsage > 80) {
        recs.push('Close unnecessary browser tabs');
        recs.push('Disable virtual background');
      }

      if (metrics.memoryUsage > 85) {
        recs.push('Reduce number of visible participants');
        recs.push('Disable video effects');
      }

      if (metrics.batteryLevel !== null && metrics.batteryLevel < 20 && !metrics.isCharging) {
        recs.push('Connect to power source');
        recs.push('Consider turning off camera');
      }

      return recs;
    }
  }, [optimizationLevel, resourceState, metrics]);

  // Auto-optimize interval
  useEffect(() => {
    const interval = setInterval(optimize, 5000);
    return () => clearInterval(interval);
  }, [optimize]);

  // Battery change listener
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as Navigator & { getBattery: () => Promise<{ addEventListener: (type: string, handler: () => void) => void; removeEventListener: (type: string, handler: () => void) => void }> })
        .getBattery()
        .then(battery => {
          const handleChange = () => optimize();
          battery.addEventListener('levelchange', handleChange);
          battery.addEventListener('chargingchange', handleChange);

          return () => {
            battery.removeEventListener('levelchange', handleChange);
            battery.removeEventListener('chargingchange', handleChange);
          };
        })
        .catch(() => {
          // Battery API not available
        });
    }
  }, [optimize]);

  return {
    resourceState,
    metrics,
    optimizationLevel,
    isOptimizing,
    optimize,
    setVideoQuality,
    setAudioQuality,
    toggleEffects,
    toggleBackgroundBlur,
    toggleNoiseSuppression,
    resetToDefaults,
    getOptimizationReport
  };
}

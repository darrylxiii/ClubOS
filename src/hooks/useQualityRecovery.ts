import { useState, useCallback, useRef, useEffect } from 'react';

type QualityLevel = 'high' | 'medium' | 'low' | 'audio-only';

interface QualityState {
  current: QualityLevel;
  target: QualityLevel;
  isRecovering: boolean;
  degradedAt: number | null;
  recoveryStartedAt: number | null;
}

interface NetworkConditions {
  rtt: number;
  packetLoss: number;
  bandwidth: number;
  jitter: number;
}

interface UseQualityRecoveryConfig {
  stabilityThresholdMs: number;      // Time network must be stable before recovery
  recoveryStepIntervalMs: number;    // Time between quality upgrade steps
  hysteresisMargin: number;          // Margin to prevent oscillation (0-1)
  maxRecoveryAttempts: number;       // Max attempts before giving up
}

interface UseQualityRecoveryReturn {
  qualityState: QualityState;
  networkConditions: NetworkConditions | null;
  updateNetworkConditions: (conditions: NetworkConditions) => void;
  forceQuality: (level: QualityLevel) => void;
  resetRecovery: () => void;
  getQualityBitrate: (level: QualityLevel) => number;
  getQualityResolution: (level: QualityLevel) => { width: number; height: number };
}

const DEFAULT_CONFIG: UseQualityRecoveryConfig = {
  stabilityThresholdMs: 10000,       // 10 seconds stable
  recoveryStepIntervalMs: 5000,      // 5 seconds between steps
  hysteresisMargin: 0.15,            // 15% margin
  maxRecoveryAttempts: 3,
};

const QUALITY_THRESHOLDS = {
  high: { minBandwidth: 1500000, maxRtt: 100, maxPacketLoss: 0.02 },
  medium: { minBandwidth: 600000, maxRtt: 200, maxPacketLoss: 0.05 },
  low: { minBandwidth: 200000, maxRtt: 400, maxPacketLoss: 0.10 },
  'audio-only': { minBandwidth: 50000, maxRtt: 1000, maxPacketLoss: 0.20 },
};

const QUALITY_SETTINGS = {
  high: { bitrate: 1500000, width: 1280, height: 720 },
  medium: { bitrate: 600000, width: 640, height: 480 },
  low: { bitrate: 200000, width: 320, height: 240 },
  'audio-only': { bitrate: 0, width: 0, height: 0 },
};

const QUALITY_ORDER: QualityLevel[] = ['audio-only', 'low', 'medium', 'high'];

export function useQualityRecovery(
  config: Partial<UseQualityRecoveryConfig> = {}
): UseQualityRecoveryReturn {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [qualityState, setQualityState] = useState<QualityState>({
    current: 'high',
    target: 'high',
    isRecovering: false,
    degradedAt: null,
    recoveryStartedAt: null,
  });
  
  const [networkConditions, setNetworkConditions] = useState<NetworkConditions | null>(null);

  const configRef = useRef(mergedConfig);
  const historyRef = useRef<NetworkConditions[]>([]);
  const recoveryAttemptsRef = useRef(0);
  const recoveryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stabilityTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    configRef.current = mergedConfig;
  }, [mergedConfig]);

  useEffect(() => {
    return () => {
      if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
      if (stabilityTimerRef.current) clearTimeout(stabilityTimerRef.current);
    };
  }, []);

  const determineOptimalQuality = useCallback((conditions: NetworkConditions): QualityLevel => {
    const config = configRef.current;
    
    for (let i = QUALITY_ORDER.length - 1; i >= 0; i--) {
      const level = QUALITY_ORDER[i];
      const thresholds = QUALITY_THRESHOLDS[level];
      
      // Apply hysteresis margin when checking for upgrade
      const bandwidthMargin = qualityState.isRecovering ? config.hysteresisMargin : 0;
      const effectiveMinBandwidth = thresholds.minBandwidth * (1 + bandwidthMargin);
      
      if (
        conditions.bandwidth >= effectiveMinBandwidth &&
        conditions.rtt <= thresholds.maxRtt &&
        conditions.packetLoss <= thresholds.maxPacketLoss
      ) {
        return level;
      }
    }
    
    return 'audio-only';
  }, [qualityState.isRecovering]);

  const isNetworkStable = useCallback((): boolean => {
    const history = historyRef.current;
    if (history.length < 5) return false;
    
    const recentHistory = history.slice(-5);
    const avgBandwidth = recentHistory.reduce((sum, c) => sum + c.bandwidth, 0) / recentHistory.length;
    const avgRtt = recentHistory.reduce((sum, c) => sum + c.rtt, 0) / recentHistory.length;
    
    // Check for stability (low variance)
    const bandwidthVariance = recentHistory.reduce(
      (sum, c) => sum + Math.pow(c.bandwidth - avgBandwidth, 2), 0
    ) / recentHistory.length;
    
    const rttVariance = recentHistory.reduce(
      (sum, c) => sum + Math.pow(c.rtt - avgRtt, 2), 0
    ) / recentHistory.length;
    
    // Stability thresholds
    const bandwidthStable = Math.sqrt(bandwidthVariance) / avgBandwidth < 0.2;
    const rttStable = Math.sqrt(rttVariance) < 50;
    
    return bandwidthStable && rttStable;
  }, []);

  const startRecovery = useCallback(() => {
    const config = configRef.current;
    
    if (recoveryAttemptsRef.current >= config.maxRecoveryAttempts) {
      console.log('Max recovery attempts reached, staying at current quality');
      return;
    }

    setQualityState(prev => ({
      ...prev,
      isRecovering: true,
      recoveryStartedAt: Date.now(),
    }));

    recoveryTimerRef.current = setInterval(() => {
      setQualityState(prev => {
        const currentIndex = QUALITY_ORDER.indexOf(prev.current);
        const targetIndex = QUALITY_ORDER.indexOf(prev.target);
        
        if (currentIndex >= targetIndex) {
          // Recovery complete
          if (recoveryTimerRef.current) {
            clearInterval(recoveryTimerRef.current);
            recoveryTimerRef.current = null;
          }
          recoveryAttemptsRef.current = 0;
          return {
            ...prev,
            isRecovering: false,
            recoveryStartedAt: null,
          };
        }
        
        // Step up one quality level
        const nextLevel = QUALITY_ORDER[currentIndex + 1];
        console.log(`Quality recovery: ${prev.current} -> ${nextLevel}`);
        
        return {
          ...prev,
          current: nextLevel,
        };
      });
    }, config.recoveryStepIntervalMs);
  }, []);

  const updateNetworkConditions = useCallback((conditions: NetworkConditions) => {
    setNetworkConditions(conditions);
    historyRef.current.push(conditions);
    
    // Keep last 20 samples
    if (historyRef.current.length > 20) {
      historyRef.current = historyRef.current.slice(-20);
    }

    const optimalQuality = determineOptimalQuality(conditions);
    const config = configRef.current;

    setQualityState(prev => {
      const currentIndex = QUALITY_ORDER.indexOf(prev.current);
      const optimalIndex = QUALITY_ORDER.indexOf(optimalQuality);

      // Degradation: immediate response
      if (optimalIndex < currentIndex) {
        if (recoveryTimerRef.current) {
          clearInterval(recoveryTimerRef.current);
          recoveryTimerRef.current = null;
        }
        if (stabilityTimerRef.current) {
          clearTimeout(stabilityTimerRef.current);
          stabilityTimerRef.current = null;
        }
        
        recoveryAttemptsRef.current++;
        console.log(`Quality degraded: ${prev.current} -> ${optimalQuality}`);
        
        return {
          current: optimalQuality,
          target: prev.target,
          isRecovering: false,
          degradedAt: Date.now(),
          recoveryStartedAt: null,
        };
      }

      // Recovery opportunity: wait for stability
      if (optimalIndex > currentIndex && !prev.isRecovering) {
        if (!stabilityTimerRef.current) {
          stabilityTimerRef.current = setTimeout(() => {
            if (isNetworkStable()) {
              setQualityState(p => ({ ...p, target: optimalQuality }));
              startRecovery();
            }
            stabilityTimerRef.current = null;
          }, config.stabilityThresholdMs);
        }
      }

      return {
        ...prev,
        target: optimalQuality,
      };
    });
  }, [determineOptimalQuality, isNetworkStable, startRecovery]);

  const forceQuality = useCallback((level: QualityLevel) => {
    if (recoveryTimerRef.current) {
      clearInterval(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
    if (stabilityTimerRef.current) {
      clearTimeout(stabilityTimerRef.current);
      stabilityTimerRef.current = null;
    }

    setQualityState({
      current: level,
      target: level,
      isRecovering: false,
      degradedAt: null,
      recoveryStartedAt: null,
    });
  }, []);

  const resetRecovery = useCallback(() => {
    recoveryAttemptsRef.current = 0;
    historyRef.current = [];
    forceQuality('high');
  }, [forceQuality]);

  const getQualityBitrate = useCallback((level: QualityLevel): number => {
    return QUALITY_SETTINGS[level].bitrate;
  }, []);

  const getQualityResolution = useCallback((level: QualityLevel): { width: number; height: number } => {
    const settings = QUALITY_SETTINGS[level];
    return { width: settings.width, height: settings.height };
  }, []);

  return {
    qualityState,
    networkConditions,
    updateNetworkConditions,
    forceQuality,
    resetRecovery,
    getQualityBitrate,
    getQualityResolution,
  };
}

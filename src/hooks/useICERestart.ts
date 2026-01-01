import { useState, useCallback, useRef, useEffect } from 'react';

interface ICERestartState {
  isRestarting: boolean;
  lastRestartAt: number | null;
  restartCount: number;
  consecutiveFailures: number;
  status: 'idle' | 'gathering' | 'checking' | 'connected' | 'failed';
}

interface UseICERestartConfig {
  maxConsecutiveFailures: number;
  restartCooldownMs: number;
  gatheringTimeoutMs: number;
  connectionTimeoutMs: number;
}

interface UseICERestartReturn {
  state: ICERestartState;
  initiateRestart: (peerConnection: RTCPeerConnection) => Promise<boolean>;
  resetState: () => void;
  canRestart: () => boolean;
  getRestartStats: () => {
    totalRestarts: number;
    successRate: number;
    avgRestartTime: number;
  };
}

const DEFAULT_CONFIG: UseICERestartConfig = {
  maxConsecutiveFailures: 3,
  restartCooldownMs: 2000,
  gatheringTimeoutMs: 5000,
  connectionTimeoutMs: 10000,
};

export function useICERestart(
  config: Partial<UseICERestartConfig> = {}
): UseICERestartReturn {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [state, setState] = useState<ICERestartState>({
    isRestarting: false,
    lastRestartAt: null,
    restartCount: 0,
    consecutiveFailures: 0,
    status: 'idle',
  });

  const configRef = useRef(mergedConfig);
  const restartTimesRef = useRef<number[]>([]);
  const successCountRef = useRef(0);

  useEffect(() => {
    configRef.current = mergedConfig;
  }, [mergedConfig]);

  const canRestart = useCallback((): boolean => {
    const config = configRef.current;
    
    if (state.isRestarting) return false;
    if (state.consecutiveFailures >= config.maxConsecutiveFailures) return false;
    
    if (state.lastRestartAt) {
      const timeSinceLastRestart = Date.now() - state.lastRestartAt;
      if (timeSinceLastRestart < config.restartCooldownMs) return false;
    }
    
    return true;
  }, [state]);

  const initiateRestart = useCallback(async (
    peerConnection: RTCPeerConnection
  ): Promise<boolean> => {
    if (!canRestart()) {
      console.warn('ICE restart blocked: conditions not met');
      return false;
    }

    const startTime = Date.now();
    const config = configRef.current;

    setState(prev => ({
      ...prev,
      isRestarting: true,
      status: 'gathering',
      lastRestartAt: startTime,
      restartCount: prev.restartCount + 1,
    }));

    console.log('Initiating ICE restart...');

    try {
      // Create offer with ICE restart flag
      const offer = await peerConnection.createOffer({ iceRestart: true });
      await peerConnection.setLocalDescription(offer);

      setState(prev => ({ ...prev, status: 'gathering' }));

      // Wait for ICE gathering to complete or timeout
      const gatheringComplete = await waitForGathering(
        peerConnection,
        config.gatheringTimeoutMs
      );

      if (!gatheringComplete) {
        throw new Error('ICE gathering timeout');
      }

      setState(prev => ({ ...prev, status: 'checking' }));

      // Wait for connection to be established
      const connected = await waitForConnection(
        peerConnection,
        config.connectionTimeoutMs
      );

      if (!connected) {
        throw new Error('ICE connection timeout');
      }

      const restartTime = Date.now() - startTime;
      restartTimesRef.current.push(restartTime);
      successCountRef.current++;

      console.log(`ICE restart successful in ${restartTime}ms`);

      setState(prev => ({
        ...prev,
        isRestarting: false,
        status: 'connected',
        consecutiveFailures: 0,
      }));

      return true;
    } catch (error) {
      console.error('ICE restart failed:', error);

      setState(prev => ({
        ...prev,
        isRestarting: false,
        status: 'failed',
        consecutiveFailures: prev.consecutiveFailures + 1,
      }));

      return false;
    }
  }, [canRestart]);

  const waitForGathering = (
    pc: RTCPeerConnection,
    timeout: number
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve(true);
        return;
      }

      const timeoutId = setTimeout(() => {
        pc.removeEventListener('icegatheringstatechange', handler);
        resolve(false);
      }, timeout);

      const handler = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timeoutId);
          pc.removeEventListener('icegatheringstatechange', handler);
          resolve(true);
        }
      };

      pc.addEventListener('icegatheringstatechange', handler);
    });
  };

  const waitForConnection = (
    pc: RTCPeerConnection,
    timeout: number
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      const successStates = ['connected', 'completed'];
      
      if (successStates.includes(pc.iceConnectionState)) {
        resolve(true);
        return;
      }

      const timeoutId = setTimeout(() => {
        pc.removeEventListener('iceconnectionstatechange', handler);
        resolve(false);
      }, timeout);

      const handler = () => {
        if (successStates.includes(pc.iceConnectionState)) {
          clearTimeout(timeoutId);
          pc.removeEventListener('iceconnectionstatechange', handler);
          resolve(true);
        } else if (pc.iceConnectionState === 'failed') {
          clearTimeout(timeoutId);
          pc.removeEventListener('iceconnectionstatechange', handler);
          resolve(false);
        }
      };

      pc.addEventListener('iceconnectionstatechange', handler);
    });
  };

  const resetState = useCallback(() => {
    setState({
      isRestarting: false,
      lastRestartAt: null,
      restartCount: 0,
      consecutiveFailures: 0,
      status: 'idle',
    });
    restartTimesRef.current = [];
    successCountRef.current = 0;
  }, []);

  const getRestartStats = useCallback(() => {
    const totalRestarts = state.restartCount;
    const successRate = totalRestarts > 0
      ? (successCountRef.current / totalRestarts) * 100
      : 100;
    const avgRestartTime = restartTimesRef.current.length > 0
      ? restartTimesRef.current.reduce((a, b) => a + b, 0) / restartTimesRef.current.length
      : 0;

    return {
      totalRestarts,
      successRate,
      avgRestartTime,
    };
  }, [state.restartCount]);

  return {
    state,
    initiateRestart,
    resetState,
    canRestart,
    getRestartStats,
  };
}

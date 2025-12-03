import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

type ReconnectionState = 'connected' | 'reconnecting' | 'failed';

interface ReconnectionConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  onReconnect: () => Promise<boolean>;
  onReconnectSuccess?: () => void;
  onReconnectFailed?: () => void;
}

const DEFAULT_CONFIG: ReconnectionConfig = {
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  onReconnect: async () => false
};

/**
 * Exponential backoff reconnection hook for meetings
 * Implements Discord/Zoom-like reconnection behavior
 */
export function useMeetingReconnection(config: Partial<ReconnectionConfig> = {}) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [state, setState] = useState<ReconnectionState>('connected');
  const [retryCount, setRetryCount] = useState(0);
  const [nextRetryIn, setNextRetryIn] = useState<number | null>(null);
  
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnectingRef = useRef(false);
  const abortedRef = useRef(false);

  const calculateDelay = useCallback((attempt: number): number => {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s... capped at maxDelay
    const delay = Math.min(
      fullConfig.baseDelay * Math.pow(2, attempt),
      fullConfig.maxDelay
    );
    // Add jitter (±20%) to prevent thundering herd
    const jitter = delay * 0.2 * (Math.random() * 2 - 1);
    return Math.round(delay + jitter);
  }, [fullConfig.baseDelay, fullConfig.maxDelay]);

  const clearTimers = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const attemptReconnect = useCallback(async (): Promise<boolean> => {
    if (abortedRef.current) return false;
    
    try {
      console.log(`[Reconnection] Attempting reconnect... (attempt ${retryCount + 1}/${fullConfig.maxRetries})`);
      toast.loading(`Reconnecting... (${retryCount + 1}/${fullConfig.maxRetries})`, { id: 'meeting-reconnect' });
      
      const success = await fullConfig.onReconnect();
      
      if (success) {
        console.log('[Reconnection] ✅ Reconnect successful');
        setState('connected');
        setRetryCount(0);
        setNextRetryIn(null);
        isReconnectingRef.current = false;
        toast.success('Reconnected successfully', { id: 'meeting-reconnect' });
        fullConfig.onReconnectSuccess?.();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[Reconnection] ❌ Reconnect attempt failed:', error);
      return false;
    }
  }, [fullConfig, retryCount]);

  const startReconnection = useCallback(async () => {
    if (isReconnectingRef.current) {
      console.log('[Reconnection] Already reconnecting, skipping');
      return;
    }
    
    isReconnectingRef.current = true;
    abortedRef.current = false;
    setState('reconnecting');
    
    // Try immediate reconnect first
    const immediateSuccess = await attemptReconnect();
    if (immediateSuccess) return;
    
    // Start retry loop
    const retryLoop = async (attempt: number) => {
      if (abortedRef.current || attempt >= fullConfig.maxRetries) {
        if (!abortedRef.current) {
          setState('failed');
          isReconnectingRef.current = false;
          toast.error('Connection failed. Please refresh the page.', { id: 'meeting-reconnect' });
          fullConfig.onReconnectFailed?.();
        }
        return;
      }
      
      setRetryCount(attempt);
      const delay = calculateDelay(attempt);
      
      // Start countdown
      let remaining = delay;
      setNextRetryIn(remaining);
      
      countdownRef.current = setInterval(() => {
        remaining -= 1000;
        setNextRetryIn(Math.max(0, remaining));
      }, 1000);
      
      retryTimeoutRef.current = setTimeout(async () => {
        clearTimers();
        
        if (abortedRef.current) return;
        
        const success = await attemptReconnect();
        if (!success) {
          retryLoop(attempt + 1);
        }
      }, delay);
    };
    
    retryLoop(1);
  }, [attemptReconnect, calculateDelay, clearTimers, fullConfig.maxRetries, fullConfig.onReconnectFailed]);

  const cancelReconnection = useCallback(() => {
    abortedRef.current = true;
    clearTimers();
    setState('connected');
    setRetryCount(0);
    setNextRetryIn(null);
    isReconnectingRef.current = false;
    toast.dismiss('meeting-reconnect');
  }, [clearTimers]);

  const forceReconnect = useCallback(async () => {
    clearTimers();
    setRetryCount(0);
    isReconnectingRef.current = false;
    abortedRef.current = false;
    await startReconnection();
  }, [clearTimers, startReconnection]);

  const handleConnectionStateChange = useCallback((connectionState: RTCPeerConnectionState) => {
    switch (connectionState) {
      case 'connected':
        if (state === 'reconnecting') {
          cancelReconnection();
        }
        setState('connected');
        break;
        
      case 'disconnected':
        // Wait a bit before reconnecting (connection might recover)
        if (state !== 'reconnecting') {
          setTimeout(() => {
            if (!abortedRef.current) {
              startReconnection();
            }
          }, 2000);
        }
        break;
        
      case 'failed':
        startReconnection();
        break;
        
      case 'closed':
        // Connection intentionally closed, don't reconnect
        cancelReconnection();
        break;
    }
  }, [state, startReconnection, cancelReconnection]);

  return {
    state,
    retryCount,
    nextRetryIn,
    isReconnecting: state === 'reconnecting',
    startReconnection,
    cancelReconnection,
    forceReconnect,
    handleConnectionStateChange,
    maxRetries: fullConfig.maxRetries
  };
}

import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export type ReconnectionState = 'connected' | 'reconnecting' | 'failed';

interface ReconnectionConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  onReconnect: () => Promise<void>;
  onMaxRetriesReached: () => void;
}

const DEFAULT_CONFIG: ReconnectionConfig = {
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  onReconnect: async () => {},
  onMaxRetriesReached: () => {}
};

export function useWebRTCReconnection(config: Partial<ReconnectionConfig> = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [state, setState] = useState<ReconnectionState>('connected');
  const [retryCount, setRetryCount] = useState(0);
  const [nextRetryIn, setNextRetryIn] = useState(0);
  
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnectingRef = useRef(false);

  // Calculate delay with exponential backoff
  const calculateDelay = useCallback((attempt: number): number => {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s... capped at maxDelay
    const delay = Math.min(
      mergedConfig.baseDelay * Math.pow(2, attempt),
      mergedConfig.maxDelay
    );
    // Add jitter (±20%) to prevent thundering herd
    const jitter = delay * 0.2 * (Math.random() * 2 - 1);
    return Math.round(delay + jitter);
  }, [mergedConfig.baseDelay, mergedConfig.maxDelay]);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // Start reconnection process
  const startReconnection = useCallback(async (reason?: string) => {
    if (isReconnectingRef.current) {
      logger.debug('Already reconnecting, skipping', { componentName: 'Reconnection' });
      return;
    }

    logger.info('Starting reconnection', { componentName: 'Reconnection', reason, retryCount });
    isReconnectingRef.current = true;
    setState('reconnecting');

    // Attempt immediate reconnection first
    try {
      await mergedConfig.onReconnect();
      // Success!
      logger.info('Reconnected successfully', { componentName: 'Reconnection' });
      isReconnectingRef.current = false;
      setState('connected');
      setRetryCount(0);
      setNextRetryIn(0);
      return;
    } catch (error) {
      logger.warn('Immediate reconnect failed', { componentName: 'Reconnection', error });
    }

    // Start retry loop
    const attemptReconnect = async (attempt: number) => {
      if (attempt >= mergedConfig.maxRetries) {
        logger.error('Max retries reached', new Error('Max retries reached'), { componentName: 'Reconnection' });
        setState('failed');
        setRetryCount(attempt);
        isReconnectingRef.current = false;
        mergedConfig.onMaxRetriesReached();
        
        toast.error('Connection lost. Please refresh the page to reconnect.', {
          duration: 10000,
          id: 'reconnection-failed'
        });
        return;
      }

      setRetryCount(attempt);
      const delay = calculateDelay(attempt);
      
      logger.debug(`Attempt ${attempt + 1}/${mergedConfig.maxRetries} in ${delay}ms`, { componentName: 'Reconnection', attempt, delay });

      // Start countdown
      let remaining = Math.ceil(delay / 1000);
      setNextRetryIn(remaining);
      
      countdownIntervalRef.current = setInterval(() => {
        remaining--;
        setNextRetryIn(remaining);
        if (remaining <= 0) {
          clearInterval(countdownIntervalRef.current!);
        }
      }, 1000);

      // Schedule retry
      retryTimeoutRef.current = setTimeout(async () => {
        clearInterval(countdownIntervalRef.current!);
        setNextRetryIn(0);

        try {
          await mergedConfig.onReconnect();
          // Success!
          logger.info(`Reconnected on attempt ${attempt + 1}`, { componentName: 'Reconnection', attempt });
          isReconnectingRef.current = false;
          setState('connected');
          setRetryCount(0);
          
          toast.success('Reconnected successfully!', {
            id: 'reconnection-success',
            duration: 3000
          });
        } catch (error) {
          logger.warn(`Attempt ${attempt + 1} failed`, { componentName: 'Reconnection', attempt, error });
          // Try next attempt
          attemptReconnect(attempt + 1);
        }
      }, delay);
    };

    // Start first retry
    attemptReconnect(0);
  }, [mergedConfig, calculateDelay, clearTimers]);

  // Cancel reconnection
  const cancelReconnection = useCallback(() => {
    logger.debug('Cancelling reconnection', { componentName: 'Reconnection' });
    clearTimers();
    isReconnectingRef.current = false;
    setState('connected');
    setRetryCount(0);
    setNextRetryIn(0);
  }, [clearTimers]);

  // Handle connection state change from RTCPeerConnection
  const handleConnectionStateChange = useCallback((
    connectionState: RTCPeerConnectionState,
    iceConnectionState: RTCIceConnectionState
  ) => {
    logger.debug('Connection state changed', { componentName: 'Reconnection', connectionState, iceConnectionState });

    switch (connectionState) {
      case 'connected':
        if (state === 'reconnecting') {
          cancelReconnection();
        }
        setState('connected');
        break;

      case 'disconnected':
        // Brief disconnection - wait before reconnecting
        if (state === 'connected') {
          logger.info('Connection disconnected, waiting before reconnect', { componentName: 'Reconnection' });
          retryTimeoutRef.current = setTimeout(() => {
            startReconnection('disconnected');
          }, 2000); // Wait 2s before starting reconnection
        }
        break;

      case 'failed':
        // Connection failed - start immediate reconnection
        startReconnection('failed');
        break;

      case 'closed':
        // Intentional close - don't reconnect
        cancelReconnection();
        break;
    }

    // Also handle ICE connection state
    if (iceConnectionState === 'disconnected' && state === 'connected') {
      // ICE restart might help
      logger.debug('ICE disconnected, may need restart', { componentName: 'Reconnection' });
    }
  }, [state, startReconnection, cancelReconnection]);

  // Force reconnect (user-initiated)
  const forceReconnect = useCallback(async () => {
    logger.info('Force reconnect requested', { componentName: 'Reconnection' });
    clearTimers();
    setRetryCount(0);
    isReconnectingRef.current = false;
    await startReconnection('manual');
  }, [clearTimers, startReconnection]);

  return {
    state,
    retryCount,
    nextRetryIn,
    maxRetries: mergedConfig.maxRetries,
    isReconnecting: state === 'reconnecting',
    isFailed: state === 'failed',
    startReconnection,
    cancelReconnection,
    handleConnectionStateChange,
    forceReconnect
  };
}

import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string | null;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
}

interface NetworkInformation extends EventTarget {
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  downlink: number;
  rtt: number;
  saveData: boolean;
  type?: string;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
  }
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSlowConnection: false,
    connectionType: null,
    effectiveType: null,
    downlink: null,
    rtt: null
  });

  const updateNetworkInfo = useCallback(() => {
    const connection = navigator.connection;
    
    const newStatus: NetworkStatus = {
      isOnline: navigator.onLine,
      isSlowConnection: false,
      connectionType: connection?.type || null,
      effectiveType: connection?.effectiveType || null,
      downlink: connection?.downlink || null,
      rtt: connection?.rtt || null
    };

    // Determine if connection is slow
    if (connection) {
      newStatus.isSlowConnection = 
        connection.effectiveType === 'slow-2g' ||
        connection.effectiveType === '2g' ||
        connection.rtt > 500 ||
        connection.downlink < 0.5;
    }

    setStatus(newStatus);
  }, []);

  useEffect(() => {
    // Initial update
    updateNetworkInfo();

    // Listen for online/offline events
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes
    const connection = navigator.connection;
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, [updateNetworkInfo]);

  return status;
}

// Hook to show offline indicator
export function useOfflineIndicator() {
  const { isOnline } = useNetworkStatus();
  const [showOffline, setShowOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowOffline(true);
    } else {
      // Delay hiding to show "back online" message
      const timeout = setTimeout(() => setShowOffline(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [isOnline]);

  return { isOnline, showOffline };
}

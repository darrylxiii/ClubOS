import { useEffect, useState, useCallback, useRef } from 'react';

const DISMISS_STORAGE_KEY = 'pwa-update-dismissed';
const DISMISS_DURATION_MS = 60 * 60 * 1000; // Re-show after 1 hour

interface PWAUpdateState {
  isUpdateAvailable: boolean;
  isUpdating: boolean;
  lastDismissed: number | null;
}

export function usePWAUpdate() {
  const [state, setState] = useState<PWAUpdateState>({
    isUpdateAvailable: false,
    isUpdating: false,
    lastDismissed: null,
  });
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    // Check if previously dismissed and if enough time has passed
    const dismissedAt = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const now = Date.now();
      if (now - dismissedTime < DISMISS_DURATION_MS) {
        setState(prev => ({ ...prev, lastDismissed: dismissedTime }));
        return; // Don't show banner yet
      } else {
        // Clear old dismissal
        localStorage.removeItem(DISMISS_STORAGE_KEY);
      }
    }

    if (!('serviceWorker' in navigator)) return;

    const handleControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    navigator.serviceWorker.ready.then((registration) => {
      // Listen for new updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              waitingWorkerRef.current = newWorker;
              setState(prev => ({ ...prev, isUpdateAvailable: true }));
            }
          });
        }
      });

      // Check for existing waiting worker
      if (registration.waiting) {
        waitingWorkerRef.current = registration.waiting;
        setState(prev => ({ ...prev, isUpdateAvailable: true }));
      }
    });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const updateNow = useCallback(() => {
    if (waitingWorkerRef.current) {
      setState(prev => ({ ...prev, isUpdating: true }));
      waitingWorkerRef.current.postMessage({ type: 'SKIP_WAITING' });
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    const now = Date.now();
    localStorage.setItem(DISMISS_STORAGE_KEY, now.toString());
    setState(prev => ({ 
      ...prev, 
      isUpdateAvailable: false, 
      lastDismissed: now 
    }));
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return false;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
      return true;
    } catch (error) {
      console.error('Failed to check for updates:', error);
      return false;
    }
  }, []);

  return {
    isUpdateAvailable: state.isUpdateAvailable,
    isUpdating: state.isUpdating,
    lastDismissed: state.lastDismissed,
    updateNow,
    dismissUpdate,
    checkForUpdates,
  };
}

import { useEffect, useState, useCallback, useRef } from 'react';

const DISMISS_STORAGE_KEY = 'pwa-update-dismissed';
const DISMISS_DURATION_MS = 60 * 60 * 1000; // Re-show after 1 hour

interface PWAUpdateState {
  isUpdateAvailable: boolean;
  isUpdating: boolean;
  lastDismissed: number | null;
}

/**
 * Completely unregisters all service workers and clears all caches.
 * This is a recovery mechanism for users stuck on stale cached versions.
 */
export async function resetOfflineCache(): Promise<boolean> {
  try {
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
    }
    
    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    // Clear localStorage PWA-related items
    localStorage.removeItem(DISMISS_STORAGE_KEY);
    localStorage.removeItem('pwa-install-dismissed');
    
    console.log('[PWA] Cache reset complete. Reloading...');
    
    // Force reload from server
    window.location.reload();
    return true;
  } catch (error) {
    console.error('[PWA] Failed to reset cache:', error);
    return false;
  }
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
      // Don't auto-reload if user is in a critical flow (onboarding, checkout, etc.)
      const inCriticalFlow = sessionStorage.getItem('pwa-critical-flow-active') === 'true';
      if (inCriticalFlow) {
        console.log('[PWA] Update available but user in critical flow - deferring reload');
        setState(prev => ({ ...prev, isUpdateAvailable: true }));
        return;
      }
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
    resetOfflineCache,
  };
}

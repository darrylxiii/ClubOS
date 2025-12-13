import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function UpdateAvailableBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Listen for new service worker updates
      const handleControllerChange = () => {
        // New service worker has taken control
        window.location.reload();
      };

      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

      // Check for updates when page loads
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New update available
                setWaitingWorker(newWorker);
                setUpdateAvailable(true);
              }
            });
          }
        });

        // Check if there's already a waiting worker
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setUpdateAvailable(true);
        }
      });

      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      };
    }
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
  };

  if (!updateAvailable) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -100 }}
        className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm"
      >
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-xl border border-primary/20 rounded-xl shadow-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/20 rounded-lg shrink-0">
              <RefreshCw className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm">
                Update Available
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                A new version of The Quantum Club is ready
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-muted rounded-md transition-colors shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              onClick={handleUpdate}
              size="sm"
              className="flex-1 gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Update Now
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
            >
              Later
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

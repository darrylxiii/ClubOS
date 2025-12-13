import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Cloud, CloudOff } from 'lucide-react';

interface OfflineIndicatorProps {
  pendingActions?: number;
  isSyncing?: boolean;
}

export function OfflineIndicator({ pendingActions = 0, isSyncing = false }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Show briefly then hide
      setShowIndicator(true);
      setTimeout(() => setShowIndicator(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
      setShowIndicator(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Also show when there are pending actions
  const shouldShow = showIndicator || pendingActions > 0 || isSyncing;

  if (!shouldShow && isOnline) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed bottom-20 left-4 z-40 md:bottom-4"
      >
        <div
          className={`
            flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium shadow-lg backdrop-blur-xl
            ${isOnline 
              ? isSyncing 
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-destructive/20 text-destructive border border-destructive/30'
            }
          `}
        >
          {isOnline ? (
            isSyncing ? (
              <>
                <Cloud className="w-4 h-4 animate-pulse" />
                <span>Syncing...</span>
              </>
            ) : pendingActions > 0 ? (
              <>
                <Cloud className="w-4 h-4" />
                <span>{pendingActions} pending</span>
              </>
            ) : (
              <>
                <Cloud className="w-4 h-4" />
                <span>Back online</span>
              </>
            )
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              <span>Offline{pendingActions > 0 ? ` (${pendingActions} pending)` : ''}</span>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NetworkErrorRecoveryProps {
  onRetry?: () => Promise<void>;
  error?: Error | null;
  showOfflineBanner?: boolean;
  className?: string;
}

/**
 * Network Error Recovery Component
 * Provides offline detection, retry UI, and automatic reconnection
 */
export function NetworkErrorRecovery({
  onRetry,
  error,
  showOfflineBanner = true,
  className,
}: NetworkErrorRecoveryProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showBanner, setShowBanner] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<'idle' | 'retrying' | 'success' | 'failed'>('idle');

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(true);
      setRecoveryStatus('success');
      
      // Auto-hide success banner after 3 seconds
      setTimeout(() => {
        setShowBanner(false);
        setRecoveryStatus('idle');
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
      setRecoveryStatus('idle');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Retry handler with exponential backoff
  const handleRetry = useCallback(async () => {
    if (!onRetry || isRetrying) return;

    setIsRetrying(true);
    setRecoveryStatus('retrying');
    setRetryCount((prev) => prev + 1);

    try {
      await onRetry();
      setRecoveryStatus('success');
      setRetryCount(0);
      
      setTimeout(() => {
        setRecoveryStatus('idle');
      }, 2000);
    } catch {
      setRecoveryStatus('failed');
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, isRetrying]);

  // Auto-retry when coming back online
  useEffect(() => {
    if (isOnline && error && onRetry && retryCount < 3) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
      const timer = setTimeout(handleRetry, delay);
      return () => clearTimeout(timer);
    }
  }, [isOnline, error, onRetry, retryCount, handleRetry]);

  if (!showOfflineBanner && !error) return null;

  return (
    <>
      {/* Offline Banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              'fixed top-0 left-0 right-0 z-50 px-4 py-3',
              !isOnline && 'bg-destructive',
              isOnline && recoveryStatus === 'success' && 'bg-green-600',
              className
            )}
          >
            <div className="container mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                {!isOnline ? (
                  <>
                    <WifiOff className="h-5 w-5 text-destructive-foreground" />
                    <span className="text-sm font-medium text-destructive-foreground">
                      You're offline. Some features may not work.
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 text-white" />
                    <span className="text-sm font-medium text-white">
                      Back online!
                    </span>
                  </>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBanner(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Recovery Card */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'rounded-lg border border-border bg-card p-6 shadow-lg',
            className
          )}
        >
          <div className="flex flex-col items-center text-center">
            <div
              className={cn(
                'mb-4 rounded-full p-3',
                recoveryStatus === 'success' && 'bg-green-100 dark:bg-green-900/30',
                recoveryStatus === 'failed' && 'bg-destructive/10',
                recoveryStatus === 'retrying' && 'bg-amber-100 dark:bg-amber-900/30',
                recoveryStatus === 'idle' && 'bg-muted'
              )}
            >
              {recoveryStatus === 'success' ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : recoveryStatus === 'retrying' ? (
                <RefreshCw className="h-8 w-8 text-amber-600 animate-spin" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-destructive" />
              )}
            </div>

            <h3 className="mb-2 text-lg font-semibold text-foreground">
              {recoveryStatus === 'success'
                ? 'Connection Restored'
                : recoveryStatus === 'retrying'
                ? 'Reconnecting...'
                : 'Connection Error'}
            </h3>

            <p className="mb-4 text-sm text-muted-foreground">
              {recoveryStatus === 'success'
                ? 'Everything is working again.'
                : recoveryStatus === 'retrying'
                ? `Attempt ${retryCount} of 3...`
                : 'We had trouble connecting. Please check your internet connection.'}
            </p>

            {recoveryStatus !== 'success' && onRetry && (
              <div className="flex gap-3">
                <Button
                  onClick={handleRetry}
                  disabled={isRetrying || !isOnline}
                  className="gap-2"
                >
                  <RefreshCw className={cn('h-4 w-4', isRetrying && 'animate-spin')} />
                  {isRetrying ? 'Retrying...' : 'Try Again'}
                </Button>

                {retryCount >= 3 && (
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    Reload Page
                  </Button>
                )}
              </div>
            )}

            {!isOnline && (
              <p className="mt-4 text-xs text-muted-foreground">
                Will automatically retry when you're back online.
              </p>
            )}
          </div>
        </motion.div>
      )}
    </>
  );
}

/**
 * Hook for network error recovery state
 */
export function useNetworkRecovery() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineAt(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, lastOnlineAt };
}

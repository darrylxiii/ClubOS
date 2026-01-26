import React from 'react';
import { useOfflineIndicator, useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function NetworkStatusIndicator() {
  const { isOnline, showOffline } = useOfflineIndicator();
  const { isSlowConnection } = useNetworkStatus();

  if (!showOffline && !isSlowConnection) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
        'px-4 py-2 rounded-full shadow-lg',
        'flex items-center gap-2 text-sm font-medium',
        'animate-in fade-in slide-in-from-bottom-4 duration-300',
        !isOnline 
          ? 'bg-destructive text-destructive-foreground' 
          : isSlowConnection 
            ? 'bg-warning text-warning-foreground' 
            : 'bg-primary text-primary-foreground'
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span>You're offline. Progress is saved locally.</span>
        </>
      ) : showOffline ? (
        <>
          <Wifi className="h-4 w-4" />
          <span>Back online!</span>
        </>
      ) : isSlowConnection ? (
        <>
          <AlertTriangle className="h-4 w-4" />
          <span>Slow connection detected</span>
        </>
      ) : null}
    </div>
  );
}

// Minimal inline status for form areas
export function InlineNetworkStatus({ className }: { className?: string }) {
  const { isOnline } = useOfflineIndicator();
  const { isSlowConnection } = useNetworkStatus();

  if (isOnline && !isSlowConnection) return null;

  return (
    <div className={cn(
      'flex items-center gap-1.5 text-xs',
      !isOnline ? 'text-destructive' : 'text-warning',
      className
    )}>
      {!isOnline ? (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Offline - changes saved locally</span>
        </>
      ) : (
        <>
          <AlertTriangle className="h-3 w-3" />
          <span>Slow connection</span>
        </>
      )}
    </div>
  );
}

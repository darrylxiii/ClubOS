import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { audioUnlock } from '@/hooks/useAudioUnlock';

interface AudioUnlockBannerProps {
  onUnlock?: () => void;
}

export function AudioUnlockBanner({ onUnlock }: AudioUnlockBannerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  useEffect(() => {
    // Check if audio needs unlocking after a short delay
    const timer = setTimeout(() => {
      if (!audioUnlock.isUnlocked()) {
        setShowBanner(true);
      }
    }, 2000);

    // Also check periodically
    const interval = setInterval(() => {
      if (audioUnlock.isUnlocked()) {
        setShowBanner(false);
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const handleUnlock = async () => {
    setIsUnlocking(true);
    try {
      await audioUnlock.forceUnlock();
      setShowBanner(false);
      onUnlock?.();
    } finally {
      setIsUnlocking(false);
    }
  };

  if (!showBanner) return null;

  return (
    <div className={cn(
      "fixed bottom-24 left-1/2 -translate-x-1/2 z-50",
      "bg-amber-500/90 backdrop-blur-md text-amber-50",
      "rounded-lg px-4 py-3 shadow-lg",
      "flex items-center gap-3",
      "animate-in fade-in-0 slide-in-from-bottom-4 duration-300"
    )}>
      <Volume2 className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm font-medium">
        Click to enable audio from other participants
      </span>
      <Button
        size="sm"
        variant="secondary"
        onClick={handleUnlock}
        disabled={isUnlocking}
        className="bg-white text-amber-600 hover:bg-amber-50"
      >
        {isUnlocking ? 'Enabling...' : 'Enable Audio'}
      </Button>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';

interface UsePushToTalkProps {
  enabled: boolean;
  hotkey?: string;
  onPushStart?: () => void;
  onPushEnd?: () => void;
}

export const usePushToTalk = ({
  enabled,
  hotkey = 'Space',
  onPushStart,
  onPushEnd,
}: UsePushToTalkProps) => {
  const [isPushing, setIsPushing] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;
      
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === hotkey && !e.repeat) {
        e.preventDefault();
        setIsPushing(true);
        onPushStart?.();
      }
    },
    [enabled, hotkey, onPushStart]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === hotkey) {
        e.preventDefault();
        setIsPushing(false);
        onPushEnd?.();
      }
    },
    [enabled, hotkey, onPushEnd]
  );

  useEffect(() => {
    if (!enabled) {
      setIsPushing(false);
      return;
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, handleKeyDown, handleKeyUp]);

  return { isPushing };
};

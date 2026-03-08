import { useEffect, useCallback } from 'react';

interface MeetingShortcutHandlers {
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleHandRaise: () => void;
  onEndCall: () => void;
  onToggleFullscreen: () => void;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  enabled: boolean;
}

export function useMeetingKeyboardShortcuts({
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleHandRaise,
  onEndCall,
  onToggleFullscreen,
  onNextPage,
  onPrevPage,
  enabled,
}: MeetingShortcutHandlers) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'm':
          e.preventDefault();
          onToggleAudio();
          break;
        case 'v':
          e.preventDefault();
          onToggleVideo();
          break;
        case 's':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onToggleScreenShare();
          }
          break;
        case 'h':
          e.preventDefault();
          onToggleHandRaise();
          break;
        case 'f':
          e.preventDefault();
          onToggleFullscreen();
          break;
        case 'arrowright':
          e.preventDefault();
          onNextPage?.();
          break;
        case 'arrowleft':
          e.preventDefault();
          onPrevPage?.();
          break;
        case 'escape':
          // Only end call on Shift+Escape to avoid accidental exits
          if (e.shiftKey) {
            e.preventDefault();
            onEndCall();
          }
          break;
      }
    },
    [enabled, onToggleAudio, onToggleVideo, onToggleScreenShare, onToggleHandRaise, onEndCall, onToggleFullscreen, onNextPage, onPrevPage],
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}

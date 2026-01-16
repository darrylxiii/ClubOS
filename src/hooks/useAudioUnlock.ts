import { useEffect, useRef, useCallback, useState } from 'react';
import { logger } from '@/lib/logger';

/**
 * Global audio unlock hook - handles browser autoplay policies
 * This is critical for WebRTC audio to work on first interaction
 */

// Singleton state for global audio unlock
let isAudioUnlocked = false;
const audioUnlockPromise: Promise<void> | null = null;
const pendingAudioElements: Set<HTMLAudioElement> = new Set();
const pendingAudioContexts: Set<AudioContext> = new Set();

// Create a silent audio element to test autoplay
const testAutoplay = async (): Promise<boolean> => {
  try {
    const audio = new Audio();
    audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    audio.volume = 0;
    await audio.play();
    audio.pause();
    return true;
  } catch {
    return false;
  }
};

// Unlock all pending audio
const unlockAllAudio = async () => {
  logger.debug('Unlocking all audio elements and contexts', { componentName: 'AudioUnlock' });
  
  // Resume all pending AudioContexts
  for (const ctx of pendingAudioContexts) {
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
        logger.debug('Resumed AudioContext', { componentName: 'AudioUnlock' });
      } catch (_e) {
        logger.warn('Failed to resume AudioContext', { componentName: 'AudioUnlock', error: _e });
      }
    }
  }
  
  // Play all pending audio elements
  for (const audio of pendingAudioElements) {
    try {
      if (audio.paused && audio.srcObject) {
        await audio.play();
        logger.debug('Started playing audio element', { componentName: 'AudioUnlock' });
      }
    } catch (_e) {
      logger.warn('Failed to play audio', { componentName: 'AudioUnlock', error: _e });
    }
  }
  
  isAudioUnlocked = true;
  logger.info('Audio unlocked successfully', { componentName: 'AudioUnlock' });
};

// Global unlock handler
const handleUserInteraction = async () => {
  if (isAudioUnlocked) return;
  
  logger.debug('User interaction detected, unlocking audio...', { componentName: 'AudioUnlock' });
  await unlockAllAudio();
  
  // Remove listeners after unlock
  document.removeEventListener('click', handleUserInteraction);
  document.removeEventListener('touchstart', handleUserInteraction);
  document.removeEventListener('keydown', handleUserInteraction);
};

// Initialize global listeners
if (typeof document !== 'undefined') {
  document.addEventListener('click', handleUserInteraction, { once: false, passive: true });
  document.addEventListener('touchstart', handleUserInteraction, { once: false, passive: true });
  document.addEventListener('keydown', handleUserInteraction, { once: false, passive: true });
}

export function useAudioUnlock() {
  const [unlocked, setUnlocked] = useState(isAudioUnlocked);
  const unlockAttemptedRef = useRef(false);

  // Register an audio element for auto-unlock
  const registerAudioElement = useCallback((audio: HTMLAudioElement) => {
    pendingAudioElements.add(audio);
    
    // If already unlocked, try to play immediately
    if (isAudioUnlocked && audio.paused && audio.srcObject) {
      audio.play().catch(() => {});
    }
    
    return () => {
      pendingAudioElements.delete(audio);
    };
  }, []);

  // Register an AudioContext for auto-unlock
  const registerAudioContext = useCallback((ctx: AudioContext) => {
    pendingAudioContexts.add(ctx);
    
    // If already unlocked, try to resume immediately
    if (isAudioUnlocked && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    
    return () => {
      pendingAudioContexts.delete(ctx);
    };
  }, []);

  // Force unlock (call after user gesture)
  const forceUnlock = useCallback(async () => {
    if (isAudioUnlocked) {
      setUnlocked(true);
      return true;
    }
    
    await unlockAllAudio();
    setUnlocked(true);
    return true;
  }, []);

  // Check if audio can autoplay
  const checkAutoplay = useCallback(async () => {
    if (isAudioUnlocked) return true;
    
    const canAutoplay = await testAutoplay();
    if (canAutoplay) {
      isAudioUnlocked = true;
      setUnlocked(true);
    }
    return canAutoplay;
  }, []);

  // Update local state when global state changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (isAudioUnlocked && !unlocked) {
        setUnlocked(true);
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, [unlocked]);

  return {
    unlocked,
    registerAudioElement,
    registerAudioContext,
    forceUnlock,
    checkAutoplay
  };
}

// Export for direct usage
export const audioUnlock = {
  isUnlocked: () => isAudioUnlocked,
  forceUnlock: unlockAllAudio,
  registerAudioElement: (audio: HTMLAudioElement) => {
    pendingAudioElements.add(audio);
    if (isAudioUnlocked && audio.paused && audio.srcObject) {
      audio.play().catch(() => {});
    }
    return () => pendingAudioElements.delete(audio);
  },
  registerAudioContext: (ctx: AudioContext) => {
    pendingAudioContexts.add(ctx);
    if (isAudioUnlocked && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return () => pendingAudioContexts.delete(ctx);
  }
};

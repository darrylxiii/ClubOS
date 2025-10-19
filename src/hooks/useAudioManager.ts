import { useRef, useCallback } from 'react';

type AudioInstance = {
  ref: HTMLAudioElement;
  type: 'dj' | 'preview';
};

class AudioManager {
  private currentAudio: AudioInstance | null = null;

  register(audio: HTMLAudioElement, type: 'dj' | 'preview') {
    this.currentAudio = { ref: audio, type };
  }

  pauseOthers(currentAudio: HTMLAudioElement, currentType: 'dj' | 'preview') {
    if (this.currentAudio && this.currentAudio.ref !== currentAudio) {
      this.currentAudio.ref.pause();
    }
    this.currentAudio = { ref: currentAudio, type: currentType };
  }

  pauseAll() {
    if (this.currentAudio) {
      this.currentAudio.ref.pause();
      this.currentAudio = null;
    }
  }
}

const audioManager = new AudioManager();

export function useAudioManager(type: 'dj' | 'preview') {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(async (audio: HTMLAudioElement) => {
    audioManager.pauseOthers(audio, type);
    try {
      await audio.play();
    } catch (err) {
      console.error('Play error:', err);
      throw err;
    }
  }, [type]);

  const pause = useCallback((audio: HTMLAudioElement) => {
    audio.pause();
  }, []);

  const pauseAll = useCallback(() => {
    audioManager.pauseAll();
  }, []);

  return { audioRef, play, pause, pauseAll };
}

// Sound effect manager for Miljoenenjacht game
class SoundManager {
  private enabled: boolean = true;
  private audioContext: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext();
    }
  }

  private playTone(frequency: number, duration: number, volume: number = 0.3) {
    if (!this.enabled || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  caseClick() {
    this.playTone(440, 0.1, 0.2);
  }

  caseReveal(isHighValue: boolean) {
    if (isHighValue) {
      // Sad sound - descending tones
      this.playTone(523, 0.15, 0.25);
      setTimeout(() => this.playTone(392, 0.2, 0.25), 100);
    } else {
      // Happy sound - ascending tones
      this.playTone(523, 0.1, 0.2);
      setTimeout(() => this.playTone(659, 0.15, 0.2), 80);
    }
  }

  bankerCall() {
    // Phone ring effect
    this.playTone(800, 0.2, 0.15);
    setTimeout(() => this.playTone(900, 0.2, 0.15), 250);
  }

  offerReveal() {
    // Dramatic reveal
    this.playTone(200, 0.3, 0.2);
    setTimeout(() => this.playTone(400, 0.3, 0.2), 200);
    setTimeout(() => this.playTone(600, 0.4, 0.2), 400);
  }

  dealAccepted() {
    // Success fanfare
    const notes = [523, 659, 784, 1046];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.3, 0.25), i * 100);
    });
  }

  noDeal() {
    // Continuation sound
    this.playTone(440, 0.15, 0.2);
    setTimeout(() => this.playTone(494, 0.15, 0.2), 150);
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  isEnabled() {
    return this.enabled;
  }
}

export const soundManager = new SoundManager();

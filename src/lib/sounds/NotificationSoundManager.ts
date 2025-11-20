/**
 * Enterprise-grade notification sound manager
 * Handles different notification types with distinct sounds
 * Respects user preferences and quiet hours
 */

type NotificationType = 'call' | 'meeting_invite' | 'message' | 'alert';

interface SoundConfig {
  enabled: boolean;
  volume: number;
  respectQuietHours: boolean;
  quietHoursStart?: string; // HH:mm format
  quietHoursEnd?: string; // HH:mm format
}

class NotificationSoundManager {
  private audioContext: AudioContext | null = null;
  private config: SoundConfig = {
    enabled: true,
    volume: 0.5,
    respectQuietHours: true,
  };

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext() {
    if (typeof window !== 'undefined' && window.AudioContext) {
      this.audioContext = new AudioContext();
    }
  }

  updateConfig(config: Partial<SoundConfig>) {
    this.config = { ...this.config, ...config };
  }

  private isQuietHours(): boolean {
    if (!this.config.respectQuietHours || !this.config.quietHoursStart || !this.config.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const start = this.config.quietHoursStart;
    const end = this.config.quietHoursEnd;

    // Handle quiet hours spanning midnight
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    }
    
    return currentTime >= start && currentTime <= end;
  }

  private async playTone(frequency: number, duration: number, delay: number = 0): Promise<void> {
    if (!this.audioContext) return;

    return new Promise((resolve) => {
      setTimeout(() => {
        if (!this.audioContext) {
          resolve();
          return;
        }

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        // Envelope for smooth sound
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(this.config.volume, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

        oscillator.start(now);
        oscillator.stop(now + duration);

        oscillator.onended = () => resolve();
      }, delay);
    });
  }

  /**
   * Play incoming call sound - repeating ring pattern
   */
  async playCallSound(): Promise<void> {
    if (!this.config.enabled || this.isQuietHours()) return;

    // Classic phone ring pattern: two beeps, pause, repeat
    for (let i = 0; i < 3; i++) {
      await this.playTone(440, 0.3, 0); // A4 note
      await this.playTone(554, 0.3, 350); // C#5 note
      await new Promise(resolve => setTimeout(resolve, 1500)); // Pause between rings
    }
  }

  /**
   * Play meeting invitation sound - pleasant three-tone ascending
   */
  async playMeetingInviteSound(): Promise<void> {
    if (!this.config.enabled || this.isQuietHours()) return;

    // Pleasant ascending chime
    await this.playTone(523, 0.2, 0); // C5
    await this.playTone(659, 0.2, 200); // E5
    await this.playTone(784, 0.4, 400); // G5
  }

  /**
   * Play message notification sound - single soft beep
   */
  async playMessageSound(): Promise<void> {
    if (!this.config.enabled || this.isQuietHours()) return;

    await this.playTone(880, 0.15, 0); // A5 note - short and subtle
  }

  /**
   * Play alert sound - attention-grabbing
   */
  async playAlertSound(): Promise<void> {
    if (!this.config.enabled || this.isQuietHours()) return;

    // Two-tone alert
    await this.playTone(800, 0.2, 0);
    await this.playTone(600, 0.2, 250);
  }

  /**
   * Play sound based on notification type
   */
  async play(type: NotificationType): Promise<void> {
    switch (type) {
      case 'call':
        await this.playCallSound();
        break;
      case 'meeting_invite':
        await this.playMeetingInviteSound();
        break;
      case 'message':
        await this.playMessageSound();
        break;
      case 'alert':
        await this.playAlertSound();
        break;
    }
  }

  /**
   * Test a notification sound
   */
  async test(type: NotificationType): Promise<void> {
    const wasEnabled = this.config.enabled;
    const wasRespectingQuietHours = this.config.respectQuietHours;
    
    // Temporarily enable sound and ignore quiet hours for testing
    this.config.enabled = true;
    this.config.respectQuietHours = false;
    
    await this.play(type);
    
    // Restore original settings
    this.config.enabled = wasEnabled;
    this.config.respectQuietHours = wasRespectingQuietHours;
  }
}

export const notificationSoundManager = new NotificationSoundManager();

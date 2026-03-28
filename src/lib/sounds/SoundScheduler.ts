/**
 * SoundScheduler — Priority queue, debouncing, batch collapsing,
 * and cross‑tab coordination for the Quantum Sound Engine.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SoundPriority = 1 | 2 | 3 | 4 | 5;
export type SoundCategory =
  | 'notification'
  | 'achievement'
  | 'social'
  | 'pipeline'
  | 'micro'
  | 'ambient';

export interface QueuedSound {
  soundId: string;
  priority: SoundPriority;
  category: SoundCategory;
  timestamp: number;
}

type PlayFn = (soundId: string) => void;

// ---------------------------------------------------------------------------
// Cross‑tab leader election via BroadcastChannel
// ---------------------------------------------------------------------------

let isLeaderTab = true;
let channel: BroadcastChannel | null = null;
const TAB_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function initCrossTab() {
  if (channel || typeof BroadcastChannel === 'undefined') return;
  try {
    channel = new BroadcastChannel('quantum-sound-leader');
    // Claim leadership on creation
    channel.postMessage({ type: 'claim', tabId: TAB_ID });

    channel.onmessage = (ev) => {
      if (ev.data?.type === 'claim' && ev.data.tabId !== TAB_ID) {
        // Another tab claimed — the latest opener wins
        // We yield if the other tab has a higher (newer) timestamp prefix
        if (ev.data.tabId > TAB_ID) {
          isLeaderTab = false;
        }
      }
      if (ev.data?.type === 'release') {
        // Previous leader closed — reclaim
        isLeaderTab = true;
        channel?.postMessage({ type: 'claim', tabId: TAB_ID });
      }
    };

    // Release on unload
    window.addEventListener('beforeunload', () => {
      channel?.postMessage({ type: 'release', tabId: TAB_ID });
    });
  } catch {
    // BroadcastChannel not available — remain leader
  }
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

const MAX_QUEUE: Record<SoundPriority, number> = {
  1: 0, // P1 never queues — play or drop
  2: 1,
  3: 2,
  4: 3,
  5: 1, // P5 interrupts, only 1 at a time
};

const MIN_ONSET_MS = 100;
const BATCH_THRESHOLD = 5; // collapse 5+ simultaneous events

export class SoundScheduler {
  private queue: QueuedSound[] = [];
  private playing = false;
  private lastPlayTime = 0;
  private batchBuffer: QueuedSound[] = [];
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private playFn: PlayFn;

  constructor(playFn: PlayFn) {
    this.playFn = playFn;
    initCrossTab();
  }

  /** Schedule a sound. Returns true if it will play, false if dropped. */
  schedule(
    soundId: string,
    priority: SoundPriority,
    category: SoundCategory,
  ): boolean {
    // Cross‑tab: only the leader plays sounds
    if (!isLeaderTab) return false;

    // Visibility: suppress in background tabs
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return false;
    }

    const now = Date.now();
    const item: QueuedSound = { soundId, priority, category, timestamp: now };

    // Batch collapsing: buffer rapid‑fire events
    this.batchBuffer.push(item);
    if (this.batchTimer) clearTimeout(this.batchTimer);
    this.batchTimer = setTimeout(() => this.flushBatch(), 50);

    return true;
  }

  private flushBatch() {
    const buffer = [...this.batchBuffer];
    this.batchBuffer = [];
    this.batchTimer = null;

    if (buffer.length === 0) return;

    // If more than BATCH_THRESHOLD sounds arrived in 50ms window, collapse
    if (buffer.length >= BATCH_THRESHOLD) {
      // Play a single "batch" sound — highest priority in the batch
      const best = buffer.reduce((a, b) => (b.priority > a.priority ? b : a));
      this.enqueue(best);
      return;
    }

    // Otherwise schedule each individually
    for (const item of buffer) {
      this.enqueue(item);
    }
  }

  private enqueue(item: QueuedSound) {
    const now = Date.now();

    // P5 interrupts everything
    if (item.priority === 5) {
      this.queue = [];
      this.playing = false;
      this.lastPlayTime = now;
      this.playFn(item.soundId);
      return;
    }

    // P1 — play immediately if nothing else is happening, otherwise drop
    if (item.priority === 1) {
      if (!this.playing && now - this.lastPlayTime >= MIN_ONSET_MS) {
        this.lastPlayTime = now;
        this.playFn(item.soundId);
      }
      return;
    }

    // P2‑P4: check queue limits
    const sameOrLower = this.queue.filter((q) => q.priority <= item.priority);
    const maxQ = MAX_QUEUE[item.priority];
    if (sameOrLower.length >= maxQ) {
      // Drop the lowest priority item
      const lowestIdx = this.queue.findIndex(
        (q) => q.priority === Math.min(...this.queue.map((x) => x.priority)),
      );
      if (lowestIdx >= 0 && this.queue[lowestIdx].priority < item.priority) {
        this.queue.splice(lowestIdx, 1);
      } else {
        return; // queue full, drop this one
      }
    }

    this.queue.push(item);
    this.queue.sort((a, b) => b.priority - a.priority);

    if (!this.playing) {
      this.processQueue();
    }
  }

  private processQueue() {
    if (this.queue.length === 0) {
      this.playing = false;
      return;
    }

    const now = Date.now();
    const elapsed = now - this.lastPlayTime;

    if (elapsed < MIN_ONSET_MS) {
      setTimeout(() => this.processQueue(), MIN_ONSET_MS - elapsed);
      return;
    }

    this.playing = true;
    const next = this.queue.shift()!;
    this.lastPlayTime = Date.now();
    this.playFn(next.soundId);

    // Assume sounds last ~300ms on average before processing next
    setTimeout(() => {
      this.playing = false;
      this.processQueue();
    }, 300);
  }

  /** Returns true if this tab is the audio leader */
  get isLeader(): boolean {
    return isLeaderTab;
  }
}

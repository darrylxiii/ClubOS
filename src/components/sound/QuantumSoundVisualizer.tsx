/**
 * QuantumSoundVisualizer — A glassmorphic real-time audio visualizer
 * that pulses with every Quantum Sound event.
 *
 * Shows the platform's "heartbeat" as elegant waveform bars
 * in the monochromatic Quantum Club aesthetic.
 */

import { useEffect, useRef, useState, memo } from 'react';
import { motion, AnimatePresence } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface QuantumSoundVisualizerProps {
  /** Number of frequency bars */
  bars?: number;
  /** Height in px */
  height?: number;
  /** Show/hide */
  visible?: boolean;
  /** Visual variant */
  variant?: 'minimal' | 'full';
  className?: string;
}

// Shared analyser state
let sharedAnalyser: AnalyserNode | null = null;
let sharedCtx: AudioContext | null = null;
const listeners = new Set<() => void>();

/**
 * Connect an AudioContext's destination to the visualizer's analyser.
 * Call this from the QuantumSoundEngine when it creates the AudioContext.
 */
export function connectVisualizer(ctx: AudioContext, sourceNode: AudioNode): void {
  if (sharedCtx === ctx && sharedAnalyser) return;

  sharedCtx = ctx;
  sharedAnalyser = ctx.createAnalyser();
  sharedAnalyser.fftSize = 64;
  sharedAnalyser.smoothingTimeConstant = 0.75;

  try {
    sourceNode.connect(sharedAnalyser);
  } catch {
    // Already connected or invalid
  }

  listeners.forEach((l) => l());
}

export const QuantumSoundVisualizer = memo(function QuantumSoundVisualizer({
  bars = 12,
  height = 32,
  visible = true,
  variant = 'minimal',
  className,
}: QuantumSoundVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [hasAnalyser, setHasAnalyser] = useState(!!sharedAnalyser);

  // Listen for analyser connection
  useEffect(() => {
    const handler = () => setHasAnalyser(!!sharedAnalyser);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  // Animation loop
  useEffect(() => {
    if (!visible || !hasAnalyser || !sharedAnalyser) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

    const analyser = sharedAnalyser;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth * dpr;
    const h = canvas.clientHeight * dpr;
    canvas.width = w;
    canvas.height = h;

    const barWidth = w / bars;
    const gap = 2 * dpr;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx2d.clearRect(0, 0, w, h);

      for (let i = 0; i < bars; i++) {
        // Map bar index to frequency bin (logarithmic distribution)
        const binIndex = Math.floor((i / bars) * bufferLength * 0.7);
        const value = dataArray[binIndex] || 0;
        const normalised = value / 255;

        // Bar height with minimum
        const barH = Math.max(2 * dpr, normalised * h * 0.9);
        const x = i * barWidth + gap / 2;
        const y = h - barH;

        // Glassmorphic gradient — monochromatic
        const alpha = 0.15 + normalised * 0.6;
        ctx2d.fillStyle =
          variant === 'full'
            ? `rgba(255, 255, 255, ${alpha})`
            : `rgba(160, 160, 160, ${alpha})`;

        // Rounded bars
        const radius = Math.min(barWidth / 2 - gap, 3 * dpr);
        ctx2d.beginPath();
        ctx2d.roundRect(x, y, barWidth - gap, barH, radius);
        ctx2d.fill();
      }
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible, hasAnalyser, bars, height, variant]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'relative overflow-hidden rounded-lg',
            variant === 'full' &&
              'bg-background/30 backdrop-blur-xl border border-white/5',
            className,
          )}
          style={{ height }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ display: 'block' }}
          />
          {/* Ambient glow */}
          {variant === 'full' && (
            <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

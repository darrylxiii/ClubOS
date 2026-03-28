import { useRef, useEffect, useCallback, useState, memo } from 'react';

/**
 * Butterchurn (Milkdrop WebGL) visualizer.
 * Renders the legendary Winamp visualizer presets in the browser.
 * Connects to the global AudioContext from RadioPlayerContext.
 */

interface MilkdropVisualizerProps {
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
  className?: string;
}

export const MilkdropVisualizer = memo(function MilkdropVisualizer({
  audioElement,
  isPlaying,
  className = '',
}: MilkdropVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const [presetName, setPresetName] = useState('Loading...');
  const [presetKeys, setPresetKeys] = useState<string[]>([]);
  const presetIdxRef = useRef(0);

  const initVisualizer = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !audioElement) return;

    try {
      // Dynamic import to avoid loading 2MB+ at startup
      const [butterchurn, butterchurnPresets] = await Promise.all([
        import('butterchurn'),
        import('butterchurn-presets'),
      ]);

      const createVisualizer = butterchurn.default || butterchurn;
      const presets = butterchurnPresets.default || butterchurnPresets;

      // Create or reuse AudioContext
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
        const source = audioCtxRef.current.createMediaElementSource(audioElement);
        source.connect(audioCtxRef.current.destination);
      }

      const width = canvas.clientWidth * window.devicePixelRatio;
      const height = canvas.clientHeight * window.devicePixelRatio;
      canvas.width = width;
      canvas.height = height;

      const visualizer = createVisualizer(audioCtxRef.current, canvas, {
        width,
        height,
        pixelRatio: window.devicePixelRatio,
      });

      const keys = Object.keys(presets);
      setPresetKeys(keys);

      // Pick a random starting preset
      const startIdx = Math.floor(Math.random() * keys.length);
      presetIdxRef.current = startIdx;
      const firstPreset = presets[keys[startIdx]];
      visualizer.loadPreset(firstPreset, 0); // Instant load
      setPresetName(keys[startIdx]);

      visualizerRef.current = visualizer;

      // Render loop
      const render = () => {
        if (visualizerRef.current) {
          visualizerRef.current.render();
        }
        rafRef.current = requestAnimationFrame(render);
      };
      render();

      // Auto-cycle presets every 30 seconds
      const cycleInterval = setInterval(() => {
        if (!visualizerRef.current || keys.length === 0) return;
        presetIdxRef.current = (presetIdxRef.current + 1) % keys.length;
        const nextPreset = presets[keys[presetIdxRef.current]];
        visualizerRef.current.loadPreset(nextPreset, 2.0); // 2s blend transition
        setPresetName(keys[presetIdxRef.current]);
      }, 30000);

      return () => {
        clearInterval(cycleInterval);
      };
    } catch (err) {
      console.warn('Butterchurn failed to load:', err);
    }
  }, [audioElement]);

  useEffect(() => {
    if (isPlaying && audioElement) {
      const cleanup = initVisualizer();
      return () => {
        cancelAnimationFrame(rafRef.current);
        cleanup?.then((fn) => fn?.());
      };
    } else {
      cancelAnimationFrame(rafRef.current);
    }
  }, [isPlaying, audioElement, initVisualizer]);

  // Handle resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(() => {
      if (visualizerRef.current && canvas) {
        const width = canvas.clientWidth * window.devicePixelRatio;
        const height = canvas.clientHeight * window.devicePixelRatio;
        canvas.width = width;
        canvas.height = height;
        visualizerRef.current.setRendererSize(width, height);
      }
    });

    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // Next preset on click
  const nextPreset = useCallback(async () => {
    if (!visualizerRef.current || presetKeys.length === 0) return;

    try {
      const presets = (await import('butterchurn-presets')).default;
      presetIdxRef.current = (presetIdxRef.current + 1) % presetKeys.length;
      const next = presets[presetKeys[presetIdxRef.current]];
      visualizerRef.current.loadPreset(next, 1.5);
      setPresetName(presetKeys[presetIdxRef.current]);
    } catch {}
  }, [presetKeys]);

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-black ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onClick={nextPreset}
        style={{ cursor: 'pointer' }}
      />
      {/* Preset name overlay */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <span className="text-[10px] text-white/40 truncate max-w-[70%] font-mono">
          {presetName}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); nextPreset(); }}
          className="text-[10px] text-white/40 hover:text-white/70 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
});

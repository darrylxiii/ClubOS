import { useState, useCallback, useRef, useEffect } from 'react';

interface VirtualBackgroundConfig {
  type: 'none' | 'blur' | 'image';
  imageUrl?: string;
  blurAmount: number;
  edgeBlur: number;
  quality: 'low' | 'medium' | 'high';
}

interface UseVirtualBackgroundSafariReturn {
  isSupported: boolean;
  isProcessing: boolean;
  processedStream: MediaStream | null;
  config: VirtualBackgroundConfig;
  startProcessing: (stream: MediaStream) => Promise<void>;
  stopProcessing: () => void;
  setBackground: (config: Partial<VirtualBackgroundConfig>) => void;
  getProcessingStats: () => { fps: number; latency: number };
}

const DEFAULT_CONFIG: VirtualBackgroundConfig = {
  type: 'none',
  blurAmount: 10,
  edgeBlur: 3,
  quality: 'medium',
};

const QUALITY_SETTINGS = {
  low: { scale: 0.25, skipFrames: 2 },
  medium: { scale: 0.5, skipFrames: 1 },
  high: { scale: 0.75, skipFrames: 0 },
};

// TensorFlow.js Body-Pix alternative using simple color-based segmentation
// This is a fallback for Safari without Insertable Streams
export function useVirtualBackgroundSafari(): UseVirtualBackgroundSafariReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedStream, setProcessedStream] = useState<MediaStream | null>(null);
  const [config, setConfig] = useState<VirtualBackgroundConfig>(DEFAULT_CONFIG);

  const sourceVideoRef = useRef<HTMLVideoElement | null>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const segmentationCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const animationFrameRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const fpsRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const latencyRef = useRef<number>(0);

  useEffect(() => {
    // Check if we need Safari fallback (no Insertable Streams)
    const hasInsertableStreams = 'RTCRtpScriptTransform' in window || 
      ('transform' in RTCRtpSender.prototype);
    
    // Safari fallback is supported if we have canvas and video
    const canvasSupported = typeof HTMLCanvasElement !== 'undefined';
    const videoSupported = typeof HTMLVideoElement !== 'undefined';
    
    setIsSupported(!hasInsertableStreams && canvasSupported && videoSupported);
  }, []);

  useEffect(() => {
    return () => {
      stopProcessing();
    };
  }, []);

  const loadBackgroundImage = useCallback(async (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }, []);

  const createSkinToneMask = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): ImageData => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const mask = new Uint8ClampedArray(width * height);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Convert to YCbCr color space for better skin detection
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      // Skin tone detection in YCbCr
      const isSkin = (
        y > 80 &&
        cb > 77 && cb < 127 &&
        cr > 133 && cr < 173
      );

      // Additional RGB-based check
      const isRgbSkin = (
        r > 95 && g > 40 && b > 20 &&
        r > g && r > b &&
        Math.abs(r - g) > 15 &&
        r - b > 15
      );

      mask[i / 4] = (isSkin || isRgbSkin) ? 255 : 0;
    }

    // Apply morphological operations for cleaner mask
    return applyMorphology(mask, width, height);
  }, []);

  const applyMorphology = useCallback((
    mask: Uint8ClampedArray,
    width: number,
    height: number
  ): ImageData => {
    // Erosion followed by dilation (opening)
    const eroded = new Uint8ClampedArray(mask.length);
    const dilated = new Uint8ClampedArray(mask.length);
    const kernel = 2;

    // Erosion
    for (let y = kernel; y < height - kernel; y++) {
      for (let x = kernel; x < width - kernel; x++) {
        let min = 255;
        for (let ky = -kernel; ky <= kernel; ky++) {
          for (let kx = -kernel; kx <= kernel; kx++) {
            const idx = (y + ky) * width + (x + kx);
            min = Math.min(min, mask[idx]);
          }
        }
        eroded[y * width + x] = min;
      }
    }

    // Dilation
    for (let y = kernel; y < height - kernel; y++) {
      for (let x = kernel; x < width - kernel; x++) {
        let max = 0;
        for (let ky = -kernel; ky <= kernel; ky++) {
          for (let kx = -kernel; kx <= kernel; kx++) {
            const idx = (y + ky) * width + (x + kx);
            max = Math.max(max, eroded[idx]);
          }
        }
        dilated[y * width + x] = max;
      }
    }

    // Convert to ImageData
    const output = new ImageData(width, height);
    for (let i = 0; i < dilated.length; i++) {
      output.data[i * 4] = dilated[i];
      output.data[i * 4 + 1] = dilated[i];
      output.data[i * 4 + 2] = dilated[i];
      output.data[i * 4 + 3] = 255;
    }

    return output;
  }, []);

  const processFrame = useCallback(() => {
    const video = sourceVideoRef.current;
    const canvas = outputCanvasRef.current;
    const segCanvas = segmentationCanvasRef.current;

    if (!video || !canvas || !segCanvas || video.paused || video.ended) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const startTime = performance.now();
    frameCountRef.current++;

    const qualitySettings = QUALITY_SETTINGS[config.quality];

    // Skip frames based on quality setting
    if (frameCountRef.current % (qualitySettings.skipFrames + 1) !== 0) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const ctx = canvas.getContext('2d');
    const segCtx = segCanvas.getContext('2d');

    if (!ctx || !segCtx) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Ensure canvas matches video size
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // Segmentation at lower resolution
    const segWidth = Math.floor(video.videoWidth * qualitySettings.scale);
    const segHeight = Math.floor(video.videoHeight * qualitySettings.scale);
    segCanvas.width = segWidth;
    segCanvas.height = segHeight;

    // Draw video to segmentation canvas
    segCtx.drawImage(video, 0, 0, segWidth, segHeight);

    if (config.type === 'none') {
      // No processing, just pass through
      ctx.drawImage(video, 0, 0);
    } else if (config.type === 'blur') {
      // Apply blur background
      applyBlurBackground(ctx, segCtx, video, segWidth, segHeight);
    } else if (config.type === 'image' && backgroundImageRef.current) {
      // Apply image background
      applyImageBackground(ctx, segCtx, video, segWidth, segHeight);
    } else {
      ctx.drawImage(video, 0, 0);
    }

    // Calculate FPS
    const now = performance.now();
    if (now - lastFrameTimeRef.current >= 1000) {
      fpsRef.current = frameCountRef.current;
      frameCountRef.current = 0;
      lastFrameTimeRef.current = now;
    }

    latencyRef.current = performance.now() - startTime;
    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [config]);

  const applyBlurBackground = useCallback((
    ctx: CanvasRenderingContext2D,
    segCtx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    segWidth: number,
    segHeight: number
  ) => {
    const canvas = ctx.canvas;
    
    // Get segmentation mask
    const maskData = createSkinToneMask(segCtx, segWidth, segHeight);

    // Draw blurred background
    ctx.filter = `blur(${config.blurAmount}px)`;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';

    // Create mask canvas at full resolution
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    // Scale up mask
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = segWidth;
    tempCanvas.height = segHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    tempCtx.putImageData(maskData, 0, 0);

    // Apply edge blur to mask
    maskCtx.filter = `blur(${config.edgeBlur}px)`;
    maskCtx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
    maskCtx.filter = 'none';

    // Composite: draw person over blurred background
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(maskCanvas, 0, 0);
    ctx.globalCompositeOperation = 'destination-over';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
  }, [config.blurAmount, config.edgeBlur, createSkinToneMask]);

  const applyImageBackground = useCallback((
    ctx: CanvasRenderingContext2D,
    segCtx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    segWidth: number,
    segHeight: number
  ) => {
    const canvas = ctx.canvas;
    const bgImage = backgroundImageRef.current;
    if (!bgImage) return;

    // Get segmentation mask
    const maskData = createSkinToneMask(segCtx, segWidth, segHeight);

    // Draw background image
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

    // Create mask canvas
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    // Scale up mask
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = segWidth;
    tempCanvas.height = segHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    tempCtx.putImageData(maskData, 0, 0);

    maskCtx.filter = `blur(${config.edgeBlur}px)`;
    maskCtx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
    maskCtx.filter = 'none';

    // Draw person canvas
    const personCanvas = document.createElement('canvas');
    personCanvas.width = canvas.width;
    personCanvas.height = canvas.height;
    const personCtx = personCanvas.getContext('2d');
    if (!personCtx) return;

    personCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
    personCtx.globalCompositeOperation = 'destination-in';
    personCtx.drawImage(maskCanvas, 0, 0);

    // Composite person over background
    ctx.drawImage(personCanvas, 0, 0);
  }, [config.edgeBlur, createSkinToneMask]);

  const startProcessing = useCallback(async (stream: MediaStream): Promise<void> => {
    stopProcessing();

    // Create video element
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    sourceVideoRef.current = video;

    await video.play();

    // Create canvases
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = video.videoWidth || 640;
    outputCanvas.height = video.videoHeight || 480;
    outputCanvasRef.current = outputCanvas;

    const segCanvas = document.createElement('canvas');
    segmentationCanvasRef.current = segCanvas;

    // Load background image if needed
    if (config.type === 'image' && config.imageUrl) {
      try {
        backgroundImageRef.current = await loadBackgroundImage(config.imageUrl);
      } catch (error) {
        console.error('Failed to load background image:', error);
      }
    }

    // Create output stream
    const outputStream = outputCanvas.captureStream(30);
    
    // Add audio tracks from source
    stream.getAudioTracks().forEach(track => {
      outputStream.addTrack(track);
    });

    setProcessedStream(outputStream);
    setIsProcessing(true);

    // Start processing loop
    lastFrameTimeRef.current = performance.now();
    processFrame();
  }, [config, loadBackgroundImage, processFrame]);

  const stopProcessing = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }

    if (sourceVideoRef.current) {
      sourceVideoRef.current.srcObject = null;
      sourceVideoRef.current = null;
    }

    setProcessedStream(null);
    setIsProcessing(false);
    frameCountRef.current = 0;
    fpsRef.current = 0;
  }, []);

  const setBackground = useCallback(async (newConfig: Partial<VirtualBackgroundConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);

    // Load new background image if URL changed
    if (newConfig.imageUrl && newConfig.imageUrl !== config.imageUrl) {
      try {
        backgroundImageRef.current = await loadBackgroundImage(newConfig.imageUrl);
      } catch (error) {
        console.error('Failed to load background image:', error);
      }
    }
  }, [config, loadBackgroundImage]);

  const getProcessingStats = useCallback(() => ({
    fps: fpsRef.current,
    latency: latencyRef.current,
  }), []);

  return {
    isSupported,
    isProcessing,
    processedStream,
    config,
    startProcessing,
    stopProcessing,
    setBackground,
    getProcessingStats,
  };
}

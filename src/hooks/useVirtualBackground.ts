import { useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';

// Inline types for MediaPipe - no external dependencies
interface SelfieSegmentationResults {
  segmentationMask: HTMLCanvasElement;
  image: HTMLVideoElement;
}

interface SelfieSegmentationInstance {
  setOptions: (options: { modelSelection: number }) => void;
  onResults: (callback: (results: SelfieSegmentationResults) => void) => void;
  send: (input: { image: HTMLVideoElement }) => Promise<void>;
  close: () => void;
}

interface CameraInstance {
  start: () => void;
  stop: () => void;
}

interface VirtualBackgroundOptions {
    enabled: boolean;
    type: 'blur' | 'image' | 'none';
    blurRadius?: number;
    imageUrl?: string;
}

// Helper to load MediaPipe scripts dynamically
const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
};

// Get MediaPipe from window after script loads
const getMediaPipeClasses = (): { SelfieSegmentation: any; Camera: any } | null => {
  const win = window as any;
  if (win.SelfieSegmentation && win.Camera) {
    return { SelfieSegmentation: win.SelfieSegmentation, Camera: win.Camera };
  }
  return null;
};

export function useVirtualBackground(inputStream: MediaStream | null, options: VirtualBackgroundOptions) {
    const [processedStream, setProcessedStream] = useState<MediaStream | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const segmentationRef = useRef<SelfieSegmentationInstance | null>(null);
    const cameraRef = useRef<CameraInstance | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const activeEffectRef = useRef<VirtualBackgroundOptions>(options);
    const backgroundImageRef = useRef<HTMLImageElement | null>(null);
    const imageLoadingRef = useRef(false);

    // Update active effect ref when options change
    useEffect(() => {
        activeEffectRef.current = options;
    }, [options]);

    // Pre-load background image when imageUrl changes
    useEffect(() => {
        if (options.type === 'image' && options.imageUrl) {
            imageLoadingRef.current = true;
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                backgroundImageRef.current = img;
                imageLoadingRef.current = false;
            };
            img.onerror = () => {
                console.error('Failed to load background image');
                backgroundImageRef.current = null;
                imageLoadingRef.current = false;
            };
            img.src = options.imageUrl;
        } else {
            backgroundImageRef.current = null;
        }
    }, [options.imageUrl, options.type]);

    useEffect(() => {
        if (!inputStream || !options.enabled || options.type === 'none') {
            setProcessedStream(inputStream);
            return;
        }

        const init = async () => {
            try {
                // Load MediaPipe scripts from CDN
                await Promise.all([
                    loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js'),
                    loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js')
                ]);

                const mediaPipe = getMediaPipeClasses();
                if (!mediaPipe) {
                    logger.warn('MediaPipe libraries not available, falling back to original stream', { componentName: 'VirtualBackground' });
                    setProcessedStream(inputStream);
                    return;
                }

                const { SelfieSegmentation, Camera } = mediaPipe;

                // Create hidden video element to play input stream
                const video = document.createElement('video');
                video.srcObject = inputStream;
                video.playsInline = true;
                video.muted = true;
                
                // Wait for video metadata to load before accessing dimensions
                await new Promise<void>((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        logger.warn('Video metadata load timeout, attempting to proceed', { componentName: 'VirtualBackground' });
                        resolve();
                    }, 5000);

                    const checkDimensions = () => {
                        if (video.videoWidth > 0 && video.videoHeight > 0) {
                            clearTimeout(timeout);
                            resolve();
                        }
                    };

                    video.onloadedmetadata = checkDimensions;
                    video.onloadeddata = checkDimensions;
                    
                    video.play().then(() => {
                        if (video.videoWidth > 0 && video.videoHeight > 0) {
                            clearTimeout(timeout);
                            resolve();
                        }
                    }).catch(err => {
                        clearTimeout(timeout);
                        reject(err);
                    });
                });

                videoRef.current = video;

                const width = video.videoWidth || 640;
                const height = video.videoHeight || 480;

                // Create canvas for output
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                canvasRef.current = canvas;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    setProcessedStream(inputStream);
                    return;
                }

                // Initialize SelfieSegmentation
                const selfieSegmentation = new SelfieSegmentation({
                    locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
                }) as SelfieSegmentationInstance;

                selfieSegmentation.setOptions({ modelSelection: 1 });

                selfieSegmentation.onResults((results: SelfieSegmentationResults) => {
                    if (!canvasRef.current || !ctx) return;

                    ctx.save();
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    const { type, blurRadius = 10 } = activeEffectRef.current;

                    ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);
                    ctx.globalCompositeOperation = 'source-in';
                    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
                    ctx.globalCompositeOperation = 'destination-over';

                    if (type === 'blur') {
                        ctx.filter = `blur(${blurRadius}px)`;
                        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
                    } else if (type === 'image' && backgroundImageRef.current) {
                        const img = backgroundImageRef.current;
                        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
                        const x = (canvas.width / 2) - (img.width / 2) * scale;
                        const y = (canvas.height / 2) - (img.height / 2) * scale;
                        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                    } else {
                        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
                    }

                    ctx.restore();
                });

                segmentationRef.current = selfieSegmentation;

                const camera = new Camera(video, {
                    onFrame: async () => {
                        await selfieSegmentation.send({ image: video });
                    },
                    width: canvas.width,
                    height: canvas.height,
                }) as CameraInstance;

                camera.start();
                cameraRef.current = camera;

                const stream = canvas.captureStream(30);
                const audioTrack = inputStream.getAudioTracks()[0];
                if (audioTrack) {
                    stream.addTrack(audioTrack);
                }

                setProcessedStream(stream);
            } catch (err) {
                logger.error('MediaPipe initialization failed', { componentName: 'VirtualBackground', error: err });
                setProcessedStream(inputStream);
            }
        };

        init();

        return () => {
            cameraRef.current?.stop();
            segmentationRef.current?.close();
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.srcObject = null;
            }
        };
    }, [inputStream, options.enabled, options.type]);

    return processedStream;
}

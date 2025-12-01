import { useEffect, useRef, useState } from 'react';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import { Camera } from '@mediapipe/camera_utils';

interface VirtualBackgroundOptions {
    enabled: boolean;
    type: 'blur' | 'image' | 'none';
    blurRadius?: number;
    imageUrl?: string;
}

export function useVirtualBackground(inputStream: MediaStream | null, options: VirtualBackgroundOptions) {
    const [processedStream, setProcessedStream] = useState<MediaStream | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const segmentationRef = useRef<SelfieSegmentation | null>(null);
    const cameraRef = useRef<Camera | null>(null);
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
            img.crossOrigin = 'anonymous'; // For CORS if needed
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
            // Create hidden video element to play input stream
            const video = document.createElement('video');
            video.srcObject = inputStream;
            video.playsInline = true;
            video.muted = true;
            await video.play();
            videoRef.current = video;

            // Create canvas for output
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvasRef.current = canvas;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Initialize SelfieSegmentation
            const selfieSegmentation = new SelfieSegmentation({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
            });

            selfieSegmentation.setOptions({
                modelSelection: 1, // 0: general, 1: landscape
            });

            selfieSegmentation.onResults((results) => {
                if (!canvasRef.current || !ctx) return;

                ctx.save();
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                const { type, blurRadius = 10 } = activeEffectRef.current;

                // Draw segmentation mask
                ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);

                // Source-in: Keep only the person (mask)
                ctx.globalCompositeOperation = 'source-in';
                ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

                // Destination-over: Draw background behind the person
                ctx.globalCompositeOperation = 'destination-over';

                if (type === 'blur') {
                    ctx.filter = `blur(${blurRadius}px)`;
                    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
                } else if (type === 'image' && backgroundImageRef.current) {
                    // Draw pre-loaded background image
                    // Scale to fit canvas while maintaining aspect ratio
                    const img = backgroundImageRef.current;
                    const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
                    const x = (canvas.width / 2) - (img.width / 2) * scale;
                    const y = (canvas.height / 2) - (img.height / 2) * scale;
                    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                } else {
                    // Fallback or none
                    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
                }

                ctx.restore();
            });

            segmentationRef.current = selfieSegmentation;

            // Use Camera utility to send frames
            const camera = new Camera(video, {
                onFrame: async () => {
                    await selfieSegmentation.send({ image: video });
                },
                width: video.videoWidth,
                height: video.videoHeight,
            });

            camera.start();
            cameraRef.current = camera;

            // Capture stream from canvas
            const stream = canvas.captureStream(30);

            // Add audio track from original stream if present
            const audioTrack = inputStream.getAudioTracks()[0];
            if (audioTrack) {
                stream.addTrack(audioTrack);
            }

            setProcessedStream(stream);
        };

        init();

        return () => {
            if (cameraRef.current) {
                cameraRef.current.stop();
            }
            if (segmentationRef.current) {
                segmentationRef.current.close();
            }
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.srcObject = null;
            }
        };
    }, [inputStream, options.enabled, options.type]);

    return processedStream;
}

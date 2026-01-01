import { useState, useCallback, useRef, useEffect } from 'react';

type ContentType = 'presentation' | 'video' | 'mixed' | 'unknown';

interface ScreenShareConfig {
  contentType: ContentType;
  width: number;
  height: number;
  frameRate: number;
  bitrate: number;
  optimizeForText: boolean;
}

interface ScreenShareAnalysis {
  contentType: ContentType;
  motionLevel: 'static' | 'low' | 'medium' | 'high';
  hasText: boolean;
  colorComplexity: 'simple' | 'complex';
  recommendedSettings: Partial<ScreenShareConfig>;
}

interface UseHDScreenShareReturn {
  isSharing: boolean;
  stream: MediaStream | null;
  config: ScreenShareConfig;
  analysis: ScreenShareAnalysis | null;
  startScreenShare: (options?: Partial<DisplayMediaStreamOptions>) => Promise<MediaStream | null>;
  stopScreenShare: () => void;
  setContentType: (type: ContentType) => void;
  optimizeForContent: () => void;
  getOptimizedConstraints: () => MediaTrackConstraints;
  applyOptimizations: (sender: RTCRtpSender) => Promise<void>;
}

const CONTENT_PRESETS: Record<ContentType, Partial<ScreenShareConfig>> = {
  presentation: {
    frameRate: 5,
    bitrate: 1000000,
    optimizeForText: true,
  },
  video: {
    frameRate: 30,
    bitrate: 3000000,
    optimizeForText: false,
  },
  mixed: {
    frameRate: 15,
    bitrate: 2000000,
    optimizeForText: true,
  },
  unknown: {
    frameRate: 15,
    bitrate: 1500000,
    optimizeForText: false,
  },
};

const DEFAULT_CONFIG: ScreenShareConfig = {
  contentType: 'unknown',
  width: 1920,
  height: 1080,
  frameRate: 15,
  bitrate: 1500000,
  optimizeForText: false,
};

export function useHDScreenShare(): UseHDScreenShareReturn {
  const [isSharing, setIsSharing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [config, setConfig] = useState<ScreenShareConfig>(DEFAULT_CONFIG);
  const [analysis, setAnalysis] = useState<ScreenShareAnalysis | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousFrameRef = useRef<ImageData | null>(null);

  useEffect(() => {
    return () => {
      stopScreenShare();
    };
  }, []);

  const analyzeContent = useCallback((videoTrack: MediaStreamTrack): void => {
    if (!analysisCanvasRef.current) {
      analysisCanvasRef.current = document.createElement('canvas');
    }

    const canvas = analysisCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create video element to capture frames
    const video = document.createElement('video');
    video.srcObject = new MediaStream([videoTrack]);
    video.muted = true;
    video.play();

    // Start analysis interval
    analysisIntervalRef.current = setInterval(() => {
      if (video.readyState < 2) return;

      canvas.width = Math.min(video.videoWidth, 320);
      canvas.height = Math.min(video.videoHeight, 180);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const analysisResult = performAnalysis(currentFrame, previousFrameRef.current);
      
      previousFrameRef.current = currentFrame;
      setAnalysis(analysisResult);

      // Auto-optimize based on analysis
      if (analysisResult.contentType !== config.contentType) {
        setConfig(prev => ({
          ...prev,
          contentType: analysisResult.contentType,
          ...CONTENT_PRESETS[analysisResult.contentType],
        }));
      }
    }, 2000); // Analyze every 2 seconds
  }, [config.contentType]);

  const performAnalysis = useCallback((
    currentFrame: ImageData,
    previousFrame: ImageData | null
  ): ScreenShareAnalysis => {
    const data = currentFrame.data;
    const width = currentFrame.width;
    const height = currentFrame.height;

    // Calculate motion level by comparing frames
    let motionPixels = 0;
    if (previousFrame) {
      const prevData = previousFrame.data;
      for (let i = 0; i < data.length; i += 4) {
        const diff = Math.abs(data[i] - prevData[i]) +
                     Math.abs(data[i + 1] - prevData[i + 1]) +
                     Math.abs(data[i + 2] - prevData[i + 2]);
        if (diff > 30) motionPixels++;
      }
    }

    const totalPixels = width * height;
    const motionRatio = motionPixels / totalPixels;
    
    let motionLevel: 'static' | 'low' | 'medium' | 'high';
    if (motionRatio < 0.01) motionLevel = 'static';
    else if (motionRatio < 0.1) motionLevel = 'low';
    else if (motionRatio < 0.3) motionLevel = 'medium';
    else motionLevel = 'high';

    // Analyze color complexity and potential text
    let colorCount = 0;
    const colorMap = new Map<string, number>();
    let highContrastEdges = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const colorKey = `${Math.floor(data[i] / 32)}-${Math.floor(data[i + 1] / 32)}-${Math.floor(data[i + 2] / 32)}`;
        
        colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);

        // Check for high contrast edges (text indicator)
        if (x > 0) {
          const prevI = (y * width + x - 1) * 4;
          const contrast = Math.abs(
            (data[i] + data[i + 1] + data[i + 2]) / 3 -
            (data[prevI] + data[prevI + 1] + data[prevI + 2]) / 3
          );
          if (contrast > 100) highContrastEdges++;
        }
      }
    }

    colorCount = colorMap.size;
    const colorComplexity = colorCount > 500 ? 'complex' : 'simple';
    const edgeRatio = highContrastEdges / totalPixels;
    const hasText = edgeRatio > 0.05 && colorComplexity === 'simple';

    // Determine content type
    let contentType: ContentType;
    if (motionLevel === 'high') {
      contentType = 'video';
    } else if (hasText && motionLevel === 'static') {
      contentType = 'presentation';
    } else if (hasText && motionLevel !== 'static') {
      contentType = 'mixed';
    } else {
      contentType = motionLevel === 'static' ? 'presentation' : 'mixed';
    }

    // Generate recommendations
    const preset = CONTENT_PRESETS[contentType];
    const recommendedSettings: Partial<ScreenShareConfig> = {
      ...preset,
      width: 1920,
      height: 1080,
    };

    // Adjust for content characteristics
    if (hasText) {
      recommendedSettings.optimizeForText = true;
      recommendedSettings.bitrate = (recommendedSettings.bitrate || 1500000) * 1.2;
    }

    return {
      contentType,
      motionLevel,
      hasText,
      colorComplexity,
      recommendedSettings,
    };
  }, []);

  const startScreenShare = useCallback(async (
    options?: Partial<DisplayMediaStreamOptions>
  ): Promise<MediaStream | null> => {
    try {
      const constraints: DisplayMediaStreamOptions = {
        video: {
          width: { ideal: config.width, max: 1920 },
          height: { ideal: config.height, max: 1080 },
          frameRate: { ideal: config.frameRate, max: 30 },
          ...((options?.video as MediaTrackConstraints) || {}),
        },
        audio: options?.audio ?? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      const mediaStream = await navigator.mediaDevices.getDisplayMedia(constraints);
      
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsSharing(true);

      // Start content analysis
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        analyzeContent(videoTrack);

        // Handle stream end
        videoTrack.onended = () => {
          stopScreenShare();
        };
      }

      return mediaStream;
    } catch (error) {
      console.error('Failed to start screen share:', error);
      return null;
    }
  }, [config, analyzeContent]);

  const stopScreenShare = useCallback(() => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setStream(null);
    setIsSharing(false);
    setAnalysis(null);
    previousFrameRef.current = null;
  }, []);

  const setContentType = useCallback((type: ContentType) => {
    setConfig(prev => ({
      ...prev,
      contentType: type,
      ...CONTENT_PRESETS[type],
    }));
  }, []);

  const optimizeForContent = useCallback(() => {
    if (analysis?.recommendedSettings) {
      setConfig(prev => ({
        ...prev,
        ...analysis.recommendedSettings,
      }));
    }
  }, [analysis]);

  const getOptimizedConstraints = useCallback((): MediaTrackConstraints => {
    return {
      width: { ideal: config.width, max: 1920 },
      height: { ideal: config.height, max: 1080 },
      frameRate: { ideal: config.frameRate, max: 30 },
    };
  }, [config]);

  const applyOptimizations = useCallback(async (sender: RTCRtpSender): Promise<void> => {
    if (!sender.track) return;

    try {
      const params = sender.getParameters();
      
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }

      // Apply content-aware encoding parameters
      params.encodings[0] = {
        ...params.encodings[0],
        maxBitrate: config.bitrate,
        maxFramerate: config.frameRate,
      };

      // Content-specific optimizations
      if (config.contentType === 'presentation') {
        params.encodings[0].priority = 'high';
        params.encodings[0].networkPriority = 'high';
      } else if (config.contentType === 'video') {
        params.encodings[0].priority = 'high';
      }

      await sender.setParameters(params);

      // Apply track constraints
      await sender.track.applyConstraints(getOptimizedConstraints());

      console.log('Screen share optimizations applied:', {
        contentType: config.contentType,
        bitrate: config.bitrate,
        frameRate: config.frameRate,
      });
    } catch (error) {
      console.error('Failed to apply screen share optimizations:', error);
    }
  }, [config, getOptimizedConstraints]);

  return {
    isSharing,
    stream,
    config,
    analysis,
    startScreenShare,
    stopScreenShare,
    setContentType,
    optimizeForContent,
    getOptimizedConstraints,
    applyOptimizations,
  };
}

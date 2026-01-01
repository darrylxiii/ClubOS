import { useState, useCallback, useRef, useEffect } from 'react';

type GestureType = 
  | 'thumbs_up' 
  | 'thumbs_down' 
  | 'wave' 
  | 'raise_hand' 
  | 'ok' 
  | 'peace' 
  | 'pointing' 
  | 'clap'
  | 'none';

interface GestureEvent {
  gesture: GestureType;
  confidence: number;
  timestamp: number;
  participantId?: string;
}

interface GestureSettings {
  enabled: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  cooldownMs: number;
  minConfidence: number;
}

interface UseGestureRecognitionReturn {
  currentGesture: GestureType;
  gestureConfidence: number;
  gestureHistory: GestureEvent[];
  isAnalyzing: boolean;
  startAnalysis: (videoElement: HTMLVideoElement) => void;
  stopAnalysis: () => void;
  settings: GestureSettings;
  updateSettings: (settings: Partial<GestureSettings>) => void;
  onGesture: (callback: (event: GestureEvent) => void) => () => void;
}

export function useGestureRecognition(): UseGestureRecognitionReturn {
  const [currentGesture, setCurrentGesture] = useState<GestureType>('none');
  const [gestureConfidence, setGestureConfidence] = useState(0);
  const [gestureHistory, setGestureHistory] = useState<GestureEvent[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [settings, setSettings] = useState<GestureSettings>({
    enabled: true,
    sensitivity: 'medium',
    cooldownMs: 1000,
    minConfidence: 0.7,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number>();
  const lastGestureRef = useRef<{ gesture: GestureType; timestamp: number }>({ gesture: 'none', timestamp: 0 });
  const callbacksRef = useRef<Set<(event: GestureEvent) => void>>(new Set());
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const getSensitivityThreshold = useCallback((): number => {
    switch (settings.sensitivity) {
      case 'low': return 0.85;
      case 'medium': return 0.7;
      case 'high': return 0.55;
      default: return 0.7;
    }
  }, [settings.sensitivity]);

  // Simplified gesture detection using canvas color/motion analysis
  const analyzeFrame = useCallback((video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 160;
    canvas.height = 120;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Analyze upper portion for hand detection (simplified)
    let skinPixelCount = 0;
    let totalPixels = 0;
    let handRegionY = 0;
    let handRegionX = 0;

    for (let y = 0; y < canvas.height * 0.6; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Simple skin tone detection (RGB ranges)
        if (r > 95 && g > 40 && b > 20 &&
            r > g && r > b &&
            Math.abs(r - g) > 15 &&
            r - g > 15 && r - b > 15) {
          skinPixelCount++;
          handRegionY += y;
          handRegionX += x;
        }
        totalPixels++;
      }
    }

    const skinRatio = skinPixelCount / totalPixels;
    const avgHandY = skinPixelCount > 0 ? handRegionY / skinPixelCount : 0;
    const avgHandX = skinPixelCount > 0 ? handRegionX / skinPixelCount : canvas.width / 2;

    // Gesture detection based on hand position and skin presence
    let detectedGesture: GestureType = 'none';
    let confidence = 0;

    const threshold = getSensitivityThreshold();

    if (skinRatio > 0.15) {
      // Significant hand presence in upper frame
      if (avgHandY < canvas.height * 0.25) {
        detectedGesture = 'raise_hand';
        confidence = Math.min(skinRatio * 3, 0.95);
      } else if (avgHandX > canvas.width * 0.7) {
        detectedGesture = 'wave';
        confidence = Math.min(skinRatio * 2.5, 0.85);
      } else if (skinRatio > 0.25) {
        detectedGesture = 'thumbs_up';
        confidence = Math.min(skinRatio * 2, 0.8);
      }
    }

    if (confidence >= threshold && confidence >= settings.minConfidence) {
      const now = Date.now();
      const lastGesture = lastGestureRef.current;

      if (detectedGesture !== lastGesture.gesture || 
          now - lastGesture.timestamp > settings.cooldownMs) {
        
        setCurrentGesture(detectedGesture);
        setGestureConfidence(confidence);

        const event: GestureEvent = {
          gesture: detectedGesture,
          confidence,
          timestamp: now,
        };

        setGestureHistory(prev => [...prev.slice(-49), event]);
        lastGestureRef.current = { gesture: detectedGesture, timestamp: now };

        callbacksRef.current.forEach(cb => cb(event));
      }
    } else if (currentGesture !== 'none') {
      setCurrentGesture('none');
      setGestureConfidence(0);
    }
  }, [settings.cooldownMs, settings.minConfidence, getSensitivityThreshold, currentGesture]);

  const startAnalysis = useCallback((videoElement: HTMLVideoElement) => {
    if (!settings.enabled) return;

    videoRef.current = videoElement;
    
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    setIsAnalyzing(true);

    const analyze = () => {
      if (videoRef.current && canvasRef.current && isAnalyzing) {
        analyzeFrame(videoRef.current, canvasRef.current);
      }
      animationRef.current = requestAnimationFrame(analyze);
    };

    analyze();
  }, [settings.enabled, analyzeFrame, isAnalyzing]);

  const stopAnalysis = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsAnalyzing(false);
    setCurrentGesture('none');
    setGestureConfidence(0);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<GestureSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const onGesture = useCallback((callback: (event: GestureEvent) => void): (() => void) => {
    callbacksRef.current.add(callback);
    return () => {
      callbacksRef.current.delete(callback);
    };
  }, []);

  useEffect(() => {
    return () => {
      stopAnalysis();
    };
  }, [stopAnalysis]);

  return {
    currentGesture,
    gestureConfidence,
    gestureHistory,
    isAnalyzing,
    startAnalysis,
    stopAnalysis,
    settings,
    updateSettings,
    onGesture,
  };
}

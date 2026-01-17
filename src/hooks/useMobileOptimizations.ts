import { useState, useEffect, useCallback, useMemo } from 'react';

interface MobileOptimizations {
  isMobile: boolean;
  isTablet: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  batteryOptimization: boolean;
  reducedMotion: boolean;

  // Recommended settings
  audioSettings: {
    maxBitrate: number;
    sampleRate: number;
    enableDTX: boolean;
    enableFEC: boolean;
  };
  videoSettings: {
    width: number;
    height: number;
    frameRate: number;
    maxBitrate: number;
  };
}

interface MobileOptimizationsConfig {
  enableBatterySaving?: boolean;
  forceHighQuality?: boolean;
}

export function useMobileOptimizations(config: MobileOptimizationsConfig = {}) {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState<boolean | null>(null);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  // Detect device type
  useEffect(() => {
    const checkDevice = () => {
      const ua = navigator.userAgent.toLowerCase();
      const width = window.innerWidth;

      // Mobile detection
      const mobileUA = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua);
      const tabletUA = /ipad|tablet|playbook|silk/i.test(ua);

      // Also check screen width
      const isMobileWidth = width < 768;
      const isTabletWidth = width >= 768 && width < 1024;

      setIsMobile(mobileUA || isMobileWidth);
      setIsTablet(tabletUA || isTabletWidth);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);

    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Battery status API (if available)
  useEffect(() => {
    const getBatteryInfo = async () => {
      try {
        if ('getBattery' in navigator) {
          const battery = await (navigator as any).getBattery();

          const updateBattery = () => {
            setBatteryLevel(battery.level);
            setIsCharging(battery.charging);
          };

          updateBattery();
          battery.addEventListener('levelchange', updateBattery);
          battery.addEventListener('chargingchange', updateBattery);

          return () => {
            battery.removeEventListener('levelchange', updateBattery);
            battery.removeEventListener('chargingchange', updateBattery);
          };
        }
      } catch (_e) {
        console.log('[MobileOpt] Battery API not available');
      }
    };

    getBatteryInfo();
  }, []);

  // Network Information API (if available)
  useEffect(() => {
    const connection = (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (connection) {
      const updateConnection = () => {
        setConnectionType(connection.effectiveType || 'unknown');
      };

      updateConnection();
      connection.addEventListener('change', updateConnection);

      return () => connection.removeEventListener('change', updateConnection);
    }
  }, []);

  // Calculate device type
  const deviceType = useMemo((): 'mobile' | 'tablet' | 'desktop' => {
    if (isMobile) return 'mobile';
    if (isTablet) return 'tablet';
    return 'desktop';
  }, [isMobile, isTablet]);

  // Determine if battery optimization should be enabled
  const batteryOptimization = useMemo(() => {
    if (config.forceHighQuality) return false;
    if (!config.enableBatterySaving) return false;

    // Enable if battery < 20% and not charging
    if (batteryLevel !== null && batteryLevel < 0.2 && !isCharging) {
      return true;
    }

    return false;
  }, [batteryLevel, isCharging, config.enableBatterySaving, config.forceHighQuality]);

  // Check for reduced motion preference
  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Calculate optimal audio settings
  const audioSettings = useMemo(() => {
    if (config.forceHighQuality) {
      return {
        maxBitrate: 64000,
        sampleRate: 48000,
        enableDTX: false,
        enableFEC: true
      };
    }

    // Mobile/low battery settings
    if (isMobile || batteryOptimization || connectionType === '2g') {
      return {
        maxBitrate: 24000,   // Lower bitrate for mobile
        sampleRate: 24000,   // Lower sample rate
        enableDTX: true,     // Enable DTX to save bandwidth during silence
        enableFEC: true      // Keep FEC for reliability
      };
    }

    // Tablet/3G settings
    if (isTablet || connectionType === '3g') {
      return {
        maxBitrate: 32000,
        sampleRate: 48000,
        enableDTX: true,
        enableFEC: true
      };
    }

    // Desktop/WiFi/4G+ settings
    return {
      maxBitrate: 64000,
      sampleRate: 48000,
      enableDTX: false,
      enableFEC: true
    };
  }, [isMobile, isTablet, batteryOptimization, connectionType, config.forceHighQuality]);

  // Calculate optimal video settings
  const videoSettings = useMemo(() => {
    if (config.forceHighQuality) {
      return {
        width: 1280,
        height: 720,
        frameRate: 30,
        maxBitrate: 2500000 // 2.5 Mbps
      };
    }

    // Mobile/low battery - aggressive optimization
    if (isMobile || batteryOptimization || connectionType === '2g') {
      return {
        width: 480,
        height: 360,
        frameRate: 15,
        maxBitrate: 300000 // 300 Kbps
      };
    }

    // Tablet/3G
    if (isTablet || connectionType === '3g') {
      return {
        width: 640,
        height: 480,
        frameRate: 24,
        maxBitrate: 800000 // 800 Kbps
      };
    }

    // Desktop/WiFi/4G+
    return {
      width: 1280,
      height: 720,
      frameRate: 30,
      maxBitrate: 2500000 // 2.5 Mbps
    };
  }, [isMobile, isTablet, batteryOptimization, connectionType, config.forceHighQuality]);

  // Get media constraints based on device
  const getMediaConstraints = useCallback((): MediaStreamConstraints => {
    return {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: { ideal: audioSettings.sampleRate },
        channelCount: { ideal: 1 } // Mono for voice
      },
      video: {
        width: { ideal: videoSettings.width, max: videoSettings.width },
        height: { ideal: videoSettings.height, max: videoSettings.height },
        frameRate: { ideal: videoSettings.frameRate, max: videoSettings.frameRate },
        facingMode: 'user'
      }
    };
  }, [audioSettings, videoSettings]);

  // Get SDP options for mobile
  const getSDPOptions = useCallback(() => {
    return {
      enableOpusFEC: audioSettings.enableFEC,
      enableOpusDTX: audioSettings.enableDTX,
      opusMaxAverageBitrate: audioSettings.maxBitrate,
      preferredAudioCodec: 'opus' as const,
      preferredVideoCodec: 'VP9' as const
    };
  }, [audioSettings]);

  const optimizations: MobileOptimizations = {
    isMobile,
    isTablet,
    deviceType,
    batteryOptimization,
    reducedMotion,
    audioSettings,
    videoSettings
  };

  return {
    ...optimizations,
    batteryLevel,
    isCharging,
    connectionType,
    getMediaConstraints,
    getSDPOptions
  };
}

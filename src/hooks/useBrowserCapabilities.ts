import { useState, useEffect, useMemo } from 'react';

export interface BrowserCapabilities {
  // Audio capabilities
  audioWorklet: boolean;
  webAudioAPI: boolean;
  speechRecognition: boolean;
  mediaRecorder: boolean;
  
  // Video capabilities
  webGL: boolean;
  webGL2: boolean;
  offscreenCanvas: boolean;
  insertableStreams: boolean;
  
  // Codec support
  vp9: boolean;
  av1: boolean;
  opus: boolean;
  h264: boolean;
  
  // WebRTC features
  rtcDataChannel: boolean;
  rtcRtpTransceiver: boolean;
  getDisplayMedia: boolean;
  
  // Other features
  sharedArrayBuffer: boolean;
  wasmSimd: boolean;
  serviceWorker: boolean;
  indexedDB: boolean;
  
  // Overall readiness
  isFullySupported: boolean;
  unsupportedFeatures: string[];
}

interface UseBrowserCapabilitiesReturn {
  capabilities: BrowserCapabilities;
  isLoading: boolean;
  checkFeature: (feature: keyof BrowserCapabilities) => boolean;
  getUnsupportedFeatures: () => string[];
  canUseFeature: (feature: string) => boolean;
}

async function checkCodecSupport(mimeType: string): Promise<boolean> {
  try {
    if (typeof RTCRtpSender !== 'undefined' && RTCRtpSender.getCapabilities) {
      const capabilities = RTCRtpSender.getCapabilities('video');
      if (capabilities?.codecs) {
        return capabilities.codecs.some(codec => 
          codec.mimeType.toLowerCase().includes(mimeType.toLowerCase())
        );
      }
    }
    return false;
  } catch {
    return false;
  }
}

async function checkAudioCodecSupport(mimeType: string): Promise<boolean> {
  try {
    if (typeof RTCRtpSender !== 'undefined' && RTCRtpSender.getCapabilities) {
      const capabilities = RTCRtpSender.getCapabilities('audio');
      if (capabilities?.codecs) {
        return capabilities.codecs.some(codec => 
          codec.mimeType.toLowerCase().includes(mimeType.toLowerCase())
        );
      }
    }
    return false;
  } catch {
    return false;
  }
}

async function detectCapabilities(): Promise<BrowserCapabilities> {
  const capabilities: BrowserCapabilities = {
    // Audio
    audioWorklet: typeof AudioWorkletNode !== 'undefined',
    webAudioAPI: typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined',
    speechRecognition: typeof (window as any).SpeechRecognition !== 'undefined' || typeof (window as any).webkitSpeechRecognition !== 'undefined',
    mediaRecorder: typeof MediaRecorder !== 'undefined',
    
    // Video
    webGL: (() => {
      try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
      } catch { return false; }
    })(),
    webGL2: (() => {
      try {
        const canvas = document.createElement('canvas');
        return !!canvas.getContext('webgl2');
      } catch { return false; }
    })(),
    offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
    insertableStreams: typeof (window as any).RTCRtpScriptTransform !== 'undefined',
    
    // Codecs - will be updated async
    vp9: false,
    av1: false,
    opus: false,
    h264: false,
    
    // WebRTC
    rtcDataChannel: typeof RTCPeerConnection !== 'undefined' && 'createDataChannel' in RTCPeerConnection.prototype,
    rtcRtpTransceiver: typeof RTCRtpTransceiver !== 'undefined',
    getDisplayMedia: typeof navigator.mediaDevices?.getDisplayMedia === 'function',
    
    // Other
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    wasmSimd: (() => {
      try {
        return WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]));
      } catch { return false; }
    })(),
    serviceWorker: 'serviceWorker' in navigator,
    indexedDB: typeof indexedDB !== 'undefined',
    
    isFullySupported: false,
    unsupportedFeatures: [],
  };

  // Check codec support async
  const [vp9, av1, opus, h264] = await Promise.all([
    checkCodecSupport('VP9'),
    checkCodecSupport('AV1'),
    checkAudioCodecSupport('opus'),
    checkCodecSupport('H264'),
  ]);

  capabilities.vp9 = vp9;
  capabilities.av1 = av1;
  capabilities.opus = opus;
  capabilities.h264 = h264;

  // Determine unsupported features
  const criticalFeatures: (keyof BrowserCapabilities)[] = [
    'webAudioAPI',
    'mediaRecorder',
    'rtcDataChannel',
  ];

  const unsupported: string[] = [];
  
  for (const feature of criticalFeatures) {
    if (!capabilities[feature]) {
      unsupported.push(feature);
    }
  }

  capabilities.unsupportedFeatures = unsupported;
  capabilities.isFullySupported = unsupported.length === 0;

  return capabilities;
}

export function useBrowserCapabilities(): UseBrowserCapabilitiesReturn {
  const [capabilities, setCapabilities] = useState<BrowserCapabilities>({
    audioWorklet: false,
    webAudioAPI: false,
    speechRecognition: false,
    mediaRecorder: false,
    webGL: false,
    webGL2: false,
    offscreenCanvas: false,
    insertableStreams: false,
    vp9: false,
    av1: false,
    opus: false,
    h264: false,
    rtcDataChannel: false,
    rtcRtpTransceiver: false,
    getDisplayMedia: false,
    sharedArrayBuffer: false,
    wasmSimd: false,
    serviceWorker: false,
    indexedDB: false,
    isFullySupported: false,
    unsupportedFeatures: [],
  });
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    detectCapabilities().then(caps => {
      if (mounted) {
        setCapabilities(caps);
        setIsLoading(false);
      }
    });

    return () => { mounted = false; };
  }, []);

  const checkFeature = useMemo(() => (feature: keyof BrowserCapabilities): boolean => {
    return capabilities[feature] as boolean;
  }, [capabilities]);

  const getUnsupportedFeatures = useMemo(() => (): string[] => {
    return capabilities.unsupportedFeatures;
  }, [capabilities]);

  const canUseFeature = useMemo(() => (feature: string): boolean => {
    switch (feature) {
      case 'noiseCancellation':
        return capabilities.audioWorklet && capabilities.webAudioAPI;
      case 'spatialAudio':
        return capabilities.webAudioAPI;
      case 'lowLightEnhancement':
        return capabilities.webGL2;
      case 'virtualBackground':
        return capabilities.webGL && capabilities.offscreenCanvas;
      case 'transcription':
        return capabilities.speechRecognition;
      case 'svc':
        return capabilities.vp9 || capabilities.av1;
      case 'screenShare':
        return capabilities.getDisplayMedia;
      case 'recording':
        return capabilities.mediaRecorder;
      default:
        return true;
    }
  }, [capabilities]);

  return {
    capabilities,
    isLoading,
    checkFeature,
    getUnsupportedFeatures,
    canUseFeature,
  };
}

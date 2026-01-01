import { useState, useCallback, useRef, useEffect } from 'react';

interface SVCLayer {
  spatialLayerId: number;
  temporalLayerId: number;
  width: number;
  height: number;
  frameRate: number;
  bitrate: number;
}

interface SVCConfig {
  codec: 'VP9' | 'AV1';
  spatialLayers: number;
  temporalLayers: number;
  baseWidth: number;
  baseHeight: number;
  baseBitrate: number;
}

interface UseSVCReturn {
  isSupported: boolean;
  activeCodec: 'VP9' | 'AV1' | 'Simulcast' | null;
  layers: SVCLayer[];
  currentLayer: SVCLayer | null;
  enableSVC: (sender: RTCRtpSender) => Promise<boolean>;
  setTargetLayer: (spatialId: number, temporalId: number) => void;
  getOptimalLayer: (availableBandwidth: number) => SVCLayer | null;
  getSVCParameters: () => RTCRtpEncodingParameters | null;
}

const DEFAULT_CONFIG: SVCConfig = {
  codec: 'VP9',
  spatialLayers: 3,
  temporalLayers: 3,
  baseWidth: 320,
  baseHeight: 180,
  baseBitrate: 100000,
};

export function useSVC(): UseSVCReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [activeCodec, setActiveCodec] = useState<'VP9' | 'AV1' | 'Simulcast' | null>(null);
  const [layers, setLayers] = useState<SVCLayer[]>([]);
  const [currentLayer, setCurrentLayer] = useState<SVCLayer | null>(null);
  
  const configRef = useRef<SVCConfig>(DEFAULT_CONFIG);
  const senderRef = useRef<RTCRtpSender | null>(null);

  // Check SVC support on mount
  useEffect(() => {
    checkSVCSupport();
  }, []);

  const checkSVCSupport = useCallback(async () => {
    try {
      // Check for VP9 SVC support
      const vp9Support = await checkCodecSupport('VP9');
      const av1Support = await checkCodecSupport('AV1');
      
      if (av1Support) {
        configRef.current.codec = 'AV1';
        setIsSupported(true);
      } else if (vp9Support) {
        configRef.current.codec = 'VP9';
        setIsSupported(true);
      } else {
        setIsSupported(false);
      }
    } catch (error) {
      console.warn('SVC support check failed:', error);
      setIsSupported(false);
    }
  }, []);

  const checkCodecSupport = async (codec: 'VP9' | 'AV1'): Promise<boolean> => {
    try {
      // Check if browser supports the codec with SVC
      const capabilities = RTCRtpSender.getCapabilities?.('video');
      if (!capabilities) return false;

      const codecInfo = capabilities.codecs.find(c => 
        c.mimeType.toLowerCase().includes(codec.toLowerCase())
      );

      if (!codecInfo) return false;

      // Additional check for scalabilityMode support
      if ('RTCRtpScriptTransform' in window || navigator.userAgent.includes('Chrome')) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  };

  const generateLayers = useCallback((config: SVCConfig): SVCLayer[] => {
    const generatedLayers: SVCLayer[] = [];
    
    for (let s = 0; s < config.spatialLayers; s++) {
      for (let t = 0; t < config.temporalLayers; t++) {
        const spatialScale = Math.pow(2, s);
        const temporalScale = Math.pow(2, t) / Math.pow(2, config.temporalLayers - 1);
        
        generatedLayers.push({
          spatialLayerId: s,
          temporalLayerId: t,
          width: config.baseWidth * spatialScale,
          height: config.baseHeight * spatialScale,
          frameRate: Math.round(30 * temporalScale),
          bitrate: Math.round(config.baseBitrate * spatialScale * spatialScale * temporalScale),
        });
      }
    }
    
    return generatedLayers.sort((a, b) => a.bitrate - b.bitrate);
  }, []);

  const enableSVC = useCallback(async (sender: RTCRtpSender): Promise<boolean> => {
    if (!isSupported || !sender.track) {
      setActiveCodec('Simulcast');
      return false;
    }

    try {
      const params = sender.getParameters();
      
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }

      // Configure SVC encoding
      const scalabilityMode = configRef.current.codec === 'AV1' 
        ? 'L3T3_KEY' // AV1 SVC mode
        : 'L3T3';    // VP9 SVC mode

      params.encodings[0] = {
        ...params.encodings[0],
        maxBitrate: 2500000,
        maxFramerate: 30,
      };
      
      // Add scalabilityMode via type assertion for browsers that support it
      (params.encodings[0] as any).scalabilityMode = scalabilityMode;

      await sender.setParameters(params);
      
      senderRef.current = sender;
      setActiveCodec(configRef.current.codec);
      setLayers(generateLayers(configRef.current));
      
      // Set initial layer to highest
      const allLayers = generateLayers(configRef.current);
      if (allLayers.length > 0) {
        setCurrentLayer(allLayers[allLayers.length - 1]);
      }

      console.log(`SVC enabled with ${configRef.current.codec}, mode: ${scalabilityMode}`);
      return true;
    } catch (error) {
      console.warn('Failed to enable SVC, falling back to Simulcast:', error);
      setActiveCodec('Simulcast');
      return false;
    }
  }, [isSupported, generateLayers]);

  const setTargetLayer = useCallback((spatialId: number, temporalId: number) => {
    const targetLayer = layers.find(
      l => l.spatialLayerId === spatialId && l.temporalLayerId === temporalId
    );
    
    if (targetLayer) {
      setCurrentLayer(targetLayer);
      
      // In a real implementation, this would communicate with the SFU
      // to request specific layer forwarding
      console.log(`SVC layer changed: S${spatialId}T${temporalId}`, targetLayer);
    }
  }, [layers]);

  const getOptimalLayer = useCallback((availableBandwidth: number): SVCLayer | null => {
    if (layers.length === 0) return null;
    
    // Find the highest quality layer that fits within bandwidth
    const suitableLayers = layers.filter(l => l.bitrate <= availableBandwidth * 0.8);
    
    if (suitableLayers.length === 0) {
      return layers[0]; // Return lowest layer if bandwidth is very limited
    }
    
    return suitableLayers[suitableLayers.length - 1];
  }, [layers]);

  const getSVCParameters = useCallback((): RTCRtpEncodingParameters | null => {
    if (!senderRef.current) return null;
    
    const params = senderRef.current.getParameters();
    return params.encodings?.[0] || null;
  }, []);

  return {
    isSupported,
    activeCodec,
    layers,
    currentLayer,
    enableSVC,
    setTargetLayer,
    getOptimalLayer,
    getSVCParameters,
  };
}

import { useCallback, useRef, useEffect } from 'react';
import { ConnectionQuality } from './useConnectionQuality';
import { logger } from '@/lib/logger';

interface AdaptiveAudioConfig {
  minBitrate: number;
  maxBitrate: number;
  targetBitrate: number;
  fecEnabled: boolean;
  dtxEnabled: boolean; // Discontinuous transmission (saves bandwidth during silence)
}

// Quality presets based on connection quality (Discord-inspired)
const QUALITY_PRESETS: Record<ConnectionQuality, AdaptiveAudioConfig> = {
  excellent: {
    minBitrate: 48000,
    maxBitrate: 96000,
    targetBitrate: 64000,
    fecEnabled: false,
    dtxEnabled: false
  },
  good: {
    minBitrate: 32000,
    maxBitrate: 64000,
    targetBitrate: 48000,
    fecEnabled: false,
    dtxEnabled: false
  },
  fair: {
    minBitrate: 24000,
    maxBitrate: 48000,
    targetBitrate: 32000,
    fecEnabled: true, // Enable FEC for packet loss recovery
    dtxEnabled: true
  },
  poor: {
    minBitrate: 16000,
    maxBitrate: 32000,
    targetBitrate: 24000,
    fecEnabled: true,
    dtxEnabled: true
  },
  disconnected: {
    minBitrate: 16000,
    maxBitrate: 24000,
    targetBitrate: 16000,
    fecEnabled: true,
    dtxEnabled: true
  }
};

interface UseAdaptiveAudioProps {
  peerConnection: RTCPeerConnection | null;
  connectionQuality: ConnectionQuality;
  enabled: boolean;
}

export function useAdaptiveAudio({
  peerConnection,
  connectionQuality,
  enabled
}: UseAdaptiveAudioProps) {
  const currentConfigRef = useRef<AdaptiveAudioConfig>(QUALITY_PRESETS.excellent);
  const lastQualityRef = useRef<ConnectionQuality>(connectionQuality);
  const adaptationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Apply bitrate configuration to audio sender
  const applyBitrateConfig = useCallback(async (config: AdaptiveAudioConfig) => {
    if (!peerConnection) return false;

    try {
      const audioSender = peerConnection.getSenders().find(
        s => s.track?.kind === 'audio'
      );

      if (!audioSender) {
        console.warn('[AdaptiveAudio] No audio sender found');
        return false;
      }

      const params = audioSender.getParameters();
      
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }

      // Apply bitrate constraints
      params.encodings[0].maxBitrate = config.maxBitrate;
      
      // Set priority based on quality
      params.encodings[0].networkPriority = 'high';
      params.encodings[0].priority = 'high';

      await audioSender.setParameters(params);

      console.log('[AdaptiveAudio] Applied config:', {
        quality: connectionQuality,
        maxBitrate: config.maxBitrate,
        fec: config.fecEnabled,
        dtx: config.dtxEnabled
      });

      currentConfigRef.current = config;
      return true;

    } catch (error) {
      console.error('[AdaptiveAudio] Error applying config:', error);
      return false;
    }
  }, [peerConnection, connectionQuality]);

  // Configure Opus codec preferences with FEC
  const configureOpusWithFEC = useCallback(async (enableFEC: boolean) => {
    if (!peerConnection) return;

    try {
      const transceivers = peerConnection.getTransceivers();
      const audioTransceiver = transceivers.find(
        t => t.receiver.track?.kind === 'audio' || t.sender.track?.kind === 'audio'
      );

      if (!audioTransceiver || !RTCRtpSender.getCapabilities) return;

      const capabilities = RTCRtpSender.getCapabilities('audio');
      if (!capabilities?.codecs) return;

      // Find Opus codecs and prioritize them
      const opusCodecs = capabilities.codecs.filter(c => 
        c.mimeType.toLowerCase() === 'audio/opus'
      );

      if (opusCodecs.length > 0 && audioTransceiver.setCodecPreferences) {
        audioTransceiver.setCodecPreferences(opusCodecs);
        logger.debug('Set Opus as preferred codec', { componentName: 'AdaptiveAudio', fec: enableFEC });
      }

    } catch (error) {
      logger.warn('Could not configure Opus', { componentName: 'AdaptiveAudio', error });
    }
  }, [peerConnection]);

  // Adapt audio parameters when quality changes
  useEffect(() => {
    if (!enabled || !peerConnection) return;

    // Debounce quality changes to avoid rapid toggling
    if (connectionQuality !== lastQualityRef.current) {
      // Clear any pending adaptation
      if (adaptationTimeoutRef.current) {
        clearTimeout(adaptationTimeoutRef.current);
      }

      // Wait 1 second before adapting (allows quality to stabilize)
      adaptationTimeoutRef.current = setTimeout(async () => {
        lastQualityRef.current = connectionQuality;
        
        const newConfig = QUALITY_PRESETS[connectionQuality];
        
        // Only adapt if config actually changed
        if (newConfig.targetBitrate !== currentConfigRef.current.targetBitrate) {
          console.log('[AdaptiveAudio] Quality changed, adapting...', {
            from: currentConfigRef.current.targetBitrate,
            to: newConfig.targetBitrate,
            quality: connectionQuality
          });

          await applyBitrateConfig(newConfig);
          
          // Configure FEC if needed
          if (newConfig.fecEnabled !== currentConfigRef.current.fecEnabled) {
            await configureOpusWithFEC(newConfig.fecEnabled);
          }
        }
      }, 1000);
    }

    return () => {
      if (adaptationTimeoutRef.current) {
        clearTimeout(adaptationTimeoutRef.current);
      }
    };
  }, [enabled, peerConnection, connectionQuality, applyBitrateConfig, configureOpusWithFEC]);

  // Initial configuration
  useEffect(() => {
    if (enabled && peerConnection) {
      const initialConfig = QUALITY_PRESETS[connectionQuality];
      applyBitrateConfig(initialConfig);
      configureOpusWithFEC(initialConfig.fecEnabled);
    }
  }, [enabled, peerConnection]); // Only run on initial enable

  // Get current configuration
  const getCurrentConfig = useCallback(() => currentConfigRef.current, []);

  // Get recommended bitrate for given packet loss
  const getRecommendedBitrate = useCallback((packetLoss: number): number => {
    if (packetLoss > 10) return 16000;  // Aggressive reduction
    if (packetLoss > 5) return 24000;
    if (packetLoss > 2) return 32000;
    if (packetLoss > 1) return 48000;
    return 64000; // Optimal
  }, []);

  // Manual bitrate override
  const setBitrate = useCallback(async (bitrate: number) => {
    const clampedBitrate = Math.max(16000, Math.min(96000, bitrate));
    
    return applyBitrateConfig({
      ...currentConfigRef.current,
      targetBitrate: clampedBitrate,
      maxBitrate: clampedBitrate
    });
  }, [applyBitrateConfig]);

  return {
    currentConfig: currentConfigRef.current,
    getCurrentConfig,
    getRecommendedBitrate,
    setBitrate,
    qualityPresets: QUALITY_PRESETS
  };
}

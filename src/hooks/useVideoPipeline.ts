import { useState, useEffect, useCallback, useRef } from 'react';
import { useLowLightEnhancement } from './useLowLightEnhancement';
import { useSVC } from './useSVC';
import { useSmartBandwidth } from './useSmartBandwidth';
import { useBrowserCapabilities } from './useBrowserCapabilities';
import type { MeetingFeatureSettings } from './useMeetingFeatureSettings';

interface VideoPipelineConfig {
  inputStream: MediaStream | null;
  peerConnection?: RTCPeerConnection | null;
  settings: MeetingFeatureSettings;
  enabled: boolean;
  activeSpeakerId?: string | null;
  participantCount?: number;
}

interface VideoPipelineState {
  isProcessing: boolean;
  processedStream: MediaStream | null;
  currentQuality: 'low' | 'medium' | 'high' | 'hd';
  lowLightActive: boolean;
  svcEnabled: boolean;
  processingLatency: number;
  frameRate: number;
  error: string | null;
}

interface UseVideoPipelineReturn extends VideoPipelineState {
  startProcessing: () => Promise<void>;
  stopProcessing: () => void;
  setQuality: (quality: 'low' | 'medium' | 'high' | 'hd') => void;
  prioritizeParticipant: (participantId: string) => void;
  getProcessedStream: () => MediaStream | null;
}

export function useVideoPipeline(config: VideoPipelineConfig): UseVideoPipelineReturn {
  const { 
    inputStream, 
    peerConnection, 
    settings, 
    enabled, 
    activeSpeakerId,
    participantCount = 1 
  } = config;

  const [state, setState] = useState<VideoPipelineState>({
    isProcessing: false,
    processedStream: null,
    currentQuality: 'high',
    lowLightActive: false,
    svcEnabled: false,
    processingLatency: 0,
    frameRate: 30,
    error: null,
  });

  const { canUseFeature } = useBrowserCapabilities();
  const processedStreamRef = useRef<MediaStream | null>(null);
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());

  // Low light enhancement
  const lowLight = useLowLightEnhancement();

  // Scalable Video Coding
  const svc = useSVC();

  // Smart bandwidth allocation
  const smartBandwidth = useSmartBandwidth({
    totalBandwidth: 2500000, // 2.5 Mbps default
  });

  // Calculate frame rate
  useEffect(() => {
    if (!state.isProcessing || !inputStream) return;

    const videoTrack = inputStream.getVideoTracks()[0];
    if (!videoTrack) return;

    const updateFrameRate = () => {
      const now = performance.now();
      const elapsed = now - lastFrameTimeRef.current;
      
      if (elapsed >= 1000) {
        const fps = (frameCountRef.current * 1000) / elapsed;
        setState(prev => ({ ...prev, frameRate: Math.round(fps) }));
        frameCountRef.current = 0;
        lastFrameTimeRef.current = now;
      }
    };

    const interval = setInterval(updateFrameRate, 1000);
    return () => clearInterval(interval);
  }, [state.isProcessing, inputStream]);

  // Start video processing pipeline
  const startProcessing = useCallback(async () => {
    if (!inputStream || !enabled) return;

    try {
      setState(prev => ({ ...prev, error: null }));
      const startTime = performance.now();

      let currentStream = inputStream;
      let lowLightActive = false;
      let svcEnabled = false;

      // Step 1: Apply low-light enhancement if needed
      if (settings.lowLightEnhancement.enabled && canUseFeature('lowLightEnhancement')) {
        await lowLight.enableEnhancement(inputStream);
        if (lowLight.enhancedStream) {
          currentStream = lowLight.enhancedStream;
          lowLightActive = lowLight.lightAnalysis?.isLowLight ?? false;
        }
      }

      // Step 2: Configure SVC on the peer connection sender
      if (settings.svc.enabled && peerConnection && canUseFeature('svc')) {
        const senders = peerConnection.getSenders();
        const videoSender = senders.find(s => s.track?.kind === 'video');
        
        if (videoSender) {
          const success = await svc.enableSVC(videoSender);
          svcEnabled = success;
        }
      }

      // Step 3: Add participants to smart bandwidth allocation
      if (settings.adaptiveQuality.enabled) {
        smartBandwidth.addParticipant('local');
      }

      processedStreamRef.current = currentStream;
      const processingLatency = performance.now() - startTime;

      setState(prev => ({
        ...prev,
        isProcessing: true,
        processedStream: currentStream,
        lowLightActive,
        svcEnabled,
        processingLatency,
      }));

    } catch (error) {
      console.error('[VideoPipeline] Error starting processing:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start video processing',
      }));
    }
  }, [inputStream, enabled, settings, canUseFeature, lowLight, svc, smartBandwidth, peerConnection]);

  // Stop video processing
  const stopProcessing = useCallback(() => {
    lowLight.disableEnhancement();
    smartBandwidth.removeParticipant('local');

    processedStreamRef.current = null;

    setState(prev => ({
      ...prev,
      isProcessing: false,
      processedStream: null,
      lowLightActive: false,
      frameRate: 0,
    }));
  }, [lowLight, smartBandwidth]);

  // Auto-start when stream and settings change
  useEffect(() => {
    if (inputStream && enabled) {
      startProcessing();
    } else {
      stopProcessing();
    }

    return () => stopProcessing();
  }, [inputStream, enabled]);

  // Update bandwidth allocation when active speaker changes
  useEffect(() => {
    if (settings.adaptiveQuality.enabled && state.isProcessing && activeSpeakerId) {
      smartBandwidth.updateSpeakingState(activeSpeakerId, true);
    }
  }, [activeSpeakerId, settings.adaptiveQuality.enabled, state.isProcessing, smartBandwidth]);

  const setQuality = useCallback((quality: 'low' | 'medium' | 'high' | 'hd') => {
    setState(prev => ({ ...prev, currentQuality: quality }));
    
    const bitrates = { low: 200000, medium: 600000, high: 1500000, hd: 3000000 };
    smartBandwidth.setTotalBandwidth(bitrates[quality]);
  }, [smartBandwidth]);

  const prioritizeParticipant = useCallback((participantId: string) => {
    smartBandwidth.pinParticipant(participantId, true);
  }, [smartBandwidth]);

  const getProcessedStream = useCallback(() => {
    return processedStreamRef.current;
  }, []);

  return {
    ...state,
    startProcessing,
    stopProcessing,
    setQuality,
    prioritizeParticipant,
    getProcessedStream,
  };
}

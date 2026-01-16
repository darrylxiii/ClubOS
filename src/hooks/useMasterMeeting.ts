import { useState, useCallback, useEffect, useRef } from 'react';
import { useVoiceChannel } from './useVoiceChannel';
import { usePerformanceMonitor } from './usePerformanceMonitor';
import { useAudioPipeline } from './useAudioPipeline';
import { useVideoPipeline } from './useVideoPipeline';
import { useMeetingFeatureSettings, type MeetingFeatureSettings } from './useMeetingFeatureSettings';
import { useBrowserCapabilities } from './useBrowserCapabilities';
import { useNetworkResilience } from './useNetworkResilience';
import { useAITranscription } from './useAITranscription';
import { useGestureRecognition } from './useGestureRecognition';
import { useMeetingAnalytics } from './useMeetingAnalytics';
import { useAutoHighlight } from './useAutoHighlight';
import { useResourceOptimizer } from './useResourceOptimizer';
import { useMemoryManager } from './useMemoryManager';
import { useStatePreservation } from './useStatePreservation';
import { useQualityRecovery } from './useQualityRecovery';
import { useICERestart } from './useICERestart';

export interface MeetingParticipant {
  id: string;
  name: string;
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  isPinned: boolean;
  handRaised: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface MeetingState {
  isActive: boolean;
  startTime: number | null;
  participants: MeetingParticipant[];
  localParticipantId: string | null;
  isRecording: boolean;
  isTranscribing: boolean;
  layout: 'grid' | 'speaker' | 'sidebar';
  activeSpeakerId: string | null;
}

export interface UseMasterMeetingOptions {
  channelId: string;
  userId: string;
  userName: string;
  autoJoin?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableStatePreservation?: boolean;
  enableQualityRecovery?: boolean;
  enableAllFeatures?: boolean;
}

export interface MasterMeetingReturn {
  // Core state
  meetingState: MeetingState;
  error: string | null;
  isConnected: boolean;
  connectionStatus: any;

  // Core actions
  joinMeeting: () => Promise<void>;
  leaveMeeting: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  toggleHandRaise: () => void;
  pinParticipant: (participantId: string) => void;
  setLayout: (layout: 'grid' | 'speaker' | 'sidebar') => void;
  toggleRecording: () => void;
  toggleTranscription: () => void;
  getMeetingDuration: () => number;
  getMeetingStats: () => any;

  // Voice channel access
  voice: ReturnType<typeof useVoiceChannel>;

  // Performance monitoring
  performance: ReturnType<typeof usePerformanceMonitor>;

  // Audio pipeline
  audioPipeline: {
    isProcessing: boolean;
    processedStream: MediaStream | null;
    audioLevel: number;
    isSpeaking: boolean;
    processingLatency: number;
  };

  // Video pipeline
  videoPipeline: {
    isProcessing: boolean;
    processedStream: MediaStream | null;
    currentQuality: 'low' | 'medium' | 'high' | 'hd';
    lowLightActive: boolean;
    svcEnabled: boolean;
    frameRate: number;
    setQuality: (quality: 'low' | 'medium' | 'high' | 'hd') => void;
    prioritizeParticipant: (participantId: string) => void;
  };

  // Network resilience
  networkResilience: {
    currentStats: any;
    history: any;
    connectionState: any;
    getStatusColor: () => string;
    getStatusLabel: () => string;
  };

  // AI Transcription
  transcription: {
    isTranscribing: boolean;
    transcripts: any[];
    currentInterim: string;
    startTranscription: (stream: MediaStream) => void;
    stopTranscription: () => void;
    exportTranscripts: (format: 'txt' | 'srt' | 'vtt' | 'json') => string;
    searchTranscripts: (query: string) => any[];
  };

  // Gesture recognition
  gestures: {
    detectedGesture: string | null;
    confidence: number;
    enable: (videoElement: HTMLVideoElement) => void;
    disable: () => void;
    isAnalyzing: boolean;
  };

  // Meeting analytics
  analytics: {
    participantStats: Map<string, any>;
    meetingMetrics: any;
    timeline: any[];
    exportAnalytics: () => any;
    isTracking: boolean;
  };

  // Auto highlights
  highlights: {
    all: any[];
    isAnalyzing: boolean;
    getByType: (type: string) => any[];
    search: (query: string) => any[];
    export: (format: 'json' | 'markdown') => string;
  };

  // Quality recovery
  qualityRecovery: {
    currentQuality: 'high' | 'medium' | 'low';
    forceQuality: (quality: 'high' | 'medium' | 'low') => void;
    qualityState: any;
    isRecovering: boolean;
  };

  // Resource optimization
  resources: {
    optimizationLevel: number;
    cpuUsage: number;
    memoryUsage: number;
    batteryLevel: number | null;
    isOptimizing: boolean;
  };

  // Feature settings
  settings: {
    current: MeetingFeatureSettings;
    update: <K extends keyof MeetingFeatureSettings>(
      category: K,
      updates: Partial<MeetingFeatureSettings[K]>
    ) => void;
    toggle: (category: keyof MeetingFeatureSettings, enabled: boolean) => void;
    reset: () => void;
    isFeatureEnabled: (category: keyof MeetingFeatureSettings) => boolean;
  };

  // Browser capabilities
  capabilities: {
    supported: string[];
    unsupported: string[];
    canUseFeature: (feature: string) => boolean;
    isLoading: boolean;
  };
}

export function useMasterMeeting(options: UseMasterMeetingOptions): MasterMeetingReturn {
  const {
    channelId,
    userId,
    userName,
    autoJoin = false,
    enablePerformanceMonitoring = true,
    enableStatePreservation = true,
    enableQualityRecovery = true,
    enableAllFeatures = false,
  } = options;

  // Core meeting state
  const [meetingState, setMeetingState] = useState<MeetingState>({
    isActive: false,
    startTime: null,
    participants: [],
    localParticipantId: null,
    isRecording: false,
    isTranscribing: false,
    layout: 'grid',
    activeSpeakerId: null,
  });

  const [error, setError] = useState<string | null>(null);
  const [currentQuality, setCurrentQuality] = useState<'high' | 'medium' | 'low'>('high');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const joinMeetingRef = useRef(false);

  // Feature settings
  const {
    settings: featureSettings,
    updateSetting,
    toggleFeature,
    resetToDefaults,
    isFeatureEnabled,
  } = useMeetingFeatureSettings();

  // Browser capabilities
  const {
    capabilities: browserCapabilities,
    isLoading: capabilitiesLoading,
    canUseFeature,
    getUnsupportedFeatures,
  } = useBrowserCapabilities();

  // Voice channel
  const voice = useVoiceChannel(channelId, { pushToTalkEnabled: false });

  // Performance monitoring
  const performance = usePerformanceMonitor({
    sampleInterval: 2000,
    onPerformanceDrop: () => {
      if (enableQualityRecovery) {
        setCurrentQuality(prev => prev === 'high' ? 'medium' : 'low');
      }
    },
  });

  // Audio pipeline
  const audioPipelineResult = useAudioPipeline({
    inputStream: localStream,
    settings: featureSettings,
    enabled: meetingState.isActive && featureSettings.noiseCancellation.enabled,
    onSpeakingChange: (isSpeaking) => {
      setMeetingState(prev => ({
        ...prev,
        participants: prev.participants.map(p =>
          p.id === prev.localParticipantId ? { ...p, isSpeaking } : p
        ),
      }));
    },
  });

  // Video pipeline
  const videoPipelineResult = useVideoPipeline({
    inputStream: localStream,
    peerConnection: null, // Will be connected when WebRTC is integrated
    settings: featureSettings,
    enabled: meetingState.isActive,
    activeSpeakerId: meetingState.activeSpeakerId,
    participantCount: meetingState.participants.length,
  });

  // Network resilience
  const networkResilience = useNetworkResilience();

  // AI Transcription
  const aiTranscription = useAITranscription();

  // Gesture recognition - simplified
  const gestureRecognition = useGestureRecognition();

  // Meeting analytics - simplified
  const meetingAnalytics = useMeetingAnalytics(channelId);

  // Auto highlights - simplified
  const autoHighlight = useAutoHighlight();

  // Resource optimizer - simplified
  const resourceOptimizer = useResourceOptimizer();

  // Memory manager - simplified
  const memoryManager = useMemoryManager();

  // State preservation - simplified
  const statePreservation = useStatePreservation(channelId);

  // Quality recovery - simplified
  const qualityRecovery = useQualityRecovery();

  // ICE restart - simplified
  const iceRestart = useICERestart();

  // Join meeting
  const joinMeeting = useCallback(async () => {
    if (joinMeetingRef.current) return;
    joinMeetingRef.current = true;

    try {
      setError(null);

      if (enablePerformanceMonitoring) {
        performance.startMonitoring();
      }

      // Try to get local media stream
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
      } catch (mediaError) {
        console.warn('[MasterMeeting] Could not get media devices:', mediaError);
      }

      const localParticipant: MeetingParticipant = {
        id: userId,
        name: userName,
        isMuted: voice.isMuted,
        isVideoOn: voice.isVideoOn,
        isScreenSharing: false,
        isSpeaking: false,
        isPinned: false,
        handRaised: false,
        connectionQuality: 'excellent',
      };

      setMeetingState(prev => ({
        ...prev,
        isActive: true,
        startTime: Date.now(),
        participants: [localParticipant],
        localParticipantId: userId,
      }));

      // Save initial state via settings
      if (enableStatePreservation) {
        statePreservation.updateSettings({
          isMuted: voice.isMuted,
          isVideoOff: !voice.isVideoOn,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join meeting');
      joinMeetingRef.current = false;
    }
  }, [userId, userName, voice.isMuted, voice.isVideoOn, enablePerformanceMonitoring, performance, enableStatePreservation, statePreservation]);

  // Leave meeting
  const leaveMeeting = useCallback(async () => {
    // Stop all processing
    audioPipelineResult.stopProcessing();
    videoPipelineResult.stopProcessing();
    aiTranscription.stopTranscription();
    performance.stopMonitoring();

    // Cleanup local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    voice.leaveChannel();

    setMeetingState({
      isActive: false,
      startTime: null,
      participants: [],
      localParticipantId: null,
      isRecording: false,
      isTranscribing: false,
      layout: 'grid',
      activeSpeakerId: null,
    });

    joinMeetingRef.current = false;
  }, [voice, performance, audioPipelineResult, videoPipelineResult, aiTranscription, localStream]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    voice.toggleMute();
    setMeetingState(prev => ({
      ...prev,
      participants: prev.participants.map(p =>
        p.id === prev.localParticipantId ? { ...p, isMuted: !p.isMuted } : p
      ),
    }));
  }, [voice]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    voice.toggleVideo();
    setMeetingState(prev => ({
      ...prev,
      participants: prev.participants.map(p =>
        p.id === prev.localParticipantId ? { ...p, isVideoOn: !p.isVideoOn } : p
      ),
    }));
  }, [voice]);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    await voice.toggleScreenShare();
    setMeetingState(prev => ({
      ...prev,
      participants: prev.participants.map(p =>
        p.id === prev.localParticipantId ? { ...p, isScreenSharing: !p.isScreenSharing } : p
      ),
    }));
  }, [voice]);

  // Toggle hand raise
  const toggleHandRaise = useCallback(() => {
    setMeetingState(prev => ({
      ...prev,
      participants: prev.participants.map(p =>
        p.id === prev.localParticipantId ? { ...p, handRaised: !p.handRaised } : p
      ),
    }));
  }, []);

  // Pin participant
  const pinParticipant = useCallback((participantId: string) => {
    setMeetingState(prev => ({
      ...prev,
      participants: prev.participants.map(p => ({
        ...p,
        isPinned: p.id === participantId ? !p.isPinned : false,
      })),
    }));
  }, []);

  // Set layout
  const setLayout = useCallback((layout: 'grid' | 'speaker' | 'sidebar') => {
    setMeetingState(prev => ({ ...prev, layout }));
  }, []);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    setMeetingState(prev => ({ ...prev, isRecording: !prev.isRecording }));
  }, []);

  // Toggle transcription
  const toggleTranscription = useCallback(() => {
    setMeetingState(prev => {
      const newIsTranscribing = !prev.isTranscribing;

      if (newIsTranscribing && localStream) {
        aiTranscription.startTranscription(localStream, userId, userName);
      } else {
        aiTranscription.stopTranscription();
      }

      return { ...prev, isTranscribing: newIsTranscribing };
    });
  }, [aiTranscription, localStream, userId, userName]);

  // Get meeting duration
  const getMeetingDuration = useCallback(() => {
    if (!meetingState.startTime) return 0;
    return Math.floor((Date.now() - meetingState.startTime) / 1000);
  }, [meetingState.startTime]);

  // Get meeting stats
  const getMeetingStats = useCallback(() => ({
    duration: getMeetingDuration(),
    participantCount: meetingState.participants.length,
    performance: performance.getPerformanceSummary(),
    quality: currentQuality,
    network: networkResilience.exportReport(),
    audio: {
      isProcessing: audioPipelineResult.isProcessing,
      level: audioPipelineResult.audioLevel,
      latency: audioPipelineResult.processingLatency,
    },
    video: {
      isProcessing: videoPipelineResult.isProcessing,
      quality: videoPipelineResult.currentQuality,
      frameRate: videoPipelineResult.frameRate,
      lowLightActive: videoPipelineResult.lowLightActive,
    },
  }), [
    getMeetingDuration,
    meetingState.participants.length,
    performance,
    currentQuality,
    networkResilience,
    audioPipelineResult,
    videoPipelineResult,
  ]);

  // Auto-join effect
  useEffect(() => {
    if (autoJoin && channelId && !meetingState.isActive) {
      joinMeeting();
    }
  }, [autoJoin, channelId, meetingState.isActive, joinMeeting]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (meetingState.isActive) {
        leaveMeeting();
      }
    };
  }, []);

  // Build supported/unsupported features list
  const supportedFeatures = Object.entries(browserCapabilities)
    .filter(([key, value]) => value === true && !['isFullySupported', 'unsupportedFeatures'].includes(key))
    .map(([key]) => key);

  return {
    // Core state
    meetingState,
    error,
    isConnected: voice.isConnected,
    connectionStatus: voice.connectionStats,

    // Core actions
    joinMeeting,
    leaveMeeting,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    toggleHandRaise,
    pinParticipant,
    setLayout,
    toggleRecording,
    toggleTranscription,
    getMeetingDuration,
    getMeetingStats,

    // Voice channel
    voice,

    // Performance
    performance,

    // Audio pipeline
    audioPipeline: {
      isProcessing: audioPipelineResult.isProcessing,
      processedStream: audioPipelineResult.processedStream,
      audioLevel: audioPipelineResult.audioLevel,
      isSpeaking: audioPipelineResult.isSpeaking,
      processingLatency: audioPipelineResult.processingLatency,
    },

    // Video pipeline
    videoPipeline: {
      isProcessing: videoPipelineResult.isProcessing,
      processedStream: videoPipelineResult.processedStream,
      currentQuality: videoPipelineResult.currentQuality,
      lowLightActive: videoPipelineResult.lowLightActive,
      svcEnabled: videoPipelineResult.svcEnabled,
      frameRate: videoPipelineResult.frameRate,
      setQuality: videoPipelineResult.setQuality,
      prioritizeParticipant: videoPipelineResult.prioritizeParticipant,
    },

    // Network resilience
    networkResilience: {
      currentStats: networkResilience.currentStats,
      history: networkResilience.history,
      connectionState: networkResilience.connectionState,
      getStatusColor: networkResilience.getStatusColor,
      getStatusLabel: networkResilience.getStatusLabel,
    },

    // AI Transcription
    transcription: {
      isTranscribing: aiTranscription.isTranscribing,
      transcripts: aiTranscription.transcripts,
      currentInterim: aiTranscription.currentInterim,
      startTranscription: (stream: MediaStream) =>
        aiTranscription.startTranscription(stream, userId, userName),
      stopTranscription: aiTranscription.stopTranscription,
      exportTranscripts: aiTranscription.exportTranscripts,
      searchTranscripts: aiTranscription.searchTranscripts,
    },

    // Gesture recognition
    gestures: {
      detectedGesture: gestureRecognition.currentGesture,
      confidence: gestureRecognition.gestureConfidence,
      enable: gestureRecognition.startAnalysis,
      disable: gestureRecognition.stopAnalysis,
      isAnalyzing: gestureRecognition.isAnalyzing,
    },

    // Meeting analytics
    analytics: {
      participantStats: meetingAnalytics.participantStats,
      meetingMetrics: meetingAnalytics.meetingMetrics,
      timeline: meetingAnalytics.timeline,
      exportAnalytics: meetingAnalytics.exportAnalytics,
      isTracking: meetingAnalytics.isTracking,
    },

    // Auto highlights
    highlights: {
      all: autoHighlight.highlights,
      isAnalyzing: autoHighlight.isAnalyzing,
      getByType: autoHighlight.getHighlightsByType as (type: string) => any[],
      search: autoHighlight.searchHighlights,
      export: autoHighlight.exportHighlights,
    },

    // Quality recovery
    qualityRecovery: {
      currentQuality,
      forceQuality: setCurrentQuality,
      qualityState: qualityRecovery.qualityState,
      isRecovering: qualityRecovery.qualityState.isRecovering,
    },

    // Resource optimization
    resources: {
      optimizationLevel: resourceOptimizer.optimizationLevel,
      cpuUsage: resourceOptimizer.metrics.cpuUsage,
      memoryUsage: resourceOptimizer.metrics.memoryUsage,
      batteryLevel: resourceOptimizer.metrics.batteryLevel,
      isOptimizing: resourceOptimizer.isOptimizing,
    },

    // Feature settings
    settings: {
      current: featureSettings,
      update: updateSetting,
      toggle: toggleFeature,
      reset: resetToDefaults,
      isFeatureEnabled,
    },

    // Browser capabilities
    capabilities: {
      supported: supportedFeatures,
      unsupported: getUnsupportedFeatures(),
      canUseFeature,
      isLoading: capabilitiesLoading,
    },
  };
}

import { useState, useCallback, useEffect, useRef } from 'react';
import { useVoiceChannel } from './useVoiceChannel';
import { usePerformanceMonitor } from './usePerformanceMonitor';

interface MeetingParticipant {
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

interface MeetingState {
  isActive: boolean;
  startTime: number | null;
  participants: MeetingParticipant[];
  localParticipantId: string | null;
  isRecording: boolean;
  isTranscribing: boolean;
  layout: 'grid' | 'speaker' | 'sidebar';
  activeSpeakerId: string | null;
}

interface UseMasterMeetingOptions {
  channelId: string;
  userId: string;
  userName: string;
  autoJoin?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableStatePreservation?: boolean;
  enableQualityRecovery?: boolean;
}

export function useMasterMeeting(options: UseMasterMeetingOptions) {
  const {
    channelId,
    userId,
    userName,
    autoJoin = false,
    enablePerformanceMonitoring = true
  } = options;

  const [meetingState, setMeetingState] = useState<MeetingState>({
    isActive: false,
    startTime: null,
    participants: [],
    localParticipantId: null,
    isRecording: false,
    isTranscribing: false,
    layout: 'grid',
    activeSpeakerId: null
  });

  const [error, setError] = useState<string | null>(null);
  const [currentQuality, setCurrentQuality] = useState<'high' | 'medium' | 'low'>('high');

  const voice = useVoiceChannel(channelId, { pushToTalkEnabled: false });

  const performance = usePerformanceMonitor({
    sampleInterval: 2000,
    onPerformanceDrop: () => {
      setCurrentQuality(prev => prev === 'high' ? 'medium' : 'low');
    }
  });

  const joinMeetingRef = useRef(false);

  const joinMeeting = useCallback(async () => {
    if (joinMeetingRef.current) return;
    joinMeetingRef.current = true;

    try {
      setError(null);
      if (enablePerformanceMonitoring) {
        performance.startMonitoring();
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
        connectionQuality: 'excellent'
      };

      setMeetingState(prev => ({
        ...prev,
        isActive: true,
        startTime: Date.now(),
        participants: [localParticipant],
        localParticipantId: userId
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join meeting');
      joinMeetingRef.current = false;
    }
  }, [userId, userName, voice.isMuted, voice.isVideoOn, enablePerformanceMonitoring, performance]);

  const leaveMeeting = useCallback(async () => {
    performance.stopMonitoring();
    voice.leaveChannel();
    setMeetingState({
      isActive: false,
      startTime: null,
      participants: [],
      localParticipantId: null,
      isRecording: false,
      isTranscribing: false,
      layout: 'grid',
      activeSpeakerId: null
    });
    joinMeetingRef.current = false;
  }, [voice, performance]);

  const toggleMute = useCallback(() => {
    voice.toggleMute();
    setMeetingState(prev => ({
      ...prev,
      participants: prev.participants.map(p =>
        p.id === prev.localParticipantId ? { ...p, isMuted: !p.isMuted } : p
      )
    }));
  }, [voice]);

  const toggleVideo = useCallback(() => {
    voice.toggleVideo();
    setMeetingState(prev => ({
      ...prev,
      participants: prev.participants.map(p =>
        p.id === prev.localParticipantId ? { ...p, isVideoOn: !p.isVideoOn } : p
      )
    }));
  }, [voice]);

  const toggleScreenShare = useCallback(async () => {
    await voice.toggleScreenShare();
    setMeetingState(prev => ({
      ...prev,
      participants: prev.participants.map(p =>
        p.id === prev.localParticipantId ? { ...p, isScreenSharing: !p.isScreenSharing } : p
      )
    }));
  }, [voice]);

  const toggleHandRaise = useCallback(() => {
    setMeetingState(prev => ({
      ...prev,
      participants: prev.participants.map(p =>
        p.id === prev.localParticipantId ? { ...p, handRaised: !p.handRaised } : p
      )
    }));
  }, []);

  const pinParticipant = useCallback((participantId: string) => {
    setMeetingState(prev => ({
      ...prev,
      participants: prev.participants.map(p => ({
        ...p,
        isPinned: p.id === participantId ? !p.isPinned : false
      }))
    }));
  }, []);

  const setLayout = useCallback((layout: 'grid' | 'speaker' | 'sidebar') => {
    setMeetingState(prev => ({ ...prev, layout }));
  }, []);

  const toggleRecording = useCallback(() => {
    setMeetingState(prev => ({ ...prev, isRecording: !prev.isRecording }));
  }, []);

  const toggleTranscription = useCallback(() => {
    setMeetingState(prev => ({ ...prev, isTranscribing: !prev.isTranscribing }));
  }, []);

  const getMeetingDuration = useCallback(() => {
    if (!meetingState.startTime) return 0;
    return Math.floor((Date.now() - meetingState.startTime) / 1000);
  }, [meetingState.startTime]);

  const getMeetingStats = useCallback(() => ({
    duration: getMeetingDuration(),
    participantCount: meetingState.participants.length,
    performance: performance.getPerformanceSummary(),
    quality: currentQuality
  }), [getMeetingDuration, meetingState.participants.length, performance, currentQuality]);

  useEffect(() => {
    if (autoJoin && channelId && !meetingState.isActive) {
      joinMeeting();
    }
  }, [autoJoin, channelId, meetingState.isActive, joinMeeting]);

  return {
    meetingState,
    error,
    isConnected: voice.isConnected,
    connectionStatus: voice.connectionStats,
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
    voice,
    performance,
    qualityRecovery: { currentQuality, forceQuality: setCurrentQuality }
  };
}

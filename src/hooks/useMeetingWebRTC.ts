import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBandwidthMonitor } from './useBandwidthMonitor';
import { useMobileOptimizations } from './useMobileOptimizations';
import { toast } from 'sonner';
import { meetingLogger as log } from '@/lib/meetingLogger';
import { supportsE2EEncryption } from '@/utils/webrtcConfig';
import { useSignalingChannel } from './useSignalingChannel';
import { usePeerConnectionManager } from './usePeerConnectionManager';
import { useMeetingScreenShare } from './useMeetingScreenShare';

interface MeetingWebRTCConfig {
  meetingId: string;
  participantId: string;
  participantName: string;
  onRemoteStream: (participantId: string, stream: MediaStream) => void;
  onParticipantLeft: (participantId: string) => void;
  enableE2EE?: boolean;
}

export function useMeetingWebRTC({
  meetingId,
  participantId,
  participantName,
  onRemoteStream,
  onParticipantLeft,
  enableE2EE = false,
}: MeetingWebRTCConfig) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [error, setError] = useState<{ message: string; recoverable: boolean } | null>(null);

  const hasJoinedRef = useRef(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const { stats } = useBandwidthMonitor();
  const { getMediaConstraints } = useMobileOptimizations({ enableBatterySaving: true });

  // --- Signal dispatch callback (stable via useCallback) ---
  const handleSignalDispatch = useCallback((signal: { sender_id: string; signal_type: string; signal_data: any }) => {
    switch (signal.signal_type) {
      case 'join':
        pcManager.handleParticipantJoin(signal.sender_id);
        break;
      case 'offer':
        pcManager.handleOffer(signal.sender_id, signal.signal_data);
        break;
      case 'answer':
        pcManager.handleAnswer(signal.sender_id, signal.signal_data);
        break;
      case 'ice-candidate':
        pcManager.handleIceCandidate(signal.sender_id, signal.signal_data);
        break;
      case 'leave':
        pcManager.handleParticipantLeave(signal.sender_id);
        break;
      case 'screen-share-start':
        toast(`${signal.sender_id.slice(0, 8)} is sharing their screen`, { duration: 2000 });
        break;
      case 'screen-share-stop':
      case 'video-state':
      case 'audio-state':
        break;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — refs are stable

  // 1. Signaling channel
  const signaling = useSignalingChannel({
    meetingId,
    participantId,
    onSignal: handleSignalDispatch,
  });

  // 2. Peer connection manager
  const pcManager = usePeerConnectionManager({
    meetingId,
    participantId,
    participantName,
    enableE2EE,
    onRemoteStream,
    onParticipantLeft,
    sendSignal: signaling.sendSignal,
  });

  // 3. Screen share
  const screenShare = useMeetingScreenShare({
    peerConnections: pcManager.peerConnections,
    localStreamRef: pcManager.localStreamRef,
    sendSignal: signaling.sendSignal,
    configureVideoSender: pcManager.configureVideoSender,
    setScreenShareContentHint: pcManager.setScreenShareContentHint,
  });

  // --- Initialize local media ---
  const initializeMedia = useCallback(async () => {
    try {
      log.debug('WebRTC', 'Requesting media permissions…');
      setError(null);

      const constraints = getMediaConstraints();
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      setLocalStream(stream);
      pcManager.setLocalStream(stream);
      signaling.setMediaReady(true);

      // Add tracks to existing PCs
      if (pcManager.peerConnections.current.size > 0) {
        pcManager.peerConnections.current.forEach((pc) => {
          stream.getTracks().forEach(track => pc.addTrack(track, stream));
        });
      }

      // Wait for channel ready
      await signaling.waitForChannelReady();

      // Send join signal
      if (!hasJoinedRef.current) {
        await signaling.sendSignal({ type: 'join', data: { name: participantName } });
        hasJoinedRef.current = true;
      }

      // Process queued joins
      await pcManager.processPendingJoins();

      return stream;
    } catch (err: unknown) {
      log.error('WebRTC', 'Media init failed:', err);
      const e = err as { name?: string; message?: string };
      const recoverable = e.name !== 'NotAllowedError' && e.name !== 'PermissionDeniedError';
      setError({
        message: e.name === 'NotFoundError' ? 'No camera or microphone detected'
          : e.name === 'NotAllowedError' ? 'Camera/microphone access denied. Click "Allow" in browser.'
          : e.name === 'NotReadableError' ? 'Camera/microphone is being used by another app'
          : `Failed to access media: ${e.message || 'Unknown error'}`,
        recoverable,
      });
      throw err;
    }
  }, [getMediaConstraints, participantName, signaling, pcManager]);

  // --- Toggle video ---
  const toggleVideo = useCallback(async () => {
    const stream = pcManager.localStreamRef.current;
    if (stream) {
      const track = stream.getVideoTracks()[0];
      if (track) {
        const newState = !isVideoEnabled;
        track.enabled = newState;
        setIsVideoEnabled(newState);
        await signaling.sendSignal({ type: 'video-state', data: { enabled: newState } });
      }
    } else {
      try { await initializeMedia(); } catch {}
    }
  }, [isVideoEnabled, initializeMedia, signaling, pcManager]);

  // --- Toggle audio ---
  const toggleAudio = useCallback(async () => {
    const stream = pcManager.localStreamRef.current;
    if (stream) {
      const track = stream.getAudioTracks()[0];
      if (track) {
        const newState = !isAudioEnabled;
        track.enabled = newState;
        setIsAudioEnabled(newState);
        await signaling.sendSignal({ type: 'audio-state', data: { enabled: newState } });
      }
    }
  }, [isAudioEnabled, signaling, pcManager]);

  // --- Send reaction ---
  const sendReaction = useCallback(async (emoji: string) => {
    await signaling.sendSignal({ type: 'reaction', data: { emoji, participantName } });
  }, [participantName, signaling]);

  // --- Picture-in-Picture ---
  const enablePictureInPicture = useCallback(async () => {
    const stream = pcManager.localStreamRef.current;
    if (!stream || !document.pictureInPictureEnabled) return false;
    try {
      const el = document.createElement('video');
      el.srcObject = stream; el.muted = true;
      await el.play();
      await el.requestPictureInPicture();
      return true;
    } catch { return false; }
  }, [pcManager]);

  // --- Cleanup ---
  const cleanup = useCallback(() => {
    const stream = pcManager.localStreamRef.current;
    if (stream) { stream.getTracks().forEach(t => t.stop()); pcManager.setLocalStream(null); }
    if (screenShare.screenStream) { screenShare.screenStream.getTracks().forEach(t => t.stop()); }
    pcManager.cleanupConnections();

    void signaling.sendSignal({ type: 'leave', data: {} });

    void supabase.from('meeting_participants')
      .update({ left_at: new Date().toISOString(), status: 'left' })
      .eq('meeting_id', meetingId)
      .or(`user_id.eq.${participantId},session_token.eq.${participantId}`)
      .is('left_at', null);

    setLocalStream(null);
    screenShare.setScreenStream(null);
    setError(null);
  }, [meetingId, participantId, pcManager, screenShare, signaling]);

  // --- Retry connection ---
  const retryConnection = useCallback(async () => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      setError({ message: 'Failed to connect after multiple attempts. Please refresh the page.', recoverable: false });
      return;
    }
    reconnectAttempts.current++;
    setError(null);
    toast.info(`Reconnecting (${reconnectAttempts.current}/${maxReconnectAttempts})…`);
    pcManager.cleanupConnections();
    hasJoinedRef.current = false;
    signaling.setMediaReady(false);
    try {
      await initializeMedia();
      toast.success('Reconnected successfully');
      reconnectAttempts.current = 0;
    } catch {
      setError({ message: 'Reconnection failed. Please try again.', recoverable: true });
    }
  }, [initializeMedia, pcManager, signaling]);

  // Participant polling on channel issues
  useEffect(() => {
    if (signaling.channelStatus === 'disconnected' || signaling.channelStatus === 'error') {
      const id = setInterval(pcManager.pollParticipants, 2000);
      return () => clearInterval(id);
    }
  }, [signaling.channelStatus, pcManager]);

  return {
    localStream,
    isVideoEnabled,
    isAudioEnabled,
    connectionState: pcManager.connectionState,
    participants: pcManager.participants,
    screenStream: screenShare.screenStream,
    networkQuality: stats.quality,
    bandwidth: stats.bandwidth,
    latency: stats.latency,
    videoStats: pcManager.videoStats,
    error,
    channelStatus: signaling.channelStatus,
    peerConnections: pcManager.peerConnections.current,
    e2eeState: {
      enabled: pcManager.e2eeActive,
      isSupported: pcManager.e2ee.isSupported(),
      keyVersion: pcManager.e2ee.state.keyVersion,
      peersEncrypted: pcManager.e2ee.state.peersEncrypted.size,
      error: pcManager.e2ee.state.error,
    },
    toggleE2EE: async () => {
      if (!supportsE2EEncryption()) { toast.error('E2E encryption not supported in this browser'); return; }
      if (pcManager.e2eeEnabledRef.current) {
        pcManager.e2eeEnabledRef.current = false;
        pcManager.e2ee.disableEncryption();
        toast.info('End-to-end encryption disabled');
      } else {
        pcManager.e2eeEnabledRef.current = true;
        toast.info('Enabling end-to-end encryption…');
        for (const [peerId, pc] of pcManager.peerConnections.current) {
          await pcManager.e2ee.enableEncryption(pc, peerId);
        }
        toast.success('End-to-end encryption enabled');
      }
    },
    initializeMedia,
    toggleVideo,
    toggleAudio,
    toggleScreenShare: screenShare.toggleScreenShare,
    sendReaction,
    enablePictureInPicture,
    cleanup,
    retryConnection,
  };
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WebRTCConfig {
  sessionId: string;
  userId: string;
  onRemoteStream: (userId: string, stream: MediaStream) => void;
  onParticipantLeft: (userId: string) => void;
}

// Professional TURN/STUN servers for enterprise-grade connectivity
const ICE_SERVERS = [
  // Google STUN servers for NAT discovery
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  
  // FREE OpenRelay TURN servers (no signup required)
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];

const RTC_CONFIG = {
  iceServers: ICE_SERVERS,
  iceTransportPolicy: 'all' as RTCIceTransportPolicy,
  bundlePolicy: 'max-bundle' as RTCBundlePolicy,
  rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy,
  iceCandidatePoolSize: 10
};

export function useWebRTC({ sessionId, userId, onRemoteStream, onParticipantLeft }: WebRTCConfig) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState<'new' | 'connecting' | 'connected' | 'disconnected'>('new');
  
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const signalChannel = useRef<any>(null);

  // Initialize local media stream
  const initializeMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((targetUserId: string, stream: MediaStream) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    // Handle remote stream
    pc.ontrack = (event) => {
      onRemoteStream(targetUserId, event.streams[0]);
    };

    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
      await supabase.from('video_call_signals').insert({
        session_id: sessionId,
        from_user_id: userId,
        to_user_id: targetUserId,
        signal_type: 'ice-candidate',
        signal_data: event.candidate.toJSON() as any
      });
      }
    };

    // Handle connection state
    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState as any);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        onParticipantLeft(targetUserId);
      }
    };

    peerConnections.current.set(targetUserId, pc);
    return pc;
  }, [sessionId, userId, onRemoteStream, onParticipantLeft]);

  // Send offer to peer
  const sendOffer = useCallback(async (targetUserId: string, stream: MediaStream) => {
    const pc = createPeerConnection(targetUserId, stream);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await supabase.from('video_call_signals').insert({
      session_id: sessionId,
      from_user_id: userId,
      to_user_id: targetUserId,
      signal_type: 'offer',
      signal_data: offer as any
    });
  }, [sessionId, userId, createPeerConnection]);

  // Handle received offer
  const handleOffer = useCallback(async (fromUserId: string, offer: RTCSessionDescriptionInit, stream: MediaStream) => {
    const pc = createPeerConnection(fromUserId, stream);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await supabase.from('video_call_signals').insert({
      session_id: sessionId,
      from_user_id: userId,
      to_user_id: fromUserId,
      signal_type: 'answer',
      signal_data: answer as any
    });
  }, [sessionId, userId, createPeerConnection]);

  // Handle received answer
  const handleAnswer = useCallback(async (fromUserId: string, answer: RTCSessionDescriptionInit) => {
    const pc = peerConnections.current.get(fromUserId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }, []);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (fromUserId: string, candidate: RTCIceCandidateInit) => {
    const pc = peerConnections.current.get(fromUserId);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  // Subscribe to signaling channel
  useEffect(() => {
    if (!sessionId || !userId || !localStream) return;

    const channel = supabase
      .channel(`video-call-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'video_call_signals',
          filter: `to_user_id=eq.${userId}`
        },
        async (payload) => {
          const signal = payload.new;
          
          switch (signal.signal_type) {
            case 'offer':
              await handleOffer(signal.from_user_id, signal.signal_data, localStream);
              break;
            case 'answer':
              await handleAnswer(signal.from_user_id, signal.signal_data);
              break;
            case 'ice-candidate':
              await handleIceCandidate(signal.from_user_id, signal.signal_data);
              break;
          }
        }
      )
      .subscribe();

    signalChannel.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [sessionId, userId, localStream, handleOffer, handleAnswer, handleIceCandidate]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });

      // Replace video track in all peer connections
      const videoTrack = screenStream.getVideoTracks()[0];
      peerConnections.current.forEach((pc) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      // Handle screen share end
      videoTrack.onended = () => {
        if (localStream) {
          const originalVideoTrack = localStream.getVideoTracks()[0];
          peerConnections.current.forEach((pc) => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              sender.replaceTrack(originalVideoTrack);
            }
          });
        }
      };

      return screenStream;
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  }, [localStream]);

  // Cleanup
  const cleanup = useCallback(() => {
    localStream?.getTracks().forEach(track => track.stop());
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    signalChannel.current?.unsubscribe();
  }, [localStream]);

  return {
    localStream,
    isVideoEnabled,
    isAudioEnabled,
    connectionState,
    initializeMedia,
    sendOffer,
    toggleVideo,
    toggleAudio,
    startScreenShare,
    cleanup
  };
}
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface MeetingWebRTCConfig {
  meetingId: string;
  participantId: string; // Can be user ID or guest session ID
  participantName: string;
  onRemoteStream: (participantId: string, stream: MediaStream) => void;
  onParticipantLeft: (participantId: string) => void;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function useMeetingWebRTC({
  meetingId,
  participantId,
  participantName,
  onRemoteStream,
  onParticipantLeft
}: MeetingWebRTCConfig) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState<string>('new');
  const [participants, setParticipants] = useState<string[]>([]);
  
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const signalChannel = useRef<RealtimeChannel | null>(null);

  // Initialize local media
  const initializeMedia = useCallback(async () => {
    try {
      console.log('[WebRTC] Initializing local media...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log('[WebRTC] Local media initialized successfully');
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('[WebRTC] Failed to initialize media:', error);
      throw error;
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((targetParticipantId: string) => {
    console.log('[WebRTC] Creating peer connection for:', targetParticipantId);
    
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track from:', targetParticipantId);
      const [remoteStream] = event.streams;
      onRemoteStream(targetParticipantId, remoteStream);
    };

    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log('[WebRTC] Sending ICE candidate to:', targetParticipantId);
        await sendSignal({
          type: 'ice-candidate',
          receiverId: targetParticipantId,
          data: event.candidate
        });
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
      setConnectionState(pc.connectionState);
      
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        onParticipantLeft(targetParticipantId);
        peerConnections.current.delete(targetParticipantId);
      }
    };

    peerConnections.current.set(targetParticipantId, pc);
    return pc;
  }, [localStream, onRemoteStream, onParticipantLeft]);

  // Send signal through Supabase
  const sendSignal = async (signal: {
    type: string;
    receiverId?: string;
    data: any;
  }) => {
    try {
      await supabase.from('webrtc_signals').insert({
        meeting_id: meetingId,
        sender_id: participantId,
        receiver_id: signal.receiverId || null,
        signal_type: signal.type,
        signal_data: signal.data
      });
    } catch (error) {
      console.error('[WebRTC] Failed to send signal:', error);
    }
  };

  // Handle incoming offer
  const handleOffer = async (senderId: string, offer: RTCSessionDescriptionInit) => {
    console.log('[WebRTC] Handling offer from:', senderId);
    
    let pc = peerConnections.current.get(senderId);
    if (!pc) {
      pc = createPeerConnection(senderId);
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await sendSignal({
      type: 'answer',
      receiverId: senderId,
      data: answer
    });
  };

  // Handle incoming answer
  const handleAnswer = async (senderId: string, answer: RTCSessionDescriptionInit) => {
    console.log('[WebRTC] Handling answer from:', senderId);
    
    const pc = peerConnections.current.get(senderId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  // Handle ICE candidate
  const handleIceCandidate = async (senderId: string, candidate: RTCIceCandidateInit) => {
    console.log('[WebRTC] Handling ICE candidate from:', senderId);
    
    const pc = peerConnections.current.get(senderId);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  // Handle new participant join
  const handleParticipantJoin = async (newParticipantId: string) => {
    if (newParticipantId === participantId) return;
    
    console.log('[WebRTC] New participant joined:', newParticipantId);
    setParticipants(prev => [...new Set([...prev, newParticipantId])]);

    // Create offer for new participant
    const pc = createPeerConnection(newParticipantId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await sendSignal({
      type: 'offer',
      receiverId: newParticipantId,
      data: offer
    });
  };

  // Join meeting and set up signaling
  useEffect(() => {
    if (!meetingId) return;

    console.log('[WebRTC] Setting up signaling for meeting:', meetingId);

    // Subscribe to webrtc_signals
    const channel = supabase
      .channel(`meeting-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webrtc_signals',
          filter: `meeting_id=eq.${meetingId}`
        },
        async (payload: any) => {
          const signal = payload.new;
          
          // Ignore own signals
          if (signal.sender_id === participantId) return;
          
          // Ignore signals meant for others
          if (signal.receiver_id && signal.receiver_id !== participantId) return;

          console.log('[WebRTC] Received signal:', signal.signal_type, 'from:', signal.sender_id);

          switch (signal.signal_type) {
            case 'join':
              await handleParticipantJoin(signal.sender_id);
              break;
            case 'offer':
              await handleOffer(signal.sender_id, signal.signal_data);
              break;
            case 'answer':
              await handleAnswer(signal.sender_id, signal.signal_data);
              break;
            case 'ice-candidate':
              await handleIceCandidate(signal.sender_id, signal.signal_data);
              break;
            case 'leave':
              onParticipantLeft(signal.sender_id);
              peerConnections.current.delete(signal.sender_id);
              setParticipants(prev => prev.filter(p => p !== signal.sender_id));
              break;
          }
        }
      )
      .subscribe();

    signalChannel.current = channel;

    // Announce join
    sendSignal({
      type: 'join',
      data: { name: participantName }
    });

    return () => {
      // Announce leave
      sendSignal({
        type: 'leave',
        data: {}
      });
      
      channel.unsubscribe();
      signalChannel.current = null;
    };
  }, [meetingId, participantId]);

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

  // Cleanup
  const cleanup = useCallback(() => {
    console.log('[WebRTC] Cleaning up...');
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    
    setLocalStream(null);
  }, [localStream]);

  return {
    localStream,
    isVideoEnabled,
    isAudioEnabled,
    connectionState,
    participants,
    initializeMedia,
    toggleVideo,
    toggleAudio,
    cleanup
  };
}

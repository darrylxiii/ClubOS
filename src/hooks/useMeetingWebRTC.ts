import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useBandwidthMonitor } from './useBandwidthMonitor';

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
  const [error, setError] = useState<{ message: string; recoverable: boolean } | null>(null);
  
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const signalChannel = useRef<RealtimeChannel | null>(null);
  const { stats, getVideoConstraints } = useBandwidthMonitor();

  // Initialize local media with adaptive quality
  const initializeMedia = useCallback(async () => {
    try {
      console.log('[WebRTC] Initializing local media...');
      setError(null);
      
      const videoConstraints = getVideoConstraints();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: videoConstraints.width },
          height: { ideal: videoConstraints.height },
          frameRate: { ideal: videoConstraints.frameRate }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log('[WebRTC] Local media initialized successfully with quality:', stats.recommendedQuality);
      setLocalStream(stream);
      return stream;
    } catch (error: any) {
      console.error('[WebRTC] Failed to initialize media:', error);
      
      const recoverable = error.name !== 'NotAllowedError' && error.name !== 'PermissionDeniedError';
      setError({
        message: error.name === 'NotFoundError' 
          ? 'No camera or microphone found'
          : error.name === 'NotAllowedError'
          ? 'Camera/microphone access denied'
          : 'Failed to access media devices',
        recoverable
      });
      
      throw error;
    }
  }, [getVideoConstraints, stats.recommendedQuality]);

  // Create peer connection
  const createPeerConnection = useCallback((targetParticipantId: string) => {
    // Check if connection already exists
    if (peerConnections.current.has(targetParticipantId)) {
      console.log('[WebRTC] Reusing existing peer connection for:', targetParticipantId);
      return peerConnections.current.get(targetParticipantId)!;
    }
    
    console.log('[WebRTC] Creating peer connection for:', targetParticipantId);
    
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Store the connection immediately to prevent duplicates
    peerConnections.current.set(targetParticipantId, pc);

    // Add local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track from:', targetParticipantId, 'Kind:', event.track.kind, 'Streams:', event.streams.length);
      const [remoteStream] = event.streams;
      if (remoteStream) {
        console.log('[WebRTC] Remote stream has tracks:', remoteStream.getTracks().length);
        onRemoteStream(targetParticipantId, remoteStream);
      } else {
        console.warn('[WebRTC] No remote stream in track event');
      }
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

    // Connection state changes with recovery
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState, 'for:', targetParticipantId);
      setConnectionState(pc.connectionState);
      
      if (pc.connectionState === 'failed') {
        console.warn('[WebRTC] Connection failed, attempting to reconnect...');
        setError({ message: 'Connection lost, reconnecting...', recoverable: true });
        
        // Attempt ICE restart
        pc.restartIce();
        
        setTimeout(() => {
          if (pc.connectionState === 'failed') {
            onParticipantLeft(targetParticipantId);
            peerConnections.current.delete(targetParticipantId);
          }
        }, 5000);
      } else if (pc.connectionState === 'disconnected') {
        console.warn('[WebRTC] Connection disconnected');
        setError({ message: 'Connection unstable', recoverable: true });
        
        setTimeout(() => {
          if (pc.connectionState === 'disconnected') {
            onParticipantLeft(targetParticipantId);
            peerConnections.current.delete(targetParticipantId);
          }
        }, 10000);
      } else if (pc.connectionState === 'connected') {
        setError(null);
      }
    };

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
      console.log('[WebRTC] Creating new peer connection for offer from:', senderId);
      pc = createPeerConnection(senderId);
    }

    // Check if we're in a stable state before setting remote description
    if (pc.signalingState !== 'stable') {
      console.log('[WebRTC] Signaling state not stable, ignoring offer from:', senderId);
      return;
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
    if (pc && pc.signalingState === 'have-local-offer') {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('[WebRTC] Answer processed successfully from:', senderId);
      } catch (error) {
        console.error('[WebRTC] Error setting remote description:', error);
      }
    } else {
      console.warn('[WebRTC] Received answer but not in correct state:', pc?.signalingState);
    }
  };

  // Handle ICE candidate
  const handleIceCandidate = async (senderId: string, candidate: RTCIceCandidateInit) => {
    console.log('[WebRTC] Handling ICE candidate from:', senderId);
    
    const pc = peerConnections.current.get(senderId);
    if (pc && pc.remoteDescription) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('[WebRTC] ICE candidate added successfully');
      } catch (error) {
        console.error('[WebRTC] Error adding ICE candidate:', error);
      }
    } else {
      console.warn('[WebRTC] Cannot add ICE candidate, remote description not set yet');
    }
  };

  // Handle new participant join
  const handleParticipantJoin = async (newParticipantId: string) => {
    if (newParticipantId === participantId) return;
    
    // Check if we already have a connection
    if (peerConnections.current.has(newParticipantId)) {
      console.log('[WebRTC] Already have connection to:', newParticipantId);
      return;
    }
    
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

    // Query existing participants and send join signal
    const joinMeeting = async () => {
      console.log('[WebRTC] Waiting for channel to be ready...');
      
      // Wait for channel to be subscribed
      await new Promise((resolve) => {
        const checkSubscription = () => {
          if (channel.state === 'joined') {
            console.log('[WebRTC] Channel ready, sending join signal');
            resolve(true);
          } else {
            setTimeout(checkSubscription, 100);
          }
        };
        checkSubscription();
      });

      // Announce join
      await sendSignal({
        type: 'join',
        data: { name: participantName }
      });

      console.log('[WebRTC] Join signal sent, waiting for offers from existing participants');
    };

    joinMeeting();

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
  const toggleVideo = useCallback(async () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        const newState = !isVideoEnabled;
        videoTrack.enabled = newState;
        setIsVideoEnabled(newState);
        console.log('[WebRTC] Video toggled:', newState ? 'ON' : 'OFF');
        
        // Notify peers about video state change
        await sendSignal({
          type: 'video-state',
          data: { enabled: newState }
        });
      }
    } else {
      // If no stream exists, try to initialize it
      console.log('[WebRTC] No stream found, attempting to reinitialize...');
      try {
        await initializeMedia();
      } catch (error) {
        console.error('[WebRTC] Failed to reinitialize media:', error);
      }
    }
  }, [localStream, isVideoEnabled, initializeMedia]);

  // Toggle audio
  const toggleAudio = useCallback(async () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        const newState = !isAudioEnabled;
        audioTrack.enabled = newState;
        setIsAudioEnabled(newState);
        console.log('[WebRTC] Audio toggled:', newState ? 'ON' : 'OFF');
        
        // Notify peers about audio state change
        await sendSignal({
          type: 'audio-state',
          data: { enabled: newState }
        });
      }
    }
  }, [localStream, isAudioEnabled]);

  // Screen sharing
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  
  const toggleScreenShare = useCallback(async () => {
    if (screenStream) {
      // Stop screen sharing
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      
      // Notify peers to stop displaying screen share
      await sendSignal({
        type: 'screen-share-stop',
        data: {}
      });
      
      return false;
    } else {
      // Start screen sharing
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });
        
        setScreenStream(stream);
        
        // Replace video track in all peer connections
        const screenTrack = stream.getVideoTracks()[0];
        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });
        
        // Notify peers about screen share
        await sendSignal({
          type: 'screen-share-start',
          data: {}
        });
        
        // Handle when user stops sharing via browser UI
        screenTrack.onended = async () => {
          setScreenStream(null);
          
          // Restore camera track
          if (localStream) {
            const cameraTrack = localStream.getVideoTracks()[0];
            peerConnections.current.forEach((pc) => {
              const sender = pc.getSenders().find(s => s.track?.kind === 'video');
              if (sender && cameraTrack) {
                sender.replaceTrack(cameraTrack);
              }
            });
          }
          
          await sendSignal({
            type: 'screen-share-stop',
            data: {}
          });
        };
        
        return true;
      } catch (error) {
        console.error('[WebRTC] Failed to start screen share:', error);
        return false;
      }
    }
  }, [screenStream, localStream, peerConnections]);

  // Send reaction
  const sendReaction = useCallback(async (emoji: string) => {
    await sendSignal({
      type: 'reaction',
      data: { emoji, participantName }
    });
  }, [participantName]);

  // Picture-in-Picture support
  const enablePictureInPicture = async () => {
    if (!localStream || !document.pictureInPictureEnabled) {
      console.warn('[PiP] Picture-in-Picture not supported');
      return false;
    }

    try {
      const videoElement = document.createElement('video');
      videoElement.srcObject = localStream;
      videoElement.muted = true;
      await videoElement.play();
      await videoElement.requestPictureInPicture();
      return true;
    } catch (error) {
      console.error('[PiP] Failed to enable picture-in-picture:', error);
      return false;
    }
  };

  // Cleanup with robust teardown
  const cleanup = useCallback(() => {
    console.log('[WebRTC] Cleaning up all resources...');
    
    try {
      // Stop all local tracks
      if (localStream) {
        localStream.getTracks().forEach(track => {
          track.stop();
          console.log('[WebRTC] Stopped track:', track.kind);
        });
      }
      
      // Stop screen share if active
      if (screenStream) {
        screenStream.getTracks().forEach(track => {
          track.stop();
          console.log('[WebRTC] Stopped screen share track');
        });
      }
      
      // Close all peer connections
      peerConnections.current.forEach((pc, id) => {
        console.log('[WebRTC] Closing peer connection:', id);
        pc.close();
      });
      peerConnections.current.clear();
      
      // Unsubscribe from channel and send leave signal
      if (signalChannel.current) {
        // Send leave signal before unsubscribing
        void sendSignal({
          type: 'leave',
          data: {}
        });
        
        signalChannel.current.unsubscribe();
        signalChannel.current = null;
      }
      
      // Mark as left in database
      void supabase
        .from('meeting_participants')
        .update({ left_at: new Date().toISOString(), status: 'left' })
        .eq('meeting_id', meetingId)
        .or(`user_id.eq.${participantId},session_token.eq.${participantId}`)
        .is('left_at', null);
      
      setLocalStream(null);
      setScreenStream(null);
      setParticipants([]);
      setError(null);
      
      console.log('[WebRTC] Cleanup complete');
    } catch (err) {
      console.error('[WebRTC] Error during cleanup:', err);
    }
  }, [localStream, screenStream]);

  return {
    localStream,
    isVideoEnabled,
    isAudioEnabled,
    connectionState,
    participants,
    screenStream,
    networkQuality: stats.quality,
    bandwidth: stats.bandwidth,
    latency: stats.latency,
    error,
    initializeMedia,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    sendReaction,
    enablePictureInPicture,
    cleanup
  };
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Peer {
  userId: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

interface UseLiveHubWebRTCProps {
  channelId: string;
  localStream: MediaStream | null;
  enabled: boolean;
}

// Professional TURN/STUN servers for enterprise-grade connectivity
const ICE_SERVERS = {
  iceServers: [
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
  ],
  iceTransportPolicy: 'all' as RTCIceTransportPolicy,
  bundlePolicy: 'max-bundle' as RTCBundlePolicy,
  rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy,
  iceCandidatePoolSize: 10
};

export function useLiveHubWebRTC({ channelId, localStream, enabled }: UseLiveHubWebRTCProps) {
  const { user } = useAuth();
  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const signalingChannelRef = useRef<RealtimeChannel | null>(null);
  const peersRef = useRef<Map<string, Peer>>(new Map());

  useEffect(() => {
    if (!enabled || !user || !channelId) return;

    connectToSignaling();

    return () => {
      disconnectFromSignaling();
    };
  }, [enabled, user, channelId]);

  useEffect(() => {
    if (!localStream || !enabled) return;

    // Add local stream tracks to all peer connections
    peersRef.current.forEach((peer) => {
      localStream.getTracks().forEach(track => {
        const senders = peer.connection.getSenders();
        const sender = senders.find(s => s.track?.kind === track.kind);
        
        if (sender) {
          sender.replaceTrack(track);
        } else {
          peer.connection.addTrack(track, localStream);
        }
      });
    });
  }, [localStream, enabled]);

  const connectToSignaling = () => {
    console.log('Connecting to WebRTC signaling via Supabase Realtime');
    
    const channel = supabase
      .channel(`webrtc:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webrtc_signals',
          filter: `channel_id=eq.${channelId}`
        },
        async (payload) => {
          const signal = payload.new;
          console.log('Received signal:', signal.signal_type, 'from:', signal.from_user_id);

          // Ignore signals from self
          if (signal.from_user_id === user!.id) return;

          // Check if signal is for us (null means broadcast)
          if (signal.to_user_id && signal.to_user_id !== user!.id) return;

          switch (signal.signal_type) {
            case 'join':
              await createPeerConnection(signal.from_user_id, true);
              break;

            case 'offer':
              await handleOffer(signal.from_user_id, signal.signal_data);
              break;

            case 'answer':
              await handleAnswer(signal.from_user_id, signal.signal_data);
              break;

            case 'ice-candidate':
              await handleIceCandidate(signal.from_user_id, signal.signal_data);
              break;

            case 'leave':
              removePeerConnection(signal.from_user_id);
              break;
          }
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Connected to signaling channel');
          // Send join signal
          await sendSignal('join', null, {});
        }
      });

    signalingChannelRef.current = channel;
  };

  const disconnectFromSignaling = async () => {
    if (signalingChannelRef.current && user) {
      // Send leave signal
      await sendSignal('leave', null, {});
      
      await supabase.removeChannel(signalingChannelRef.current);
      signalingChannelRef.current = null;
    }

    // Close all peer connections
    peersRef.current.forEach((peer) => {
      peer.connection.close();
    });
    peersRef.current.clear();
    setPeers(new Map());
    setRemoteStreams(new Map());
  };

  const sendSignal = async (
    signalType: string, 
    toUserId: string | null, 
    signalData: any
  ) => {
    if (!user) return;

    // Use type assertion until types regenerate after migration
    await supabase
      .from('webrtc_signals')
      .insert({
        channel_id: channelId,
        from_user_id: user.id,
        to_user_id: toUserId,
        signal_type: signalType,
        signal_data: signalData
      } as any);
  };

  const createPeerConnection = async (userId: string, shouldCreateOffer: boolean) => {
    console.log(`Creating peer connection with ${userId}, shouldCreateOffer: ${shouldCreateOffer}`);

    const peerConnection = new RTCPeerConnection(ICE_SERVERS);

    // Add local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      console.log('Received remote track from', userId);
      const [remoteStream] = event.streams;
      
      setRemoteStreams(prev => {
        const newStreams = new Map(prev);
        newStreams.set(userId, remoteStream);
        return newStreams;
      });
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        await sendSignal('ice-candidate', userId, event.candidate);
      }
    };

    peerConnection.onconnectionstatechange = () => {
      console.log(`Peer connection state with ${userId}:`, peerConnection.connectionState);
      
      if (peerConnection.connectionState === 'disconnected' || 
          peerConnection.connectionState === 'failed') {
        removePeerConnection(userId);
      }
    };

    const peer: Peer = {
      userId,
      connection: peerConnection
    };

    peersRef.current.set(userId, peer);
    setPeers(new Map(peersRef.current));

    // Create and send offer if initiating
    if (shouldCreateOffer) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      await sendSignal('offer', userId, offer);
    }

    return peerConnection;
  };

  const handleOffer = async (fromUserId: string, offer: RTCSessionDescriptionInit) => {
    console.log('Handling offer from', fromUserId);

    let peer = peersRef.current.get(fromUserId);
    if (!peer) {
      await createPeerConnection(fromUserId, false);
      peer = peersRef.current.get(fromUserId)!;
    }

    await peer.connection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peer.connection.createAnswer();
    await peer.connection.setLocalDescription(answer);

    await sendSignal('answer', fromUserId, answer);
  };

  const handleAnswer = async (fromUserId: string, answer: RTCSessionDescriptionInit) => {
    console.log('Handling answer from', fromUserId);

    const peer = peersRef.current.get(fromUserId);
    if (peer) {
      await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  const handleIceCandidate = async (fromUserId: string, candidate: RTCIceCandidateInit) => {
    const peer = peersRef.current.get(fromUserId);
    if (peer) {
      try {
        await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  };

  const removePeerConnection = (userId: string) => {
    const peer = peersRef.current.get(userId);
    if (peer) {
      peer.connection.close();
      peersRef.current.delete(userId);
      setPeers(new Map(peersRef.current));

      setRemoteStreams(prev => {
        const newStreams = new Map(prev);
        newStreams.delete(userId);
        return newStreams;
      });
    }
  };

  return {
    remoteStreams,
    isConnected: signalingChannelRef.current !== null
  };
}
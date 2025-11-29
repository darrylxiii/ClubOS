import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

export function useLiveHubWebRTC({ channelId, localStream, enabled }: UseLiveHubWebRTCProps) {
  const { user } = useAuth();
  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const signalingSocketRef = useRef<WebSocket | null>(null);
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
    const projectId = 'dpjucecmoyfzrduhlctt';
    const wsUrl = `wss://${projectId}.supabase.co/functions/v1/webrtc-signaling`;
    
    const ws = new WebSocket(wsUrl);
    signalingSocketRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to WebRTC signaling server');
      ws.send(JSON.stringify({
        type: 'join',
        channelId,
        userId: user!.id
      }));
    };

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      console.log('Received signaling message:', message.type);

      switch (message.type) {
        case 'peer-joined':
          if (message.userId !== user!.id) {
            await createPeerConnection(message.userId, true);
          }
          break;

        case 'offer':
          if (message.fromUserId !== user!.id) {
            await handleOffer(message.fromUserId, message.offer);
          }
          break;

        case 'answer':
          if (message.fromUserId !== user!.id) {
            await handleAnswer(message.fromUserId, message.answer);
          }
          break;

        case 'ice-candidate':
          if (message.fromUserId !== user!.id) {
            await handleIceCandidate(message.fromUserId, message.candidate);
          }
          break;

        case 'peer-left':
          removePeerConnection(message.userId);
          break;
      }
    };

    ws.onerror = (error) => {
      console.error('WebRTC signaling error:', error);
    };

    ws.onclose = () => {
      console.log('Disconnected from WebRTC signaling server');
    };
  };

  const disconnectFromSignaling = () => {
    if (signalingSocketRef.current) {
      signalingSocketRef.current.send(JSON.stringify({
        type: 'leave',
        channelId,
        userId: user!.id
      }));
      signalingSocketRef.current.close();
      signalingSocketRef.current = null;
    }

    // Close all peer connections
    peersRef.current.forEach((peer) => {
      peer.connection.close();
    });
    peersRef.current.clear();
    setPeers(new Map());
    setRemoteStreams(new Map());
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
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && signalingSocketRef.current) {
        signalingSocketRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          channelId,
          fromUserId: user!.id,
          targetUserId: userId,
          candidate: event.candidate
        }));
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

      if (signalingSocketRef.current) {
        signalingSocketRef.current.send(JSON.stringify({
          type: 'offer',
          channelId,
          fromUserId: user!.id,
          targetUserId: userId,
          offer
        }));
      }
    }

    return peerConnection;
  };

  const handleOffer = async (fromUserId: string, offer: RTCSessionDescriptionInit) => {
    console.log('Handling offer from', fromUserId);

    let peer = peersRef.current.get(fromUserId);
    if (!peer) {
      const connection = await createPeerConnection(fromUserId, false);
      peer = peersRef.current.get(fromUserId)!;
    }

    await peer.connection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peer.connection.createAnswer();
    await peer.connection.setLocalDescription(answer);

    if (signalingSocketRef.current) {
      signalingSocketRef.current.send(JSON.stringify({
        type: 'answer',
        channelId,
        fromUserId: user!.id,
        targetUserId: fromUserId,
        answer
      }));
    }
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
    isConnected: signalingSocketRef.current?.readyState === WebSocket.OPEN
  };
}

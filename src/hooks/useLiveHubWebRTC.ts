import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface Peer {
  userId: string;
  connection: RTCPeerConnection;
  isPolite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  isSettingRemoteAnswerPending: boolean;
  pendingCandidates: RTCIceCandidateInit[]; // Queue for ICE candidates before remote description
}

interface RemoteStreamBundle {
  camera: MediaStream | null;
  screen: MediaStream | null;
}

interface UseLiveHubWebRTCProps {
  channelId: string;
  localStream: MediaStream | null;
  localScreenStream: MediaStream | null;
  enabled: boolean;
}

// Professional TURN/STUN servers
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
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

export function useLiveHubWebRTC({ channelId, localStream, localScreenStream, enabled }: UseLiveHubWebRTCProps) {
  const { user } = useAuth();
  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, RemoteStreamBundle>>(new Map());
  const signalingChannelRef = useRef<RealtimeChannel | null>(null);
  const peersRef = useRef<Map<string, Peer>>(new Map());

  // Refs for current streams to use in callbacks
  const localStreamRef = useRef<MediaStream | null>(localStream);
  const localScreenStreamRef = useRef<MediaStream | null>(localScreenStream);

  // Map to store stream ID -> type ('camera' | 'screen') for remote streams
  const remoteStreamTypesRef = useRef<Map<string, 'camera' | 'screen'>>(new Map());

  // Update refs and handle track updates
  useEffect(() => {
    localStreamRef.current = localStream;
    updateTracks(localStream, 'camera');
  }, [localStream, enabled]);

  useEffect(() => {
    localScreenStreamRef.current = localScreenStream;
    updateTracks(localScreenStream, 'screen');
  }, [localScreenStream, enabled]);

  const updateTracks = (stream: MediaStream | null, type: 'camera' | 'screen') => {
    if (!enabled) return;

    peersRef.current.forEach((peer) => {
      const senders = peer.connection.getSenders();

      if (stream) {
        stream.getTracks().forEach(track => {
          const existingSender = senders.find(s => s.track?.id === track.id);

          if (!existingSender) {
            try {
              peer.connection.addTrack(track, stream);
            } catch (e) {
              console.error(`[WebRTC] Error adding ${type} track:`, e);
            }
          }
        });

        // Send metadata about this stream
        sendSignal('stream-metadata', peer.userId, {
          streamId: stream.id,
          type
        });
      }
    });
  };

  useEffect(() => {
    if (!enabled || !user || !channelId) return;

    connectToSignaling();

    return () => {
      disconnectFromSignaling();
    };
  }, [enabled, user, channelId]);

  const connectToSignaling = () => {
    console.log('[WebRTC] Connecting to signaling via Supabase Realtime');

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

          if (signal.from_user_id === user!.id) return;
          if (signal.to_user_id && signal.to_user_id !== user!.id) return;

          console.log('[WebRTC] Signal received:', signal.signal_type, 'from:', signal.from_user_id);

          switch (signal.signal_type) {
            case 'join':
              // DETERMINISTIC: Higher user ID is always the initiator
              const shouldInitiate = user!.id > signal.from_user_id;
              console.log('[WebRTC] Join from', signal.from_user_id, '- I initiate:', shouldInitiate);
              await createPeerConnection(signal.from_user_id, shouldInitiate);
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

            case 'ice-candidates-batch':
              await handleIceCandidatesBatch(signal.from_user_id, signal.signal_data.candidates);
              break;

            case 'stream-metadata':
              handleStreamMetadata(signal.from_user_id, signal.signal_data);
              break;

            case 'leave':
              removePeerConnection(signal.from_user_id);
              break;

            case 'reaction':
              window.dispatchEvent(new CustomEvent(`reaction:${channelId}`, {
                detail: { emoji: signal.signal_data.emoji, userId: signal.from_user_id }
              }));
              break;

            case 'whiteboard-event':
              window.dispatchEvent(new CustomEvent(`whiteboard:${channelId}`, {
                detail: signal.signal_data
              }));
              break;
          }
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[WebRTC] Connected to signaling channel');
          
          // Small delay to ensure all peers have subscribed
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Send join signal
          await sendSignal('join', null, {});
          
          // Query existing participants and connect to them
          try {
            const { data: existingParticipants } = await supabase
              .from('live_channel_participants')
              .select('user_id')
              .eq('channel_id', channelId)
              .neq('user_id', user!.id);
            
            console.log('[WebRTC] Existing participants:', existingParticipants?.length || 0);
            
            // Connect to each existing participant we don't already have
            for (const p of existingParticipants || []) {
              if (!peersRef.current.has(p.user_id)) {
                const shouldInitiate = user!.id > p.user_id;
                console.log('[WebRTC] Connecting to existing participant:', p.user_id, '- I initiate:', shouldInitiate);
                await createPeerConnection(p.user_id, shouldInitiate);
              }
            }
          } catch (e) {
            console.warn('[WebRTC] Could not query existing participants:', e);
          }
        }
      });

    signalingChannelRef.current = channel;
  };

  const disconnectFromSignaling = async () => {
    if (signalingChannelRef.current && user) {
      await sendSignal('leave', null, {});
      await supabase.removeChannel(signalingChannelRef.current);
      signalingChannelRef.current = null;
    }

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

    try {
      const { error } = await supabase
        .from('webrtc_signals')
        .insert({
          channel_id: channelId,
          from_user_id: user.id,
          to_user_id: toUserId,
          sender_id: user.id,
          receiver_id: toUserId,
          signal_type: signalType,
          signal_data: signalData
        } as any);

      if (error) {
        console.error('[WebRTC] Signal insert failed:', error);
        if (['offer', 'answer'].includes(signalType)) {
          toast.error('Connection issue - trying to reconnect...');
        }
      }
    } catch (e) {
      console.error('[WebRTC] Error sending signal:', e);
    }
  };

  const sendReaction = async (emoji: string) => {
    await sendSignal('reaction', null, { emoji });
    window.dispatchEvent(new CustomEvent(`reaction:${channelId}`, {
      detail: { emoji, userId: user?.id }
    }));
  };

  const sendWhiteboardEvent = async (event: any) => {
    await sendSignal('whiteboard-event', null, event);
  };

  // Configure audio sender for optimal voice quality
  const configureAudioSender = async (pc: RTCPeerConnection, userId: string) => {
    try {
      const audioSender = pc.getSenders().find(s => s.track?.kind === 'audio');
      if (!audioSender) return;

      const params = audioSender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }

      // Optimize for voice: 64kbps max, high priority
      params.encodings[0].maxBitrate = 64000;
      params.encodings[0].networkPriority = 'high';
      params.encodings[0].priority = 'high';

      await audioSender.setParameters(params);
      console.log('[Audio] Configured sender for', userId, '- 64kbps, high priority');
    } catch (error) {
      console.warn('[Audio] Could not configure sender params:', error);
    }
  };

  // Set Opus as preferred codec for audio
  const setOpusPreference = (pc: RTCPeerConnection) => {
    try {
      const transceivers = pc.getTransceivers();
      const audioTransceiver = transceivers.find(t => 
        t.receiver.track?.kind === 'audio' || t.sender.track?.kind === 'audio'
      );
      
      if (audioTransceiver && RTCRtpSender.getCapabilities) {
        const codecs = RTCRtpSender.getCapabilities('audio')?.codecs || [];
        const opusCodecs = codecs.filter(c => c.mimeType === 'audio/opus');
        
        if (opusCodecs.length > 0 && audioTransceiver.setCodecPreferences) {
          audioTransceiver.setCodecPreferences(opusCodecs);
          console.log('[Audio] Set Opus as preferred codec');
        }
      }
    } catch (error) {
      console.warn('[Audio] Could not set codec preference:', error);
    }
  };

  // Monitor audio stats for quality tracking
  const monitorAudioStats = async (pc: RTCPeerConnection, userId: string) => {
    try {
      const stats = await pc.getStats();
      let audioStats = {
        packetsLost: 0,
        packetsReceived: 0,
        jitter: 0,
        concealedSamples: 0,
        rtt: 0
      };

      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.kind === 'audio') {
          audioStats.packetsLost = report.packetsLost || 0;
          audioStats.packetsReceived = report.packetsReceived || 0;
          audioStats.jitter = (report.jitter || 0) * 1000;
          audioStats.concealedSamples = report.concealedSamples || 0;
        }
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          audioStats.rtt = (report.currentRoundTripTime || 0) * 1000;
        }
      });

      const lossRate = audioStats.packetsReceived > 0 
        ? (audioStats.packetsLost / (audioStats.packetsLost + audioStats.packetsReceived)) * 100 
        : 0;

      if (lossRate > 5 || audioStats.jitter > 50) {
        console.warn('[Audio] Quality degraded for', userId, {
          lossRate: lossRate.toFixed(1) + '%',
          jitter: audioStats.jitter.toFixed(0) + 'ms',
          rtt: audioStats.rtt.toFixed(0) + 'ms'
        });
      }

      return audioStats;
    } catch (error) {
      console.warn('[Audio] Stats monitoring error:', error);
      return null;
    }
  };

  // Audio stats monitoring interval
  const audioStatsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    audioStatsIntervalRef.current = setInterval(() => {
      peersRef.current.forEach((peer, usrId) => {
        monitorAudioStats(peer.connection, usrId);
      });
    }, 3000);

    return () => {
      if (audioStatsIntervalRef.current) {
        clearInterval(audioStatsIntervalRef.current);
      }
    };
  }, [enabled]);

  // Flush queued ICE candidates after remote description is set
  const flushPendingCandidates = async (peer: Peer) => {
    if (peer.pendingCandidates.length === 0) return;
    
    console.log('[ICE] Flushing', peer.pendingCandidates.length, 'queued candidates for', peer.userId);
    
    for (const candidate of peer.pendingCandidates) {
      try {
        await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[ICE] Error adding queued candidate:', err);
      }
    }
    peer.pendingCandidates = [];
  };

  const createPeerConnection = async (userId: string, isInitiator: boolean) => {
    if (peersRef.current.has(userId)) {
      return peersRef.current.get(userId)!;
    }

    console.log(`[WebRTC] Creating peer connection with ${userId}, initiator: ${isInitiator}`);

    const peerConnection = new RTCPeerConnection(ICE_SERVERS);
    const peer: Peer = {
      userId,
      connection: peerConnection,
      isPolite: !isInitiator,
      makingOffer: false,
      ignoreOffer: false,
      isSettingRemoteAnswerPending: false,
      pendingCandidates: [] // Initialize ICE candidate queue
    };

    // Add local tracks BEFORE any negotiation
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });
      sendSignal('stream-metadata', userId, { streamId: localStreamRef.current.id, type: 'camera' });
    }

    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localScreenStreamRef.current!);
      });
      sendSignal('stream-metadata', userId, { streamId: localScreenStreamRef.current.id, type: 'screen' });
    }

    // Configure audio for optimal voice quality
    setOpusPreference(peerConnection);
    
    // Configure audio sender after tracks are added
    setTimeout(() => configureAudioSender(peerConnection, userId), 100);

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      const track = event.track;
      const [remoteStream] = event.streams;
      const streamId = remoteStream.id;
      
      console.log('[WebRTC] Received remote track', { 
        userId, 
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        readyState: track.readyState,
        streamId,
        trackCount: remoteStream.getTracks().length
      });

      // Determine type based on metadata OR track label heuristics
      let type = remoteStreamTypesRef.current.get(streamId);
      if (!type) {
        const isScreenShare = track.label?.toLowerCase().includes('screen') || 
                              track.label?.toLowerCase().includes('window') ||
                              track.label?.toLowerCase().includes('monitor') ||
                              track.label?.toLowerCase().includes('display');
        type = isScreenShare ? 'screen' : 'camera';
        console.log('[WebRTC] Inferred stream type:', type, 'from label:', track.label);
      }

      setRemoteStreams(prev => {
        const newStreams = new Map(prev);
        const userStreams = newStreams.get(userId) || { camera: null, screen: null };

        if (type === 'screen') {
          userStreams.screen = remoteStream;
        } else {
          userStreams.camera = remoteStream;
        }

        console.log('[WebRTC] Updated remote streams for', userId, {
          hasCameraStream: !!userStreams.camera,
          hasScreenStream: !!userStreams.screen
        });

        newStreams.set(userId, { ...userStreams });
        return newStreams;
      });

      track.onended = () => console.log('[WebRTC] Track ended:', { userId, kind: track.kind });
      track.onmute = () => console.log('[WebRTC] Track muted:', { userId, kind: track.kind });
      track.onunmute = () => console.log('[WebRTC] Track unmuted:', { userId, kind: track.kind });
    };

    // Handle ICE candidates - send immediately
    peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        await sendSignal('ice-candidate', userId, event.candidate);
      }
    };

    // ICE connection state monitoring
    peerConnection.oniceconnectionstatechange = () => {
      console.log('[ICE] Connection state:', peerConnection.iceConnectionState, 'for', userId);
    };

    peerConnection.onicegatheringstatechange = () => {
      console.log('[ICE] Gathering state:', peerConnection.iceGatheringState, 'for', userId);
    };

    peerConnection.onsignalingstatechange = () => {
      console.log('[Signaling] State:', peerConnection.signalingState, 'for', userId);
    };

    // Negotiation Needed - with track verification
    peerConnection.onnegotiationneeded = async () => {
      // Wait a tick to ensure tracks are fully added
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify we have tracks before creating offer
      const senders = peerConnection.getSenders();
      if (senders.length === 0) {
        console.warn('[WebRTC] No senders yet, deferring offer');
        return;
      }

      try {
        peer.makingOffer = true;
        console.log('[WebRTC] Creating offer for', userId, 'with', senders.length, 'senders');
        await peerConnection.setLocalDescription();
        await sendSignal('offer', userId, peerConnection.localDescription);
      } catch (err) {
        console.error('[WebRTC] Error during negotiation:', err);
      } finally {
        peer.makingOffer = false;
      }
    };

    // Connection state change with proper ICE restart
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log('[WebRTC] Connection state changed to:', state, 'for', userId);
      
      if (state === 'failed') {
        console.log('[WebRTC] Connection failed - initiating ICE restart for', userId);
        // Full renegotiation with ICE restart
        peerConnection.restartIce();
        peerConnection.createOffer({ iceRestart: true })
          .then(offer => peerConnection.setLocalDescription(offer))
          .then(() => sendSignal('offer', userId, peerConnection.localDescription))
          .catch(err => console.error('[ICE Restart] Error:', err));
      } else if (state === 'disconnected') {
        // Give it 3 seconds before taking action
        setTimeout(() => {
          if (peerConnection.connectionState === 'disconnected') {
            console.log('[WebRTC] Still disconnected, restarting ICE for', userId);
            peerConnection.restartIce();
          }
        }, 3000);
      }
    };

    peersRef.current.set(userId, peer);
    setPeers(new Map(peersRef.current));

    return peer;
  };

  const handleStreamMetadata = (fromUserId: string, metadata: { streamId: string, type: 'camera' | 'screen' }) => {
    console.log('[WebRTC] Received stream metadata:', metadata);
    remoteStreamTypesRef.current.set(metadata.streamId, metadata.type);

    setRemoteStreams(prev => {
      const newStreams = new Map(prev);
      const userStreams = newStreams.get(fromUserId);

      if (userStreams) {
        let foundStream: MediaStream | null = null;
        if (userStreams.camera?.id === metadata.streamId) foundStream = userStreams.camera;
        if (userStreams.screen?.id === metadata.streamId) foundStream = userStreams.screen;

        if (foundStream) {
          if (metadata.type === 'screen') {
            userStreams.screen = foundStream;
            if (userStreams.camera?.id === metadata.streamId) userStreams.camera = null;
          } else {
            userStreams.camera = foundStream;
            if (userStreams.screen?.id === metadata.streamId) userStreams.screen = null;
          }
          newStreams.set(fromUserId, { ...userStreams });
          return newStreams;
        }
      }
      return prev;
    });
  };

  const handleOffer = async (fromUserId: string, offer: RTCSessionDescriptionInit) => {
    let peer = peersRef.current.get(fromUserId);
    if (!peer) {
      // DETERMINISTIC: If we receive an offer, we're the responder (not initiator)
      peer = await createPeerConnection(fromUserId, false);
    }

    if (!peer) return;

    const readyForOffer = !peer.makingOffer || (peer.makingOffer && peer.isPolite);

    if (!readyForOffer) {
      console.log('[WebRTC] Ignoring offer - collision detected, I am impolite peer');
      peer.ignoreOffer = true;
      return;
    }

    peer.ignoreOffer = false;

    try {
      console.log('[WebRTC] Setting remote description (offer) from', fromUserId);
      await peer.connection.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Flush queued ICE candidates now that remote description is set
      await flushPendingCandidates(peer);
      
      await peer.connection.setLocalDescription();
      await sendSignal('answer', fromUserId, peer.connection.localDescription);
      console.log('[WebRTC] Sent answer to', fromUserId);
    } catch (err) {
      console.error('[WebRTC] Error handling offer:', err);
    }
  };

  const handleAnswer = async (fromUserId: string, answer: RTCSessionDescriptionInit) => {
    const peer = peersRef.current.get(fromUserId);
    if (!peer) {
      console.warn('[WebRTC] No peer found for answer from', fromUserId);
      return;
    }

    try {
      console.log('[WebRTC] Setting remote description (answer) from', fromUserId);
      await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
      
      // Flush queued ICE candidates now that remote description is set
      await flushPendingCandidates(peer);
    } catch (err) {
      console.error('[WebRTC] Error handling answer:', err);
    }
  };

  const handleIceCandidate = async (fromUserId: string, candidate: RTCIceCandidateInit) => {
    const peer = peersRef.current.get(fromUserId);
    if (!peer) {
      console.warn('[ICE] No peer for candidate from', fromUserId);
      return;
    }

    // QUEUE candidates if remote description not set yet
    if (!peer.connection.remoteDescription) {
      console.log('[ICE] Queuing candidate - remote description not set yet for', fromUserId);
      peer.pendingCandidates.push(candidate);
      return;
    }

    try {
      await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      if (!peer.ignoreOffer) {
        console.error('[ICE] Error adding candidate:', err);
      }
    }
  };

  const handleIceCandidatesBatch = async (fromUserId: string, candidates: RTCIceCandidateInit[]) => {
    console.log('[ICE] Received batch of', candidates.length, 'candidates from', fromUserId);
    for (const candidate of candidates) {
      await handleIceCandidate(fromUserId, candidate);
    }
  };

  const removePeerConnection = (userId: string) => {
    const peer = peersRef.current.get(userId);
    if (peer) {
      console.log('[WebRTC] Removing peer connection for', userId);
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
    isConnected: signalingChannelRef.current !== null,
    sendReaction,
    sendWhiteboardEvent
  };
}

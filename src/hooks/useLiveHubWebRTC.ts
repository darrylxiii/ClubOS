import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { optimizeSessionDescription } from '@/utils/sdpMunger';

interface Peer {
  userId: string;
  connection: RTCPeerConnection;
  isPolite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  isSettingRemoteAnswerPending: boolean;
  pendingCandidates: RTCIceCandidateInit[];
  offerLock: boolean; // Prevent simultaneous offers
  lastOfferTime: number; // Debounce offers
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

// Discord-style TURN/STUN servers with multiple fallbacks
// Priority: Google STUN (fast) -> Metered TURN (reliable) -> Xirsys fallback
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    // Fast STUN servers (for users not behind strict NAT)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    
    // Primary TURN (Metered.ca - reliable free tier)
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
    },
    // Secondary TURN (different provider for redundancy)
    {
      urls: 'turns:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    
    // Twilio STUN fallback
    { urls: 'stun:global.stun.twilio.com:3478' }
  ],
  iceTransportPolicy: 'all' as RTCIceTransportPolicy,
  bundlePolicy: 'max-bundle' as RTCBundlePolicy,
  rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy,
  iceCandidatePoolSize: 10
};

// Reconnection configuration
const RECONNECTION_CONFIG = {
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 30000
};

// Minimum time between offers (prevents offer spam)
const OFFER_DEBOUNCE_MS = 500;

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
  
  // Track if we've successfully connected signaling
  const signalingReadyRef = useRef(false);
  
  // Global offer lock to prevent simultaneous offers across all peers
  const globalOfferLockRef = useRef(false);

  // Update refs SYNCHRONOUSLY and handle track updates
  useEffect(() => {
    console.log('[WebRTC] Local stream changed:', localStream ? 'present' : 'null');
    localStreamRef.current = localStream;
    
    // Only update tracks if signaling is ready
    if (signalingReadyRef.current && localStream) {
      updateTracksForAllPeers(localStream, 'camera');
    }
  }, [localStream]);

  // Listen for video track change events (fired when streamVersion changes in useVoiceChannel)
  // This is a backup mechanism to ensure WebRTC picks up track changes immediately
  useEffect(() => {
    const handleVideoTrackChanged = (event: CustomEvent) => {
      console.log('[WebRTC] Video track change event received:', event.detail);
      
      if (!signalingReadyRef.current || !localStreamRef.current) {
        console.log('[WebRTC] Skipping track update - not ready');
        return;
      }
      
      // Force immediate track update for all peers
      const stream = localStreamRef.current;
      const videoTracks = stream.getVideoTracks();
      
      console.log('[WebRTC] Forcing video track update, video tracks:', videoTracks.length);
      
      // Update all peer connections with current tracks
      updateTracksForAllPeers(stream, 'camera');
    };

    window.addEventListener('local-video-track-changed', handleVideoTrackChanged as EventListener);
    
    return () => {
      window.removeEventListener('local-video-track-changed', handleVideoTrackChanged as EventListener);
    };
  }, []);

  useEffect(() => {
    console.log('[WebRTC] Screen stream changed:', localScreenStream ? 'present' : 'null');
    localScreenStreamRef.current = localScreenStream;
    
    if (signalingReadyRef.current && localScreenStream) {
      updateTracksForAllPeers(localScreenStream, 'screen');
    }
  }, [localScreenStream]);

  const updateTracksForAllPeers = async (stream: MediaStream, type: 'camera' | 'screen') => {
    if (!enabled) return;

    console.log(`[WebRTC] Updating ${type} tracks for all peers, track count:`, stream.getTracks().length);

    for (const [userId, peer] of peersRef.current.entries()) {
      // Skip if peer is busy with an offer
      if (peer.offerLock || peer.makingOffer) {
        console.log(`[WebRTC] Skipping track update for ${userId} - offer in progress`);
        continue;
      }
      
      const senders = peer.connection.getSenders();
      let addedNewTrack = false;

      for (const track of stream.getTracks()) {
        const existingSender = senders.find(s => s.track?.id === track.id);

        if (!existingSender) {
          try {
            console.log(`[WebRTC] Adding ${track.kind} track to peer ${userId}`);
            peer.connection.addTrack(track, stream);
            addedNewTrack = true;
          } catch (e) {
            console.error(`[WebRTC] Error adding ${type} track:`, e);
          }
        }
      }

      // Send metadata about this stream
      await sendSignal('stream-metadata', userId, {
        streamId: stream.id,
        type
      });

      // Force renegotiation with proper locking if we added new tracks
      if (addedNewTrack && peer.connection.signalingState === 'stable' && !peer.isPolite) {
        console.log(`[WebRTC] Forcing renegotiation for ${userId} after adding tracks`);
        
        // Use locking
        if (!peer.offerLock && !peer.makingOffer) {
          peer.offerLock = true;
          peer.makingOffer = true;
          try {
            const offer = await peer.connection.createOffer();
            await peer.connection.setLocalDescription(offer);
            await sendSignal('offer', userId, peer.connection.localDescription);
          } catch (err) {
            console.error('[WebRTC] Renegotiation error:', err);
          } finally {
            peer.offerLock = false;
            peer.makingOffer = false;
          }
        }
      }
    }
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
          signalingReadyRef.current = true;
          
          // Wait for local stream to be available before connecting
          let waitAttempts = 0;
          while (!localStreamRef.current && waitAttempts < 20) {
            console.log('[WebRTC] Waiting for local stream...');
            await new Promise(resolve => setTimeout(resolve, 100));
            waitAttempts++;
          }
          
          if (!localStreamRef.current) {
            console.warn('[WebRTC] No local stream after waiting, proceeding anyway');
          } else {
            console.log('[WebRTC] Local stream ready, proceeding with signaling');
          }
          
          // Small delay to ensure all peers have subscribed
          await new Promise(resolve => setTimeout(resolve, 200));
          
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
    signalingReadyRef.current = false;
    
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
    remoteStreamTypesRef.current.clear();
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
      console.log(`[WebRTC] Peer connection already exists for ${userId}`);
      return peersRef.current.get(userId)!;
    }

    console.log(`[WebRTC] Creating peer connection with ${userId}, initiator: ${isInitiator}, hasLocalStream: ${!!localStreamRef.current}`);

    const peerConnection = new RTCPeerConnection(ICE_SERVERS);
    const peer: Peer = {
      userId,
      connection: peerConnection,
      isPolite: !isInitiator,
      makingOffer: false,
      ignoreOffer: false,
      isSettingRemoteAnswerPending: false,
      pendingCandidates: [],
      offerLock: false,
      lastOfferTime: 0
    };

    // Store peer FIRST before adding tracks (prevents race conditions)
    peersRef.current.set(userId, peer);
    setPeers(new Map(peersRef.current));

    // Add local tracks BEFORE any negotiation
    let tracksAdded = 0;
    if (localStreamRef.current) {
      console.log(`[WebRTC] Adding ${localStreamRef.current.getTracks().length} local tracks for ${userId}`);
      localStreamRef.current.getTracks().forEach(track => {
        try {
          peerConnection.addTrack(track, localStreamRef.current!);
          tracksAdded++;
          console.log(`[WebRTC] Added ${track.kind} track: ${track.label}`);
        } catch (e) {
          console.error('[WebRTC] Error adding track:', e);
        }
      });
      await sendSignal('stream-metadata', userId, { streamId: localStreamRef.current.id, type: 'camera' });
    }

    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach(track => {
        try {
          peerConnection.addTrack(track, localScreenStreamRef.current!);
          tracksAdded++;
        } catch (e) {
          console.error('[WebRTC] Error adding screen track:', e);
        }
      });
      await sendSignal('stream-metadata', userId, { streamId: localScreenStreamRef.current.id, type: 'screen' });
    }
    
    console.log(`[WebRTC] Total tracks added: ${tracksAdded} for peer ${userId}`);

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

      // Listen for future tracks on this stream (critical for video added after audio)
      remoteStream.onaddtrack = (trackEvent) => {
        console.log('[WebRTC] Additional track received on stream:', { 
          userId, 
          kind: trackEvent.track.kind,
          label: trackEvent.track.label,
          streamId: remoteStream.id
        });
        
        // Force remoteStreams update by creating new object reference
        setRemoteStreams(prev => {
          const newStreams = new Map(prev);
          const userStreams = newStreams.get(userId) || { camera: null, screen: null };
          // Clone to force React update
          newStreams.set(userId, { ...userStreams, camera: remoteStream });
          return newStreams;
        });
      };

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
          hasScreenStream: !!userStreams.screen,
          cameraTrackCount: userStreams.camera?.getTracks().length || 0
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

    // SINGLE offer creation function with proper locking
    const createAndSendOffer = async (reason: string) => {
      // Check debounce
      const now = Date.now();
      if (now - peer.lastOfferTime < OFFER_DEBOUNCE_MS) {
        console.log('[WebRTC] Skipping offer - debounce active for', userId);
        return;
      }
      
      // Check locks
      if (peer.offerLock || peer.makingOffer || globalOfferLockRef.current) {
        console.log('[WebRTC] Skipping offer - locked for', userId, { 
          peerLock: peer.offerLock, 
          makingOffer: peer.makingOffer,
          globalLock: globalOfferLockRef.current 
        });
        return;
      }
      
      // Check signaling state
      if (peerConnection.signalingState !== 'stable') {
        console.log('[WebRTC] Skipping offer - signaling not stable:', peerConnection.signalingState);
        return;
      }
      
      // Only initiator creates offers
      if (!isInitiator) {
        console.log('[WebRTC] Skipping offer - not initiator for', userId);
        return;
      }

      // Acquire locks
      peer.offerLock = true;
      peer.makingOffer = true;
      globalOfferLockRef.current = true;
      peer.lastOfferTime = now;

      try {
        const senders = peerConnection.getSenders();
        console.log(`[WebRTC] Creating offer (${reason}) for`, userId, 'with', senders.length, 'senders');
        
        const offer = await peerConnection.createOffer();
        
        // Double check signaling state hasn't changed
        if (peerConnection.signalingState !== 'stable') {
          console.log('[WebRTC] Aborting offer - signaling state changed');
          return;
        }
        
        // Apply SDP optimization with FEC and DTX enabled
        const optimizedOffer = optimizeSessionDescription(offer, {
          enableOpusFEC: true,
          enableOpusDTX: true, // Enable DTX for 60-80% bandwidth savings during silence
          opusMaxAverageBitrate: 64000,
          preferredVideoCodec: 'VP9'
        });
        
        await peerConnection.setLocalDescription(optimizedOffer);
        await sendSignal('offer', userId, optimizedOffer);
        console.log(`[WebRTC] Offer sent (${reason}) to`, userId);
      } catch (err) {
        console.error('[WebRTC] Error creating offer:', err);
      } finally {
        peer.offerLock = false;
        peer.makingOffer = false;
        globalOfferLockRef.current = false;
      }
    };

    // Negotiation Needed - delegate to single offer function
    peerConnection.onnegotiationneeded = async () => {
      // Small delay to batch multiple track additions
      await new Promise(resolve => setTimeout(resolve, 150));
      await createAndSendOffer('negotiationneeded');
    };

    // Enhanced connection state handling with exponential backoff reconnection
    let reconnectAttempt = 0;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const attemptReconnect = async () => {
      if (reconnectAttempt >= RECONNECTION_CONFIG.maxRetries) {
        console.error('[WebRTC] Max reconnection attempts reached for', userId);
        toast.error('Connection lost. Please try rejoining the channel.');
        return;
      }

      reconnectAttempt++;
      const delay = Math.min(
        RECONNECTION_CONFIG.baseDelay * Math.pow(2, reconnectAttempt - 1),
        RECONNECTION_CONFIG.maxDelay
      );

      console.log(`[WebRTC] Reconnection attempt ${reconnectAttempt}/${RECONNECTION_CONFIG.maxRetries} in ${delay}ms for ${userId}`);

      reconnectTimeout = setTimeout(async () => {
        if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
          // Try ICE restart first
          if (isInitiator && !peer.offerLock) {
            peer.offerLock = true;
            try {
              peerConnection.restartIce();
              const offer = await peerConnection.createOffer({ iceRestart: true });
              await peerConnection.setLocalDescription(offer);
              await sendSignal('offer', userId, peerConnection.localDescription);
              console.log('[WebRTC] ICE restart offer sent for', userId);
            } catch (err) {
              console.error('[ICE Restart] Error:', err);
              // If ICE restart fails, try full reconnection
              attemptReconnect();
            } finally {
              peer.offerLock = false;
            }
          }
        }
      }, delay);
    };

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log('[WebRTC] Connection state changed to:', state, 'for', userId);
      
      // Clear any pending reconnect on state change
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      
      switch (state) {
        case 'connected':
          console.log('[WebRTC] Successfully connected to', userId);
          reconnectAttempt = 0; // Reset reconnect counter on successful connection
          break;

        case 'failed':
          console.warn('[WebRTC] Connection failed for', userId);
          attemptReconnect();
          break;

        case 'disconnected':
          console.warn('[WebRTC] Connection disconnected for', userId);
          // Wait 2 seconds before attempting reconnect (brief disconnections are normal)
          reconnectTimeout = setTimeout(() => {
            if (peerConnection.connectionState === 'disconnected') {
              console.log('[WebRTC] Still disconnected after 2s, attempting reconnect for', userId);
              attemptReconnect();
            }
          }, 2000);
          break;

        case 'closed':
          console.log('[WebRTC] Connection closed for', userId);
          break;
      }
    };

    // Create initial offer if initiator with tracks (single path, properly locked)
    if (isInitiator && tracksAdded > 0) {
      // Delay slightly to allow onnegotiationneeded to fire first
      setTimeout(() => createAndSendOffer('initial'), 300);
    }

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
      
      // Create answer with SDP optimization (FEC enabled)
      const answer = await peer.connection.createAnswer();
      const optimizedAnswer = optimizeSessionDescription(answer, {
        enableOpusFEC: true,
        enableOpusDTX: false,
        opusMaxAverageBitrate: 64000
      });
      
      await peer.connection.setLocalDescription(optimizedAnswer);
      await sendSignal('answer', fromUserId, optimizedAnswer);
      console.log('[WebRTC] Sent optimized answer to', fromUserId);
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

  // Get first peer connection for quality monitoring
  const getFirstPeerConnection = useCallback((): RTCPeerConnection | null => {
    const firstPeer = peersRef.current.values().next().value;
    return firstPeer?.connection || null;
  }, []);

  return {
    remoteStreams,
    isConnected: signalingChannelRef.current !== null,
    sendReaction,
    sendWhiteboardEvent,
    peerConnection: getFirstPeerConnection()
  };
}

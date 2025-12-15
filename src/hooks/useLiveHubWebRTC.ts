import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { optimizeSessionDescription } from '@/utils/sdpMunger';
import { DEFAULT_RTC_CONFIG } from '@/utils/webrtcConfig';
import { useSimulcast } from './useSimulcast';
import { useMobileOptimizations } from './useMobileOptimizations';

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
const ICE_SERVERS = DEFAULT_RTC_CONFIG;


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
  const pendingGlobalCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map()); // Buffer for candidates before peer exists

  // Refs for current streams to use in callbacks
  const localStreamRef = useRef<MediaStream | null>(localStream);
  const localScreenStreamRef = useRef<MediaStream | null>(localScreenStream);

  // Map to store stream ID -> type ('camera' | 'screen') for remote streams
  const remoteStreamTypesRef = useRef<Map<string, 'camera' | 'screen'>>(new Map());

  // Track if we've successfully connected signaling
  const signalingReadyRef = useRef(false);

  // Global offer lock to prevent simultaneous offers across all peers
  const globalOfferLockRef = useRef(false);

  // Video optimization hooks
  const { configureSimulcast, adaptToNetworkConditions, setScreenShareContentHint, getSimulcastStats } = useSimulcast();
  const { isMobile, isTablet, videoSettings, connectionType } = useMobileOptimizations({ enableBatterySaving: true });

  // Track video stats for quality monitoring
  const [videoStats, setVideoStats] = useState<{
    framesSent: number;
    framesReceived: number;
    qualityLimitationReason: string;
    availableBandwidth: number;
  }>({ framesSent: 0, framesReceived: 0, qualityLimitationReason: 'none', availableBandwidth: 0 });

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
      // CRITICAL FIX: Don't skip track updates even if offer is in progress
      // Queue tracks to be added after current negotiation completes
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
        } else {
          // Track exists, make sure it's enabled
          if (existingSender.track && !existingSender.track.enabled) {
            existingSender.track.enabled = true;
            console.log(`[WebRTC] Re-enabled ${track.kind} track for ${userId}`);
          }
        }
      }

      // Send metadata about this stream
      await sendSignal('stream-metadata', userId, {
        streamId: stream.id,
        type
      });

      // Force renegotiation if we added new tracks and signaling is stable
      if (addedNewTrack && peer.connection.signalingState === 'stable') {
        console.log(`[WebRTC] Forcing renegotiation for ${userId} after adding tracks`);

        // Short delay to let all tracks settle
        setTimeout(async () => {
          // Double-check state before creating offer
          if (peer.connection.signalingState !== 'stable' || peer.offerLock || peer.makingOffer) {
            console.log(`[WebRTC] Skipping renegotiation - not ready for ${userId}`);
            return;
          }

          // Only initiator (higher user ID) creates offers
          if (user!.id <= userId) {
            console.log(`[WebRTC] Skipping renegotiation - not initiator for ${userId}`);
            return;
          }

          peer.offerLock = true;
          peer.makingOffer = true;
          try {
            const offer = await peer.connection.createOffer();
            await peer.connection.setLocalDescription(offer);
            await sendSignal('offer', userId, peer.connection.localDescription);
            console.log(`[WebRTC] Renegotiation offer sent to ${userId}`);
          } catch (err) {
            console.error('[WebRTC] Renegotiation error:', err);
          } finally {
            peer.offerLock = false;
            peer.makingOffer = false;
          }
        }, 200);
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

  // Configure video sender with simulcast and adaptive quality
  const configureVideoSender = async (pc: RTCPeerConnection, userId: string, isScreenShare: boolean = false) => {
    try {
      const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (!videoSender) return;

      // Apply simulcast configuration for 3-layer adaptive quality
      const simulcastConfigured = await configureSimulcast(videoSender, undefined, isScreenShare);

      if (!simulcastConfigured) {
        // Fallback: configure single encoding with adaptive bitrate
        const params = videoSender.getParameters();
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}];
        }

        // Adaptive bitrate based on device type and connection
        let maxBitrate = 2500000; // Default 2.5 Mbps for 720p
        if (isMobile || connectionType === '3g') {
          maxBitrate = videoSettings.maxBitrate || 300000;
        } else if (isTablet || connectionType === '4g') {
          maxBitrate = videoSettings.maxBitrate || 800000;
        }

        params.encodings[0].maxBitrate = maxBitrate;
        params.encodings[0].networkPriority = 'medium'; // Lower than audio
        params.encodings[0].priority = 'medium';

        // Set adaptive framerate for mobile
        if (isMobile || isTablet) {
          params.encodings[0].maxFramerate = videoSettings.frameRate || 24;
        }

        await videoSender.setParameters(params);
        console.log('[Video] Configured sender for', userId, {
          maxBitrate: maxBitrate / 1000 + 'kbps',
          device: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'
        });
      } else {
        console.log('[Video] Simulcast enabled for', userId, '(3 quality layers)');
      }

      // Apply content hint for screen sharing (detail for documents, motion for video)
      if (isScreenShare && videoSender.track) {
        setScreenShareContentHint(videoSender.track, 'detail');
      }
    } catch (error) {
      console.warn('[Video] Could not configure sender params:', error);
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

  // Set VP9 as preferred codec for video (better compression than VP8)
  const setVP9Preference = (pc: RTCPeerConnection) => {
    try {
      const transceivers = pc.getTransceivers();
      const videoTransceiver = transceivers.find(t =>
        t.receiver.track?.kind === 'video' || t.sender.track?.kind === 'video'
      );

      if (videoTransceiver && RTCRtpSender.getCapabilities) {
        const codecs = RTCRtpSender.getCapabilities('video')?.codecs || [];
        // Prefer VP9 > VP8 > H264 for best quality/bandwidth ratio
        const preferredCodecs = [
          ...codecs.filter(c => c.mimeType === 'video/VP9'),
          ...codecs.filter(c => c.mimeType === 'video/VP8'),
          ...codecs.filter(c => c.mimeType === 'video/H264')
        ];

        if (preferredCodecs.length > 0 && videoTransceiver.setCodecPreferences) {
          videoTransceiver.setCodecPreferences(preferredCodecs);
          console.log('[Video] Set VP9/VP8 as preferred codec');
        }
      }
    } catch (error) {
      console.warn('[Video] Could not set codec preference:', error);
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

  // Monitor video stats for quality tracking and adaptive quality
  const monitorVideoStats = async (pc: RTCPeerConnection, userId: string) => {
    try {
      const stats = await pc.getStats();
      let localVideoStats = {
        framesSent: 0,
        framesReceived: 0,
        qualityLimitationReason: 'none',
        availableBandwidth: 0,
        packetsLost: 0,
        packetsReceived: 0,
        rtt: 0
      };

      stats.forEach(report => {
        // Outbound video stats (what we're sending)
        if (report.type === 'outbound-rtp' && report.kind === 'video') {
          localVideoStats.framesSent = report.framesSent || 0;
          localVideoStats.qualityLimitationReason = report.qualityLimitationReason || 'none';
        }
        // Inbound video stats (what we're receiving)
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          localVideoStats.framesReceived = report.framesReceived || 0;
          localVideoStats.packetsLost = report.packetsLost || 0;
          localVideoStats.packetsReceived = report.packetsReceived || 0;
        }
        // Bandwidth estimation
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          localVideoStats.availableBandwidth = (report.availableOutgoingBitrate || 0) / 1000; // Convert to kbps
          localVideoStats.rtt = (report.currentRoundTripTime || 0) * 1000;
        }
      });

      // Update video stats state for UI
      setVideoStats({
        framesSent: localVideoStats.framesSent,
        framesReceived: localVideoStats.framesReceived,
        qualityLimitationReason: localVideoStats.qualityLimitationReason,
        availableBandwidth: localVideoStats.availableBandwidth
      });

      // Adaptive quality: adjust simulcast layers based on bandwidth
      const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (videoSender && localVideoStats.availableBandwidth > 0) {
        await adaptToNetworkConditions(videoSender, localVideoStats.availableBandwidth);
      }

      // Log quality issues
      const lossRate = localVideoStats.packetsReceived > 0
        ? (localVideoStats.packetsLost / (localVideoStats.packetsLost + localVideoStats.packetsReceived)) * 100
        : 0;

      if (lossRate > 3 || localVideoStats.qualityLimitationReason !== 'none') {
        console.warn('[Video] Quality issue for', userId, {
          lossRate: lossRate.toFixed(1) + '%',
          limitation: localVideoStats.qualityLimitationReason,
          bandwidth: localVideoStats.availableBandwidth.toFixed(0) + 'kbps',
          rtt: localVideoStats.rtt.toFixed(0) + 'ms'
        });
      }

      return localVideoStats;
    } catch (error) {
      console.warn('[Video] Stats monitoring error:', error);
      return null;
    }
  };

  // Audio and video stats monitoring interval
  const audioStatsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoStatsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Audio stats every 3 seconds
    audioStatsIntervalRef.current = setInterval(() => {
      peersRef.current.forEach((peer, usrId) => {
        monitorAudioStats(peer.connection, usrId);
      });
    }, 3000);

    // Video stats every 5 seconds (less frequent to reduce overhead)
    videoStatsIntervalRef.current = setInterval(() => {
      peersRef.current.forEach((peer, usrId) => {
        monitorVideoStats(peer.connection, usrId);
      });
    }, 5000);

    return () => {
      if (audioStatsIntervalRef.current) {
        clearInterval(audioStatsIntervalRef.current);
      }
      if (videoStatsIntervalRef.current) {
        clearInterval(videoStatsIntervalRef.current);
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

  const handleIceCandidate = async (fromUserId: string, candidate: RTCIceCandidateInit) => {
    const peer = peersRef.current.get(fromUserId);
    if (!peer) {
      // Buffer candidate if peer connection not yet established
      let candidates = pendingGlobalCandidates.current.get(fromUserId) || [];
      candidates.push(candidate);
      pendingGlobalCandidates.current.set(fromUserId, candidates);
      console.log('[ICE] Buffered candidate for unknown peer:', fromUserId, 'total:', candidates.length);
      return;
    }

    try {
      // If remote description is not set yet, queue candidates
      if (peer.connection.remoteDescription === null || peer.isSettingRemoteAnswerPending) {
        peer.pendingCandidates.push(candidate);
        console.log('[ICE] Queued candidate for', fromUserId, 'pending remote description');
      } else {
        await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('[ICE] Added ICE candidate for', fromUserId);
      }
    } catch (err) {
      console.error('[ICE] Error adding ICE candidate:', err);
    }
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
      pendingCandidates: pendingGlobalCandidates.current.get(userId) || [], // Ingest globally queued candidates
      offerLock: false,
      lastOfferTime: 0
    };

    // Clear global queue for this user
    if (pendingGlobalCandidates.current.has(userId)) {
      console.log('[WebRTC] Ingested', pendingGlobalCandidates.current.get(userId)?.length, 'early candidates for', userId);
      pendingGlobalCandidates.current.delete(userId);
    }

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

    // Configure video for optimal quality
    setVP9Preference(peerConnection);

    // Configure audio sender after tracks are added
    setTimeout(() => configureAudioSender(peerConnection, userId), 100);

    // Configure video sender after tracks are added (with simulcast)
    setTimeout(() => {
      const hasVideoTrack = localStreamRef.current?.getVideoTracks().length > 0;
      if (hasVideoTrack) {
        configureVideoSender(peerConnection, userId, false);
      }
    }, 150);

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
    peerConnection: getFirstPeerConnection(),
    // Video optimization stats
    videoStats
  };
}

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

      // If stream is null, remove tracks of this type? 
      // Actually, we need to be careful not to remove the OTHER stream's tracks.
      // But since we don't easily know which sender belongs to which stream without storing it,
      // we rely on the track IDs or just add/replace.

      if (stream) {
        stream.getTracks().forEach(track => {
          const sender = senders.find(s => s.track?.kind === track.kind && s.track?.label === track.label); // Heuristic
          // Better: Check if we already have a sender for this track ID
          const existingSender = senders.find(s => s.track?.id === track.id);

          if (!existingSender) {
            try {
              peer.connection.addTrack(track, stream);
            } catch (e) {
              console.error(`Error adding ${type} track:`, e);
            }
          }
        });

        // Send metadata about this stream
        sendSignal('stream-metadata', peer.userId, {
          streamId: stream.id,
          type
        });
      }

      // Removal logic is tricky without tracking sender -> stream map.
      // For now, we assume addTrack works and we rely on negotiation to handle removals if we were to implement full sync.
      // But for "toggle", we usually just stop tracks or replace them.
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

          if (signal.from_user_id === user!.id) return;
          if (signal.to_user_id && signal.to_user_id !== user!.id) return;

          console.log('Received signal:', signal.signal_type, 'from:', signal.from_user_id);

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

            case 'stream-metadata':
              handleStreamMetadata(signal.from_user_id, signal.signal_data);
              break;

            case 'leave':
              removePeerConnection(signal.from_user_id);
              break;

            case 'reaction':
              // Dispatch custom event for UI to handle
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
          console.log('Connected to signaling channel');
          await sendSignal('join', null, {});
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
          // New columns for Live Hub
          channel_id: channelId,
          from_user_id: user.id,
          to_user_id: toUserId,
          // Legacy columns (for backward compatibility with existing schema)
          sender_id: user.id,
          receiver_id: toUserId,
          // Signal data
          signal_type: signalType,
          signal_data: signalData
        } as any);

      if (error) {
        console.error('Signal insert failed:', error);
        // Only show toast for critical signal types
        if (['offer', 'answer'].includes(signalType)) {
          toast.error('Connection issue - trying to reconnect...');
        }
      }
    } catch (e) {
      console.error('Error sending signal:', e);
    }
  };

  const sendReaction = async (emoji: string) => {
    await sendSignal('reaction', null, { emoji });
    // Also show local reaction
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
          audioStats.jitter = (report.jitter || 0) * 1000; // Convert to ms
          audioStats.concealedSamples = report.concealedSamples || 0;
        }
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          audioStats.rtt = (report.currentRoundTripTime || 0) * 1000;
        }
      });

      const lossRate = audioStats.packetsReceived > 0 
        ? (audioStats.packetsLost / (audioStats.packetsLost + audioStats.packetsReceived)) * 100 
        : 0;

      // Log quality issues
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

    // Monitor audio stats every 3 seconds
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

  const createPeerConnection = async (userId: string, isInitiator: boolean) => {
    if (peersRef.current.has(userId)) {
      return peersRef.current.get(userId)!;
    }

    console.log(`Creating peer connection with ${userId}, initiator: ${isInitiator}`);

    const peerConnection = new RTCPeerConnection(ICE_SERVERS);
    const peer: Peer = {
      userId,
      connection: peerConnection,
      isPolite: !isInitiator,
      makingOffer: false,
      ignoreOffer: false,
      isSettingRemoteAnswerPending: false
    };

    // Add local tracks
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

      // Check if stream has video tracks
      const hasVideoTracks = remoteStream.getVideoTracks().length > 0;
      const hasActiveVideo = remoteStream.getVideoTracks().some(t => t.enabled && t.readyState === 'live');
      
      console.log('[WebRTC] Stream video status', {
        userId,
        hasVideoTracks,
        hasActiveVideo,
        videoTracks: remoteStream.getVideoTracks().map(t => ({
          label: t.label,
          enabled: t.enabled,
          readyState: t.readyState
        }))
      });

      // Determine type based on metadata OR track label heuristics
      let type = remoteStreamTypesRef.current.get(streamId);
      if (!type) {
        // Heuristic: check track label for screen share indicators
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
          // Only set as camera if it has video tracks OR it's an audio-only update to existing
          userStreams.camera = remoteStream;
        }

        console.log('[WebRTC] Updated remote streams for', userId, {
          hasCameraStream: !!userStreams.camera,
          hasScreenStream: !!userStreams.screen,
          cameraVideoTracks: userStreams.camera?.getVideoTracks().length || 0,
          screenVideoTracks: userStreams.screen?.getVideoTracks().length || 0
        });

        newStreams.set(userId, { ...userStreams });
        return newStreams;
      });

      // Listen for track events to detect changes
      track.onended = () => {
        console.log('[WebRTC] Track ended:', { userId, kind: track.kind, label: track.label });
      };

      track.onmute = () => {
        console.log('[WebRTC] Track muted:', { userId, kind: track.kind, label: track.label });
      };

      track.onunmute = () => {
        console.log('[WebRTC] Track unmuted:', { userId, kind: track.kind, label: track.label });
      };
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        await sendSignal('ice-candidate', userId, event.candidate);
      }
    };

    // Negotiation Needed
    peerConnection.onnegotiationneeded = async () => {
      try {
        peer.makingOffer = true;
        await peerConnection.setLocalDescription();
        await sendSignal('offer', userId, peerConnection.localDescription);
      } catch (err) {
        console.error('Error during negotiation:', err);
      } finally {
        peer.makingOffer = false;
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'failed') {
        peerConnection.restartIce();
      }
    };

    peersRef.current.set(userId, peer);
    setPeers(new Map(peersRef.current));

    return peer;
  };

  const handleStreamMetadata = (fromUserId: string, metadata: { streamId: string, type: 'camera' | 'screen' }) => {
    console.log('Received stream metadata:', metadata);
    remoteStreamTypesRef.current.set(metadata.streamId, metadata.type);

    // Refresh remote streams to apply type
    setRemoteStreams(prev => {
      const newStreams = new Map(prev);
      const userStreams = newStreams.get(fromUserId);

      if (userStreams) {
        // Check if we have this stream already and move it if needed
        // This is a bit complex because we need to find the stream object by ID
        // But typically ontrack fires after or around same time.
        // If ontrack already fired, we might have put it in 'camera' default.

        // Let's iterate current streams to find the one with this ID
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
      const newPeer = await createPeerConnection(fromUserId, false);
      peer = newPeer.connection ? newPeer : undefined;
    }

    if (!peer) return;

    const readyForOffer = !peer.makingOffer || (peer.makingOffer && peer.isPolite);

    if (!readyForOffer) {
      peer.ignoreOffer = true;
      return;
    }

    peer.ignoreOffer = false;

    try {
      await peer.connection.setRemoteDescription(new RTCSessionDescription(offer));
      await peer.connection.setLocalDescription();
      await sendSignal('answer', fromUserId, peer.connection.localDescription);
    } catch (err) {
      console.error('Error handling offer:', err);
    }
  };

  const handleAnswer = async (fromUserId: string, answer: RTCSessionDescriptionInit) => {
    const peer = peersRef.current.get(fromUserId);
    if (!peer) return;

    try {
      await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error('Error handling answer:', err);
    }
  };

  const handleIceCandidate = async (fromUserId: string, candidate: RTCIceCandidateInit) => {
    const peer = peersRef.current.get(fromUserId);
    if (!peer) return;

    try {
      await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      if (!peer.ignoreOffer) {
        console.error('Error adding ICE candidate:', err);
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
    isConnected: signalingChannelRef.current !== null,
    sendReaction,
    sendWhiteboardEvent
  };
}
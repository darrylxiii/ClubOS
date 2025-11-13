import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useBandwidthMonitor } from './useBandwidthMonitor';
import { toast } from 'sonner';

interface MeetingWebRTCConfig {
  meetingId: string;
  participantId: string; // Can be user ID or guest session ID
  participantName: string;
  onRemoteStream: (participantId: string, stream: MediaStream) => void;
  onParticipantLeft: (participantId: string) => void;
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
  const [channelStatus, setChannelStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const signalChannel = useRef<RealtimeChannel | null>(null);
  const hasJoinedRef = useRef(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const signalRetryQueue = useRef<Map<string, { signal: any; retries: number; timestamp: number }>>(new Map());
  const mediaReadyRef = useRef(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingJoinSignals = useRef<string[]>([]);
  const { stats, getVideoConstraints } = useBandwidthMonitor();

  // Helper: Wait for channel to be ready with timeout
  const waitForChannelReady = useCallback((channel: RealtimeChannel | null, timeout: number = 5000): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (channel?.state === 'joined') {
        console.log('[WebRTC] ✅ Channel already joined');
        resolve();
        return;
      }
      
      console.log('[WebRTC] ⏳ Waiting for channel to be ready...');
      const timer = setTimeout(() => {
        console.warn('[WebRTC] ⚠️ Channel subscription timeout');
        reject(new Error('Channel subscription timeout'));
      }, timeout);
      
      const checkState = setInterval(() => {
        if (channel?.state === 'joined') {
          clearTimeout(timer);
          clearInterval(checkState);
          console.log('[WebRTC] ✅ Channel ready');
          resolve();
        }
      }, 100);
    });
  }, []);

  // Initialize local media with strict race condition fixes
  const initializeMedia = useCallback(async () => {
    try {
      console.log('[WebRTC] 🎬 STEP 1: Requesting media permissions...');
      setError(null);
      setChannelStatus('connecting');
      
      // 1. Get local media FIRST (strict ordering)
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
      
      console.log('[WebRTC] ✅ STEP 2: Media acquired, setting state...');
      setLocalStream(stream);
      localStreamRef.current = stream;
      mediaReadyRef.current = true;
      
      // Add tracks to existing peer connections (if any were created before media was ready)
      if (peerConnections.current.size > 0) {
        console.log('[WebRTC] Adding tracks to', peerConnections.current.size, 'existing peer connections');
        peerConnections.current.forEach((pc, peerId) => {
          stream.getTracks().forEach(track => {
            pc.addTrack(track, stream);
          });
        });
      }
      
      // 2. WAIT for channel to be FULLY ready (increased timeout, no fallback)
      console.log('[WebRTC] ⏳ STEP 3: Waiting for signaling channel...');
      await waitForChannelReady(signalChannel.current, 10000);
      setChannelStatus('connected');
      
      // 3. ONLY NOW send join signal
      if (!hasJoinedRef.current) {
        console.log('[WebRTC] 📢 STEP 4: Sending join signal...');
        await sendSignal({
          type: 'join',
          data: { name: participantName }
        });
        hasJoinedRef.current = true;
        console.log('[WebRTC] ✅ Join signal sent, ready for peer connections');
      }
      
      // 4. Process pending offers that arrived early
      if (pendingJoinSignals.current.length > 0) {
        console.log('[WebRTC] 📋 Processing', pendingJoinSignals.current.length, 'queued signals');
        for (const senderId of pendingJoinSignals.current) {
          await handleParticipantJoinInternal(senderId);
        }
        pendingJoinSignals.current = [];
      }
      
      return stream;
    } catch (error: any) {
      console.error('[WebRTC] ❌ Media initialization failed:', error);
      setChannelStatus('error');
      
      // Specific error messages
      const recoverable = error.name !== 'NotAllowedError' && error.name !== 'PermissionDeniedError';
      setError({
        message: error.name === 'NotFoundError' 
          ? 'No camera or microphone detected'
          : error.name === 'NotAllowedError'
          ? 'Camera/microphone access denied. Click "Allow" in browser.'
          : error.name === 'NotReadableError'
          ? 'Camera/microphone is being used by another app'
          : `Failed to access media: ${error.message}`,
        recoverable
      });
      
      throw error;
    }
  }, [getVideoConstraints, participantName, meetingId]);

  // Create peer connection - ONLY call after media is ready
  const createPeerConnection = useCallback((targetParticipantId: string) => {
    // Check if connection already exists
    if (peerConnections.current.has(targetParticipantId)) {
      console.log('[WebRTC] ♻️ Reusing existing peer connection for:', targetParticipantId);
      return peerConnections.current.get(targetParticipantId)!;
    }
    
    const currentStream = localStreamRef.current;
    if (!currentStream || !mediaReadyRef.current) {
      console.error('[WebRTC] ❌ Cannot create peer connection, media not ready! | Local stream ref:', !!localStreamRef.current, '| Media ready flag:', mediaReadyRef.current);
      throw new Error('Media not initialized');
    }
    
    console.log('[WebRTC] 🆕 Creating peer connection for:', targetParticipantId, '| Media ready:', mediaReadyRef.current, '| Tracks:', currentStream.getTracks().length);
    
    const pc = new RTCPeerConnection(RTC_CONFIG);

    // Store the connection immediately to prevent duplicates
    peerConnections.current.set(targetParticipantId, pc);

    // Add local stream tracks
    console.log('[WebRTC] ✅ Adding local tracks to peer connection for:', targetParticipantId);
    currentStream.getTracks().forEach(track => {
      console.log('[WebRTC] 📹 Adding track:', track.kind, 'enabled:', track.enabled);
      pc.addTrack(track, currentStream);
    });

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('[WebRTC] 📨 Received remote track from:', targetParticipantId, 'Kind:', event.track.kind, 'Streams:', event.streams.length, 'Track ID:', event.track.id);
      const [remoteStream] = event.streams;
      if (remoteStream) {
        const videoTracks = remoteStream.getVideoTracks();
        const audioTracks = remoteStream.getAudioTracks();
        console.log('[WebRTC] ✅ Remote stream details:', {
          streamId: remoteStream.id,
          videoTracks: videoTracks.length,
          audioTracks: audioTracks.length,
          videoEnabled: videoTracks[0]?.enabled,
          audioEnabled: audioTracks[0]?.enabled
        });
        
        // Log each track
        remoteStream.getTracks().forEach(track => {
          console.log('[WebRTC] 📹 Track:', track.kind, 'ID:', track.id, 'Enabled:', track.enabled, 'Ready:', track.readyState);
        });
        
        console.log('[WebRTC] 🎥 Calling onRemoteStream for participant:', targetParticipantId);
        onRemoteStream(targetParticipantId, remoteStream);
      } else {
        console.warn('[WebRTC] ⚠️ No remote stream in track event');
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

    // Enhanced ICE connection state monitoring with auto-recovery
    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      console.log('[WebRTC] 🧊 ICE state for', targetParticipantId, ':', iceState);
      
      switch (iceState) {
        case 'checking':
          toast.info(`Connecting to ${targetParticipantId.slice(0, 8)}...`, { id: `conn-${targetParticipantId}` });
          break;
        case 'connected':
        case 'completed':
          toast.success(`Connected to ${targetParticipantId.slice(0, 8)}`, { id: `conn-${targetParticipantId}` });
          setError(null);
          // Monitor connection stats
          monitorConnectionStats(targetParticipantId);
          break;
        case 'disconnected':
          toast.warning(`Connection unstable with ${targetParticipantId.slice(0, 8)}`, { id: `conn-${targetParticipantId}` });
          console.log('[WebRTC] 🔄 Attempting ICE restart...');
          pc.restartIce();
          break;
        case 'failed':
          toast.error(`Failed to connect to ${targetParticipantId.slice(0, 8)}. Retrying...`, { id: `conn-${targetParticipantId}` });
          // Try full reconnection
          setTimeout(async () => {
            if (pc.iceConnectionState === 'failed') {
              console.log('[WebRTC] 🔁 Full reconnection attempt...');
              peerConnections.current.delete(targetParticipantId);
              await handleParticipantJoinInternal(targetParticipantId);
            }
          }, 2000);
          break;
        case 'closed':
          console.log('[WebRTC] Connection closed for:', targetParticipantId);
          onParticipantLeft(targetParticipantId);
          break;
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState, 'for:', targetParticipantId);
      setConnectionState(pc.connectionState);
      
      if (pc.connectionState === 'failed') {
        setError({ message: 'Connection lost, reconnecting...', recoverable: true });
      } else if (pc.connectionState === 'disconnected') {
        setError({ message: 'Connection unstable', recoverable: true });
      } else if (pc.connectionState === 'connected') {
        setError(null);
      }
    };

    return pc;
  }, [localStream, onRemoteStream, onParticipantLeft]);

  // Monitor connection stats and adapt quality
  const monitorConnectionStats = async (targetParticipantId: string) => {
    const pc = peerConnections.current.get(targetParticipantId);
    if (!pc) return;
    
    try {
      const stats = await pc.getStats();
      stats.forEach(report => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          console.log('[WebRTC] 📊 Active connection:', {
            localType: report.localCandidateType,
            remoteType: report.remoteCandidateType,
            protocol: report.protocol,
            currentRoundTripTime: report.currentRoundTripTime
          });
          
          // Alert if using TURN relay
          if (report.localCandidateType === 'relay' || report.remoteCandidateType === 'relay') {
            console.log('[WebRTC] ⚠️ Using TURN relay - direct P2P not possible');
            toast.info('Connected via relay server', { id: 'relay-notification', duration: 3000 });
          }
        }
      });
    } catch (error) {
      console.error('[WebRTC] Failed to get stats:', error);
    }
  };

  // Adapt video quality based on network conditions
  const adaptVideoQuality = useCallback(async (targetParticipantId: string) => {
    const pc = peerConnections.current.get(targetParticipantId);
    if (!pc) return;
    
    try {
      const stats = await pc.getStats();
      let packetsLost = 0;
      let packetsReceived = 0;
      let rtt = 0;
      
      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          packetsLost = report.packetsLost || 0;
          packetsReceived = report.packetsReceived || 0;
        }
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          rtt = (report.currentRoundTripTime || 0) * 1000;
        }
      });
      
      const packetLossRate = packetsReceived > 0 ? (packetsLost / (packetsLost + packetsReceived)) * 100 : 0;
      
      // Determine quality based on network conditions
      let recommendedQuality: 'high' | 'medium' | 'low';
      if (packetLossRate < 2 && rtt < 150) {
        recommendedQuality = 'high';
      } else if (packetLossRate < 5 && rtt < 300) {
        recommendedQuality = 'medium';
      } else {
        recommendedQuality = 'low';
      }
      
      // Apply quality settings
      const senders = pc.getSenders();
      const videoSender = senders.find(s => s.track?.kind === 'video');
      
      if (videoSender) {
        const params = videoSender.getParameters();
        if (!params.encodings) params.encodings = [{}];
        
        switch (recommendedQuality) {
          case 'high':
            params.encodings[0].maxBitrate = 2500000;
            params.encodings[0].scaleResolutionDownBy = 1;
            break;
          case 'medium':
            params.encodings[0].maxBitrate = 1000000;
            params.encodings[0].scaleResolutionDownBy = 2;
            break;
          case 'low':
            params.encodings[0].maxBitrate = 500000;
            params.encodings[0].scaleResolutionDownBy = 4;
            break;
        }
        
        await videoSender.setParameters(params);
        console.log('[WebRTC] 🎥 Adapted to', recommendedQuality, 'quality | Packet loss:', packetLossRate.toFixed(2), '% | RTT:', rtt.toFixed(0), 'ms');
      }
    } catch (error) {
      console.error('[WebRTC] Failed to adapt quality:', error);
    }
  }, []);

  // Monitor quality every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      peerConnections.current.forEach((_, participantId) => {
        adaptVideoQuality(participantId);
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, [adaptVideoQuality]);

  // Send signal through Supabase with retry logic
  const sendSignal = async (signal: {
    type: string;
    receiverId?: string;
    data: any;
  }) => {
    const signalKey = `${signal.type}-${signal.receiverId || 'broadcast'}-${Date.now()}`;
    
    try {
      console.log('[WebRTC] 📤 Sending signal:', signal.type, 'to:', signal.receiverId || 'broadcast', 'from:', participantId);
      
      await supabase.from('webrtc_signals').insert({
        meeting_id: meetingId,
        sender_id: participantId,
        receiver_id: signal.receiverId || null,
        signal_type: signal.type,
        signal_data: signal.data
      });
      
      console.log('[WebRTC] ✅ Signal sent successfully:', signal.type);
      
      // Remove from retry queue if it was there
      signalRetryQueue.current.delete(signalKey);
    } catch (error) {
      console.error('[WebRTC] ❌ Failed to send signal:', signal.type, error);
      
      // Add to retry queue for critical signals
      if (['join', 'offer', 'answer'].includes(signal.type)) {
        const existing = signalRetryQueue.current.get(signalKey);
        const retries = existing ? existing.retries + 1 : 1;
        
        if (retries <= 3) {
          signalRetryQueue.current.set(signalKey, {
            signal,
            retries,
            timestamp: Date.now()
          });
          
          console.log('[WebRTC] 🔄 Signal queued for retry:', signal.type, 'attempt:', retries);
          
          // Retry after exponential backoff
          setTimeout(() => sendSignal(signal), Math.min(1000 * Math.pow(2, retries), 5000));
        } else {
          console.error('[WebRTC] ❌ Signal retry limit exceeded:', signal.type);
          setError({ message: 'Failed to send signal. Connection may be unstable.', recoverable: true });
        }
      }
    }
  };

  // Handle incoming offer
  const handleOffer = async (senderId: string, offer: RTCSessionDescriptionInit) => {
    console.log('[WebRTC] 📞 Handling offer from:', senderId, '| Media ready:', mediaReadyRef.current, '| Stream ref:', !!localStreamRef.current);
    
    // Check if media is ready before handling offer
    if (!mediaReadyRef.current || !localStreamRef.current) {
      console.warn('[WebRTC] ⚠️ Received offer but media not ready yet. Queuing sender:', senderId);
      if (!pendingJoinSignals.current.includes(senderId)) {
        pendingJoinSignals.current.push(senderId);
      }
      return;
    }
    
    console.log('[WebRTC] Current peers:', Array.from(peerConnections.current.keys()));
    
    let pc = peerConnections.current.get(senderId);
    if (!pc) {
      console.log('[WebRTC] 🆕 Creating new peer connection for offer from:', senderId);
      pc = createPeerConnection(senderId);
      setParticipants(prev => [...new Set([...prev, senderId])]);
    }

    // Check if we're in a stable state before setting remote description
    if (pc.signalingState !== 'stable') {
      console.log('[WebRTC] ⚠️ Signaling state not stable:', pc.signalingState, '| Attempting rollback');
      // Try to rollback and retry
      try {
        await pc.setLocalDescription({ type: 'rollback' });
      } catch (e) {
        console.log('[WebRTC] Rollback failed or not needed:', e);
      }
    }

    try {
      console.log('[WebRTC] 📝 Setting remote description (offer) from:', senderId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      console.log('[WebRTC] 🎤 Creating answer for:', senderId);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      console.log('[WebRTC] 📤 Sending answer to:', senderId);
      await sendSignal({
        type: 'answer',
        receiverId: senderId,
        data: answer
      });
      
      console.log('[WebRTC] ✅ Answer sent successfully to:', senderId);
    } catch (error) {
      console.error('[WebRTC] ❌ Error handling offer from:', senderId, error);
    }
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

  // Fallback polling for participants (when realtime fails)
  const pollParticipants = useCallback(async () => {
    // Don't poll if media isn't ready
    if (!mediaReadyRef.current) {
      console.log('[WebRTC] ⏸️ Skipping participant poll, media not ready');
      return;
    }
    
    try {
      const { data: participants, error } = await supabase
        .from('meeting_participants')
        .select('user_id, session_token')
        .eq('meeting_id', meetingId)
        .is('left_at', null);
      
      if (error) {
        console.error('[WebRTC] ❌ Failed to poll participants:', error);
        return;
      }
      
      if (participants) {
        console.log('[WebRTC] 📊 Polled participants:', participants.length);
        
        const newParticipantIds = participants
          .map(p => p.user_id || p.session_token)
          .filter((id): id is string => id !== null && id !== participantId);
        
        // Check for new participants
        for (const newId of newParticipantIds) {
          const currentParticipants = Array.from(peerConnections.current.keys());
          if (!currentParticipants.includes(newId)) {
            console.log('[WebRTC] 🆕 New participant found via polling:', newId);
            if (newId === participantId) continue;
            
            // Check if we already have a connection
            if (peerConnections.current.has(newId)) {
              console.log('[WebRTC] Already have connection to:', newId);
              continue;
            }
            
            // Use wrapper to respect media-ready check
            await handleParticipantJoin(newId);
          }
        }
        
        setParticipants(newParticipantIds);
      }
    } catch (error) {
      console.error('[WebRTC] ❌ Participant polling error:', error);
    }
  }, [meetingId, participantId]);

  // Fallback polling for signals (when realtime fails)
  const pollSignals = useCallback(async () => {
    // Don't poll if media isn't ready
    if (!mediaReadyRef.current) {
      console.log('[WebRTC] ⏸️ Skipping signal poll, media not ready');
      return;
    }
    
    try {
      const { data: signals, error } = await supabase
        .from('webrtc_signals')
        .select('*')
        .eq('meeting_id', meetingId)
        .or(`receiver_id.eq.${participantId},receiver_id.is.null`)
        .neq('sender_id', participantId)
        .eq('processed', false)
        .order('created_at', { ascending: true })
        .limit(10);
      
      if (error) {
        console.error('[WebRTC] ❌ Failed to poll signals:', error);
        return;
      }
      
      if (signals && signals.length > 0) {
        console.log('[WebRTC] 📊 Processing', signals.length, 'signals from polling');
        
        for (const signal of signals) {
          // Process signal - cast signal_data to appropriate type via unknown
          switch (signal.signal_type) {
            case 'join':
              await handleParticipantJoin(signal.sender_id);
              break;
            case 'offer':
              await handleOffer(signal.sender_id, signal.signal_data as unknown as RTCSessionDescriptionInit);
              break;
            case 'answer':
              await handleAnswer(signal.sender_id, signal.signal_data as unknown as RTCSessionDescriptionInit);
              break;
            case 'ice-candidate':
              await handleIceCandidate(signal.sender_id, signal.signal_data as unknown as RTCIceCandidateInit);
              break;
          }
          
          // Mark as processed
          await supabase
            .from('webrtc_signals')
            .update({ processed: true })
            .eq('id', signal.id);
        }
      }
    } catch (error) {
      console.error('[WebRTC] ❌ Signal polling error:', error);
    }
  }, [meetingId, participantId]);

  // Start fallback polling when channel is unreliable
  useEffect(() => {
    if (channelStatus === 'disconnected' || channelStatus === 'error') {
      console.log('[WebRTC] 🔄 Starting fallback polling due to channel issues');
      
      // Poll participants and signals every 2 seconds
      pollingInterval.current = setInterval(() => {
        pollParticipants();
        pollSignals();
      }, 2000);
      
      return () => {
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
        }
      };
    } else if (pollingInterval.current) {
      // Stop polling when channel is healthy
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  }, [channelStatus, pollParticipants, pollSignals]);
  // Internal handler that requires media to be ready
  const handleParticipantJoinInternal = async (newParticipantId: string) => {
    if (newParticipantId === participantId) {
      console.log('[WebRTC] Ignoring own join signal');
      return;
    }
    
    // Double-check media is ready before proceeding
    if (!mediaReadyRef.current || !localStreamRef.current) {
      console.error('[WebRTC] ❌ handleParticipantJoinInternal called but media not ready! This should not happen. | Media ready:', mediaReadyRef.current, '| Stream ref:', !!localStreamRef.current);
      // Queue it again
      if (!pendingJoinSignals.current.includes(newParticipantId)) {
        pendingJoinSignals.current.push(newParticipantId);
      }
      return;
    }

    // CRITICAL: Verify the participant is approved before establishing WebRTC connection
    try {
      console.log('[WebRTC] 🔍 Verifying participant approval status for:', newParticipantId);
      const { data, error } = await supabase
        .from('meeting_participants')
        .select('status, session_token, user_id')
        .eq('meeting_id', meetingId)
        .or(`user_id.eq.${newParticipantId},session_token.eq.${newParticipantId}`)
        .maybeSingle();

      if (error) {
        console.error('[WebRTC] ❌ Error checking participant approval:', error);
        return;
      }

      if (!data) {
        console.warn('[WebRTC] ⚠️ Participant not found in database, may not be approved yet:', newParticipantId);
        return;
      }

      if (data.status !== 'accepted') {
        console.warn('[WebRTC] ⚠️ Participant not yet accepted (status:', data.status, '), skipping WebRTC connection');
        return;
      }

      console.log('[WebRTC] ✅ Participant verified as accepted, proceeding with WebRTC connection');
    } catch (error) {
      console.error('[WebRTC] ❌ Error verifying participant approval:', error);
      return;
    }
    
    const currentStream = localStreamRef.current;
    console.log('[WebRTC] ✅ Media confirmed ready | Stream tracks:', currentStream.getTracks().length);
    
    // Check if we already have a connection
    if (peerConnections.current.has(newParticipantId)) {
      console.log('[WebRTC] Already have connection to:', newParticipantId);
      return;
    }
    
    console.log('[WebRTC] ✅ New participant joined:', newParticipantId, '| Media confirmed ready | Creating offer');
    setParticipants(prev => [...new Set([...prev, newParticipantId])]);

    try {
      // Create peer connection with media tracks
      console.log('[WebRTC] 📞 Creating peer connection with tracks for:', newParticipantId);
      const pc = createPeerConnection(newParticipantId);
      
      console.log('[WebRTC] 🎬 Creating offer with', currentStream.getTracks().length, 'tracks');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      console.log('[WebRTC] ✅ Offer created for:', newParticipantId, '| SDP:', offer.sdp?.substring(0, 100) + '...');
      
      await sendSignal({
        type: 'offer',
        receiverId: newParticipantId,
        data: offer
      });
      
      console.log('[WebRTC] ✅ Offer sent to:', newParticipantId);
    } catch (error) {
      console.error('[WebRTC] ❌ Failed to create/send offer to:', newParticipantId, error);
    }
  };

  // External handler that queues join signals until media is ready
  const handleParticipantJoin = async (newParticipantId: string) => {
    if (!mediaReadyRef.current || !localStreamRef.current) {
      console.log('[WebRTC] ⏸️ Media not ready, queueing join signal from:', newParticipantId, '| Media ready:', mediaReadyRef.current, '| Stream ref:', !!localStreamRef.current);
      if (!pendingJoinSignals.current.includes(newParticipantId)) {
        pendingJoinSignals.current.push(newParticipantId);
        console.log('[WebRTC] 📝 Queued participant:', newParticipantId, '| Queue length:', pendingJoinSignals.current.length);
      }
      return;
    }
    
    console.log('[WebRTC] ✅ Media is ready (stream in ref), processing join from:', newParticipantId);
    await handleParticipantJoinInternal(newParticipantId);
  };

  // Join meeting and set up signaling - STABLE effect that doesn't re-run
  useEffect(() => {
    if (!meetingId) return;

    console.log('[WebRTC] 🔧 Setting up signaling for meeting:', meetingId, '| Participant:', participantId);

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
          if (signal.sender_id === participantId) {
            console.log('[WebRTC] 🔄 Ignoring own signal:', signal.signal_type);
            return;
          }
          
          // Ignore signals meant for others
          if (signal.receiver_id && signal.receiver_id !== participantId) {
            console.log('[WebRTC] 📭 Ignoring signal for others:', signal.signal_type, 'from:', signal.sender_id, 'to:', signal.receiver_id);
            return;
          }

          console.log('[WebRTC] 📨 Received signal:', signal.signal_type, 'from:', signal.sender_id, 'receiver:', signal.receiver_id || 'broadcast');

          switch (signal.signal_type) {
            case 'join':
              console.log('[WebRTC] 👤 JOIN signal received from:', signal.sender_id);
              await handleParticipantJoin(signal.sender_id);
              break;
            case 'offer':
              console.log('[WebRTC] 📞 OFFER signal received from:', signal.sender_id);
              await handleOffer(signal.sender_id, signal.signal_data);
              break;
            case 'answer':
              console.log('[WebRTC] ✅ ANSWER signal received from:', signal.sender_id);
              await handleAnswer(signal.sender_id, signal.signal_data);
              break;
            case 'ice-candidate':
              console.log('[WebRTC] 🧊 ICE-CANDIDATE signal received from:', signal.sender_id);
              await handleIceCandidate(signal.sender_id, signal.signal_data);
              break;
            case 'leave':
              console.log('[WebRTC] 👋 LEAVE signal received from:', signal.sender_id);
              onParticipantLeft(signal.sender_id);
              peerConnections.current.delete(signal.sender_id);
              setParticipants(prev => prev.filter(p => p !== signal.sender_id));
              break;
            case 'screen-share-start':
              console.log('[WebRTC] 🖥️ SCREEN-SHARE-START signal received from:', signal.sender_id);
              // Remote user started screen sharing - their video track will be replaced automatically
              toast(`${signal.sender_id.slice(0, 8)} is sharing their screen`, { duration: 2000 });
              break;
            case 'screen-share-stop':
              console.log('[WebRTC] 🖥️ SCREEN-SHARE-STOP signal received from:', signal.sender_id);
              // Remote user stopped screen sharing - their camera track will be restored automatically
              break;
            case 'video-state':
            case 'audio-state':
              // Handle remote media state changes (logged but not acted on)
              console.log('[WebRTC] 🎛️ Media state change from:', signal.sender_id, signal.signal_data);
              break;
            default:
              console.log('[WebRTC] ❓ Unknown signal type:', signal.signal_type);
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[WebRTC] 📡 Channel subscription status:', status, err);
        if (status === 'SUBSCRIBED') {
          setChannelStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          setChannelStatus('error');
        } else if (status === 'TIMED_OUT') {
          setChannelStatus('disconnected');
        } else if (status === 'CLOSED') {
          console.warn('[WebRTC] ⚠️ Channel closed');
          setChannelStatus('disconnected');
        }
      });

    signalChannel.current = channel;

    // Wait for channel to be ready, then send join signal if media is ready
    const setupChannel = async () => {
      console.log('[WebRTC] ⏳ Waiting for channel to be ready...');
      setChannelStatus('connecting');
      
      // Wait for channel to be subscribed with timeout
      const channelReady = await Promise.race([
        new Promise<boolean>((resolve) => {
          const checkSubscription = () => {
            const state = channel.state;
            console.log('[WebRTC] 📡 Current channel state:', state);
            
            if (state === 'joined') {
              console.log('[WebRTC] ✅ Channel ready and joined');
              setChannelStatus('connected');
              resolve(true);
            } else if (state === 'closed') {
              console.warn('[WebRTC] ⚠️ Channel is closed, retrying...');
              resolve(false);
            } else {
              setTimeout(checkSubscription, 100);
            }
          };
          checkSubscription();
        }),
        new Promise<boolean>((resolve) => {
          setTimeout(() => {
            console.warn('[WebRTC] ⏱️ Channel setup timeout after 10s');
            setChannelStatus('error');
            resolve(false);
          }, 10000);
        })
      ]);

      if (!channelReady) {
        console.error('[WebRTC] ❌ Channel failed to initialize, will use polling');
        return;
      }

      // If we have media already, send join signal immediately
      // Otherwise, initializeMedia will send it when ready
      if (mediaReadyRef.current && !hasJoinedRef.current) {
        console.log('[WebRTC] 📢 Media already available, sending join signal');
        await sendSignal({
          type: 'join',
          data: { name: participantName }
        });
        hasJoinedRef.current = true;
        console.log('[WebRTC] ✅ Join signal sent immediately (media pre-initialized)');
      } else {
        console.log('[WebRTC] ⏸️ Waiting for media to be initialized before sending join signal | Media ready:', mediaReadyRef.current, '| Has joined:', hasJoinedRef.current);
      }
    };

    setupChannel();
    
    // Fallback: Send join signal after timeout if media init hangs
    const mediaInitTimeout = setTimeout(() => {
      if (!mediaReadyRef.current && channel.state === 'joined' && !hasJoinedRef.current) {
        console.warn('[WebRTC] ⚠️ Media init timeout (5s) - sending join anyway');
        sendSignal({ type: 'join', data: { name: participantName } });
        hasJoinedRef.current = true;
      }
    }, 5000);

    return () => {
      clearTimeout(mediaInitTimeout);
      
      // Announce leave
      console.log('[WebRTC] 👋 Leaving meeting, sending leave signal');
      sendSignal({
        type: 'leave',
        data: {}
      });
      
      channel.unsubscribe();
      signalChannel.current = null;
      hasJoinedRef.current = false;
    };
  }, [meetingId, participantId, participantName]);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    const currentStream = localStreamRef.current;
    if (currentStream) {
      const videoTrack = currentStream.getVideoTracks()[0];
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
  }, [isVideoEnabled, initializeMedia]);

  // Toggle audio
  const toggleAudio = useCallback(async () => {
    const currentStream = localStreamRef.current;
    if (currentStream) {
      const audioTrack = currentStream.getAudioTracks()[0];
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
  }, [isAudioEnabled]);

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
          const currentStream = localStreamRef.current;
          if (currentStream) {
            const cameraTrack = currentStream.getVideoTracks()[0];
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
    const currentStream = localStreamRef.current;
    if (!currentStream || !document.pictureInPictureEnabled) {
      console.warn('[PiP] Picture-in-Picture not supported');
      return false;
    }

    try {
      const videoElement = document.createElement('video');
      videoElement.srcObject = currentStream;
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
      const currentStream = localStreamRef.current;
      if (currentStream) {
        currentStream.getTracks().forEach(track => {
          track.stop();
          console.log('[WebRTC] Stopped track:', track.kind);
        });
        localStreamRef.current = null;
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
    channelStatus,
    initializeMedia,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    sendReaction,
    enablePictureInPicture,
    cleanup,
    retryConnection: async () => {
      console.log('[WebRTC] 🔄 Manual retry triggered, attempt:', reconnectAttempts.current + 1);
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        setError({ message: 'Failed to connect after multiple attempts. Please refresh the page.', recoverable: false });
        toast.error('Connection failed after multiple attempts');
        return;
      }

      reconnectAttempts.current++;
      setError(null);
      setChannelStatus('connecting');
      
      toast.info(`Reconnecting (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})...`);

      // Clean up existing connections
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();
      setParticipants([]);
      
      // Unsubscribe from old channel
      if (signalChannel.current) {
        signalChannel.current.unsubscribe();
        signalChannel.current = null;
      }
      
      // Reset flags
      hasJoinedRef.current = false;
      mediaReadyRef.current = false;
      
      // Re-initialize media
      try {
        await initializeMedia();
        toast.success('Reconnected successfully');
        reconnectAttempts.current = 0; // Reset on success
      } catch (error) {
        console.error('[WebRTC] ❌ Retry failed:', error);
        setError({ message: 'Reconnection failed. Please try again.', recoverable: true });
      }
    }
  };
}

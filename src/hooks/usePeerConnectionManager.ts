import { useRef, useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSimulcast } from './useSimulcast';
import { useMobileOptimizations } from './useMobileOptimizations';
import { useE2EEncryption } from './useE2EEncryption';
import { toast } from 'sonner';
import { optimizeSessionDescription } from '@/utils/sdpMunger';
import { meetingLogger as log } from '@/lib/meetingLogger';
import { DEFAULT_RTC_CONFIG, getE2EEConfig, supportsE2EEncryption, getDynamicRTCConfig } from '@/utils/webrtcConfig';
import type { SignalPayload } from './useSignalingChannel';

interface UsePeerConnectionManagerOptions {
  meetingId: string;
  participantId: string;
  participantName: string;
  enableE2EE?: boolean;
  onRemoteStream: (participantId: string, stream: MediaStream) => void;
  onParticipantLeft: (participantId: string) => void;
  sendSignal: (signal: SignalPayload) => Promise<void>;
}

/**
 * Manages RTCPeerConnection lifecycle: creation, ICE handling,
 * negotiation, codec preferences, adaptive bitrate, and stats monitoring.
 */
export function usePeerConnectionManager({
  meetingId,
  participantId,
  participantName,
  enableE2EE = false,
  onRemoteStream,
  onParticipantLeft,
  sendSignal,
}: UsePeerConnectionManagerOptions) {
  const [connectionState, setConnectionState] = useState<string>('new');
  const [participants, setParticipants] = useState<string[]>([]);
  const [e2eeActive, setE2eeActive] = useState(false);
  const [videoStats, setVideoStats] = useState({
    framesSent: 0, framesReceived: 0, qualityLimitationReason: 'none' as string, availableBandwidth: 0,
  });

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const mediaReadyRef = useRef(false);
  const pendingJoinSignals = useRef<string[]>([]);
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const leftParticipantsRef = useRef<Set<string>>(new Set());
  const dynamicRTCConfigRef = useRef<RTCConfiguration | null>(null);
  const e2eeEnabledRef = useRef(enableE2EE);

  const e2ee = useE2EEncryption(meetingId);
  const { configureSimulcast, adaptToNetworkConditions, setScreenShareContentHint } = useSimulcast();
  const { isMobile, isTablet, connectionType } = useMobileOptimizations({ enableBatterySaving: true });

  // Fetch dynamic TURN credentials
  useEffect(() => {
    let cancelled = false;
    getDynamicRTCConfig({ enableE2EE }).then(c => { if (!cancelled) dynamicRTCConfigRef.current = c; }).catch(() => {});
    return () => { cancelled = true; };
  }, [enableE2EE]);

  const getRTCConfig = useCallback(() => {
    if (dynamicRTCConfigRef.current) return dynamicRTCConfigRef.current;
    if (e2eeEnabledRef.current && supportsE2EEncryption()) return getE2EEConfig();
    return DEFAULT_RTC_CONFIG;
  }, []);

  const setLocalStream = useCallback((stream: MediaStream | null) => {
    localStreamRef.current = stream;
    mediaReadyRef.current = !!stream;
  }, []);

  // Configure video sender with simulcast / adaptive bitrate
  const configureVideoSender = useCallback(async (pc: RTCPeerConnection, isScreenShare = false) => {
    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
    if (!sender) return;

    const ok = await configureSimulcast(sender, undefined, isScreenShare);
    if (!ok) {
      const params = sender.getParameters();
      if (!params.encodings?.length) params.encodings = [{}];
      let maxBitrate = 2500000;
      if (isMobile || connectionType === '2g') maxBitrate = 300000;
      else if (isTablet || connectionType === '3g') maxBitrate = 800000;
      params.encodings[0].maxBitrate = maxBitrate;
      try { await sender.setParameters(params); } catch {}
    }
    if (isScreenShare && sender.track) setScreenShareContentHint(sender.track, 'detail');
  }, [configureSimulcast, setScreenShareContentHint, isMobile, isTablet, connectionType]);

  // VP9 preference
  const setVP9Preference = useCallback((pc: RTCPeerConnection) => {
    try {
      const t = pc.getTransceivers().find(tr => tr.receiver.track?.kind === 'video' || tr.sender.track?.kind === 'video');
      if (t && RTCRtpSender.getCapabilities) {
        const codecs = RTCRtpSender.getCapabilities('video')?.codecs || [];
        const preferred = [...codecs.filter(c => c.mimeType === 'video/VP9'), ...codecs.filter(c => c.mimeType === 'video/VP8'), ...codecs.filter(c => c.mimeType === 'video/H264')];
        if (preferred.length && t.setCodecPreferences) t.setCodecPreferences(preferred);
      }
    } catch {}
  }, []);

  // Create a peer connection
  const createPeerConnection = useCallback((targetId: string): RTCPeerConnection => {
    if (peerConnections.current.has(targetId)) return peerConnections.current.get(targetId)!;

    const stream = localStreamRef.current;
    if (!stream || !mediaReadyRef.current) throw new Error('Media not initialized');

    const pc = new RTCPeerConnection(getRTCConfig());
    peerConnections.current.set(targetId, pc);

    // E2EE
    if (e2eeEnabledRef.current && supportsE2EEncryption()) {
      setTimeout(async () => {
        const ok = await e2ee.enableEncryption(pc, targetId);
        if (ok) setE2eeActive(true);
      }, 100);
    }

    // Add tracks
    stream.getTracks().filter(t => t.readyState === 'live').forEach(track => {
      pc.addTrack(track, stream);
      track.onended = () => log.debug('PC', 'Track ended: ' + track.kind);
    });

    setVP9Preference(pc);
    setTimeout(() => { if (stream.getVideoTracks().length) configureVideoSender(pc, false); }, 150);

    // Remote tracks
    pc.ontrack = (ev) => {
      const [rs] = ev.streams;
      if (rs) onRemoteStream(targetId, rs);
    };

    // ICE candidates
    pc.onicecandidate = async (ev) => {
      if (ev.candidate) await sendSignal({ type: 'ice-candidate', receiverId: targetId, data: ev.candidate });
    };

    // ICE state
    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      if (leftParticipantsRef.current.has(targetId)) {
        if (s === 'failed' || s === 'disconnected') { peerConnections.current.delete(targetId); onParticipantLeft(targetId); }
        return;
      }
      switch (s) {
        case 'connected': case 'completed':
          toast.success(`Connected to ${targetId.slice(0, 8)}`, { id: `conn-${targetId}` });
          break;
        case 'disconnected':
          toast.warning(`Connection unstable with ${targetId.slice(0, 8)}`, { id: `conn-${targetId}` });
          pc.restartIce();
          setTimeout(async () => {
            if (pc.iceConnectionState === 'disconnected' && !leftParticipantsRef.current.has(targetId)) {
              const { data } = await supabase.from('meeting_participants').select('left_at').eq('meeting_id', meetingId).or(`user_id.eq.${targetId},session_token.eq.${targetId}`).maybeSingle();
              if (data?.left_at !== null) { leftParticipantsRef.current.add(targetId); peerConnections.current.delete(targetId); onParticipantLeft(targetId); }
            }
          }, 3000);
          break;
        case 'failed':
          toast.error(`Failed to connect to ${targetId.slice(0, 8)}`, { id: `conn-${targetId}` });
          setTimeout(async () => {
            if (pc.iceConnectionState === 'failed' && !leftParticipantsRef.current.has(targetId)) {
              const { data } = await supabase.from('meeting_participants').select('left_at').eq('meeting_id', meetingId).or(`user_id.eq.${targetId},session_token.eq.${targetId}`).maybeSingle();
              if (data?.left_at !== null) { leftParticipantsRef.current.add(targetId); peerConnections.current.delete(targetId); onParticipantLeft(targetId); }
              else { peerConnections.current.delete(targetId); handleParticipantJoinInternal(targetId); }
            }
          }, 2000);
          break;
        case 'closed':
          peerConnections.current.delete(targetId); onParticipantLeft(targetId);
          break;
      }
    };

    // Renegotiation
    pc.onnegotiationneeded = async () => {
      try {
        const offer = await pc.createOffer();
        const opt = optimizeSessionDescription(offer, { enableOpusFEC: true, enableOpusDTX: true, opusMaxAverageBitrate: 64000, preferredVideoCodec: 'VP9' });
        await pc.setLocalDescription(opt);
        await sendSignal({ type: 'offer', receiverId: targetId, data: opt });
      } catch (e) { log.error('PC', 'Renegotiation failed:', e); }
    };

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
    };

    return pc;
  }, [getRTCConfig, onRemoteStream, onParticipantLeft, sendSignal, meetingId, configureVideoSender, setVP9Preference, e2ee]);

  // Flush pending ICE candidates
  const flushCandidates = useCallback(async (pc: RTCPeerConnection, senderId: string) => {
    const cands = pendingCandidates.current.get(senderId);
    if (cands?.length) {
      for (const c of cands) { try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {} }
      pendingCandidates.current.delete(senderId);
    }
  }, []);

  const handleOffer = useCallback(async (senderId: string, offer: RTCSessionDescriptionInit) => {
    if (!mediaReadyRef.current || !localStreamRef.current) {
      if (!pendingJoinSignals.current.includes(senderId)) pendingJoinSignals.current.push(senderId);
      return;
    }
    let pc = peerConnections.current.get(senderId);
    if (!pc) { pc = createPeerConnection(senderId); setParticipants(p => [...new Set([...p, senderId])]); }
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      const opt = optimizeSessionDescription(answer, { enableOpusFEC: true, enableOpusDTX: false, opusMaxAverageBitrate: 64000 });
      await pc.setLocalDescription(opt);
      await sendSignal({ type: 'answer', receiverId: senderId, data: opt });
      await flushCandidates(pc, senderId);
    } catch (e) { log.error('PC', 'Offer handling failed:', e); }
  }, [createPeerConnection, sendSignal, flushCandidates]);

  const handleAnswer = useCallback(async (senderId: string, answer: RTCSessionDescriptionInit) => {
    const pc = peerConnections.current.get(senderId);
    if (pc && pc.signalingState === 'have-local-offer') {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await flushCandidates(pc, senderId);
      } catch (e) { log.error('PC', 'Answer handling failed:', e); }
    }
  }, [flushCandidates]);

  const handleIceCandidate = useCallback(async (senderId: string, candidate: RTCIceCandidateInit) => {
    const pc = peerConnections.current.get(senderId);
    if (pc?.remoteDescription?.type) {
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    } else {
      const cur = pendingCandidates.current.get(senderId) || [];
      pendingCandidates.current.set(senderId, [...cur, candidate]);
    }
  }, []);

  // Internal join handler (media must be ready)
  const handleParticipantJoinInternal = useCallback(async (newId: string) => {
    if (newId === participantId) return;
    if (leftParticipantsRef.current.has(newId)) return;
    if (!mediaReadyRef.current || !localStreamRef.current) {
      if (!pendingJoinSignals.current.includes(newId)) pendingJoinSignals.current.push(newId);
      return;
    }

    // Verify participant
    try {
      const { data, error } = await supabase.from('meeting_participants').select('status, left_at').eq('meeting_id', meetingId).or(`user_id.eq.${newId},session_token.eq.${newId}`).maybeSingle();
      if (error || !data || data.left_at !== null) { if (data?.left_at !== null) leftParticipantsRef.current.add(newId); return; }
      if (data.status !== 'accepted') return;
    } catch { return; }

    if (peerConnections.current.has(newId)) return;

    const pc = createPeerConnection(newId);
    setParticipants(p => [...new Set([...p, newId])]);

    if (participantId > newId) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal({ type: 'offer', receiverId: newId, data: offer });
      } catch (e) { log.error('[PC] Offer creation failed:', e); }
    }
  }, [participantId, meetingId, createPeerConnection, sendSignal]);

  // External join handler (queues if media not ready)
  const handleParticipantJoin = useCallback(async (newId: string) => {
    if (!mediaReadyRef.current || !localStreamRef.current) {
      if (!pendingJoinSignals.current.includes(newId)) pendingJoinSignals.current.push(newId);
      return;
    }
    await handleParticipantJoinInternal(newId);
  }, [handleParticipantJoinInternal]);

  // Process pending join signals
  const processPendingJoins = useCallback(async () => {
    if (pendingJoinSignals.current.length > 0) {
      const pending = [...pendingJoinSignals.current];
      pendingJoinSignals.current = [];
      for (const id of pending) await handleParticipantJoinInternal(id);
    }
  }, [handleParticipantJoinInternal]);

  // Handle leave
  const handleParticipantLeave = useCallback((senderId: string) => {
    leftParticipantsRef.current.add(senderId);
    const pc = peerConnections.current.get(senderId);
    if (pc) { pc.close(); peerConnections.current.delete(senderId); }
    setParticipants(p => p.filter(x => x !== senderId));
    onParticipantLeft(senderId);
    toast.info(`${senderId.slice(0, 8)} left the meeting`, { duration: 2000 });
  }, [onParticipantLeft]);

  // Poll participants
  const pollParticipants = useCallback(async () => {
    if (!mediaReadyRef.current) return;
    try {
      const { data, error } = await supabase.from('meeting_participants').select('user_id, session_token, left_at').eq('meeting_id', meetingId).is('left_at', null);
      if (error || !data) return;
      const activeIds = data.map(p => p.user_id || p.session_token).filter((id): id is string => !!id && id !== participantId && !leftParticipantsRef.current.has(id));
      for (const id of activeIds) { if (!peerConnections.current.has(id)) await handleParticipantJoin(id); }
      const activeSet = new Set(activeIds);
      for (const connId of Array.from(peerConnections.current.keys())) {
        if (!activeSet.has(connId)) { leftParticipantsRef.current.add(connId); const pc = peerConnections.current.get(connId); if (pc) { pc.close(); peerConnections.current.delete(connId); } onParticipantLeft(connId); }
      }
      setParticipants(activeIds);
    } catch {}
  }, [meetingId, participantId, handleParticipantJoin, onParticipantLeft]);

  // Adaptive quality monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      peerConnections.current.forEach(async (pc) => {
        try {
          const stats = await pc.getStats();
          stats.forEach(r => {
            if (r.type === 'outbound-rtp' && r.kind === 'video') {
              setVideoStats(prev => ({ ...prev, framesSent: r.framesSent || 0, qualityLimitationReason: r.qualityLimitationReason || 'none' }));
            }
            if (r.type === 'candidate-pair' && r.state === 'succeeded') {
              setVideoStats(prev => ({ ...prev, availableBandwidth: (r.availableOutgoingBitrate || 0) / 1000 }));
            }
          });
          const vs = pc.getSenders().find(s => s.track?.kind === 'video');
          if (vs) await adaptToNetworkConditions(vs, videoStats.availableBandwidth);
        } catch {}
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [adaptToNetworkConditions, videoStats.availableBandwidth]);

  // Cleanup
  const cleanupConnections = useCallback(() => {
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    leftParticipantsRef.current.clear();
    setParticipants([]);
  }, []);

  return {
    peerConnections,
    connectionState,
    participants,
    setParticipants,
    videoStats,
    e2eeActive,
    e2eeEnabledRef,
    e2ee,
    localStreamRef,
    mediaReadyRef,
    leftParticipantsRef,
    setLocalStream,
    createPeerConnection,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    handleParticipantJoin,
    handleParticipantJoinInternal,
    handleParticipantLeave,
    processPendingJoins,
    pollParticipants,
    cleanupConnections,
    configureVideoSender,
    setScreenShareContentHint,
  };
}

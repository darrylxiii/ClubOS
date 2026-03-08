import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { meetingLogger as log } from '@/lib/meetingLogger';

export interface SignalPayload {
  type: string;
  receiverId?: string;
  data: any;
}

interface SignalMessage {
  sender_id: string;
  signal_type: string;
  signal_data: any;
  receiver_id: string | null;
}

interface UseSignalingChannelOptions {
  meetingId: string;
  participantId: string;
  onSignal: (signal: SignalMessage) => void;
}

/**
 * Manages the Supabase realtime channel for WebRTC signaling.
 * Handles sending signals with retry, channel subscription,
 * and fallback polling when the channel is unreliable.
 */
export function useSignalingChannel({
  meetingId,
  participantId,
  onSignal,
}: UseSignalingChannelOptions) {
  const [channelStatus, setChannelStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');

  const channelRef = useRef<RealtimeChannel | null>(null);
  const signalRetryQueue = useRef<Map<string, { signal: SignalPayload; retries: number; timestamp: number }>>(new Map());
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const mediaReadyRef = useRef(false);

  /** Mark media as ready so polling won't skip */
  const setMediaReady = useCallback((ready: boolean) => {
    mediaReadyRef.current = ready;
  }, []);

  /** Wait for channel to reach 'joined' state */
  const waitForChannelReady = useCallback((timeout = 10000): Promise<void> => {
    return new Promise((resolve, reject) => {
      const ch = channelRef.current;
      if (ch?.state === 'joined') { resolve(); return; }
      log.debug('Signaling', 'Waiting for channel…');
      const timer = setTimeout(() => { reject(new Error('Channel timeout')); }, timeout);
      const check = setInterval(() => {
        if (channelRef.current?.state === 'joined') {
          clearTimeout(timer); clearInterval(check);
          log.debug('Signaling', 'Channel ready');
          resolve();
        }
      }, 100);
    });
  }, []);

  /** Send a signal via Supabase insert with retry for critical types */
  const sendSignal = useCallback(async (signal: SignalPayload) => {
    const signalKey = `${signal.type}-${signal.receiverId || 'broadcast'}-${Date.now()}`;
    try {
      log.debug('Signaling', 'Sending: ' + signal.type + ' to: ' + (signal.receiverId || 'broadcast'));
      await supabase.from('webrtc_signals').insert({
        meeting_id: meetingId,
        sender_id: participantId,
        receiver_id: signal.receiverId || null,
        signal_type: signal.type,
        signal_data: signal.data,
      });
      signalRetryQueue.current.delete(signalKey);
    } catch (error) {
      log.error('Signaling', 'Failed to send: ' + signal.type, error);
      if (['join', 'offer', 'answer'].includes(signal.type)) {
        const existing = signalRetryQueue.current.get(signalKey);
        const retries = existing ? existing.retries + 1 : 1;
        if (retries <= 3) {
          signalRetryQueue.current.set(signalKey, { signal, retries, timestamp: Date.now() });
          setTimeout(() => sendSignal(signal), Math.min(1000 * Math.pow(2, retries), 5000));
        }
      }
    }
  }, [meetingId, participantId]);

  /** Poll signals table as fallback */
  const pollSignals = useCallback(async () => {
    if (!mediaReadyRef.current) return;
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

      if (error || !signals?.length) return;
      log.debug('[Signaling] Polling found', signals.length, 'signals');

      for (const sig of signals) {
        onSignal({
          sender_id: sig.sender_id,
          signal_type: sig.signal_type,
          signal_data: sig.signal_data,
          receiver_id: sig.receiver_id,
        });
        await supabase.from('webrtc_signals').update({ processed: true }).eq('id', sig.id);
      }
    } catch (e) {
      log.error('[Signaling] Poll error:', e);
    }
  }, [meetingId, participantId, onSignal]);

  // Start/stop fallback polling based on channel health
  useEffect(() => {
    if (channelStatus === 'disconnected' || channelStatus === 'error') {
      log.debug('[Signaling] Starting fallback polling');
      pollingInterval.current = setInterval(pollSignals, 2000);
      return () => { if (pollingInterval.current) clearInterval(pollingInterval.current); };
    } else if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  }, [channelStatus, pollSignals]);

  // Subscribe to Supabase channel
  useEffect(() => {
    if (!meetingId) return;

    const channel = supabase
      .channel(`meeting-${meetingId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'webrtc_signals', filter: `meeting_id=eq.${meetingId}` },
        (payload: any) => {
          const sig = payload.new;
          if (sig.sender_id === participantId) return;
          if (sig.receiver_id && sig.receiver_id !== participantId) return;
          onSignal({
            sender_id: sig.sender_id,
            signal_type: sig.signal_type,
            signal_data: sig.signal_data,
            receiver_id: sig.receiver_id,
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setChannelStatus('connected');
        else if (status === 'CHANNEL_ERROR') setChannelStatus('error');
        else if (status === 'TIMED_OUT' || status === 'CLOSED') setChannelStatus('disconnected');
      });

    channelRef.current = channel;

    return () => {
      sendSignal({ type: 'leave', data: {} });
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [meetingId, participantId, onSignal, sendSignal]);

  return {
    channelStatus,
    sendSignal,
    waitForChannelReady,
    setMediaReady,
    channelRef,
  };
}

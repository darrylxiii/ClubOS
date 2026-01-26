import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useScribe, CommitStrategy } from '@elevenlabs/react';

interface TranscriptionSegment {
  id: string;
  text: string;
  speaker: string;
  timestamp: Date;
  isFinal: boolean;
}

interface UseStreamingTranscriptionProps {
  meetingId: string;
  participantId?: string;
  participantName: string;
  localStream: MediaStream | null;
  enabled: boolean;
}

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 2000;
const TOKEN_REFRESH_INTERVAL_MS = 12 * 60 * 1000; // 12 minutes (tokens last 15 min)

export function useStreamingTranscription({
  meetingId,
  participantId,
  participantName,
  localStream,
  enabled
}: UseStreamingTranscriptionProps) {
  const [transcriptions, setTranscriptions] = useState<TranscriptionSegment[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasConnectedRef = useRef(false);
  const pendingTranscriptRef = useRef<string>('');
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tokenRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveTranscriptToDb = useCallback(async (text: string, isFinal: boolean) => {
    if (!text.trim()) return;
    
    try {
      await supabase.from('meeting_transcripts').insert({
        meeting_id: meetingId,
        participant_name: participantName,
        text: text.trim(),
        timestamp_ms: Date.now(),
        is_final: isFinal,
        confidence: isFinal ? 0.95 : null
      });
    } catch (err) {
      console.error('[StreamingTranscription] Failed to save transcript:', err);
    }
  }, [meetingId, participantName]);

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    commitStrategy: 'vad' as CommitStrategy,
    onPartialTranscript: (data) => {
      console.log('[StreamingTranscription] Partial:', data.text);
      pendingTranscriptRef.current = data.text;
      
      // Update UI with interim result
      setTranscriptions(prev => {
        const filtered = prev.filter(t => t.isFinal);
        if (data.text.trim()) {
          return [...filtered, {
            id: `interim-${Date.now()}`,
            text: data.text,
            speaker: participantName,
            timestamp: new Date(),
            isFinal: false
          }];
        }
        return filtered;
      });
    },
    onCommittedTranscript: (data) => {
      console.log('[StreamingTranscription] Committed:', data.text);
      
      const segment: TranscriptionSegment = {
        id: `final-${Date.now()}-${Math.random()}`,
        text: data.text,
        speaker: participantName,
        timestamp: new Date(),
        isFinal: true
      };

      setTranscriptions(prev => {
        // Remove interim and add final
        const filtered = prev.filter(t => t.isFinal);
        return [...filtered, segment];
      });

      // Save to database
      saveTranscriptToDb(data.text, true);
      pendingTranscriptRef.current = '';
      
      // Reset reconnect counter on successful transcript
      reconnectAttemptsRef.current = 0;
    },
    onCommittedTranscriptWithTimestamps: (data) => {
      console.log('[StreamingTranscription] Committed with timestamps:', data.text, data.words);
    }
  });

  const fetchToken = useCallback(async (): Promise<string | null> => {
    try {
      console.log('[StreamingTranscription] Fetching scribe token...');
      
      const { data, error: fnError } = await supabase.functions.invoke('elevenlabs-scribe-token', {
        body: { meeting_id: meetingId, participant_id: participantId }
      });
      
      if (fnError || !data?.token) {
        throw new Error(fnError?.message || 'Failed to get scribe token');
      }

      return data.token;
    } catch (err) {
      console.error('[StreamingTranscription] Token fetch failed:', err);
      return null;
    }
  }, [meetingId, participantId]);

  const connect = useCallback(async () => {
    if (!localStream || hasConnectedRef.current) {
      console.log('[StreamingTranscription] 🚫 Connect skipped:', {
        hasLocalStream: !!localStream,
        alreadyConnected: hasConnectedRef.current
      });
      return;
    }

    console.log('[StreamingTranscription] 🎬 Attempting connection...');
    console.log('[StreamingTranscription] Stream tracks:', localStream.getTracks().map(t => `${t.kind}: ${t.enabled ? 'enabled' : 'disabled'}`));

    try {
      const token = await fetchToken();
      
      if (!token) {
        throw new Error('Could not obtain transcription token');
      }

      console.log('[StreamingTranscription] ✅ Token received, connecting to ElevenLabs Scribe...');
      
      await scribe.connect({
        token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      hasConnectedRef.current = true;
      setIsConnected(true);
      setIsReconnecting(false);
      setError(null);
      reconnectAttemptsRef.current = 0;
      
      console.log('[StreamingTranscription] ✅ Connected successfully to ElevenLabs Scribe');
      console.log('[StreamingTranscription] VAD commit strategy enabled');

      // Schedule token refresh before expiry
      scheduleTokenRefresh();
    } catch (err) {
      console.error('[StreamingTranscription] ❌ Connection failed:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnected(false);
      
      // Attempt reconnection
      attemptReconnect();
    }
  }, [localStream, scribe, fetchToken]);

  const scheduleTokenRefresh = useCallback(() => {
    // Clear any existing refresh timer
    if (tokenRefreshTimeoutRef.current) {
      clearTimeout(tokenRefreshTimeoutRef.current);
    }

    // Schedule refresh 3 minutes before token expires (tokens last 15 min)
    tokenRefreshTimeoutRef.current = setTimeout(async () => {
      if (hasConnectedRef.current && scribe.isConnected) {
        console.log('[StreamingTranscription] Refreshing token...');
        
        // Disconnect and reconnect with new token
        scribe.disconnect();
        hasConnectedRef.current = false;
        
        // Small delay before reconnecting
        setTimeout(() => {
          connect();
        }, 500);
      }
    }, TOKEN_REFRESH_INTERVAL_MS);
  }, [scribe, connect]);

  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[StreamingTranscription] Max reconnect attempts reached');
      setError('Connection lost. Please refresh to try again.');
      setIsReconnecting(false);
      return;
    }

    reconnectAttemptsRef.current++;
    setIsReconnecting(true);
    
    const delay = RECONNECT_DELAY_MS * Math.pow(2, reconnectAttemptsRef.current - 1);
    console.log(`[StreamingTranscription] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      hasConnectedRef.current = false;
      connect();
    }, delay);
  }, [connect]);

  const disconnect = useCallback(() => {
    if (scribe.isConnected) {
      scribe.disconnect();
    }
    hasConnectedRef.current = false;
    setIsConnected(false);
    setIsReconnecting(false);
    
    // Clear timers
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (tokenRefreshTimeoutRef.current) {
      clearTimeout(tokenRefreshTimeoutRef.current);
    }
    
    console.log('[StreamingTranscription] Disconnected');
  }, [scribe]);

  // Connect when enabled and stream available
  useEffect(() => {
    console.log('[StreamingTranscription] 🔍 Effect check:', {
      enabled,
      hasLocalStream: !!localStream,
      hasConnected: hasConnectedRef.current
    });

    if (enabled && localStream && !hasConnectedRef.current) {
      console.log('[StreamingTranscription] 🎬 Starting connection in 1s...');
      // Small delay to ensure stream is ready
      const timer = setTimeout(() => {
        connect();
      }, 1000);
      return () => clearTimeout(timer);
    }
    
    if (!enabled && hasConnectedRef.current) {
      console.log('[StreamingTranscription] ⏸️ Disabled, disconnecting...');
      disconnect();
    }
  }, [enabled, localStream, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    transcriptions,
    isTranscribing: isConnected && scribe.isConnected,
    isReconnecting,
    partialTranscript: scribe.partialTranscript,
    committedTranscripts: scribe.committedTranscripts,
    error,
    connect,
    disconnect,
    reconnect: () => {
      reconnectAttemptsRef.current = 0;
      disconnect();
      setTimeout(() => connect(), 500);
    }
  };
}

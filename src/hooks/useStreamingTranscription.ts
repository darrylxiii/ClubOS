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
  participantName: string;
  localStream: MediaStream | null;
  enabled: boolean;
}

export function useStreamingTranscription({
  meetingId,
  participantName,
  localStream,
  enabled
}: UseStreamingTranscriptionProps) {
  const [transcriptions, setTranscriptions] = useState<TranscriptionSegment[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasConnectedRef = useRef(false);
  const pendingTranscriptRef = useRef<string>('');

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
    },
    onCommittedTranscriptWithTimestamps: (data) => {
      console.log('[StreamingTranscription] Committed with timestamps:', data.text, data.words);
    }
  });

  const connect = useCallback(async () => {
    if (!localStream || hasConnectedRef.current) return;

    try {
      console.log('[StreamingTranscription] Fetching scribe token...');
      
      const { data, error: fnError } = await supabase.functions.invoke('elevenlabs-scribe-token');
      
      if (fnError || !data?.token) {
        throw new Error(fnError?.message || 'Failed to get scribe token');
      }

      console.log('[StreamingTranscription] Connecting to ElevenLabs Scribe...');
      
      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      hasConnectedRef.current = true;
      setIsConnected(true);
      setError(null);
      console.log('[StreamingTranscription] Connected successfully');
    } catch (err) {
      console.error('[StreamingTranscription] Connection failed:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnected(false);
    }
  }, [localStream, scribe, saveTranscriptToDb]);

  const disconnect = useCallback(() => {
    if (scribe.isConnected) {
      scribe.disconnect();
    }
    hasConnectedRef.current = false;
    setIsConnected(false);
    console.log('[StreamingTranscription] Disconnected');
  }, [scribe]);

  // Connect when enabled and stream available
  useEffect(() => {
    if (enabled && localStream && !hasConnectedRef.current) {
      // Small delay to ensure stream is ready
      const timer = setTimeout(() => {
        connect();
      }, 1000);
      return () => clearTimeout(timer);
    }
    
    if (!enabled && hasConnectedRef.current) {
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
    partialTranscript: scribe.partialTranscript,
    committedTranscripts: scribe.committedTranscripts,
    error,
    connect,
    disconnect
  };
}

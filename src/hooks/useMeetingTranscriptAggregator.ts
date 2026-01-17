import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface AggregatedTranscript {
  id: string;
  text: string;
  speaker_name: string;
  speaker_id: string;
  timestamp_ms: number;
  is_final: boolean;
  confidence?: number;
}

interface UseMeetingTranscriptAggregatorOptions {
  meetingId: string;
  enabled?: boolean;
  maxTranscripts?: number;
}

/**
 * Aggregates transcripts from all participants in a meeting
 * Subscribes to real-time updates for multi-speaker display
 */
export function useMeetingTranscriptAggregator({
  meetingId,
  enabled = true,
  maxTranscripts = 100
}: UseMeetingTranscriptAggregatorOptions) {
  const [transcripts, setTranscripts] = useState<AggregatedTranscript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const speakerNamesRef = useRef<Map<string, string>>(new Map());

  // Fetch speaker name from participant ID
  const getSpeakerName = useCallback(async (participantId: string): Promise<string> => {
    // Check cache first
    if (speakerNamesRef.current.has(participantId)) {
      return speakerNamesRef.current.get(participantId)!;
    }

    try {
      // Try to get from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', participantId)
        .maybeSingle();

      if (profile?.full_name) {
        speakerNamesRef.current.set(participantId, profile.full_name);
        return profile.full_name;
      }

      // Try meeting_participants for guest name
      const { data: participant } = await supabase
        .from('meeting_participants')
        .select('role')
        .eq('meeting_id', meetingId)
        .or(`user_id.eq.${participantId},session_token.eq.${participantId}`)
        .maybeSingle();

      // Fallback to truncated ID
      const fallback = `Participant ${participantId.slice(0, 6)}`;
      speakerNamesRef.current.set(participantId, fallback);
      return fallback;
    } catch (err) {
      console.error('[TranscriptAggregator] Error fetching speaker name:', err);
      return `Participant ${participantId.slice(0, 6)}`;
    }
  }, [meetingId]);

  // Fetch existing transcripts
  const fetchExistingTranscripts = useCallback(async () => {
    if (!enabled || !meetingId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('meeting_transcripts')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('timestamp_ms', { ascending: true })
        .limit(maxTranscripts);

      if (fetchError) throw fetchError;

      if (data) {
        // Enrich with speaker names
        const enriched = await Promise.all(
          data.map(async (t) => ({
            id: t.id,
            text: t.text,
            speaker_name: t.participant_id ? await getSpeakerName(t.participant_id) : 'Unknown',
            speaker_id: t.participant_id ?? 'unknown',
            timestamp_ms: t.timestamp_ms,
            is_final: t.is_final ?? true,
            confidence: t.confidence ?? undefined
          }))
        );

        setTranscripts(enriched);
      }
    } catch (err: any) {
      console.error('[TranscriptAggregator] Error fetching transcripts:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [meetingId, enabled, maxTranscripts, getSpeakerName]);

  // Subscribe to real-time transcript updates
  useEffect(() => {
    if (!enabled || !meetingId) return;

    fetchExistingTranscripts();

    // Set up real-time subscription
    const channel = supabase
      .channel(`meeting-transcripts-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'meeting_transcripts',
          filter: `meeting_id=eq.${meetingId}`
        },
        async (payload) => {
          const newTranscript = payload.new as any;

          const speakerName = await getSpeakerName(newTranscript.participant_id);

          const enriched: AggregatedTranscript = {
            id: newTranscript.id,
            text: newTranscript.text,
            speaker_name: speakerName,
            speaker_id: newTranscript.participant_id,
            timestamp_ms: newTranscript.timestamp_ms,
            is_final: newTranscript.is_final,
            confidence: newTranscript.confidence
          };

          setTranscripts(prev => {
            // If this is an update to an existing interim transcript, replace it
            const existingIndex = prev.findIndex(
              t => t.speaker_id === enriched.speaker_id &&
                !t.is_final &&
                Math.abs(t.timestamp_ms - enriched.timestamp_ms) < 5000
            );

            if (existingIndex >= 0 && !enriched.is_final) {
              const updated = [...prev];
              updated[existingIndex] = enriched;
              return updated;
            }

            // Remove interim and add final, or just add new
            if (enriched.is_final) {
              const filtered = prev.filter(
                t => !(t.speaker_id === enriched.speaker_id && !t.is_final)
              );
              return [...filtered, enriched].slice(-maxTranscripts);
            }

            return [...prev, enriched].slice(-maxTranscripts);
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'meeting_transcripts',
          filter: `meeting_id=eq.${meetingId}`
        },
        async (payload) => {
          const updated = payload.new as any;
          const speakerName = await getSpeakerName(updated.participant_id);

          setTranscripts(prev =>
            prev.map(t =>
              t.id === updated.id
                ? {
                  ...t,
                  text: updated.text,
                  is_final: updated.is_final,
                  speaker_name: speakerName
                }
                : t
            )
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [meetingId, enabled, fetchExistingTranscripts, getSpeakerName, maxTranscripts]);

  // Get latest transcript per speaker (for captions)
  const getLatestBySpeaker = useCallback((): Map<string, AggregatedTranscript> => {
    const latestMap = new Map<string, AggregatedTranscript>();

    // Process in order, keeping most recent per speaker
    for (const t of transcripts) {
      const existing = latestMap.get(t.speaker_id);
      if (!existing || t.timestamp_ms > existing.timestamp_ms) {
        latestMap.set(t.speaker_id, t);
      }
    }

    return latestMap;
  }, [transcripts]);

  // Get all final transcripts for full meeting transcript
  const getFinalTranscripts = useCallback((): AggregatedTranscript[] => {
    return transcripts.filter(t => t.is_final);
  }, [transcripts]);

  // Export transcript as text
  const exportAsText = useCallback((): string => {
    return getFinalTranscripts()
      .map(t => {
        const time = new Date(t.timestamp_ms).toLocaleTimeString();
        return `[${time}] ${t.speaker_name}: ${t.text}`;
      })
      .join('\n');
  }, [getFinalTranscripts]);

  // Clear transcripts
  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
  }, []);

  return {
    transcripts,
    isLoading,
    error,
    getLatestBySpeaker,
    getFinalTranscripts,
    exportAsText,
    clearTranscripts,
    refresh: fetchExistingTranscripts
  };
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { aiService } from '@/services/aiService';

interface TranscriptionChunk {
  id: string;
  text: string;
  speaker: string;
  timestamp: Date;
  isFinal: boolean;
}

interface UseMeetingTranscriptionProps {
  meetingId: string;
  participantName: string;
  localStream: MediaStream | null;
  enabled: boolean;
}

export function useMeetingTranscription({
  meetingId,
  participantName,
  localStream,
  enabled
}: UseMeetingTranscriptionProps) {
  const [transcriptions, setTranscriptions] = useState<TranscriptionChunk[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track stream ID to detect when stream object changes
  const currentStreamIdRef = useRef<string | null>(null);
  // Track audio-only stream clone for transcription (isolated from video changes)
  const audioStreamRef = useRef<MediaStream | null>(null);

  const processAudioBlob = useCallback(async (audioBlob: Blob) => {
    try {
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const base64Audio = await base64Promise;

      // Call voice-to-text edge function
      const data = await aiService.voiceToText({
        audio: base64Audio,
        meetingId,
        participantName,
        timestamp: new Date().toISOString()
      });

      if (data?.text && data.text.trim()) {
        const newChunk: TranscriptionChunk = {
          id: `${Date.now()}-${Math.random()}`,
          text: data.text,
          speaker: participantName,
          timestamp: new Date(),
          isFinal: true
        };

        setTranscriptions(prev => [...prev, newChunk]);

        // Save to database
        await supabase.from('meeting_transcripts').insert({
          meeting_id: meetingId,
          participant_name: participantName,
          text: data.text,
          timestamp_ms: Date.now(),
          is_final: true
        });
      }
    } catch (error) {
      console.error('[Transcription] Error processing audio:', error);
    }
  }, [meetingId, participantName]);

  // Cleanup function for MediaRecorder
  const cleanupMediaRecorder = useCallback(() => {
    if (transcriptionIntervalRef.current) {
      clearInterval(transcriptionIntervalRef.current);
      transcriptionIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_e) {
        console.warn('[Transcription] Error stopping MediaRecorder:', _e);
      }
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];

    // Cleanup audio-only stream
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !localStream) {
      cleanupMediaRecorder();
      currentStreamIdRef.current = null;
      setIsTranscribing(false);
      return;
    }

    // Check if stream has audio tracks
    const audioTracks = localStream.getAudioTracks();
    if (!audioTracks.length) {
      console.warn('[Transcription] No audio tracks in stream');
      setIsTranscribing(false);
      return;
    }

    // Check if this is the same stream (by checking audio track IDs)
    const newStreamId = audioTracks.map(t => t.id).join('-');

    // If stream audio tracks haven't changed, don't reinitialize
    if (currentStreamIdRef.current === newStreamId && mediaRecorderRef.current) {
      console.log('[Transcription] Same audio tracks, keeping existing MediaRecorder');
      return;
    }

    // Stream changed - cleanup and reinitialize
    console.log('[Transcription] Audio tracks changed, reinitializing MediaRecorder', {
      oldId: currentStreamIdRef.current,
      newId: newStreamId
    });

    cleanupMediaRecorder();
    currentStreamIdRef.current = newStreamId;

    // Initialize MediaRecorder for proper audio format
    const setupAudioCapture = async () => {
      try {
        // Find an active audio track
        const activeTrack = audioTracks.find(track => track.readyState === 'live' && track.enabled);
        if (!activeTrack) {
          console.warn('[Transcription] No active audio tracks available');
          return;
        }

        // CRITICAL: Create audio-only stream clone for transcription
        // This isolates transcription from video track changes
        const audioOnlyStream = new MediaStream([activeTrack.clone()]);
        audioStreamRef.current = audioOnlyStream;

        // Check for supported mime types
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';

        const mediaRecorder = new MediaRecorder(audioOnlyStream, {
          mimeType,
          audioBitsPerSecond: 128000
        });

        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onerror = (event: Event) => {
          console.error('[Transcription] MediaRecorder error:', event);
          // Attempt recovery by cleaning up
          cleanupMediaRecorder();
          setIsTranscribing(false);
        };

        mediaRecorder.onstop = async () => {
          if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            audioChunksRef.current = [];

            // Process the audio blob
            await processAudioBlob(audioBlob);
          }
        };

        // Listen for track ended events
        activeTrack.onended = () => {
          console.warn('[Transcription] Audio track ended');
          cleanupMediaRecorder();
          setIsTranscribing(false);
        };

        // Record in 5-second intervals
        mediaRecorder.start();
        transcriptionIntervalRef.current = setInterval(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            // Only restart if we still have the same recorder
            if (mediaRecorderRef.current === mediaRecorder) {
              try {
                mediaRecorder.start();
              } catch (_e) {
                console.warn('[Transcription] Could not restart MediaRecorder:', _e);
              }
            }
          }
        }, 5000);

        setIsTranscribing(true);
        console.log('[Transcription] Started successfully with audio-only stream');
      } catch (error) {
        console.error('[Transcription] Setup failed:', error);
        setIsTranscribing(false);
      }
    };

    // Delay setup to ensure stream is ready
    const setupTimer = setTimeout(() => {
      setupAudioCapture();
    }, 1500);

    return () => {
      clearTimeout(setupTimer);
      cleanupMediaRecorder();
    };
  }, [enabled, localStream, processAudioBlob, cleanupMediaRecorder]);

  return {
    transcriptions,
    isTranscribing
  };
}

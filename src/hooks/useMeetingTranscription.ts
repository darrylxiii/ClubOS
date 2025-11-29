import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: {
          audio: base64Audio,
          meetingId,
          participantName,
          timestamp: new Date().toISOString()
        }
      });

      if (error) throw error;

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

  useEffect(() => {
    if (!enabled || !localStream) {
      // Cleanup
      if (transcriptionIntervalRef.current) {
        clearInterval(transcriptionIntervalRef.current);
        transcriptionIntervalRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }
      audioChunksRef.current = [];
      setIsTranscribing(false);
      return;
    }

    // Initialize MediaRecorder for proper audio format
    const setupAudioCapture = async () => {
      try {
        // Validate stream has audio tracks and they're enabled
        const audioTracks = localStream.getAudioTracks();
        if (!audioTracks.length) {
          console.warn('[Transcription] No audio tracks in stream');
          return;
        }

        // Wait for tracks to be ready
        const activeTrack = audioTracks.find(track => track.readyState === 'live' && track.enabled);
        if (!activeTrack) {
          console.warn('[Transcription] No active audio tracks available');
          return;
        }

        // Check for supported mime types
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';

        const mediaRecorder = new MediaRecorder(localStream, {
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
          console.error('[Transcription] MediaRecorder error:', {
            error: event,
            state: mediaRecorder.state,
            stream: localStream,
            tracks: localStream.getAudioTracks().map(t => ({
              id: t.id,
              enabled: t.enabled,
              muted: t.muted,
              readyState: t.readyState
            }))
          });
          
          // Stop recording on error
          if (transcriptionIntervalRef.current) {
            clearInterval(transcriptionIntervalRef.current);
            transcriptionIntervalRef.current = null;
          }
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
        audioTracks.forEach(track => {
          track.onended = () => {
            console.warn('[Transcription] Audio track ended');
            if (transcriptionIntervalRef.current) {
              clearInterval(transcriptionIntervalRef.current);
              transcriptionIntervalRef.current = null;
            }
            setIsTranscribing(false);
          };
        });

        // Record in 5-second intervals
        mediaRecorder.start();
        transcriptionIntervalRef.current = setInterval(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            mediaRecorder.start(); // Start new recording
          }
        }, 5000);

        setIsTranscribing(true);
        console.log('[Transcription] Started successfully');
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
      if (transcriptionIntervalRef.current) {
        clearInterval(transcriptionIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [enabled, localStream, processAudioBlob]);

  return {
    transcriptions,
    isTranscribing
  };
}

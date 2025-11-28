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

        mediaRecorder.onstop = async () => {
          if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            audioChunksRef.current = [];
            
            // Process the audio blob
            await processAudioBlob(audioBlob);
          }
        };

        // Record in 5-second intervals
        mediaRecorder.start();
        transcriptionIntervalRef.current = setInterval(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            mediaRecorder.start(); // Start new recording
          }
        }, 5000);

        setIsTranscribing(true);
        toast.success('Live transcription started');
      } catch (error) {
        console.error('[Transcription] Setup failed:', error);
        toast.error('Failed to start transcription');
      }
    };

    setupAudioCapture();

    return () => {
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

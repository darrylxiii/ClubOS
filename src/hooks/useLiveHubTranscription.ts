import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TranscriptionChunk {
  id: string;
  text: string;
  speaker: string;
  timestamp: Date;
  isFinal: boolean;
}

interface UseLiveHubTranscriptionProps {
  channelId: string;
  recordingId?: string | null;
  participantName: string;
  userId?: string;
  localStream: MediaStream | null;
  enabled: boolean;
}

export function useLiveHubTranscription({
  channelId,
  recordingId,
  participantName,
  userId,
  localStream,
  enabled
}: UseLiveHubTranscriptionProps) {
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
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: {
          audio: base64Audio,
          meetingId: channelId, // Keep for compatibility with edge function
          participantName,
          timestamp: new Date().toISOString()
        }
      });

      if (error) {
        console.error('[LiveHub Transcription] Edge function error:', error);
        throw error;
      }

      if (data?.text && data.text.trim()) {
        const newChunk: TranscriptionChunk = {
          id: `${Date.now()}-${Math.random()}`,
          text: data.text,
          speaker: participantName,
          timestamp: new Date(),
          isFinal: true
        };

        setTranscriptions(prev => [...prev, newChunk]);

        // Save to LiveHub transcripts table (NOT meeting_transcripts)
        const { error: insertError } = await supabase.from('livehub_transcripts').insert({
          channel_id: channelId,
          recording_id: recordingId || null,
          user_id: userId || null,
          speaker_name: participantName,
          text: data.text,
          timestamp_ms: Date.now(),
          is_final: true,
          metadata: {
            source: 'voice_channel',
            confidence: data.confidence || null
          }
        });

        if (insertError) {
          console.error('[LiveHub Transcription] Failed to save transcript:', insertError);
        } else {
          console.log('[LiveHub Transcription] Saved transcript to livehub_transcripts');
        }
      }
    } catch (error) {
      console.error('[LiveHub Transcription] Error processing audio:', error);
    }
  }, [channelId, recordingId, participantName, userId]);

  // Cleanup function for MediaRecorder
  const cleanupMediaRecorder = useCallback(() => {
    if (transcriptionIntervalRef.current) {
      clearInterval(transcriptionIntervalRef.current);
      transcriptionIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('[LiveHub Transcription] Error stopping MediaRecorder:', e);
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
      console.warn('[LiveHub Transcription] No audio tracks in stream');
      setIsTranscribing(false);
      return;
    }

    // Check if this is the same stream (by checking audio track IDs)
    const newStreamId = audioTracks.map(t => t.id).join('-');
    
    // If stream audio tracks haven't changed, don't reinitialize
    if (currentStreamIdRef.current === newStreamId && mediaRecorderRef.current) {
      console.log('[LiveHub Transcription] Same audio tracks, keeping existing MediaRecorder');
      return;
    }

    // Stream changed - cleanup and reinitialize
    console.log('[LiveHub Transcription] Audio tracks changed, reinitializing MediaRecorder', {
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
          console.warn('[LiveHub Transcription] No active audio tracks available');
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
          console.error('[LiveHub Transcription] MediaRecorder error:', event);
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
          console.warn('[LiveHub Transcription] Audio track ended');
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
              } catch (e) {
                console.warn('[LiveHub Transcription] Could not restart MediaRecorder:', e);
              }
            }
          }
        }, 5000);

        setIsTranscribing(true);
        console.log('[LiveHub Transcription] Started successfully for channel:', channelId);
      } catch (error) {
        console.error('[LiveHub Transcription] Setup failed:', error);
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
  }, [enabled, localStream, processAudioBlob, cleanupMediaRecorder, channelId]);

  return {
    transcriptions,
    isTranscribing
  };
}

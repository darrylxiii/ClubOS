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
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioBufferRef = useRef<Float32Array[]>([]);
  const transcriptionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const encodeAudioForAPI = useCallback((float32Arrays: Float32Array[]): string => {
    // Combine all chunks
    const totalLength = float32Arrays.reduce((acc, arr) => acc + arr.length, 0);
    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const arr of float32Arrays) {
      combined.set(arr, offset);
      offset += arr.length;
    }

    // Convert to PCM16
    const int16Array = new Int16Array(combined.length);
    for (let i = 0; i < combined.length; i++) {
      const s = Math.max(-1, Math.min(1, combined[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Convert to base64
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = '';
    const chunkSize = 0x8000;
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    return btoa(binary);
  }, []);

  const processAudioChunk = useCallback(async () => {
    if (audioBufferRef.current.length === 0) return;

    const audioData = [...audioBufferRef.current];
    audioBufferRef.current = [];

    try {
      const base64Audio = encodeAudioForAPI(audioData);
      
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
  }, [meetingId, participantName, encodeAudioForAPI]);

  useEffect(() => {
    if (!enabled || !localStream) {
      // Cleanup
      if (transcriptionIntervalRef.current) {
        clearInterval(transcriptionIntervalRef.current);
        transcriptionIntervalRef.current = null;
      }
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setIsTranscribing(false);
      return;
    }

    // Initialize audio processing
    const setupAudioCapture = async () => {
      try {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        sourceRef.current = audioContextRef.current.createMediaStreamSource(localStream);
        processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

        processorRef.current.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          audioBufferRef.current.push(new Float32Array(inputData));
        };

        sourceRef.current.connect(processorRef.current);
        processorRef.current.connect(audioContextRef.current.destination);

        // Process accumulated audio every 5 seconds
        transcriptionIntervalRef.current = setInterval(processAudioChunk, 5000);

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
      if (processorRef.current) {
        processorRef.current.disconnect();
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [enabled, localStream, processAudioChunk]);

  return {
    transcriptions,
    isTranscribing
  };
}

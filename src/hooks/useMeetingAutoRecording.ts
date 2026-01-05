import { useRef, useCallback, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface UseMeetingAutoRecordingProps {
  meetingId: string;
  participantId: string;
  participantName: string;
  localStream: MediaStream | null;
  remoteStreams: Map<string, { stream: MediaStream; name: string }>;
  meeting: any;
  enabled?: boolean;
}

interface RecordingState {
  isRecording: boolean;
  recordingStartTime: number | null;
  recordingId: string | null;
  hasConsent: boolean;
}

export function useMeetingAutoRecording({
  meetingId,
  participantId,
  participantName,
  localStream,
  remoteStreams,
  meeting,
  enabled = true
}: UseMeetingAutoRecordingProps) {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    recordingStartTime: null,
    recordingId: null,
    hasConsent: false
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const autoStartAttemptedRef = useRef(false);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!localStream || state.isRecording) {
      console.log('[AutoRecording] Cannot start: no stream or already recording');
      return false;
    }

    try {
      // Combine local and all remote streams
      const tracks: MediaStreamTrack[] = [...localStream.getTracks()];

      remoteStreams.forEach(({ stream }) => {
        tracks.push(...stream.getTracks());
      });

      if (tracks.length === 0) {
        console.log('[AutoRecording] No tracks available to record');
        return false;
      }

      const combinedStream = new MediaStream(tracks);

      // WARNING: MediaRecorder typically only records the first video track (usually local or whoever joined first).
      // A full grid recording requires a server-side MCU or canvas composition.
      if (tracks.filter(t => t.kind === 'video').length > 1) {
        logger.warn('Multiple video tracks detected. MediaRecorder may only record one track. Grid recording requires server-side composition.', { componentName: 'AutoRecording' });
      }

      // Check for supported mime types
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
      }

      const recorder = new MediaRecorder(combinedStream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onerror = (e) => {
        console.error('[AutoRecording] MediaRecorder error:', e);
        toast.error('Recording error occurred');
        stopRecording();
      };

      // Use single blob mode for correct duration metadata
      recorder.start();
      mediaRecorderRef.current = recorder;

      const startTime = Date.now();
      setState(prev => ({
        ...prev,
        isRecording: true,
        recordingStartTime: startTime,
        hasConsent: true
      }));

      console.log('[AutoRecording] ✅ Recording started for meeting:', meetingId);
      toast.success('Club AI is recording this meeting', {
        description: 'Transcript and analysis will be available after the meeting'
      });

      return true;
    } catch (error) {
      console.error('[AutoRecording] Failed to start recording:', error);
      toast.error('Failed to start recording');
      return false;
    }
  }, [localStream, remoteStreams, meetingId, state.isRecording]);

  // Stop recording and upload
  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || !state.isRecording) {
      return null;
    }

    return new Promise<string | null>((resolve) => {
      const recorder = mediaRecorderRef.current!;

      recorder.onstop = async () => {
        console.log('[AutoRecording] Recording stopped, processing...');

        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const durationSeconds = state.recordingStartTime
          ? Math.round((Date.now() - state.recordingStartTime) / 1000)
          : 0;

        // Upload to storage
        const recordingId = await uploadRecording(blob, durationSeconds);

        // Cleanup
        recordedChunksRef.current = [];
        mediaRecorderRef.current = null;

        setState({
          isRecording: false,
          recordingStartTime: null,
          recordingId: null,
          hasConsent: false
        });

        resolve(recordingId);
      };

      recorder.stop();
      toast.info('Processing recording...');
    });
  }, [state.isRecording, state.recordingStartTime]);

  // Upload recording to storage and database
  const uploadRecording = async (blob: Blob, durationSeconds: number): Promise<string | null> => {
    try {
      const fileName = `${meetingId}-${Date.now()}.webm`;
      const filePath = `${meetingId}/${fileName}`;

      console.log('[AutoRecording] Uploading recording:', filePath, 'Size:', blob.size);

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('meeting-recordings')
        .upload(filePath, blob, {
          contentType: 'video/webm',
          upsert: false
        });

      if (uploadError) {
        console.error('[AutoRecording] Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('meeting-recordings')
        .getPublicUrl(filePath);

      // Build participants array
      const participantsList = [
        { id: participantId, name: participantName, role: 'host' }
      ];
      remoteStreams.forEach(({ name }, id) => {
        participantsList.push({ id, name, role: 'participant' });
      });

      // Save recording metadata to meeting_recordings_extended
      const { data: recordingData, error: insertError } = await supabase
        .from('meeting_recordings_extended')
        .insert({
          meeting_id: meetingId,
          host_id: participantId,
          candidate_id: meeting?.candidate_id || null,
          application_id: meeting?.application_id || null,
          job_id: meeting?.job_id || null,
          title: meeting?.title || 'Meeting Recording',
          recording_url: publicUrl,
          storage_path: filePath,
          file_size_bytes: blob.size,
          duration_seconds: durationSeconds,
          source_type: 'tqc_meeting',
          participants: participantsList,
          processing_status: 'pending',
          recording_consent_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[AutoRecording] Database insert error:', insertError);
        throw insertError;
      }

      const recordingId = recordingData?.id;
      console.log('[AutoRecording] ✅ Recording saved:', recordingId);

      toast.success('Recording saved successfully');

      // Trigger transcription and AI analysis
      if (recordingId) {
        triggerAnalysis(recordingId);
      }

      return recordingId;
    } catch (error) {
      console.error('[AutoRecording] Failed to upload recording:', error);
      toast.error('Failed to save recording');
      return null;
    }
  };

  // Trigger AI analysis pipeline
  const triggerAnalysis = async (recordingId: string) => {
    try {
      console.log('[AutoRecording] Triggering AI analysis for:', recordingId);

      // Update status to transcribing
      await supabase
        .from('meeting_recordings_extended')
        .update({ processing_status: 'transcribing' })
        .eq('id', recordingId);

      // Call the analysis edge function
      const { error } = await supabase.functions.invoke('analyze-meeting-recording-advanced', {
        body: { recordingId }
      });

      if (error) {
        console.error('[AutoRecording] Analysis trigger failed:', error);
        await supabase
          .from('meeting_recordings_extended')
          .update({
            processing_status: 'failed',
            processing_error: error.message
          })
          .eq('id', recordingId);
      } else {
        console.log('[AutoRecording] ✅ AI analysis triggered');
        toast.success('AI analysis started', {
          description: 'Transcript and insights will be ready soon'
        });
      }
    } catch (error) {
      console.error('[AutoRecording] Error triggering analysis:', error);
    }
  };

  // Auto-start recording when meeting starts (if enabled)
  useEffect(() => {
    if (!enabled || !localStream || autoStartAttemptedRef.current || state.isRecording) {
      return;
    }

    // Wait a moment for streams to stabilize
    const timer = setTimeout(() => {
      if (!autoStartAttemptedRef.current) {
        autoStartAttemptedRef.current = true;
        startRecording();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [enabled, localStream, state.isRecording, startRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && state.isRecording) {
        console.log('[AutoRecording] Cleanup: stopping recording');
        stopRecording();
      }
    };
  }, []);

  return {
    isRecording: state.isRecording,
    recordingStartTime: state.recordingStartTime,
    hasConsent: state.hasConsent,
    startRecording,
    stopRecording
  };
}

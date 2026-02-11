/**
 * Compositor Recording Hook
 * Uses canvas-based composition for multi-participant recording
 * Ensures all participants are properly captured in the recording
 */

import { useRef, useCallback, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { useRecordingCompositor, CompositorParticipant, CompositorConfig } from './useRecordingCompositor';
import type { ConsentOptions } from '@/components/meetings/RecordingConsentModal';

interface UseCompositorRecordingProps {
  meetingId: string;
  hostId: string;
  meeting: any;
  enabled?: boolean;
}

interface ParticipantConsent {
  participantId: string;
  participantName: string;
  consent: ConsentOptions;
  grantedAt: string;
}

interface RecordingMetadata {
  isRecording: boolean;
  recordingId: string | null;
  recordingStartTime: number | null;
  participantConsents: ParticipantConsent[];
  layout: 'grid' | 'spotlight';
}

export function useCompositorRecording({
  meetingId,
  hostId,
  meeting,
  enabled = true
}: UseCompositorRecordingProps) {
  const [metadata, setMetadata] = useState<RecordingMetadata>({
    isRecording: false,
    recordingId: null,
    recordingStartTime: null,
    participantConsents: [],
    layout: 'grid'
  });

  const [pendingConsent, setPendingConsent] = useState(false);

  // Initialize compositor with high-quality settings
  const compositorConfig: Partial<CompositorConfig> = {
    width: 1920,
    height: 1080,
    frameRate: 30,
    videoBitrate: 5000000,
    audioBitrate: 128000,
    layout: metadata.layout,
    backgroundColor: '#0a0a0a',
    showNames: true,
    showSpeakingIndicator: true
  };

  const {
    state: compositorState,
    initialize,
    addParticipant,
    removeParticipant,
    updateSpeakingState,
    startRecording: startCompositorRecording,
    stopRecording: stopCompositorRecording,
    setLayout
  } = useRecordingCompositor(compositorConfig);

  /**
   * Register a participant's consent
   */
  const registerConsent = useCallback((
    participantId: string,
    participantName: string,
    consent: ConsentOptions
  ) => {
    setMetadata(prev => ({
      ...prev,
      participantConsents: [
        ...prev.participantConsents.filter(c => c.participantId !== participantId),
        {
          participantId,
          participantName,
          consent,
          grantedAt: consent.consentTimestamp
        }
      ]
    }));

    logger.info('Participant consent registered', {
      componentName: 'CompositorRecording',
      participantId,
      consent: {
        video: consent.allowVideoRecording,
        audio: consent.allowAudioRecording,
        transcription: consent.allowTranscription,
        ai: consent.allowAIAnalysis
      }
    });
  }, []);

  /**
   * Add a participant to the recording
   */
  const addRecordingParticipant = useCallback((
    participant: CompositorParticipant,
    consent?: ConsentOptions
  ) => {
    // Only add if consent allows video recording
    const participantConsent = metadata.participantConsents.find(
      c => c.participantId === participant.id
    );

    if (consent?.allowVideoRecording || participantConsent?.consent.allowVideoRecording) {
      addParticipant(participant);
      logger.debug('Added participant to recording', {
        componentName: 'CompositorRecording',
        participantId: participant.id
      });
    }
  }, [addParticipant, metadata.participantConsents]);

  /**
   * Start the recording with all consented participants
   */
  const startRecording = useCallback(async (): Promise<boolean> => {
    if (!enabled) {
      logger.warn('Recording not enabled', { componentName: 'CompositorRecording' });
      return false;
    }

    try {
      // Initialize compositor if needed
      initialize();

      // Start compositor recording
      await startCompositorRecording();

      const startTime = Date.now();
      setMetadata(prev => ({
        ...prev,
        isRecording: true,
        recordingStartTime: startTime
      }));

      logger.info('Compositor recording started', {
        componentName: 'CompositorRecording',
        meetingId,
        participantCount: metadata.participantConsents.length
      });

      toast.success('Recording started', {
        description: 'All consented participants are being recorded'
      });

      return true;
    } catch (error) {
      logger.error('Failed to start compositor recording', {
        componentName: 'CompositorRecording',
        error
      });
      toast.error('Failed to start recording');
      return false;
    }
  }, [enabled, initialize, startCompositorRecording, meetingId, metadata.participantConsents.length]);

  /**
   * Stop recording and upload
   */
  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!metadata.isRecording) {
      return null;
    }

    try {
      toast.info('Stopping recording...');

      const blob = await stopCompositorRecording();
      const durationSeconds = metadata.recordingStartTime
        ? Math.round((Date.now() - metadata.recordingStartTime) / 1000)
        : 0;

      // Upload the recording
      const recordingId = await uploadRecording(blob, durationSeconds);

      setMetadata(prev => ({
        ...prev,
        isRecording: false,
        recordingId,
        recordingStartTime: null
      }));

      logger.info('Compositor recording stopped and uploaded', {
        componentName: 'CompositorRecording',
        recordingId,
        durationSeconds,
        fileSize: blob.size
      });

      return recordingId;
    } catch (error) {
      logger.error('Failed to stop compositor recording', {
        componentName: 'CompositorRecording',
        error
      });
      toast.error('Failed to stop recording');
      return null;
    }
  }, [metadata.isRecording, metadata.recordingStartTime, stopCompositorRecording]);

  /**
   * Upload recording to storage and database
   */
  const uploadRecording = async (blob: Blob, durationSeconds: number): Promise<string | null> => {
    try {
      const fileName = `${meetingId}-compositor-${Date.now()}.webm`;
      const filePath = `${meetingId}/${fileName}`;

      logger.info('Uploading compositor recording', {
        componentName: 'CompositorRecording',
        filePath,
        size: blob.size
      });

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('meeting-recordings')
        .upload(filePath, blob, {
          contentType: 'video/webm',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('meeting-recordings')
        .getPublicUrl(filePath);

      // Build consent participants array
      const consentedParticipants = metadata.participantConsents.map(c => ({
        id: c.participantId,
        name: c.participantName,
        consent: c.consent,
        grantedAt: c.grantedAt
      }));

      // Save recording metadata using type assertion for extended fields
      const { data: recordingData, error: insertError } = await supabase
        .from('meeting_recordings_extended')
        .insert({
          meeting_id: meetingId,
          host_id: hostId,
          candidate_id: meeting?.candidate_id || null,
          application_id: meeting?.application_id || null,
          job_id: meeting?.job_id || null,
          title: meeting?.title || 'Meeting Recording',
          recording_url: publicUrl,
          storage_path: filePath,
          file_size_bytes: blob.size,
          duration_seconds: durationSeconds,
          source_type: 'tqc_meeting_compositor',
          participants: consentedParticipants,
          consent_participants: consentedParticipants,
          processing_status: 'pending',
          recording_consent_at: new Date().toISOString()
        } as any)
        .select('id')
        .single();

      if (insertError) {
        throw insertError;
      }

      const recordingId = recordingData?.id;

      toast.success('Recording saved', {
        description: 'Processing will begin shortly'
      });

      // Trigger analysis
      if (recordingId) {
        triggerAnalysis(recordingId);
      }

      return recordingId;
    } catch (error) {
      logger.error('Failed to upload recording', {
        componentName: 'CompositorRecording',
        error
      });
      toast.error('Failed to save recording');
      return null;
    }
  };

  /**
   * Trigger transcription and AI analysis pipeline with retry logic
   */
  const triggerAnalysis = async (recordingId: string, attempt = 1) => {
    const maxAttempts = 3;
    const baseDelay = 2000;

    try {
      // Call transcribe-recording which handles the full pipeline
      const { error } = await supabase.functions.invoke('transcribe-recording', {
        body: { recordingId, chainAnalysis: true }
      });

      if (error) {
        throw error;
      }

      logger.info('Transcription pipeline triggered successfully', {
        componentName: 'CompositorRecording',
        recordingId,
        attempt
      });
    } catch (error: unknown) {
      logger.error(`Transcription trigger attempt ${attempt} failed`, {
        componentName: 'CompositorRecording',
        error,
        recordingId
      });

      if (attempt < maxAttempts) {
        const delay = baseDelay * attempt;
        logger.info(`Retrying transcription in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`, {
          componentName: 'CompositorRecording',
          recordingId
        });
        setTimeout(() => triggerAnalysis(recordingId, attempt + 1), delay);
      } else {
        // All retries exhausted
        toast.error('Recording saved but processing failed', {
          description: 'You can retry from History tab',
          duration: 5000
        });
        
        await supabase
          .from('meeting_recordings_extended')
          .update({
            processing_status: 'failed',
            processing_error: error instanceof Error ? error.message : 'Transcription trigger failed after 3 attempts'
          })
          .eq('id', recordingId);
      }
    }
  };

  /**
   * Change recording layout
   */
  const changeLayout = useCallback((newLayout: 'grid' | 'spotlight') => {
    setLayout(newLayout);
    setMetadata(prev => ({ ...prev, layout: newLayout }));
  }, [setLayout]);

  /**
   * Check if a participant has consented
   */
  const hasParticipantConsented = useCallback((participantId: string): boolean => {
    return metadata.participantConsents.some(c => c.participantId === participantId);
  }, [metadata.participantConsents]);

  /**
   * Get consent for a specific participant
   */
  const getParticipantConsent = useCallback((participantId: string): ConsentOptions | null => {
    const consent = metadata.participantConsents.find(c => c.participantId === participantId);
    return consent?.consent || null;
  }, [metadata.participantConsents]);

  return {
    // State
    isRecording: metadata.isRecording,
    recordingId: metadata.recordingId,
    recordingStartTime: metadata.recordingStartTime,
    participantConsents: metadata.participantConsents,
    layout: metadata.layout,
    compositorState,
    pendingConsent,

    // Actions
    registerConsent,
    addRecordingParticipant,
    removeRecordingParticipant: removeParticipant,
    updateSpeakingState,
    startRecording,
    stopRecording,
    changeLayout,
    setPendingConsent,

    // Queries
    hasParticipantConsented,
    getParticipantConsent
  };
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UseLiveHubAutoRecordingProps {
  channelId: string;
  channelName: string;
  localStream: MediaStream | null;
  remoteStreams: Map<string, { camera?: MediaStream; screen?: MediaStream }>;
  autoRecord?: boolean;
  enabled: boolean;
}

export function useLiveHubAutoRecording({
  channelId,
  channelName,
  localStream,
  remoteStreams,
  autoRecord = true,
  enabled
}: UseLiveHubAutoRecordingProps) {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const isStoppingRef = useRef(false);

  const startRecording = useCallback(() => {
    if (!localStream || isRecording || !enabled || !autoRecord) return;

    try {
      // Combine all available streams
      const tracks: MediaStreamTrack[] = [...localStream.getTracks()];
      
      remoteStreams.forEach(({ camera, screen }) => {
        if (camera) tracks.push(...camera.getTracks());
        if (screen) tracks.push(...screen.getTracks());
      });

      const combinedStream = new MediaStream(tracks);
      
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'audio/webm';

      const recorder = new MediaRecorder(combinedStream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.start(1000); // Chunk every second
      mediaRecorderRef.current = recorder;
      setRecordingStartTime(Date.now());
      setIsRecording(true);
      console.log('[LiveHub Recording] Started auto-recording for channel:', channelName);
    } catch (error) {
      console.error('[LiveHub Recording] Failed to start:', error);
    }
  }, [localStream, isRecording, enabled, autoRecord, remoteStreams, channelName]);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || !isRecording || isStoppingRef.current) return;

    isStoppingRef.current = true;
    
    return new Promise<void>((resolve) => {
      const recorder = mediaRecorderRef.current!;
      
      recorder.onstop = async () => {
        try {
          const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType });
          const duration = recordingStartTime ? Math.round((Date.now() - recordingStartTime) / 1000) : 0;
          
          // Only upload if we have meaningful content (> 5 seconds)
          if (duration > 5 && blob.size > 0) {
            await uploadRecording(blob, duration);
          }
          
          recordedChunksRef.current = [];
          setIsRecording(false);
          setRecordingStartTime(null);
          mediaRecorderRef.current = null;
          isStoppingRef.current = false;
          resolve();
        } catch (error) {
          console.error('[LiveHub Recording] Error in onstop:', error);
          isStoppingRef.current = false;
          resolve();
        }
      };

      recorder.stop();
    });
  }, [isRecording, recordingStartTime]);

  const uploadRecording = async (blob: Blob, duration: number) => {
    if (!user) return;

    try {
      const fileName = `${channelId}-${Date.now()}.webm`;
      const filePath = `livehub/${channelId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('meeting-recordings')
        .upload(filePath, blob, { contentType: blob.type, upsert: false });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('meeting-recordings')
        .getPublicUrl(filePath);

      // Get participants for context
      const { data: participants } = await supabase
        .from('live_channel_participants')
        .select('user_id, profiles(full_name)')
        .eq('channel_id', channelId);

      const participantNames = participants?.map((p: any) => 
        p.profiles?.full_name || 'Unknown'
      ) || [];

      // Create recording entry
      const { data: recordingData, error: insertError } = await supabase
        .from('meeting_recordings_extended' as any)
        .insert({
          live_channel_id: channelId,
          host_id: user.id,
          recording_url: publicUrl,
          storage_path: filePath,
          file_size_bytes: blob.size,
          duration_seconds: duration,
          source_type: 'live_hub',
          participants: participantNames,
          processing_status: 'pending',
          analysis_status: 'pending',
          title: channelName,
          recording_consent_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success('Live Hub recording saved');

      // Trigger transcription and AI analysis
      const recordingId = (recordingData as any).id;
      supabase.functions.invoke('analyze-meeting-recording-advanced', {
        body: { recordingId, isLiveHub: true }
      }).catch(err => {
        console.error('[LiveHub Recording] Analysis trigger failed:', err);
      });

      console.log('[LiveHub Recording] Uploaded successfully:', recordingId);
    } catch (error) {
      console.error('[LiveHub Recording] Upload failed:', error);
      toast.error('Failed to save recording');
    }
  };

  // Auto-start when enabled and stream available
  useEffect(() => {
    if (enabled && localStream && autoRecord && !isRecording) {
      // Small delay to ensure connection is stable
      const timer = setTimeout(() => {
        startRecording();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [enabled, localStream, autoRecord, isRecording, startRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        stopRecording();
      }
    };
  }, [isRecording, stopRecording]);

  return {
    isRecording,
    recordingDuration: recordingStartTime ? Math.round((Date.now() - recordingStartTime) / 1000) : 0,
    startRecording,
    stopRecording
  };
}

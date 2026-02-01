/**
 * Hook for native browser-based external meeting capture
 * Uses getDisplayMedia for screen+audio capture and MediaRecorder for recording
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CaptureState {
  isCapturing: boolean;
  isUploading: boolean;
  isProcessing: boolean;
  duration: number;
  hasAudio: boolean;
  error: string | null;
  sessionId: string | null;
  stream: MediaStream | null;
}

interface UseExternalMeetingCaptureOptions {
  onCaptureComplete?: (sessionId: string) => void;
  onError?: (error: Error) => void;
}

export function useExternalMeetingCapture(options?: UseExternalMeetingCaptureOptions) {
  const [state, setState] = useState<CaptureState>({
    isCapturing: false,
    isUploading: false,
    isProcessing: false,
    duration: 0,
    hasAudio: false,
    error: null,
    sessionId: null,
    stream: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Check browser compatibility
  const checkBrowserSupport = useCallback(() => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      return { supported: false, reason: 'Screen capture not supported in this browser' };
    }
    
    // Check for system audio support (Chrome 94+, Edge)
    const isChromium = /Chrome|Chromium|Edge/.test(navigator.userAgent);
    const chromeVersion = navigator.userAgent.match(/Chrome\/(\d+)/)?.[1];
    const supportsSystemAudio = isChromium && chromeVersion && parseInt(chromeVersion) >= 94;
    
    return { 
      supported: true, 
      supportsSystemAudio,
      reason: supportsSystemAudio ? null : 'System audio capture requires Chrome 94+ or Edge'
    };
  }, []);

  // Request screen capture with audio
  const requestScreenCapture = useCallback(async () => {
    const compatibility = checkBrowserSupport();
    
    if (!compatibility.supported) {
      throw new Error(compatibility.reason || 'Screen capture not supported');
    }

    try {
      // Request display media with audio
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'window',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      } as DisplayMediaStreamOptions);

      const hasAudio = stream.getAudioTracks().length > 0;
      
      if (!hasAudio) {
        toast.warning(
          'No audio captured. Make sure to check "Share audio" in the picker for transcription.',
          { duration: 6000 }
        );
      }

      setState(prev => ({ 
        ...prev, 
        stream, 
        hasAudio,
        error: null 
      }));

      // Handle track ended (user stopped sharing)
      stream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };

      return stream;
    } catch (error) {
      if ((error as Error).name === 'NotAllowedError') {
        throw new Error('Screen capture was denied. Please allow access to capture your meeting.');
      }
      throw error;
    }
  }, [checkBrowserSupport]);

  // Start recording the captured stream
  const startRecording = useCallback(async (
    stream: MediaStream,
    sessionId: string,
    platform: string,
    meetingTitle: string
  ) => {
    // Determine best codec
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
      ? 'video/webm;codecs=vp8,opus'
      : 'video/webm';

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 2500000, // 2.5 Mbps
    });

    chunksRef.current = [];
    mediaRecorderRef.current = mediaRecorder;
    startTimeRef.current = Date.now();

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      await uploadAndProcess(blob, sessionId, platform, meetingTitle);
    };

    mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event);
      setState(prev => ({ 
        ...prev, 
        error: 'Recording error occurred',
        isCapturing: false 
      }));
      options?.onError?.(new Error('Recording error'));
    };

    // Start recording with 1-second chunks for better recovery
    mediaRecorder.start(1000);

    // Update duration every second
    durationIntervalRef.current = setInterval(() => {
      setState(prev => ({
        ...prev,
        duration: Math.floor((Date.now() - startTimeRef.current) / 1000)
      }));
    }, 1000);

    setState(prev => ({
      ...prev,
      isCapturing: true,
      sessionId,
      error: null
    }));

    // Update session status to capturing
    await supabase
      .from('external_meeting_sessions' as any)
      .update({ status: 'capturing' })
      .eq('id', sessionId);

    toast.success('Recording started! Capture your meeting and click Stop when done.');
  }, [options]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (state.stream) {
      state.stream.getTracks().forEach(track => track.stop());
    }

    setState(prev => ({
      ...prev,
      isCapturing: false,
      stream: null
    }));
  }, [state.stream]);

  // Upload recording and trigger processing
  const uploadAndProcess = useCallback(async (
    blob: Blob,
    sessionId: string,
    platform: string,
    meetingTitle: string
  ) => {
    setState(prev => ({ ...prev, isUploading: true }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update session status
      await supabase
        .from('external_meeting_sessions' as any)
        .update({ status: 'uploading' })
        .eq('id', sessionId);

      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `external-capture/${user.id}/${sessionId}/${timestamp}.webm`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('meeting-recordings')
        .upload(filename, blob, {
          contentType: 'video/webm',
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;

      // Get signed URL for the uploaded file
      const { data: signedUrlData } = await supabase.storage
        .from('meeting-recordings')
        .createSignedUrl(filename, 3600 * 24); // 24 hour expiry

      const recordingUrl = signedUrlData?.signedUrl;

      // Update session with recording info
      await supabase
        .from('external_meeting_sessions' as any)
        .update({
          status: 'processing',
          recording_url: recordingUrl,
          recording_path: filename,
          duration_seconds: state.duration,
          metadata: {
            platform,
            title: meetingTitle,
            captured_at: new Date().toISOString(),
            has_audio: state.hasAudio,
            file_size_bytes: blob.size
          }
        })
        .eq('id', sessionId);

      setState(prev => ({ ...prev, isUploading: false, isProcessing: true }));

      // Trigger processing edge function
      const { error: processError } = await supabase.functions.invoke('process-external-capture', {
        body: {
          sessionId,
          recordingPath: filename,
          platform,
          meetingTitle,
          hasAudio: state.hasAudio
        }
      });

      if (processError) {
        console.error('Processing error:', processError);
        toast.warning('Recording saved. Processing will continue in background.');
      } else {
        toast.success('Recording uploaded! Processing transcript and analysis...');
      }

      options?.onCaptureComplete?.(sessionId);

    } catch (error) {
      console.error('Upload error:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to upload recording',
        isUploading: false 
      }));
      
      // Update session status to failed
      await supabase
        .from('external_meeting_sessions' as any)
        .update({ status: 'failed', notes: (error as Error).message })
        .eq('id', sessionId);

      toast.error('Failed to upload recording');
      options?.onError?.(error as Error);
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [state.duration, state.hasAudio, options]);

  // Cancel capture
  const cancelCapture = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    if (state.stream) {
      state.stream.getTracks().forEach(track => track.stop());
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    chunksRef.current = [];

    setState({
      isCapturing: false,
      isUploading: false,
      isProcessing: false,
      duration: 0,
      hasAudio: false,
      error: null,
      sessionId: null,
      stream: null,
    });
  }, [state.stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [state.stream]);

  return {
    state,
    checkBrowserSupport,
    requestScreenCapture,
    startRecording,
    stopRecording,
    cancelCapture,
  };
}

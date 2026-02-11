import { useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

export type RecordingQuality = '1080p' | '720p' | '480p' | '360p';
export type RecordingFormat = 'webm' | 'mp4';

interface RecordingOptions {
    quality: RecordingQuality;
    format: RecordingFormat;
    audioBitrate?: number; // kbps
    videoBitrate?: number; // kbps
}

interface UseRecordingWithEffectsProps {
    videoStream: MediaStream | null; // Can be processed stream with effects
    audioStream?: MediaStream | null; // Optional separate audio
    enabled: boolean;
}

const QUALITY_PRESETS: Record<RecordingQuality, { width: number; height: number; videoBitrate: number }> = {
    '1080p': { width: 1920, height: 1080, videoBitrate: 5000 },
    '720p': { width: 1280, height: 720, videoBitrate: 2500 },
    '480p': { width: 854, height: 480, videoBitrate: 1000 },
    '360p': { width: 640, height: 360, videoBitrate: 600 }
};

export function useRecordingWithEffects({
    videoStream,
    audioStream,
    enabled
}: UseRecordingWithEffectsProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);

    /**
     * Start recording
     */
    const startRecording = useCallback(async (options: RecordingOptions = {
        quality: '720p',
        format: 'webm',
        audioBitrate: 128,
    }) => {
        if (!enabled || !videoStream) {
            toast.error('No video stream available');
            return;
        }

        try {
            // Combine video and audio streams
            const tracks: MediaStreamTrack[] = [];

            // Add video tracks from processed stream
            videoStream.getVideoTracks().forEach(track => tracks.push(track));

            // Add audio tracks (prefer separate audio stream if provided)
            if (audioStream) {
                audioStream.getAudioTracks().forEach(track => tracks.push(track));
            } else {
                videoStream.getAudioTracks().forEach(track => tracks.push(track));
            }

            const combinedStream = new MediaStream(tracks);

            // Configure MediaRecorder
            const mimeType = options.format === 'webm'
                ? 'video/webm;codecs=vp9,opus'
                : 'video/mp4';

            const mediaRecorder = new MediaRecorder(combinedStream, {
                mimeType: MediaRecorder.isTypeSupported(mimeType)
                    ? mimeType
                    : 'video/webm', // Fallback
                videoBitsPerSecond: options.videoBitrate || QUALITY_PRESETS[options.quality].videoBitrate * 1000,
                audioBitsPerSecond: options.audioBitrate ? options.audioBitrate * 1000 : 128000
            });

            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, {
                    type: options.format === 'webm' ? 'video/webm' : 'video/mp4'
                });
                setRecordedBlob(blob);
                setIsRecording(false);
                setIsPaused(false);

                if (durationIntervalRef.current) {
                    clearInterval(durationIntervalRef.current);
                    durationIntervalRef.current = null;
                }

                toast.success('Recording saved');
            };

            mediaRecorder.onerror = (error) => {
                console.error('MediaRecorder error:', error);
                toast.error('Recording error occurred');
                stopRecording();
            };

            // Start recording
            mediaRecorder.start(1000); // Collect data every second
            mediaRecorderRef.current = mediaRecorder;
            setIsRecording(true);
            setRecordingDuration(0);
            startTimeRef.current = Date.now();

            // Track duration
            durationIntervalRef.current = setInterval(() => {
                setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }, 1000);

            toast.success('Recording started');
        } catch (error: unknown) {
            console.error('Error starting recording:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to start recording');
        }
    }, [enabled, videoStream, audioStream]);

    /**
     * Stop recording
     */
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();

            // Stop all tracks to release resources
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    }, [isRecording]);

    /**
     * Pause recording
     */
    const pauseRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording && !isPaused) {
            mediaRecorderRef.current.pause();
            setIsPaused(true);

            if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
            }

            toast.info('Recording paused');
        }
    }, [isRecording, isPaused]);

    /**
     * Resume recording
     */
    const resumeRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording && isPaused) {
            mediaRecorderRef.current.resume();
            setIsPaused(false);

            // Resume duration tracking
            const pausedDuration = recordingDuration;
            startTimeRef.current = Date.now() - (pausedDuration * 1000);

            durationIntervalRef.current = setInterval(() => {
                setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }, 1000);

            toast.info('Recording resumed');
        }
    }, [isRecording, isPaused, recordingDuration]);

    /**
     * Download recorded video
     */
    const downloadRecording = useCallback((filename?: string) => {
        if (!recordedBlob) {
            toast.error('No recording available');
            return;
        }

        const url = URL.createObjectURL(recordedBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || `recording-${new Date().toISOString()}.webm`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success('Recording downloaded');
    }, [recordedBlob]);

    /**
     * Clear recorded blob
     */
    const clearRecording = useCallback(() => {
        setRecordedBlob(null);
        chunksRef.current = [];
        setRecordingDuration(0);
    }, []);

    /**
     * Get recording preview URL
     */
    const getPreviewUrl = useCallback(() => {
        if (!recordedBlob) return null;
        return URL.createObjectURL(recordedBlob);
    }, [recordedBlob]);

    return {
        isRecording,
        isPaused,
        recordingDuration,
        recordedBlob,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        downloadRecording,
        clearRecording,
        getPreviewUrl
    };
}

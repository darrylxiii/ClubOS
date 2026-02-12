import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface VoiceMemoState {
  isRecording: boolean;
  duration: number;
  isUploading: boolean;
}

export function useVoiceMemo() {
  const { user } = useAuth();
  const [state, setState] = useState<VoiceMemoState>({
    isRecording: false,
    duration: 0,
    isUploading: false,
  });
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start(250); // collect chunks every 250ms
      startTimeRef.current = Date.now();
      setState({ isRecording: true, duration: 0, isUploading: false });

      timerRef.current = setInterval(() => {
        setState((prev) => ({
          ...prev,
          duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
        }));
      }, 1000);
    } catch (err) {
      toast.error("Microphone access denied");
      console.error("getUserMedia error:", err);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        // Stop all tracks
        recorder.stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const durationSecs = Math.floor((Date.now() - startTimeRef.current) / 1000);

        setState((prev) => ({ ...prev, isRecording: false, isUploading: true }));

        if (!user?.id) {
          toast.error("Not authenticated");
          setState((prev) => ({ ...prev, isUploading: false }));
          resolve();
          return;
        }

        try {
          const fileName = `${user.id}/${Date.now()}.webm`;
          const { error: uploadError } = await supabase.storage
            .from("voice-memos")
            .upload(fileName, blob, { contentType: "audio/webm" });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from("voice-memos")
            .getPublicUrl(fileName);

          // Use signed URL since bucket is private
          const { data: signedData } = await supabase.storage
            .from("voice-memos")
            .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 day expiry

          const audioUrl = signedData?.signedUrl || urlData.publicUrl;

          const { error: insertError } = await supabase.from("voice_memos").insert({
            user_id: user.id,
            audio_url: fileName, // Store the path, not the signed URL
            duration_seconds: durationSecs,
            status: "recorded",
          });

          if (insertError) throw insertError;

          toast.success(`Voice memo saved (${durationSecs}s)`);
        } catch (err) {
          console.error("Voice memo save error:", err);
          toast.error("Failed to save voice memo");
        } finally {
          setState((prev) => ({ ...prev, isUploading: false, duration: 0 }));
        }
        resolve();
      };
      recorder.stop();
    });
  }, [user?.id]);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stream.getTracks().forEach((t) => t.stop());
      recorder.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    chunksRef.current = [];
    setState({ isRecording: false, duration: 0, isUploading: false });
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}

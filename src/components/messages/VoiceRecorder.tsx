import { Button } from "@/components/ui/button";
import { Mic, Square, Send, Trash2, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface VoiceRecorderProps {
  onSend: (audioUrl: string, duration: number) => void;
}

export const VoiceRecorder = ({ onSend }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType: 'audio/webm;codecs=opus' 
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleSend = async () => {
    stopRecording();
    setUploading(true);

    try {
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const fileName = `voice_${Date.now()}.webm`;
      const filePath = `voices/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(filePath, audioBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(filePath);

      onSend(publicUrl, duration);
      setDuration(0);
      chunksRef.current = [];
      toast.success("Voice note sent");
    } catch (error) {
      console.error("Error uploading voice note:", error);
      toast.error("Failed to send voice note");
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    stopRecording();
    setDuration(0);
    chunksRef.current = [];
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 glass-strong rounded-lg border border-border/50 animate-fade-in">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping" />
          </div>
          <span className="text-sm font-mono text-primary">{formatDuration(duration)}</span>
          <div className="flex-1 h-8 flex items-center gap-0.5">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1 bg-primary/50 rounded-full transition-all",
                  isRecording && Math.random() > 0.5 ? "h-6" : "h-2"
                )}
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          className="hover:bg-destructive/20 hover:text-destructive"
        >
          <Trash2 className="h-5 w-5" />
        </Button>
        <Button
          onClick={handleSend}
          disabled={uploading}
          size="icon"
          className="bg-gradient-accent shadow-glass-md"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={startRecording}
      className="flex-shrink-0 hover:bg-accent/50"
      title="Record voice note"
    >
      <Mic className="h-5 w-5" />
    </Button>
  );
};

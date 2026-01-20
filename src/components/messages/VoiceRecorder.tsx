import { Button } from "@/components/ui/button";
import { Mic, Square, Send, Trash2, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface VoiceRecorderProps {
  onSend: (audioUrl: string, duration: number, transcript?: string) => void;
}

export const VoiceRecorder = ({ onSend }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
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
      // Request microphone permission with better error handling
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
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
      
      toast.success("Recording started");
    } catch (error: any) {
      console.error("Error accessing microphone:", error);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error("Microphone access denied. Please allow microphone permissions in your browser settings.");
      } else if (error.name === 'NotFoundError') {
        toast.error("No microphone found on your device.");
      } else {
        toast.error("Could not access microphone. Please check your device settings.");
      }
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
      
      // Transcribe audio
      setTranscribing(true);
      let transcript = '';
      try {
        const reader = new FileReader();
        const base64Audio = await new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.readAsDataURL(audioBlob);
        });

        const { data: transcriptionData, error: transcriptionError } = await supabase.functions.invoke(
          'voice-to-text',
          { body: { audio: base64Audio } }
        );

        if (transcriptionError) throw transcriptionError;
        transcript = transcriptionData?.text || '';
        
        if (transcript) {
          toast.success("Audio transcribed successfully");
        }
      } catch (transcriptionError) {
        console.error("Transcription error:", transcriptionError);
        toast.error("Could not transcribe audio, sending without transcript");
      } finally {
        setTranscribing(false);
      }

      // Upload audio file
      const fileName = `voice_${Date.now()}.webm`;
      const filePath = `voices/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(filePath, audioBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(filePath);

      onSend(publicUrl, duration, transcript);
      setDuration(0);
      chunksRef.current = [];
      toast.success("Voice note sent");
    } catch (error) {
      console.error("Error uploading voice note:", error);
      toast.error("Failed to send voice note");
    } finally {
      setUploading(false);
      setTranscribing(false);
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

  if (isRecording || uploading || transcribing) {
    return (
      <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
        <div className="flex flex-col gap-2 px-4 py-3 glass-strong rounded-xl border border-border/50 animate-fade-in shadow-lg">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping" />
              </div>
              <span className="text-sm font-mono text-primary">{formatDuration(duration)}</span>
              <div className="flex-1 h-8 flex items-center gap-0.5">
                {Array.from({ length: 15 }).map((_, i) => (
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
            {isRecording && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCancel}
                  className="hover:bg-destructive/20 hover:text-destructive h-9 w-9"
                  title="Cancel recording"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={uploading || transcribing}
                  size="icon"
                  className="bg-gradient-accent shadow-glass-md h-9 w-9"
                  title="Stop and send"
                >
                  <Square className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          {transcribing && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Transcribing audio...</span>
            </div>
          )}
          {uploading && !transcribing && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Uploading voice note...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={startRecording}
      className="flex-shrink-0 hover:bg-accent/50 h-9 w-9 p-0 rounded-lg"
      title="Record voice note"
    >
      <Mic className="h-4 w-4" />
    </Button>
  );
};

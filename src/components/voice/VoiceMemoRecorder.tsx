import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceMemo } from "@/hooks/useVoiceMemo";
import { cn } from "@/lib/utils";

interface VoiceMemoRecorderProps {
  open: boolean;
  onClose: () => void;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const VoiceMemoRecorder = ({ open, onClose }: VoiceMemoRecorderProps) => {
  const { isRecording, duration, isUploading, startRecording, stopRecording, cancelRecording } =
    useVoiceMemo();

  // Auto-start recording when opened
  useEffect(() => {
    if (open && !isRecording && !isUploading) {
      startRecording();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStop = async () => {
    await stopRecording();
    onClose();
  };

  const handleCancel = () => {
    cancelRecording();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={cn(
            "fixed bottom-20 right-4 z-[9990]",
            "bg-card/90 backdrop-blur-xl border border-border/20 rounded-2xl",
            "shadow-[var(--shadow-glass-xl)] p-4",
            "flex items-center gap-3 min-w-[220px]"
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Saving...</span>
            </>
          ) : (
            <>
              {/* Pulse indicator */}
              <div className="relative flex items-center justify-center">
                <motion.div
                  className="absolute h-8 w-8 rounded-full bg-destructive/20"
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <Mic className="h-4 w-4 text-destructive relative z-10" />
              </div>

              {/* Timer */}
              <span className="text-sm font-mono text-foreground tabular-nums min-w-[40px]">
                {formatDuration(duration)}
              </span>

              <div className="flex items-center gap-1 ml-auto">
                {/* Stop & Save */}
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleStop}
                  className="h-8 px-3 rounded-lg"
                >
                  <Square className="h-3 w-3 mr-1" />
                  Save
                </Button>

                {/* Cancel */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCancel}
                  className="h-8 w-8"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

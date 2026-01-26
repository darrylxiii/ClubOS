import { useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StreamingCaptionsProps {
  enabled: boolean;
  isConnected: boolean;
  partialTranscript: string;
  committedTranscripts: Array<{ id: string; text: string }>;
  participantName: string;
  source?: string; // NEW: Shows which transcription source is active
}

export function StreamingCaptions({
  enabled,
  isConnected,
  partialTranscript,
  committedTranscripts,
  participantName,
  source
}: StreamingCaptionsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest caption
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [partialTranscript, committedTranscripts]);

  if (!enabled) return null;

  // Get last 3 committed transcripts
  const recentCommitted = committedTranscripts.slice(-3);

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[10001] max-w-3xl w-full px-4">
      <Card className="backdrop-blur-2xl bg-background/90 border-border/50 p-4 space-y-2 shadow-2xl">
        <div className="flex items-center justify-between mb-2">
          <Badge 
            variant={isConnected ? "default" : "secondary"} 
            className="gap-2"
          >
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <Mic className="h-3 w-3" />
                Live Transcription
              </>
            ) : (
              <>
                <MicOff className="h-3 w-3" />
                Connecting...
              </>
            )}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {source || 'Powered by ElevenLabs Scribe'}
          </span>
        </div>
        
        <div ref={scrollRef} className="max-h-32 overflow-y-auto space-y-2">
          <AnimatePresence mode="popLayout">
            {/* Committed transcripts */}
            {recentCommitted.map(transcript => (
              <motion.div
                key={transcript.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-1"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold">{participantName}</span>
                  <span>{new Date().toLocaleTimeString()}</span>
                </div>
                <p className="text-foreground">{transcript.text}</p>
              </motion.div>
            ))}

            {/* Partial/interim transcript */}
            {partialTranscript && (
              <motion.div
                key="partial"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-1"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold">{participantName}</span>
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    typing...
                  </Badge>
                </div>
                <p className="text-muted-foreground italic">{partialTranscript}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {!partialTranscript && recentCommitted.length === 0 && isConnected && (
            <p className="text-center text-muted-foreground text-sm py-2">
              Start speaking to see live transcription...
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

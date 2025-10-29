import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Video, PhoneOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface IncomingCallBannerProps {
  callerName: string;
  callerAvatar?: string;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onDecline: () => void;
  createdAt: string;
}

export function IncomingCallBanner({
  callerName,
  callerAvatar,
  callType,
  onAccept,
  onDecline,
  createdAt
}: IncomingCallBannerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(30);

  // Play pleasant ring tone
  useEffect(() => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    let isPlaying = true;
    let ringCount = 0;
    const maxRings = 4;

    const playRing = () => {
      if (!isPlaying || ringCount >= maxRings) return;

      // Create a pleasant two-tone chime (C5 -> E5)
      const playNote = (frequency: number, startTime: number, duration: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        // Smooth envelope
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.08, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      const now = audioContext.currentTime;
      
      // Two-tone chime: C5 (523.25 Hz) -> E5 (659.25 Hz)
      playNote(523.25, now, 0.3);
      playNote(659.25, now + 0.32, 0.4);

      ringCount++;

      setTimeout(() => {
        if (isPlaying && ringCount < maxRings) playRing();
      }, 2500); // Pause between rings
    };

    playRing();

    return () => {
      isPlaying = false;
      audioContext.close();
    };
  }, []);

  // Update time remaining
  useEffect(() => {
    const created = new Date(createdAt).getTime();
    
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - created) / 1000);
      const remaining = Math.max(0, 30 - elapsed);
      setTimeRemaining(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [createdAt]);

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none"
      >
        <div className="pointer-events-auto bg-gradient-to-r from-background via-background/98 to-background border-b border-primary/30 shadow-2xl animate-pulse-border">
          <div className="container max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              {/* Caller info */}
              <div className="flex items-center gap-4 flex-1">
                <div className="relative">
                  <Avatar className="h-14 w-14 border-2 border-primary/30 ring-2 ring-primary/10 ring-offset-2 ring-offset-background">
                    <AvatarImage src={callerAvatar} alt={callerName} />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                      {callerName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-background animate-pulse" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {callType === 'video' ? (
                      <Video className="h-4 w-4 text-primary" />
                    ) : (
                      <Phone className="h-4 w-4 text-primary" />
                    )}
                    <h3 className="text-lg font-semibold text-foreground truncate">
                      {callerName}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Incoming {callType} call • {timeRemaining}s
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={onDecline}
                  variant="outline"
                  size="lg"
                  className="h-12 px-6 border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50"
                >
                  <PhoneOff className="h-5 w-5 mr-2" />
                  Decline
                </Button>

                <Button
                  onClick={onAccept}
                  size="lg"
                  className="h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 animate-pulse-glow"
                >
                  <Phone className="h-5 w-5 mr-2" />
                  Accept
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

import { createPortal } from 'react-dom';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface IncomingCallCardProps {
  callerName: string;
  callerAvatar?: string;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onDecline: () => void;
  createdAt: string;
}

/**
 * Premium FaceTime-style incoming call card with full-screen overlay
 * and smooth animations.
 */
export function IncomingCallCard({
  callerName,
  callerAvatar,
  callType,
  onAccept,
  onDecline,
  createdAt
}: IncomingCallCardProps) {
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [isConnecting, setIsConnecting] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef(true);

  // Play pleasant ringtone
  useEffect(() => {
    let audioContext: AudioContext | null = null;
    let isPlaying = true;
    isPlayingRef.current = true;

    const initAudio = async () => {
      try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;

        const playChime = () => {
          if (!audioContext || !isPlaying) return;

          const now = audioContext.currentTime;
          const startTime = now + 0.05;

          // First tone (C5 - 523.25 Hz)
          const oscillator1 = audioContext.createOscillator();
          const gainNode1 = audioContext.createGain();
          
          oscillator1.connect(gainNode1);
          gainNode1.connect(audioContext.destination);
          
          oscillator1.type = 'sine';
          oscillator1.frequency.setValueAtTime(523.25, startTime);
          
          gainNode1.gain.setValueAtTime(0, startTime);
          gainNode1.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
          gainNode1.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
          
          oscillator1.start(startTime);
          oscillator1.stop(startTime + 0.3);

          // Second tone (E5 - 659.25 Hz)
          const oscillator2 = audioContext.createOscillator();
          const gainNode2 = audioContext.createGain();
          
          oscillator2.connect(gainNode2);
          gainNode2.connect(audioContext.destination);
          
          oscillator2.type = 'sine';
          oscillator2.frequency.setValueAtTime(659.25, startTime + 0.15);
          
          gainNode2.gain.setValueAtTime(0, startTime + 0.15);
          gainNode2.gain.linearRampToValueAtTime(0.12, startTime + 0.17);
          gainNode2.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
          
          oscillator2.start(startTime + 0.15);
          oscillator2.stop(startTime + 0.4);
        };

        // Play the chime repeatedly with pauses
        const playSequence = async () => {
          while (isPlaying) {
            playChime();
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        };

        playSequence();
      } catch (_error) {
        console.error('Error initializing audio:', _error);
      }
    };

    initAudio();

    return () => {
      isPlaying = false;
      isPlayingRef.current = false;
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, []);

  // Stop audio immediately when user interacts
  const stopAudio = () => {
    isPlayingRef.current = false;
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const handleAccept = () => {
    stopAudio();
    setIsConnecting(true);
    setTimeout(() => {
      onAccept();
    }, 500);
  };

  const handleDecline = () => {
    stopAudio();
    onDecline();
  };

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
    <AnimatePresence mode="wait">
      {/* Full-screen dark overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-md"
        onClick={handleDecline}
      />

      {/* Connecting state */}
      {isConnecting && (
        <motion.div
          key="connecting"
          initial={{ scale: 1, opacity: 1 }}
          animate={{ scale: 1.05, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
        >
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-3xl p-8 shadow-2xl">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75" />
                <Phone className="h-12 w-12 text-white relative" />
              </div>
              <p className="text-white text-xl font-semibold">Connecting...</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main call card */}
      {!isConnecting && (
        <motion.div
          key="card"
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 50 }}
          transition={{ 
            type: "spring", 
            damping: 25, 
            stiffness: 300,
            duration: 0.4 
          }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative w-full max-w-sm">
            {/* Card container with glassmorphism */}
            <div className="bg-card/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-border/30 overflow-hidden">
              {/* Gradient header */}
              <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8 pb-6">
                {/* Caller Avatar with pulsing ring */}
                <div className="flex flex-col items-center">
                  <div className="relative mb-4">
                    {/* Pulsing rings */}
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 rounded-full bg-primary/30"
                      style={{ transform: 'scale(1.5)' }}
                    />
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.1, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                      className="absolute inset-0 rounded-full bg-primary/20"
                      style={{ transform: 'scale(1.8)' }}
                    />
                    <Avatar className="h-28 w-28 border-4 border-background/50 shadow-xl relative z-10">
                      <AvatarImage src={callerAvatar} alt={callerName} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-semibold">
                        {callerName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Call type indicator */}
                  <div className="flex items-center gap-2 mb-2">
                    {callType === 'video' ? (
                      <Video className="h-5 w-5 text-primary" />
                    ) : (
                      <Phone className="h-5 w-5 text-primary" />
                    )}
                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Incoming {callType} call
                    </span>
                  </div>

                  {/* Caller name */}
                  <h2 className="text-2xl font-bold text-foreground text-center">
                    {callerName}
                  </h2>

                  {/* Time remaining */}
                  <p className="text-sm text-muted-foreground mt-2">
                    {timeRemaining > 0 ? `${timeRemaining}s remaining` : 'Call expired'}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="p-6 pt-4">
                <div className="flex items-center justify-center gap-6">
                  {/* Decline button */}
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      size="lg"
                      onClick={handleDecline}
                      className="h-16 w-16 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <PhoneOff className="h-7 w-7" />
                    </Button>
                  </motion.div>

                  {/* Accept button */}
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      size="lg"
                      onClick={handleAccept}
                      className="h-20 w-20 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      {callType === 'video' ? (
                        <Video className="h-8 w-8" />
                      ) : (
                        <Phone className="h-8 w-8" />
                      )}
                    </Button>
                  </motion.div>
                </div>

                {/* Button labels */}
                <div className="flex items-center justify-center gap-6 mt-3">
                  <span className="text-sm text-muted-foreground w-16 text-center">Decline</span>
                  <span className="text-sm text-muted-foreground w-20 text-center">Accept</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

import { createPortal } from 'react-dom';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [isConnecting, setIsConnecting] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef(true);

  // Play pleasant two-tone chime
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

        // Play the chime 4 times with pauses
        const playSequence = async () => {
          for (let i = 0; i < 4 && isPlaying; i++) {
            playChime();
            await new Promise(resolve => setTimeout(resolve, 1800));
          }
        };

        playSequence();
      } catch (error) {
        console.error('Error initializing audio:', error);
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
      {isConnecting && (
        <motion.div
          key="connecting"
          initial={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-green-500/95 to-green-600/95 backdrop-blur-lg shadow-2xl border-b border-green-400/20"
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-center gap-3">
              <Phone className="h-5 w-5 text-white animate-pulse" />
              <p className="text-white font-medium">Connecting to call...</p>
            </div>
          </div>
        </motion.div>
      )}

      {!isConnecting && (
        <motion.div
          key="banner"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300, duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-primary/95 to-primary-dark/95 backdrop-blur-lg shadow-2xl border-b border-primary/20"
        >
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              {/* Caller Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-12 w-12 border-2 border-white/20 ring-2 ring-white/10">
                  <AvatarImage src={callerAvatar} alt={callerName} />
                  <AvatarFallback className="bg-primary-light text-white">
                    {callerName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {callType === 'video' ? (
                      <Video className="h-4 w-4 text-white/90" />
                    ) : (
                      <Phone className="h-4 w-4 text-white/90" />
                    )}
                    <p className="text-sm font-medium text-white/90">
                      Incoming {callType} call
                    </p>
                  </div>
                  <p className="text-lg font-semibold text-white truncate">
                    {callerName}
                  </p>
                  <p className="text-xs text-white/70">
                    {timeRemaining}s remaining
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  size="lg"
                  onClick={handleAccept}
                  className="bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 gap-2"
                >
                  {callType === 'video' ? <Video className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                  Accept
                </Button>
                
                <Button
                  size="lg"
                  onClick={handleDecline}
                  variant="outline"
                  className="bg-red-500 hover:bg-red-600 text-white border-red-600 shadow-lg hover:shadow-xl transition-all duration-200 gap-2"
                >
                  <PhoneOff className="h-5 w-5" />
                  Decline
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useClubAIVoice } from '@/hooks/useClubAIVoice';
import { ClubAIVoiceDialog } from './ClubAIVoiceDialog';
import { ClubAIWaveform } from './ClubAIWaveform';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const ClubAIVoice = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const {
    status,
    isSpeaking,
    isListening,
    transcript,
    inputVolume,
    outputVolume,
    startSession,
    endSession,
    error,
  } = useClubAIVoice();

  // Keyboard shortcut: Cmd+Shift+V
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handleToggle();
      }
    };

    const handleCustomEvent = (e: Event) => {
      handleToggle();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-voice-assistant', handleCustomEvent);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-voice-assistant', handleCustomEvent);
    };
  }, [status]);

  const handleToggle = useCallback(async () => {
    if (status === 'connected') {
      setIsDialogOpen(true);
    } else if (status === 'idle' || status === 'error') {
      await startSession();
      setIsDialogOpen(true);
    }
  }, [status, startSession]);

  const handleEndSession = useCallback(async () => {
    await endSession();
    setIsDialogOpen(false);
  }, [endSession]);

  const handleClose = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  // Determine button state
  const isActive = status === 'connected';
  const isConnecting = status === 'connecting';

  return (
    <TooltipProvider>
      <div className="fixed bottom-6 right-6 z-50">
        {/* Floating Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              onHoverStart={() => setIsHovered(true)}
              onHoverEnd={() => setIsHovered(false)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={handleToggle}
                disabled={isConnecting}
                className={cn(
                  'relative w-14 h-14 rounded-full shadow-lg transition-all duration-300',
                  'bg-gradient-to-br from-card to-card/90 hover:from-card/95 hover:to-card/85',
                  'border border-border/40 hover:border-accent-gold/40',
                  isActive && 'border-accent-gold/60 shadow-accent-gold/20 shadow-xl',
                  isConnecting && 'opacity-80'
                )}
              >
                {/* Pulsing rings when active */}
                <AnimatePresence>
                  {isActive && (
                    <>
                      <motion.div
                        initial={{ scale: 1, opacity: 0.6 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
                        className="absolute inset-0 rounded-full border-2 border-accent-gold/40"
                      />
                      <motion.div
                        initial={{ scale: 1, opacity: 0.4 }}
                        animate={{ scale: 1.8, opacity: 0 }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'easeOut', delay: 0.3 }}
                        className="absolute inset-0 rounded-full border border-accent-gold/30"
                      />
                    </>
                  )}
                </AnimatePresence>

                {/* Waveform background when speaking/listening */}
                {isActive && (isSpeaking || isListening) && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <ClubAIWaveform
                      isActive={true}
                      type={isSpeaking ? 'output' : 'input'}
                      volume={isSpeaking ? outputVolume : inputVolume}
                      variant="circular"
                      className="scale-[0.4]"
                    />
                  </div>
                )}

                {/* Icon */}
                <div className="relative z-10">
                  {isConnecting ? (
                    <Loader2 className="w-6 h-6 text-accent-gold animate-spin" />
                  ) : (
                    <Sparkles
                      className={cn(
                        'w-6 h-6 transition-colors duration-300',
                        isActive ? 'text-accent-gold' : 'text-foreground/70',
                        isSpeaking && 'animate-pulse'
                      )}
                    />
                  )}
                </div>

                {/* Active indicator dot */}
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={cn(
                      'absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card',
                      isSpeaking ? 'bg-accent-gold' : 'bg-green-500'
                    )}
                  >
                    {isListening && (
                      <motion.div
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="absolute inset-0 rounded-full bg-green-500"
                      />
                    )}
                  </motion.div>
                )}
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="left" className="flex items-center gap-2">
            <span>ClubAI Voice</span>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded">⌘⇧V</kbd>
          </TooltipContent>
        </Tooltip>

        {/* Expanded hint on hover when not active */}
        <AnimatePresence>
          {isHovered && !isActive && !isDialogOpen && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap"
            >
              <div className="px-3 py-2 bg-card/95 backdrop-blur-sm border border-border/40 rounded-lg shadow-lg">
                <p className="text-sm font-medium text-foreground">Talk to ClubAI</p>
                <p className="text-xs text-muted-foreground">Voice-powered assistant</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Voice Dialog */}
        <ClubAIVoiceDialog
          isOpen={isDialogOpen}
          onClose={handleClose}
          status={status}
          isSpeaking={isSpeaking}
          isListening={isListening}
          transcript={transcript}
          inputVolume={inputVolume}
          outputVolume={outputVolume}
          onEndSession={handleEndSession}
          error={error}
        />
      </div>
    </TooltipProvider>
  );
};

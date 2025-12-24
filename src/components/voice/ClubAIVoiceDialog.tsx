import { X, Mic, MicOff, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ClubAIWaveform } from './ClubAIWaveform';
import { motion, AnimatePresence } from 'framer-motion';

interface TranscriptMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface ClubAIVoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'idle' | 'connecting' | 'connected' | 'error';
  isSpeaking: boolean;
  isListening: boolean;
  transcript: TranscriptMessage[];
  inputVolume: number;
  outputVolume: number;
  onEndSession: () => void;
  error: string | null;
}

export const ClubAIVoiceDialog = ({
  isOpen,
  onClose,
  status,
  isSpeaking,
  isListening,
  transcript,
  inputVolume,
  outputVolume,
  onEndSession,
  error,
}: ClubAIVoiceDialogProps) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusText = () => {
    if (error) return 'Error occurred';
    if (isSpeaking) return 'ClubAI is speaking...';
    if (isListening) return 'Listening...';
    if (status === 'connecting') return 'Connecting...';
    return 'Ready';
  };

  const getStatusColor = () => {
    if (error) return 'text-destructive';
    if (isSpeaking) return 'text-accent-gold';
    if (isListening) return 'text-green-400';
    return 'text-muted-foreground';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-24 right-6 w-[380px] max-w-[calc(100vw-3rem)] bg-card/95 backdrop-blur-xl border border-border/40 rounded-2xl shadow-2xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/20 bg-gradient-to-r from-card to-card/80">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-gold/20 to-accent-gold/5 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-accent-gold" />
                </div>
                {status === 'connected' && (
                  <motion.div
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">ClubAI Voice</h3>
                <p className={cn('text-xs', getStatusColor())}>{getStatusText()}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Waveform Visualization */}
          <div className="flex items-center justify-center py-6 bg-gradient-to-b from-background/50 to-transparent">
            <div className="relative">
              <ClubAIWaveform
                isActive={isSpeaking || isListening}
                type={isSpeaking ? 'output' : 'input'}
                volume={isSpeaking ? outputVolume : inputVolume}
                variant="circular"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                {isListening ? (
                  <Mic className="w-6 h-6 text-accent-gold animate-pulse" />
                ) : isSpeaking ? (
                  <Sparkles className="w-6 h-6 text-accent-gold animate-pulse" />
                ) : (
                  <MicOff className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>

          {/* Transcript */}
          <ScrollArea className="h-48 px-4">
            {transcript.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Start speaking to interact with ClubAI</p>
              </div>
            ) : (
              <div className="space-y-3 py-2">
                {transcript.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: message.role === 'user' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      'flex flex-col gap-1',
                      message.role === 'user' ? 'items-end' : 'items-start'
                    )}
                  >
                    <div
                      className={cn(
                        'px-3 py-2 rounded-xl max-w-[85%] text-sm',
                        message.role === 'user'
                          ? 'bg-accent-gold/20 text-foreground rounded-br-none'
                          : 'bg-muted/50 text-foreground rounded-bl-none'
                      )}
                    >
                      {message.text}
                    </div>
                    <span className="text-[10px] text-muted-foreground px-1">
                      {formatTime(message.timestamp)}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/20 bg-muted/20">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  isListening ? 'bg-green-500' : 'bg-muted-foreground/30'
                )} />
                <span className="text-xs text-muted-foreground">Mic</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onEndSession}
              className="h-8 text-destructive border-destructive/50 hover:bg-destructive/10"
            >
              End Session
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

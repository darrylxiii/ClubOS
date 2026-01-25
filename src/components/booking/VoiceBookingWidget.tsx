/**
 * Voice Booking Widget Component
 * 
 * Floating widget for voice-based booking via ElevenLabs
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Volume2,
  Loader2,
  CheckCircle2,
  X
} from 'lucide-react';
import { useVoiceBooking } from '@/hooks/useVoiceBooking';
import { cn } from '@/lib/utils';

interface VoiceBookingWidgetProps {
  bookingLinkSlug?: string;
  onBookingComplete?: (bookingId: string) => void;
  className?: string;
}

export function VoiceBookingWidget({ 
  bookingLinkSlug, 
  onBookingComplete,
  className 
}: VoiceBookingWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    session,
    isActive,
    lastResponse,
    startSession,
    confirmBooking,
    endSession,
    startListening,
  } = useVoiceBooking({
    bookingLinkSlug,
    onBookingComplete: (id) => {
      onBookingComplete?.(id);
      setTimeout(() => setIsOpen(false), 3000);
    }
  });

  const handleStart = async () => {
    setIsOpen(true);
    await startSession();
  };

  const handleEnd = () => {
    endSession();
    setIsOpen(false);
  };

  const getStatusIcon = () => {
    switch (session.status) {
      case 'listening':
        return <Mic className="h-5 w-5 text-red-500 animate-pulse" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin" />;
      case 'speaking':
        return <Volume2 className="h-5 w-5 text-primary animate-pulse" />;
      case 'confirming':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      default:
        return <MicOff className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (session.status) {
      case 'listening':
        return 'Listening...';
      case 'processing':
        return 'Processing...';
      case 'speaking':
        return 'QUIN is speaking';
      case 'confirming':
        return 'Ready to confirm';
      default:
        return 'Ready';
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={cn('fixed bottom-6 right-6 z-50', className)}
          >
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg gap-0"
              onClick={handleStart}
            >
              <Phone className="h-6 w-6" />
              <span className="sr-only">Start voice booking</span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Booking Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'fixed bottom-6 right-6 z-50 w-80 md:w-96',
              className
            )}
          >
            <Card className="shadow-2xl border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {getStatusIcon()}
                    Voice Booking
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleEnd}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{getStatusText()}</p>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Conversation History */}
                <ScrollArea className="h-48 rounded-lg border bg-muted/30 p-3">
                  {session.transcript.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Starting voice session...
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {session.transcript.map((msg, i) => (
                        <div
                          key={i}
                          className={cn(
                            'text-sm p-2 rounded-lg max-w-[85%]',
                            msg.role === 'user'
                              ? 'ml-auto bg-primary text-primary-foreground'
                              : 'bg-background border'
                          )}
                        >
                          {msg.content}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Extracted Data Display */}
                {Object.keys(session.extractedData).length > 0 && (
                  <div className="text-xs space-y-1 p-2 rounded-lg bg-muted">
                    <p className="font-medium text-muted-foreground">Booking details:</p>
                    {session.extractedData.date && (
                      <p>📅 {session.extractedData.date}</p>
                    )}
                    {session.extractedData.time && (
                      <p>🕐 {session.extractedData.time}</p>
                    )}
                    {session.extractedData.name && (
                      <p>👤 {session.extractedData.name}</p>
                    )}
                    {session.extractedData.email && (
                      <p>📧 {session.extractedData.email}</p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {session.status === 'confirming' ? (
                    <Button 
                      className="flex-1 gap-2"
                      onClick={confirmBooking}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Confirm Booking
                    </Button>
                  ) : (
                    <Button
                      className="flex-1 gap-2"
                      onClick={startListening}
                      disabled={session.status === 'listening' || session.status === 'processing'}
                      variant={session.status === 'listening' ? 'secondary' : 'default'}
                    >
                      {session.status === 'listening' ? (
                        <>
                          <Mic className="h-4 w-4 animate-pulse" />
                          Listening...
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4" />
                          Speak
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={handleEnd}
                  >
                    <PhoneOff className="h-4 w-4" />
                  </Button>
                </div>

                {/* Booking Complete State */}
                {session.bookingId && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-green-600">
                      Booking confirmed!
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Check your email for details
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

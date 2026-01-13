import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { aiService } from '@/services/aiService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Mic, MicOff, Volume2, Loader2, Sparkles, X, MessageSquare, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface QUINResponse {
  responseType: string;
  responseText: string;
  timestamp: string;
}

interface QUINVoiceAssistantProps {
  meetingId: string;
  recentTranscript?: string;
  remainingTime?: number;
  onClose?: () => void;
}

export function QUINVoiceAssistant({
  meetingId,
  recentTranscript,
  remainingTime,
  onClose
}: QUINVoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [responses, setResponses] = useState<QUINResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check for speech recognition support and initialize
  useEffect(() => {
    const hasSpeechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    setSpeechSupported(hasSpeechRecognition);

    if (hasSpeechRecognition) {
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionClass();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const current = event.resultIndex;
        const result = event.results[current];
        setTranscript(result[0].transcript);

        if (result.isFinal) {
          handleVoiceCommand(result[0].transcript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        // On error, suggest text input as fallback
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setShowTextInput(true);
          setError('Microphone access denied. Use text input instead.');
        } else {
          setError(`Voice recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      // No speech recognition - show text input by default
      setShowTextInput(true);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (synthesisRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      handleVoiceCommand(textInput.trim());
      setTextInput('');
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening && !isProcessing) {
      setTranscript('');
      setError(null);
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleVoiceCommand = async (command: string) => {
    if (!command.trim()) return;

    setIsProcessing(true);
    try {
      const data = await aiService.quinMeetingVoice({
        command,
        meetingId,
        context: {
          recentTranscript: recentTranscript?.slice(-2000),
          remainingTime
        }
      });



      if (data?.responseText) {
        const response: QUINResponse = {
          responseType: data.responseType,
          responseText: data.responseText,
          timestamp: data.timestamp
        };

        setResponses(prev => [response, ...prev.slice(0, 9)]);
        speakResponse(data.responseText);
      }
    } catch (err) {
      console.error('QUIN voice error:', err);
      setError('Failed to process command');
    } finally {
      setIsProcessing(false);
      setTranscript('');
    }
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Try to find a natural-sounding voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v =>
        v.name.includes('Google') ||
        v.name.includes('Samantha') ||
        v.name.includes('Daniel')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      synthesisRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const getResponseTypeColor = (type: string) => {
    switch (type) {
      case 'summary': return 'bg-blue-500/10 text-blue-500';
      case 'suggestion': return 'bg-amber-500/10 text-amber-500';
      case 'flag': return 'bg-green-500/10 text-green-500';
      case 'analysis': return 'bg-purple-500/10 text-purple-500';
      case 'info': return 'bg-muted text-muted-foreground';
      default: return 'bg-primary/10 text-primary';
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">QUIN Voice Assistant</h4>
              <p className="text-xs text-muted-foreground">
                {speechSupported ? 'Say "QUIN" to activate' : 'Type your command below'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTextInput(!showTextInput)}
              className={cn(showTextInput && 'text-primary')}
            >
              <Keyboard className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Text Input Fallback */}
        {showTextInput && (
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Type your command..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
              disabled={isProcessing}
              className="flex-1"
            />
            <Button
              onClick={handleTextSubmit}
              disabled={isProcessing || !textInput.trim()}
              size="sm"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
            </Button>
          </div>
        )}

        {/* Voice Control - only show if speech is supported */}
        {speechSupported && (
          <div className="flex items-center justify-center gap-4 mb-4">
            <Button
              variant={isListening ? 'destructive' : 'default'}
              size="lg"
              className="h-16 w-16 rounded-full"
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing}
            >
              <AnimatePresence mode="wait">
                {isProcessing ? (
                  <motion.div
                    key="processing"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </motion.div>
                ) : isListening ? (
                  <motion.div
                    key="listening"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <MicOff className="h-6 w-6" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Mic className="h-6 w-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>

            {isSpeaking && (
              <Button
                variant="outline"
                size="icon"
                onClick={stopSpeaking}
                className="animate-pulse"
              >
                <Volume2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Status */}
        <div className="text-center mb-4">
          {isListening && (
            <div className="flex items-center justify-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span className="text-sm font-medium">Listening...</span>
            </div>
          )}
          {transcript && (
            <p className="text-sm text-muted-foreground mt-2 italic">
              "{transcript}"
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive mt-2">{error}</p>
          )}
        </div>

        {/* Quick Commands */}
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          {[
            { label: 'Summarize', command: 'Summarize the last 5 minutes' },
            { label: 'Questions', command: 'What questions should I ask next?' },
            { label: 'Flag', command: 'Flag this moment' },
            { label: 'Concerns', command: 'Any red flags to watch for?' },
          ].map((item) => (
            <Button
              key={item.label}
              variant="outline"
              size="sm"
              onClick={() => handleVoiceCommand(item.command)}
              disabled={isProcessing}
            >
              {item.label}
            </Button>
          ))}
        </div>

        {/* Response History */}
        {responses.length > 0 && (
          <div className="border-t pt-4">
            <h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Recent Responses
            </h5>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {responses.map((response, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-muted/50 text-sm"
                  >
                    <Badge
                      variant="secondary"
                      className={cn('mb-1 text-xs', getResponseTypeColor(response.responseType))}
                    >
                      {response.responseType}
                    </Badge>
                    <p className="text-muted-foreground line-clamp-2">
                      {response.responseText}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

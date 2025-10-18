import { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Caption {
  id: string;
  text: string;
  speaker: string;
  timestamp: Date;
  isFinal: boolean;
}

interface LiveCaptionsProps {
  enabled: boolean;
  localStream?: MediaStream | null;
}

export function LiveCaptions({ enabled, localStream }: LiveCaptionsProps) {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled || !localStream) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
      return;
    }

    // Check if browser supports Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[Captions] Web Speech API not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log('[Captions] Started listening');
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');

      const isFinal = event.results[event.results.length - 1].isFinal;

      setCaptions(prev => {
        const newCaption: Caption = {
          id: Date.now().toString(),
          text: transcript,
          speaker: 'You',
          timestamp: new Date(),
          isFinal
        };

        // Keep only last 3 captions
        const updated = [...prev.filter(c => c.isFinal), newCaption].slice(-3);
        return updated;
      });
    };

    recognition.onerror = (event: any) => {
      console.error('[Captions] Recognition error:', event.error);
      if (event.error === 'no-speech') {
        recognition.start();
      }
    };

    recognition.onend = () => {
      if (enabled) {
        recognition.start(); // Restart if still enabled
      } else {
        setIsListening(false);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (error) {
      console.error('[Captions] Failed to start:', error);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [enabled, localStream]);

  if (!enabled || captions.length === 0) return null;

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[10001] max-w-3xl w-full px-4">
      <Card className="backdrop-blur-2xl bg-black/80 border-white/10 p-4 space-y-2">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary" className="gap-2">
            {isListening && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
            Live Captions
          </Badge>
        </div>
        
        {captions.map(caption => (
          <div key={caption.id} className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold">{caption.speaker}</span>
              <span>{caption.timestamp.toLocaleTimeString()}</span>
            </div>
            <p className={`text-base ${caption.isFinal ? 'text-white' : 'text-gray-400 italic'}`}>
              {caption.text}
            </p>
          </div>
        ))}
      </Card>
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseMeetingTranscriptProps {
    enabled: boolean;
    onTranscriptUpdate?: (text: string) => void;
    simulate?: boolean;
}

export function useMeetingTranscript({ enabled, onTranscriptUpdate, simulate = false }: UseMeetingTranscriptProps) {
    const [transcript, setTranscript] = useState<string>('');
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);
    const simulationIntervalRef = useRef<any>(null);

    const startListening = useCallback(() => {
        if (!enabled) return;
        setIsListening(true);

        if (simulate) {
            console.log('[Transcript] Starting simulation mode');
            const mockPhrases = [
                "Can you explain your experience with React?",
                "I have worked with React for 5 years, focusing on performance.",
                "That's impressive. How do you handle state management?",
                "I prefer using Context API for simple apps and Redux for complex ones.",
                "What about server-side rendering?",
                "I've used Next.js extensively for SSR and SEO optimization."
            ];

            let index = 0;
            simulationIntervalRef.current = setInterval(() => {
                const phrase = mockPhrases[index % mockPhrases.length];
                const newSegment = phrase + " ";
                setTranscript(prev => {
                    const updated = prev + newSegment;
                    onTranscriptUpdate?.(updated);
                    return updated;
                });
                index++;
            }, 3000);
            return;
        }

        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript + ' ';
                    }
                }

                if (finalTranscript) {
                    setTranscript(prev => {
                        const updated = prev + finalTranscript;
                        onTranscriptUpdate?.(updated);
                        return updated;
                    });
                }
            };

            recognition.onerror = (event: any) => {
                console.error('[Transcript] Speech recognition error', event.error);
            };

            recognition.start();
            recognitionRef.current = recognition;
        } else {
            console.warn('[Transcript] Web Speech API not supported in this browser');
        }
    }, [enabled, simulate, onTranscriptUpdate]);

    const stopListening = useCallback(() => {
        setIsListening(false);
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        if (simulationIntervalRef.current) {
            clearInterval(simulationIntervalRef.current);
        }
    }, []);

    useEffect(() => {
        if (enabled) {
            startListening();
        } else {
            stopListening();
        }
        return () => stopListening();
    }, [enabled, startListening, stopListening]);

    return {
        transcript,
        isListening,
        resetTranscript: () => setTranscript('')
    };
}

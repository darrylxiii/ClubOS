import { useState, useCallback, useRef, useEffect } from 'react';

interface TranscriptSegment {
  id: string;
  participantId: string;
  participantName: string;
  text: string;
  timestamp: number;
  duration: number;
  confidence: number;
  language?: string;
  isInterim?: boolean;
}

interface TranscriptionSettings {
  language: string;
  enablePunctuation: boolean;
  enableSpeakerLabels: boolean;
  enableWordTimestamps: boolean;
  profanityFilter: boolean;
}

interface UseAITranscriptionReturn {
  isTranscribing: boolean;
  transcripts: TranscriptSegment[];
  currentInterim: string;
  startTranscription: (stream: MediaStream, participantId: string, participantName: string) => void;
  stopTranscription: () => void;
  clearTranscripts: () => void;
  exportTranscripts: (format: 'txt' | 'srt' | 'vtt' | 'json') => string;
  settings: TranscriptionSettings;
  updateSettings: (settings: Partial<TranscriptionSettings>) => void;
  searchTranscripts: (query: string) => TranscriptSegment[];
}

export function useAITranscription(): UseAITranscriptionReturn {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [currentInterim, setCurrentInterim] = useState('');
  const [settings, setSettings] = useState<TranscriptionSettings>({
    language: 'en-US',
    enablePunctuation: true,
    enableSpeakerLabels: true,
    enableWordTimestamps: true,
    profanityFilter: false,
  });

  const recognitionRef = useRef<any>(null);
  const participantInfoRef = useRef<{ id: string; name: string } | null>(null);

  const startTranscription = useCallback((
    stream: MediaStream,
    participantId: string,
    participantName: string
  ) => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      console.warn('Speech recognition not supported');
      return;
    }

    participantInfoRef.current = { id: participantId, name: participantName };

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = settings.language;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          const segment: TranscriptSegment = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            participantId: participantInfoRef.current?.id || 'unknown',
            participantName: participantInfoRef.current?.name || 'Unknown',
            text: transcript.trim(),
            timestamp: Date.now(),
            duration: 0,
            confidence: result[0].confidence || 0.9,
            language: settings.language,
            isInterim: false,
          };

          setTranscripts(prev => [...prev, segment]);
          setCurrentInterim('');
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript) {
        setCurrentInterim(interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        setIsTranscribing(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still supposed to be transcribing
      if (isTranscribing && recognitionRef.current) {
        try {
          recognition.start();
        } catch (_e) {
          console.error('Failed to restart recognition:', e);
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsTranscribing(true);
  }, [settings.language, isTranscribing]);

  const stopTranscription = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsTranscribing(false);
    setCurrentInterim('');
  }, []);

  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
  }, []);

  const formatTimestamp = (ms: number, format: 'srt' | 'vtt'): string => {
    const date = new Date(ms);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
    const milliseconds = date.getUTCMilliseconds().toString().padStart(3, '0');

    if (format === 'srt') {
      return `${hours}:${minutes}:${seconds},${milliseconds}`;
    }
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  };

  const exportTranscripts = useCallback((format: 'txt' | 'srt' | 'vtt' | 'json'): string => {
    switch (format) {
      case 'txt':
        return transcripts
          .map(t => `[${new Date(t.timestamp).toLocaleTimeString()}] ${t.participantName}: ${t.text}`)
          .join('\n');

      case 'srt':
        return transcripts
          .map((t, i) => {
            const startTime = formatTimestamp(t.timestamp, 'srt');
            const endTime = formatTimestamp(t.timestamp + (t.duration || 3000), 'srt');
            return `${i + 1}\n${startTime} --> ${endTime}\n${t.participantName}: ${t.text}\n`;
          })
          .join('\n');

      case 'vtt': {
        let vtt = 'WEBVTT\n\n';
        vtt += transcripts
          .map((t, i) => {
            const startTime = formatTimestamp(t.timestamp, 'vtt');
            const endTime = formatTimestamp(t.timestamp + (t.duration || 3000), 'vtt');
            return `${i + 1}\n${startTime} --> ${endTime}\n${t.participantName}: ${t.text}\n`;
          })
          .join('\n');
        return vtt;
      }

      case 'json':
        return JSON.stringify({ transcripts, exportedAt: new Date().toISOString() }, null, 2);

      default:
        return '';
    }
  }, [transcripts]);

  const updateSettings = useCallback((newSettings: Partial<TranscriptionSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const searchTranscripts = useCallback((query: string): TranscriptSegment[] => {
    const lowerQuery = query.toLowerCase();
    return transcripts.filter(t =>
      t.text.toLowerCase().includes(lowerQuery) ||
      t.participantName.toLowerCase().includes(lowerQuery)
    );
  }, [transcripts]);

  useEffect(() => {
    return () => {
      stopTranscription();
    };
  }, [stopTranscription]);

  return {
    isTranscribing,
    transcripts,
    currentInterim,
    startTranscription,
    stopTranscription,
    clearTranscripts,
    exportTranscripts,
    settings,
    updateSettings,
    searchTranscripts,
  };
}

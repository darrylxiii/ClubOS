import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Languages, Volume2, VolumeX, Settings, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TranslatedSegment {
  id: string;
  originalText: string;
  translatedText: string;
  speaker: string;
  timestamp: number;
  language: string;
}

interface LiveTranslationPanelProps {
  meetingId: string;
  recentTranscript?: string;
  transcriptSegments?: Array<{
    text: string;
    speaker: string;
    timestamp_ms: number;
  }>;
  onClose?: () => void;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'nl', name: 'Dutch' },
  { code: 'de', name: 'German' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'pl', name: 'Polish' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ru', name: 'Russian' },
  { code: 'tr', name: 'Turkish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'fi', name: 'Finnish' },
  { code: 'uk', name: 'Ukrainian' },
];

export function LiveTranslationPanel({
  meetingId,
  recentTranscript,
  transcriptSegments = [],
  onClose
}: LiveTranslationPanelProps) {
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [enabled, setEnabled] = useState(true);
  const [showOriginal, setShowOriginal] = useState(false);
  const [speakTranslations, setSpeakTranslations] = useState(false);
  const [translations, setTranslations] = useState<TranslatedSegment[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const lastTranslatedIndex = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Translate new segments as they arrive
  useEffect(() => {
    if (!enabled || transcriptSegments.length === 0) return;
    
    const newSegments = transcriptSegments.slice(lastTranslatedIndex.current);
    if (newSegments.length > 0) {
      translateSegments(newSegments);
      lastTranslatedIndex.current = transcriptSegments.length;
    }
  }, [transcriptSegments, enabled, targetLanguage]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [translations]);

  const translateSegments = useCallback(async (segments: typeof transcriptSegments) => {
    if (segments.length === 0 || isTranslating) return;
    
    setIsTranslating(true);
    try {
      const textsToTranslate = segments.map(s => s.text).join('\n---\n');
      
      const { data, error } = await supabase.functions.invoke('translate-message', {
        body: {
          text: textsToTranslate,
          targetLanguage,
          context: 'interview meeting transcription'
        }
      });

      if (error) throw error;

      if (data?.translatedText) {
        const translatedParts = data.translatedText.split('\n---\n');
        
        const newTranslations: TranslatedSegment[] = segments.map((segment, idx) => ({
          id: `${segment.timestamp_ms}-${idx}`,
          originalText: segment.text,
          translatedText: translatedParts[idx] || segment.text,
          speaker: segment.speaker,
          timestamp: segment.timestamp_ms,
          language: targetLanguage
        }));

        setTranslations(prev => [...prev, ...newTranslations]);

        // Speak the last translation if enabled
        if (speakTranslations && newTranslations.length > 0) {
          const lastTranslation = newTranslations[newTranslations.length - 1];
          speakText(lastTranslation.translatedText);
        }
      }
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  }, [targetLanguage, speakTranslations, isTranslating]);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = targetLanguage;
      utterance.rate = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const clearTranslations = () => {
    setTranslations([]);
    lastTranslatedIndex.current = 0;
  };

  return (
    <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Languages className="h-4 w-4 text-blue-500" />
            Live Translation
            {isTranslating && (
              <Badge variant="outline" className="animate-pulse text-xs">
                Translating...
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              className="scale-75"
            />
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Settings Row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs">To:</Label>
            <Select value={targetLanguage} onValueChange={setTargetLanguage}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="showOriginal"
              checked={showOriginal}
              onCheckedChange={setShowOriginal}
              className="scale-75"
            />
            <Label htmlFor="showOriginal" className="text-xs">Show original</Label>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSpeakTranslations(!speakTranslations)}
            className={cn(speakTranslations && 'text-blue-500')}
          >
            {speakTranslations ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Translations */}
        <ScrollArea className="h-[250px] pr-2" ref={scrollRef as any}>
          {translations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Languages className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Translations will appear here</p>
              <p className="text-xs mt-1">
                Speaking detected text will be translated to {
                  SUPPORTED_LANGUAGES.find(l => l.code === targetLanguage)?.name
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {translations.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-lg bg-muted/50 border border-muted"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{t.speaker}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(t.timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-sm font-medium">{t.translatedText}</p>
                  
                  {showOriginal && t.originalText !== t.translatedText && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      Original: {t.originalText}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {translations.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearTranslations}
            className="w-full"
          >
            Clear Translations
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

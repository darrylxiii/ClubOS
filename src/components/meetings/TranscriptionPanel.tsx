import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Search, 
  Download, 
  Settings, 
  Play, 
  Pause,
  Globe,
  X
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface TranscriptSegment {
  id: string;
  participantId: string;
  participantName: string;
  text: string;
  timestamp: number;
  confidence: number;
  isInterim?: boolean;
}

interface TranscriptionPanelProps {
  transcripts: TranscriptSegment[];
  currentInterim: string;
  isTranscribing: boolean;
  onStartTranscription: () => void;
  onStopTranscription: () => void;
  onExport: (format: 'txt' | 'srt' | 'vtt' | 'json') => void;
  settings: {
    language: string;
    enablePunctuation: boolean;
    enableSpeakerLabels: boolean;
  };
  onUpdateSettings: (settings: Record<string, unknown>) => void;
  onSearch: (query: string) => TranscriptSegment[];
}

const LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'es-ES', label: 'Spanish' },
  { code: 'fr-FR', label: 'French' },
  { code: 'de-DE', label: 'German' },
  { code: 'it-IT', label: 'Italian' },
  { code: 'pt-BR', label: 'Portuguese' },
  { code: 'nl-NL', label: 'Dutch' },
  { code: 'ja-JP', label: 'Japanese' },
  { code: 'ko-KR', label: 'Korean' },
  { code: 'zh-CN', label: 'Chinese' },
];

export function TranscriptionPanel({
  transcripts,
  currentInterim,
  isTranscribing,
  onStartTranscription,
  onStopTranscription,
  onExport,
  settings,
  onUpdateSettings,
  onSearch,
}: TranscriptionPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TranscriptSegment[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new transcripts arrive
    if (scrollAreaRef.current && !isSearching) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [transcripts, isSearching]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setIsSearching(true);
      setSearchResults(onSearch(query));
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  const displayTranscripts = isSearching ? searchResults : transcripts;

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-background border rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Live Transcription</span>
          {isTranscribing && (
            <Badge variant="default" className="animate-pulse">
              Recording
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={isTranscribing ? onStopTranscription : onStartTranscription}
          >
            {isTranscribing ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Language
                  </Label>
                  <Select
                    value={settings.language}
                    onValueChange={(value) => onUpdateSettings({ language: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="punctuation">Auto-punctuation</Label>
                  <Switch
                    id="punctuation"
                    checked={settings.enablePunctuation}
                    onCheckedChange={(checked) => 
                      onUpdateSettings({ enablePunctuation: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="speaker-labels">Speaker labels</Label>
                  <Switch
                    id="speaker-labels"
                    checked={settings.enableSpeakerLabels}
                    onCheckedChange={(checked) => 
                      onUpdateSettings({ enableSpeakerLabels: checked })
                    }
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Download className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40" align="end">
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => onExport('txt')}
                >
                  Text (.txt)
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => onExport('srt')}
                >
                  Subtitles (.srt)
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => onExport('vtt')}
                >
                  WebVTT (.vtt)
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => onExport('json')}
                >
                  JSON (.json)
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Search */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transcripts..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8 h-8"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => handleSearch('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        {isSearching && (
          <p className="text-xs text-muted-foreground mt-1">
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
          </p>
        )}
      </div>

      {/* Transcript Content */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-3 space-y-3">
          {displayTranscripts.length === 0 && !currentInterim ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              {isTranscribing 
                ? 'Listening for speech...' 
                : 'Start transcription to capture the conversation'}
            </div>
          ) : (
            <>
              {displayTranscripts.map((segment) => (
                <div
                  key={segment.id}
                  className="group hover:bg-muted/50 rounded-md p-2 -mx-2 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatTime(segment.timestamp)}
                    </span>
                    <div className="flex-1 min-w-0">
                      {settings.enableSpeakerLabels && (
                        <span className="font-medium text-sm text-primary">
                          {segment.participantName}:{' '}
                        </span>
                      )}
                      <span className="text-sm">{segment.text}</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {Math.round(segment.confidence * 100)}%
                    </Badge>
                  </div>
                </div>
              ))}

              {/* Current interim transcript */}
              {currentInterim && !isSearching && (
                <div className="p-2 -mx-2 opacity-60">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatTime(Date.now())}
                    </span>
                    <span className="text-sm italic">{currentInterim}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer Stats */}
      <div className="p-2 border-t bg-muted/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{transcripts.length} segments</span>
          <span>
            {transcripts.reduce((sum, t) => sum + t.text.split(' ').length, 0)} words
          </span>
        </div>
      </div>
    </div>
  );
}

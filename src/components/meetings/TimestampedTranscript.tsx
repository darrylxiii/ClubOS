import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Play, User, Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TranscriptSegment {
  timestamp_ms: number;
  speaker?: string;
  speaker_id?: string;
  text: string;
}

interface TimestampedTranscriptProps {
  transcriptJson: TranscriptSegment[] | null;
  currentTimeMs: number;
  onSeek: (timeMs: number) => void;
  onCreateClip?: (startMs: number, endMs: number, text: string) => void;
  speakerColors?: Record<string, string>;
}

const DEFAULT_SPEAKER_COLORS = [
  'bg-blue-500/20 text-blue-400',
  'bg-green-500/20 text-green-400',
  'bg-purple-500/20 text-purple-400',
  'bg-orange-500/20 text-orange-400',
  'bg-pink-500/20 text-pink-400',
];

export function TimestampedTranscript({
  transcriptJson,
  currentTimeMs,
  onSeek,
  onCreateClip,
  speakerColors = {}
}: TimestampedTranscriptProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegments, setSelectedSegments] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);
  
  // Normalize transcript data - handle both array and Whisper response object formats
  const normalizedSegments: TranscriptSegment[] = (() => {
    if (!transcriptJson) return [];
    
    // If it's already an array, use it directly
    if (Array.isArray(transcriptJson)) {
      return transcriptJson;
    }
    
    // If it's a Whisper response object with segments
    if (typeof transcriptJson === 'object' && 'segments' in transcriptJson && Array.isArray((transcriptJson as any).segments)) {
      return ((transcriptJson as any).segments as any[]).map((seg: any) => ({
        timestamp_ms: (seg.start || 0) * 1000,
        speaker: seg.speaker || undefined,
        speaker_id: seg.speaker_id || undefined,
        text: seg.text || ''
      }));
    }
    
    return [];
  })();
  
  // Auto-scroll to current segment
  useEffect(() => {
    if (activeSegmentRef.current && scrollRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [currentTimeMs]);

  if (normalizedSegments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>No transcript available yet</p>
      </div>
    );
  }

  const formatTimestamp = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getSpeakerColor = (speaker: string, index: number): string => {
    if (speakerColors[speaker]) return speakerColors[speaker];
    return DEFAULT_SPEAKER_COLORS[index % DEFAULT_SPEAKER_COLORS.length];
  };

  const getActiveSegmentIndex = (): number => {
    for (let i = normalizedSegments.length - 1; i >= 0; i--) {
      if (normalizedSegments[i].timestamp_ms <= currentTimeMs) {
        return i;
      }
    }
    return -1;
  };

  const filteredSegments = searchQuery
    ? normalizedSegments.filter(seg => 
        seg.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seg.speaker?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : normalizedSegments;

  const activeIndex = getActiveSegmentIndex();
  const uniqueSpeakers = [...new Set(normalizedSegments.map(s => s.speaker).filter(Boolean))];

  const handleCreateClip = () => {
    if (selectedSegments.size < 1 || !onCreateClip) return;
    
    const indices = Array.from(selectedSegments).sort((a, b) => a - b);
    const startMs = normalizedSegments[indices[0]].timestamp_ms;
    const endMs = normalizedSegments[indices[indices.length - 1]].timestamp_ms + 5000; // Add 5s buffer
    const text = indices.map(i => normalizedSegments[i].text).join(' ');
    
    onCreateClip(startMs, endMs, text);
    setSelectedSegments(new Set());
  };

  const toggleSegmentSelection = (index: number) => {
    const newSelected = new Set(selectedSegments);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSegments(newSelected);
  };

  return (
    <div className="space-y-4">
      {/* Search and Clip Controls */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {onCreateClip && selectedSegments.size > 0 && (
          <Button onClick={handleCreateClip} size="sm" variant="secondary">
            <Scissors className="h-4 w-4 mr-2" />
            Create Clip ({selectedSegments.size})
          </Button>
        )}
      </div>

      {/* Speaker Legend */}
      {uniqueSpeakers.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {uniqueSpeakers.map((speaker, idx) => (
            <Badge key={speaker} variant="outline" className={getSpeakerColor(speaker!, idx)}>
              <User className="h-3 w-3 mr-1" />
              {speaker}
            </Badge>
          ))}
        </div>
      )}

      {/* Transcript */}
      <ScrollArea className="h-[400px]" ref={scrollRef}>
        <div className="space-y-2 pr-4">
          {filteredSegments.map((segment, idx) => {
            const originalIndex = searchQuery 
              ? transcriptJson.findIndex(s => s === segment)
              : idx;
            const isActive = originalIndex === activeIndex;
            const isSelected = selectedSegments.has(originalIndex);
            const speakerIdx = uniqueSpeakers.indexOf(segment.speaker || '');

            return (
              <div
                key={originalIndex}
                ref={isActive ? activeSegmentRef : null}
                onClick={() => toggleSegmentSelection(originalIndex)}
                className={cn(
                  "flex gap-3 p-3 rounded-lg transition-all cursor-pointer group",
                  isActive && "bg-accent/30 border border-accent/50",
                  isSelected && "bg-primary/20 border border-primary/50",
                  !isActive && !isSelected && "hover:bg-muted/50"
                )}
              >
                {/* Timestamp */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 font-mono text-xs h-7 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(segment.timestamp_ms);
                  }}
                >
                  <Play className="h-3 w-3 mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {formatTimestamp(segment.timestamp_ms)}
                </Button>

                {/* Speaker Avatar */}
                {segment.speaker && (
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className={cn("text-xs", getSpeakerColor(segment.speaker, speakerIdx))}>
                      {segment.speaker.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}

                {/* Text */}
                <div className="flex-1">
                  {segment.speaker && (
                    <span className="text-xs font-medium text-muted-foreground block mb-1">
                      {segment.speaker}
                    </span>
                  )}
                  <p className={cn(
                    "text-sm leading-relaxed",
                    isActive && "font-medium"
                  )}>
                    {searchQuery ? (
                      highlightText(segment.text, searchQuery)
                    ) : (
                      segment.text
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Search Results Count */}
      {searchQuery && (
        <p className="text-xs text-muted-foreground text-center">
          {filteredSegments.length} of {transcriptJson.length} segments match "{searchQuery}"
        </p>
      )}
    </div>
  );
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text;
  
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, i) => 
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-accent/50 text-accent-foreground rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

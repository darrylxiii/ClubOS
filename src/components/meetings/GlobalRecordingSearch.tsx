import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, Video, Mic, Clock, User, 
  FileText, ArrowRight, Quote
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchResult {
  id: string;
  title: string;
  source_type: string;
  created_at: string;
  duration_seconds: number;
  executive_summary: string | null;
  transcript_excerpt: string;
  match_type: 'transcript' | 'summary' | 'title';
  highlight: string;
}

interface GlobalRecordingSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalRecordingSearch({ open, onOpenChange }: GlobalRecordingSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  
  const debouncedQuery = useDebounce(query, 300);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('meeting_recordings_extended' as any)
        .select('id, title, source_type, created_at, duration_seconds, executive_summary, transcript')
        .or(`transcript.ilike.%${searchQuery}%,executive_summary.ilike.%${searchQuery}%,title.ilike.%${searchQuery}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const processedResults: SearchResult[] = (data || []).map((rec: any) => {
        let matchType: 'transcript' | 'summary' | 'title' = 'title';
        let highlight = '';

        if (rec.title?.toLowerCase().includes(searchQuery.toLowerCase())) {
          matchType = 'title';
          highlight = rec.title;
        } else if (rec.executive_summary?.toLowerCase().includes(searchQuery.toLowerCase())) {
          matchType = 'summary';
          highlight = extractHighlight(rec.executive_summary, searchQuery);
        } else if (rec.transcript?.toLowerCase().includes(searchQuery.toLowerCase())) {
          matchType = 'transcript';
          highlight = extractHighlight(rec.transcript, searchQuery);
        }

        return {
          id: rec.id,
          title: rec.title || 'Untitled Recording',
          source_type: rec.source_type,
          created_at: rec.created_at,
          duration_seconds: rec.duration_seconds || 0,
          executive_summary: rec.executive_summary,
          transcript_excerpt: rec.transcript?.slice(0, 200) || '',
          match_type: matchType,
          highlight
        };
      });

      setResults(processedResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery, performSearch]);

  const handleResultClick = (recordingId: string) => {
    navigate(`/recording/${recordingId}`);
    onOpenChange(false);
    setQuery('');
    setResults([]);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'live_hub':
        return <Mic className="h-4 w-4" />;
      case 'conversation_call':
        return <User className="h-4 w-4" />;
      default:
        return <Video className="h-4 w-4" />;
    }
  };

  const getMatchIcon = (type: string) => {
    switch (type) {
      case 'transcript':
        return <FileText className="h-3 w-3" />;
      case 'summary':
        return <Quote className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search All Recordings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transcripts, summaries, quotes..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                performSearch(e.target.value);
              }}
              className="pl-10 text-lg h-12"
              autoFocus
            />
          </div>

          {/* Search Results */}
          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <Skeleton className="h-5 w-2/3 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-2">
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result.id)}
                    className="w-full text-left p-4 border rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getSourceIcon(result.source_type)}
                          <h4 className="font-medium truncate">{result.title}</h4>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(result.created_at), 'MMM d, yyyy')}
                          </span>
                          <span>•</span>
                          <span>{formatDuration(result.duration_seconds)}</span>
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            {getMatchIcon(result.match_type)}
                            {result.match_type}
                          </Badge>
                        </div>

                        {/* Highlighted match */}
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {highlightSearchTerm(result.highlight, query)}
                        </p>
                      </div>

                      <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            ) : query.length >= 3 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recordings found for "{query}"</p>
                <p className="text-sm mt-1">Try different keywords or phrases</p>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Type at least 3 characters to search</p>
                <p className="text-sm mt-1">Search through transcripts, summaries, and quotes</p>
              </div>
            )}
          </ScrollArea>

          {/* Quick tips */}
          <div className="text-xs text-muted-foreground border-t pt-3">
            <p>Pro tips: Search for specific quotes, candidate names, or topics discussed</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function extractHighlight(text: string, query: string): string {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  
  if (index === -1) return text.slice(0, 150);
  
  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + query.length + 100);
  
  let excerpt = text.slice(start, end);
  if (start > 0) excerpt = '...' + excerpt;
  if (end < text.length) excerpt = excerpt + '...';
  
  return excerpt;
}

function highlightSearchTerm(text: string, query: string): React.ReactNode {
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

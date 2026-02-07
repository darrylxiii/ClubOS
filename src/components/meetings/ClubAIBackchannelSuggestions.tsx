import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sparkles, MessageSquare, AlertTriangle, Lightbulb, 
  RefreshCw, ThumbsUp, ThumbsDown, Copy, Check 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Suggestion {
  id: string;
  type: 'question' | 'concern' | 'insight';
  content: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
  used?: boolean;
}

interface ClubAIBackchannelSuggestionsProps {
  meetingId: string;
  recentTranscript?: string;
  onSuggestionUsed?: (suggestion: Suggestion) => void;
}

export function ClubAIBackchannelSuggestions({
  meetingId,
  recentTranscript,
  onSuggestionUsed
}: ClubAIBackchannelSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastAnalyzedLength, setLastAnalyzedLength] = useState(0);

  // Auto-generate suggestions when transcript updates significantly
  useEffect(() => {
    const transcriptLength = recentTranscript?.length || 0;
    // Only re-analyze if transcript grew by at least 500 chars
    if (transcriptLength - lastAnalyzedLength > 500) {
      generateSuggestions();
      setLastAnalyzedLength(transcriptLength);
    }
  }, [recentTranscript]);

  const generateSuggestions = useCallback(async () => {
    if (!recentTranscript || loading) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-interview-realtime', {
        body: {
          meetingId,
          transcript: recentTranscript.slice(-3000),
          requestType: 'suggestions'
        }
      });

      if (error) throw error;

      if (data?.suggestions) {
        const newSuggestions: Suggestion[] = data.suggestions.map((s: any, idx: number) => ({
          id: `${Date.now()}-${idx}`,
          type: s.type || 'question',
          content: s.content,
          priority: s.priority || 'medium',
          timestamp: new Date()
        }));

        setSuggestions(prev => {
          // Keep only unique suggestions by content
          const combined = [...newSuggestions, ...prev];
          const unique = combined.filter((s, i, arr) => 
            arr.findIndex(x => x.content === s.content) === i
          );
          return unique.slice(0, 10);
        });
      }
    } catch (err) {
      console.error('Failed to generate suggestions:', err);
    } finally {
      setLoading(false);
    }
  }, [meetingId, recentTranscript, loading]);

  const copyToClipboard = (suggestion: Suggestion) => {
    navigator.clipboard.writeText(suggestion.content);
    setCopiedId(suggestion.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const markAsUsed = (suggestion: Suggestion) => {
    setSuggestions(prev => 
      prev.map(s => s.id === suggestion.id ? { ...s, used: true } : s)
    );
    onSuggestionUsed?.(suggestion);
  };

  const dismissSuggestion = (id: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== id));
  };

  const getTypeIcon = (type: Suggestion['type']) => {
    switch (type) {
      case 'question':
        return <MessageSquare className="h-4 w-4" />;
      case 'concern':
        return <AlertTriangle className="h-4 w-4" />;
      case 'insight':
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: Suggestion['type']) => {
    switch (type) {
      case 'question':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'concern':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'insight':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }
  };

  const getPriorityBadge = (priority: Suggestion['priority']) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">High</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="text-xs">Medium</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-xs">Low</Badge>;
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Club AI Suggestions
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={generateSuggestions}
            disabled={loading}
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Club AI is analyzing the conversation...</p>
            <p className="text-xs mt-1">Suggestions will appear as the interview progresses</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-2">
            <AnimatePresence>
              <div className="space-y-2">
                {suggestions.map((suggestion) => (
                  <motion.div
                    key={suggestion.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className={cn(
                      'p-3 rounded-lg border transition-all',
                      getTypeColor(suggestion.type),
                      suggestion.used && 'opacity-50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(suggestion.type)}
                        <span className="text-xs font-medium capitalize">
                          {suggestion.type}
                        </span>
                        {getPriorityBadge(suggestion.priority)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(suggestion)}
                        >
                          {copiedId === suggestion.id ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <p className="text-sm mb-2">{suggestion.content}</p>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          copyToClipboard(suggestion);
                          markAsUsed(suggestion);
                        }}
                      >
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        Use
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => dismissSuggestion(suggestion.id)}
                      >
                        <ThumbsDown className="h-3 w-3 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

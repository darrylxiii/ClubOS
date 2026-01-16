import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { aiService } from '@/services/aiService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sparkles, Play, Share2, RefreshCw, AlertTriangle,
  CheckCircle2, Lightbulb, Users, Code, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AIClip {
  id: string;
  title: string | null;
  description: string | null;
  start_ms: number;
  end_ms: number;
  highlight_type: string | null;
  ai_reasoning: string | null;
  confidence_score: number | null;
  transcript_excerpt?: string | null;
}

interface AIHighlightClipsProps {
  recordingId: string;
  onSeek?: (timeMs: number) => void;
  onShare?: (clip: AIClip) => void;
}

export function AIHighlightClips({ recordingId, onSeek, onShare }: AIHighlightClipsProps) {
  const [clips, setClips] = useState<AIClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadClips();
  }, [recordingId]);

  const loadClips = async () => {
    try {
      const { data, error } = await supabase
        .from('meeting_clips')
        .select('*')
        .eq('recording_id', recordingId)
        .eq('ai_generated', true)
        .order('start_time_ms', { ascending: true });

      if (error) throw error;
      setClips(data || []);
    } catch (error) {
      console.error('Error loading AI clips:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateHighlights = async () => {
    setGenerating(true);
    try {
      const data = await aiService.generateHighlightClips(recordingId);

      if (!data) throw new Error("No highlights generated");

      toast.success(`Generated ${data?.clips?.length || 0} highlight clips`);
      loadClips();
    } catch (error) {
      console.error('Failed to generate highlights:', error);
      toast.error('Failed to generate highlights');
    } finally {
      setGenerating(false);
    }
  };

  const getHighlightIcon = (type: string) => {
    switch (type) {
      case 'strong_answer':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'red_flag':
        return <AlertTriangle className="h-4 w-4 text-rose-500" />;
      case 'key_decision':
        return <Lightbulb className="h-4 w-4 text-amber-500" />;
      case 'cultural_fit':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'technical_excellence':
        return <Code className="h-4 w-4 text-purple-500" />;
      default:
        return <Sparkles className="h-4 w-4 text-primary" />;
    }
  };

  const getHighlightColor = (type: string) => {
    switch (type) {
      case 'strong_answer':
        return 'bg-green-500/10 border-green-500/20 hover:bg-green-500/15';
      case 'red_flag':
        return 'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/15';
      case 'key_decision':
        return 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15';
      case 'cultural_fit':
        return 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15';
      case 'technical_excellence':
        return 'bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/15';
      default:
        return 'bg-primary/10 border-primary/20 hover:bg-primary/15';
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatHighlightType = (type: string | null) => {
    if (!type) return 'Unknown';
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Highlights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Highlights
            {clips.length > 0 && (
              <Badge variant="secondary">{clips.length}</Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={generateHighlights}
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                {clips.length > 0 ? 'Regenerate' : 'Generate'}
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {clips.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground mb-2">No AI highlights yet</p>
            <p className="text-sm text-muted-foreground">
              Click "Generate" to have QUIN identify key moments
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {clips.map((clip) => (
                <div
                  key={clip.id}
                  className={cn(
                    'p-4 rounded-lg border cursor-pointer transition-colors',
                    getHighlightColor(clip.highlight_type || 'default')
                  )}
                  onClick={() => onSeek?.(clip.start_ms)}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      {getHighlightIcon(clip.highlight_type || 'default')}
                      <span className="font-medium text-sm">{clip.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {formatTime(clip.start_ms)} - {formatTime(clip.end_ms)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onShare?.(clip);
                        }}
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {formatHighlightType(clip.highlight_type)}
                    </Badge>
                    {clip.confidence_score && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(clip.confidence_score * 100)}% confidence
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {clip.ai_reasoning || clip.description}
                  </p>

                  {clip.transcript_excerpt && (
                    <div className="mt-2 p-2 bg-background/50 rounded text-xs text-muted-foreground italic line-clamp-2">
                      "{clip.transcript_excerpt}"
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeek?.(clip.start_ms);
                      }}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Play
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

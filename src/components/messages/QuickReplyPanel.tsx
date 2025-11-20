import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/hooks/useMessages';

interface QuickReplyPanelProps {
  lastMessage?: Message;
  onSelectReply: (content: string) => void;
}

export function QuickReplyPanel({ lastMessage, onSelectReply }: QuickReplyPanelProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lastMessage?.content) {
      generateSuggestions();
    }
  }, [lastMessage?.id]);

  const generateSuggestions = async () => {
    if (!lastMessage?.content) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-quick-replies', {
        body: { messageContent: lastMessage.content }
      });

      if (error) throw error;
      if (data?.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      // Fallback to generic suggestions
      setSuggestions([
        'Thanks for letting me know!',
        'Got it, will do.',
        'Sounds good 👍'
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!lastMessage || suggestions.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-t bg-muted/30">
      <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {loading ? (
          <div className="text-sm text-muted-foreground">Generating suggestions...</div>
        ) : (
          suggestions.map((suggestion, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              onClick={() => onSelectReply(suggestion)}
              className="whitespace-nowrap"
            >
              <Zap className="h-3 w-3 mr-1" />
              {suggestion}
            </Button>
          ))
        )}
      </div>
    </div>
  );
}

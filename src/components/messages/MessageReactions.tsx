import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Reaction {
  id: string;
  emoji: string;
  user_id: string;
  count?: number;
  users?: { id: string; full_name: string }[];
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  onReactionsChange: () => void;
}

const EMOJI_OPTIONS = ['👍', '❤️', '😊', '🎉', '🚀', '👀', '💯', '🔥'];

export function MessageReactions({ messageId, reactions, onReactionsChange }: MessageReactionsProps) {
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);

  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = { emoji: reaction.emoji, count: 0, userIds: [], hasUserReacted: false };
    }
    acc[reaction.emoji].count++;
    acc[reaction.emoji].userIds.push(reaction.user_id);
    if (reaction.user_id === user?.id) {
      acc[reaction.emoji].hasUserReacted = true;
    }
    return acc;
  }, {} as Record<string, { emoji: string; count: number; userIds: string[]; hasUserReacted: boolean }>);

  const handleReaction = async (emoji: string) => {
    if (!user) return;

    try {
      const existingReaction = reactions.find(r => r.emoji === emoji && r.user_id === user.id);

      if (existingReaction) {
        await supabase.from('message_reactions').delete().eq('id', existingReaction.id);
      } else {
        await supabase.from('message_reactions').insert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        });
      }

      onReactionsChange();
    } catch (error) {
      console.error('Error toggling reaction:', error);
      toast.error('Failed to react to message');
    }
  };

  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      {Object.values(groupedReactions).map(({ emoji, count, hasUserReacted }) => (
        <Button
          key={emoji}
          variant="outline"
          size="sm"
          className={cn(
            'h-6 px-2 text-xs',
            hasUserReacted && 'bg-primary/10 border-primary'
          )}
          onClick={() => handleReaction(emoji)}
        >
          <span>{emoji}</span>
          <span className="ml-1">{count}</span>
        </Button>
      ))}

      <Popover open={isAdding} onOpenChange={setIsAdding}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Smile className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="grid grid-cols-4 gap-1">
            {EMOJI_OPTIONS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => {
                  handleReaction(emoji);
                  setIsAdding(false);
                }}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

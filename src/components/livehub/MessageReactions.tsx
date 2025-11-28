import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const COMMON_EMOJIS = ['👍', '👎', '❤️', '😂', '🎉', '🤔', '🔥', '💯'];

interface Reaction {
  emoji: string;
  count: number;
  users: string[];
  hasUserReacted: boolean;
}

interface MessageReactionsProps {
  messageId: string;
}

const MessageReactions = ({ messageId }: MessageReactionsProps) => {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  useEffect(() => {
    loadReactions();
    subscribeToReactions();
  }, [messageId]);

  const loadReactions = async () => {
    const { data, error } = await supabase
      .from('live_channel_message_reactions')
      .select('emoji, user_id')
      .eq('message_id', messageId);

    if (error) {
      console.error('Error loading reactions:', error);
      return;
    }

    // Group reactions by emoji
    const grouped = data.reduce((acc, r) => {
      if (!acc[r.emoji]) {
        acc[r.emoji] = {
          emoji: r.emoji,
          count: 0,
          users: [],
          hasUserReacted: false
        };
      }
      acc[r.emoji].count++;
      acc[r.emoji].users.push(r.user_id);
      if (r.user_id === user?.id) {
        acc[r.emoji].hasUserReacted = true;
      }
      return acc;
    }, {} as Record<string, Reaction>);

    setReactions(Object.values(grouped));
  };

  const subscribeToReactions = () => {
    const channel = supabase
      .channel(`reactions:${messageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_channel_message_reactions',
          filter: `message_id=eq.${messageId}`
        },
        () => loadReactions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const toggleReaction = async (emoji: string) => {
    if (!user) return;

    const reaction = reactions.find(r => r.emoji === emoji);
    
    if (reaction?.hasUserReacted) {
      // Remove reaction
      const { error } = await supabase
        .from('live_channel_message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);

      if (error) {
        console.error('Error removing reaction:', error);
        toast.error('Failed to remove reaction');
      }
    } else {
      // Add reaction
      const { error } = await supabase
        .from('live_channel_message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji
        });

      if (error) {
        console.error('Error adding reaction:', error);
        toast.error('Failed to add reaction');
      }
    }

    setIsPickerOpen(false);
  };

  if (reactions.length === 0 && !isPickerOpen) {
    return (
      <div className="flex items-center gap-1 mt-1">
        <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100">
              <Plus className="w-3 h-3 mr-1" />
              Add reaction
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="flex gap-1">
              {COMMON_EMOJIS.map(emoji => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-lg hover:bg-muted"
                  onClick={() => toggleReaction(emoji)}
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

  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      {reactions.map(reaction => (
        <Button
          key={reaction.emoji}
          variant="ghost"
          size="sm"
          className={`h-6 px-2 text-xs ${reaction.hasUserReacted ? 'bg-primary/10 border border-primary' : 'border border-border'}`}
          onClick={() => toggleReaction(reaction.emoji)}
        >
          <span className="mr-1">{reaction.emoji}</span>
          <span>{reaction.count}</span>
        </Button>
      ))}
      <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
            <Plus className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="flex gap-1">
            {COMMON_EMOJIS.map(emoji => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-lg hover:bg-muted"
                onClick={() => toggleReaction(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default MessageReactions;

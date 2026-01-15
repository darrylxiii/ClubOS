import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Smile } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { EnhancedEmojiPicker } from './EnhancedEmojiPicker';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

export function MessageReactions({ messageId, reactions, onReactionsChange }: MessageReactionsProps) {
  const { user } = useAuth();

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        userIds: [],
        hasUserReacted: false,
        userNames: []
      };
    }
    acc[reaction.emoji].count++;
    acc[reaction.emoji].userIds.push(reaction.user_id);

    // Add user name if available (assuming it's passed in the reaction object or we'd need to fetch it)
    // For now, we'll use a placeholder if not available, but ideally this comes from the join
    if (reaction.users && reaction.users[0]) {
      acc[reaction.emoji].userNames.push(reaction.users[0].full_name);
    }

    if (reaction.user_id === user?.id) {
      acc[reaction.emoji].hasUserReacted = true;
    }
    return acc;
  }, {} as Record<string, {
    emoji: string;
    count: number;
    userIds: string[];
    hasUserReacted: boolean;
    userNames: string[];
  }>);

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
    } catch (_error) {
      console.error('Error toggling reaction:', error);
      toast.error('Failed to react to message');
    }
  };

  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      <TooltipProvider>
        {Object.values(groupedReactions).map(({ emoji, count, hasUserReacted, userNames }) => (
          <Tooltip key={emoji}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'h-6 px-2 text-xs transition-all hover:scale-105',
                  hasUserReacted && 'bg-primary/10 border-primary text-primary'
                )}
                onClick={() => handleReaction(emoji)}
              >
                <span>{emoji}</span>
                <span className="ml-1 font-medium">{count}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                {userNames.length > 0 ? (
                  <div className="flex flex-col gap-0.5">
                    {userNames.slice(0, 5).map((name, i) => (
                      <span key={i}>{name}</span>
                    ))}
                    {userNames.length > 5 && (
                      <span className="text-muted-foreground">+{userNames.length - 5} more</span>
                    )}
                  </div>
                ) : (
                  <span>{count} reaction{count !== 1 ? 's' : ''}</span>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>

      <EnhancedEmojiPicker onSelect={handleReaction}>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity data-[state=open]:opacity-100"
        >
          <Smile className="h-3 w-3 text-muted-foreground hover:text-foreground" />
        </Button>
      </EnhancedEmojiPicker>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { EnhancedEmojiPicker } from "./EnhancedEmojiPicker";

interface Reaction {
  id: string;
  emoji: string;
  user_id: string;
  created_at: string;
}

interface MessageReactionsDisplayProps {
  messageId: string;
}

export const MessageReactionsDisplay = ({ messageId }: MessageReactionsDisplayProps) => {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Reaction[]>([]);

  useEffect(() => {
    loadReactions();

    const channel = supabase
      .channel(`reactions-${messageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${messageId}`,
        },
        () => {
          loadReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId]);

  const loadReactions = async () => {
    const { data, error } = await supabase
      .from('message_reactions')
      .select('*')
      .eq('message_id', messageId);

    if (error) {
      console.error('Error loading reactions:', error);
      return;
    }

    setReactions(data || []);
  };

  const handleAddReaction = async (emoji: string) => {
    if (!user) return;

    const existing = reactions.find(
      (r) => r.emoji === emoji && r.user_id === user.id
    );

    if (existing) {
      await supabase
        .from('message_reactions')
        .delete()
        .eq('id', existing.id);
      toast.success("Reaction removed");
    } else {
      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        });

      if (error) {
        console.error('Error adding reaction:', error);
        toast.error("Failed to add reaction");
      }
    }
  };

  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, Reaction[]>);

  if (Object.keys(groupedReactions).length === 0) {
    return (
      <EnhancedEmojiPicker onSelect={handleAddReaction}>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </EnhancedEmojiPicker>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {Object.entries(groupedReactions).map(([emoji, reactionList]) => {
        const hasReacted = reactionList.some((r) => r.user_id === user?.id);
        return (
          <Popover key={emoji}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAddReaction(emoji)}
                className={`h-6 px-2 text-xs gap-1 hover:scale-110 transition-all ${
                  hasReacted ? 'bg-primary/20 ring-1 ring-primary/50' : 'bg-accent/50'
                }`}
              >
                <span>{emoji}</span>
                <span className="text-xs">{reactionList.length}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2 glass-card" align="center">
              <div className="text-xs space-y-1">
                {reactionList.map((r) => (
                  <div key={r.id} className="text-muted-foreground">
                    {r.user_id === user?.id ? "You" : "Someone"} reacted with {emoji}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        );
      })}
      <EnhancedEmojiPicker onSelect={handleAddReaction}>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs hover:scale-110 transition-all"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </EnhancedEmojiPicker>
    </div>
  );
};

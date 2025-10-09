import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { EnhancedEmojiPicker } from "./EnhancedEmojiPicker";
import { cn } from "@/lib/utils";

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
          size="icon"
          className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-accent/50 shadow-glass-sm"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </EnhancedEmojiPicker>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      {Object.entries(groupedReactions).map(([emoji, reactionList]) => {
        const hasReacted = reactionList.some((r) => r.user_id === user?.id);
        return (
          <Popover key={emoji}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAddReaction(emoji)}
                className={cn(
                  "h-7 w-7 p-0 rounded-full text-sm hover:scale-125 transition-all shadow-glass-sm",
                  hasReacted ? 'bg-primary/20 ring-2 ring-primary/50 shadow-glow' : 'bg-accent/50 hover:bg-accent/70'
                )}
              >
                <span className="text-base">{emoji}</span>
                <span className="absolute -top-1 -right-1 text-[10px] font-bold bg-background rounded-full w-4 h-4 flex items-center justify-center border border-border/50">
                  {reactionList.length}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2 glass-card border-primary/20" align="center" side="left">
              <div className="text-xs space-y-1 font-medium">
                {reactionList.map((r) => (
                  <div key={r.id} className="text-foreground/80">
                    {r.user_id === user?.id ? "You" : "Someone"} reacted {emoji}
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
          size="icon"
          className="h-7 w-7 rounded-full hover:scale-125 transition-all hover:bg-accent/70 shadow-glass-sm"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </EnhancedEmojiPicker>
    </div>
  );
};

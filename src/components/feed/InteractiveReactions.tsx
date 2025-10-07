import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Heart, ThumbsUp, Smile, Sparkles, Flame, Trophy } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const REACTIONS = [
  { type: 'like', icon: ThumbsUp, label: 'Like', color: 'text-blue-500' },
  { type: 'love', icon: Heart, label: 'Love', color: 'text-red-500' },
  { type: 'celebrate', icon: Trophy, label: 'Celebrate', color: 'text-yellow-500' },
  { type: 'insightful', icon: Sparkles, label: 'Insightful', color: 'text-purple-500' },
  { type: 'funny', icon: Smile, label: 'Funny', color: 'text-orange-500' },
  { type: 'fire', icon: Flame, label: 'Fire', color: 'text-red-600' },
];

interface InteractiveReactionsProps {
  postId: string;
  postAuthorId: string;
  initialReactions?: Record<string, number>;
}

export function InteractiveReactions({ postId, postAuthorId, initialReactions = {} }: InteractiveReactionsProps) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Record<string, number>>(initialReactions);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    fetchReactions();
    fetchUserReaction();
  }, [postId]);

  const fetchReactions = async () => {
    const { data } = await supabase
      .from('post_reactions')
      .select('reaction_type')
      .eq('post_id', postId);

    if (data) {
      const counts: Record<string, number> = {};
      data.forEach(r => {
        counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
      });
      setReactions(counts);
    }
  };

  const fetchUserReaction = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('post_reactions')
      .select('reaction_type')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single();

    if (data) setUserReaction(data.reaction_type);
  };

  const handleReaction = async (reactionType: string) => {
    if (!user) {
      toast({ title: "Please sign in to react", variant: "destructive" });
      return;
    }

    try {
      if (userReaction === reactionType) {
        // Remove reaction
        await supabase
          .from('post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        
        setReactions(prev => ({
          ...prev,
          [reactionType]: Math.max(0, (prev[reactionType] || 0) - 1)
        }));
        setUserReaction(null);
      } else {
        // Add or update reaction
        if (userReaction) {
          await supabase
            .from('post_reactions')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', user.id);
          
          setReactions(prev => ({
            ...prev,
            [userReaction]: Math.max(0, (prev[userReaction] || 0) - 1)
          }));
        }

        await supabase
          .from('post_reactions')
          .insert({
            post_id: postId,
            user_id: user.id,
            reaction_type: reactionType
          });

        setReactions(prev => ({
          ...prev,
          [reactionType]: (prev[reactionType] || 0) + 1
        }));
        setUserReaction(reactionType);

        // Track like engagement
        if (user.id !== postAuthorId) {
          await (supabase as any).from('post_engagement_signals').upsert({
            user_id: user.id,
            post_id: postId,
            liked: true,
            liked_at: new Date().toISOString(),
          }, { onConflict: 'user_id,post_id' });

          await (supabase as any).rpc('update_relationship_score', {
            p_user_id: user.id,
            p_related_user_id: postAuthorId,
          });
        }
      }
      setShowPicker(false);
    } catch (error) {
      console.error('Reaction error:', error);
    }
  };

  const totalReactions = Object.values(reactions).reduce((sum, count) => sum + count, 0);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => setShowPicker(!showPicker)}
          onMouseEnter={() => setShowPicker(true)}
        >
          {userReaction ? (
            <>
              {REACTIONS.find(r => r.type === userReaction)?.icon && (
                <>
                  {(() => {
                    const Icon = REACTIONS.find(r => r.type === userReaction)!.icon;
                    return <Icon className={`w-4 h-4 ${REACTIONS.find(r => r.type === userReaction)!.color}`} />;
                  })()}
                </>
              )}
            </>
          ) : (
            <ThumbsUp className="w-4 h-4" />
          )}
          {totalReactions > 0 && <span>{totalReactions}</span>}
        </Button>

        {/* Reaction Summary */}
        {totalReactions > 0 && (
          <div className="flex gap-1">
            {Object.entries(reactions)
              .filter(([_, count]) => count > 0)
              .sort(([_, a], [__, b]) => b - a)
              .slice(0, 3)
              .map(([type, count]) => {
                const reaction = REACTIONS.find(r => r.type === type);
                if (!reaction) return null;
                const Icon = reaction.icon;
                return (
                  <div key={type} className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Icon className={`w-3 h-3 ${reaction.color}`} />
                    <span>{count}</span>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Reaction Picker */}
      {showPicker && (
        <div 
          className="absolute left-0 bottom-full mb-2 p-2 bg-card border rounded-lg shadow-lg flex gap-1 z-50 animate-scale-in"
          onMouseLeave={() => setShowPicker(false)}
        >
          {REACTIONS.map((reaction) => {
            const Icon = reaction.icon;
            const isActive = userReaction === reaction.type;
            return (
              <Button
                key={reaction.type}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                className={`group relative ${isActive ? reaction.color : ''}`}
                onClick={() => handleReaction(reaction.type)}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'scale-125' : 'group-hover:scale-125'} transition-transform ${reaction.color}`} />
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {reaction.label}
                </span>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}

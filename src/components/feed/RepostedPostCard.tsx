import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, ExternalLink, Sparkles, ChevronDown, ThumbsUp, Trophy, Smile, Flame } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { LazyMedia } from "./LazyMedia";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DOMPurify from "dompurify";

interface RepostedPostCardProps {
  originalPost: any;
}

const REACTIONS = [
  { type: 'like', icon: ThumbsUp, label: 'Like', color: 'text-blue-500' },
  { type: 'love', icon: Heart, label: 'Love', color: 'text-red-500' },
  { type: 'celebrate', icon: Trophy, label: 'Celebrate', color: 'text-yellow-500' },
  { type: 'insightful', icon: Sparkles, label: 'Insightful', color: 'text-purple-500' },
  { type: 'funny', icon: Smile, label: 'Funny', color: 'text-orange-500' },
  { type: 'fire', icon: Flame, label: 'Fire', color: 'text-red-600' },
];

export function RepostedPostCard({ originalPost }: RepostedPostCardProps) {
  const navigate = useNavigate();
  const [showSummary, setShowSummary] = useState(false);
  const [liveLikesCount, setLiveLikesCount] = useState(originalPost.post_likes?.length || 0);
  const [liveCommentsCount, setLiveCommentsCount] = useState(originalPost.post_comments?.length || 0);
  const [reactionBreakdown, setReactionBreakdown] = useState<Record<string, number>>({});

  const author = originalPost.profiles || originalPost.companies;
  const authorName = author?.full_name || author?.name || "Unknown";
  const authorImage = author?.avatar_url || author?.logo_url;
  const authorTitle = originalPost.profiles?.current_title || "Company";

  const mediaUrls = Array.isArray(originalPost.media_urls) ? originalPost.media_urls : [];
  const firstMedia = mediaUrls[0];
  const additionalMediaCount = mediaUrls.length - 1;

  const fetchReactionBreakdown = async () => {
    const { data } = await supabase
      .from('post_reactions')
      .select('reaction_type')
      .eq('post_id', originalPost.id);

    if (data) {
      const counts: Record<string, number> = {};
      data.forEach(r => {
        counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
      });
      setReactionBreakdown(counts);
      setLiveLikesCount(data.length);
    }
  };

  useEffect(() => {
    // Initial fetch of reaction breakdown
    fetchReactionBreakdown();

    // Subscribe to reactions changes
    const reactionsChannel = supabase
      .channel(`reactions-${originalPost.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_reactions',
          filter: `post_id=eq.${originalPost.id}`
        },
        () => {
          fetchReactionBreakdown();
        }
      )
      .subscribe();

    // Subscribe to comments changes
    const commentsChannel = supabase
      .channel(`comments-${originalPost.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_comments',
          filter: `post_id=eq.${originalPost.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLiveCommentsCount((prev: number) => prev + 1);
          } else if (payload.eventType === 'DELETE') {
            setLiveCommentsCount((prev: number) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reactionsChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [originalPost.id]);

  const handleViewOriginal = () => {
    navigate(`/post/${originalPost.id}`);
  };

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (originalPost.profiles) {
      navigate(`/profile/${originalPost.user_id}`);
    } else if (originalPost.companies) {
      navigate(`/companies/${originalPost.companies.slug}`);
    }
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden cursor-pointer",
        "border-l-4 border-accent/50",
        "bg-muted/30 hover:bg-muted/50",
        "transition-all duration-200",
        "hover:scale-[1.01] hover:shadow-md"
      )}
      onClick={handleViewOriginal}
    >
      <div className="p-4 space-y-3">
        {/* Original Author */}
        <div className="flex items-center gap-3">
          <Avatar
            className="w-10 h-10 cursor-pointer ring-2 ring-transparent hover:ring-accent/50 transition-all"
            onClick={handleAuthorClick}
          >
            <AvatarImage src={authorImage} />
            <AvatarFallback>{authorName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4
                className="font-semibold text-sm hover:text-accent transition-colors truncate"
                onClick={handleAuthorClick}
              >
                {authorName}
              </h4>
              <Badge variant="secondary" className="text-xs shrink-0">
                Original
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{authorTitle}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(originalPost.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        {/* Content Preview (collapsed to 4 lines) */}
        {originalPost.content && (
          <div
            className="text-sm line-clamp-4 break-all overflow-hidden prose prose-sm max-w-none [&_a]:text-primary [&_a]:underline"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(originalPost.content, {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'b', 'i', 'div'],
                ALLOWED_ATTR: ['href', 'target', 'rel'],
                ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i
              })
            }}
          />
        )}

        {/* AI Summary */}
        {originalPost.ai_summary && (
          <Collapsible open={showSummary} onOpenChange={setShowSummary}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 w-full justify-start">
                <Sparkles className="w-4 h-4" />
                AI Summary
                <ChevronDown className={cn("w-4 h-4 transition-transform", showSummary && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                <p className="text-sm text-muted-foreground italic">{originalPost.ai_summary}</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Media Preview */}
        {firstMedia && (
          <div className="relative rounded-lg overflow-hidden">
            {firstMedia.type === 'image' ? (
              <LazyMedia
                src={firstMedia.url}
                alt="Post media"
                type="image"
                className="w-full h-48 object-cover"
              />
            ) : firstMedia.type === 'video' ? (
              <div className="relative w-full h-48 bg-muted flex items-center justify-center">
                <LazyMedia
                  src={firstMedia.url}
                  type="video"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : null}

            {additionalMediaCount > 0 && (
              <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md">
                <span className="text-xs font-medium">+{additionalMediaCount} more</span>
              </div>
            )}
          </div>
        )}

        {/* Original Post Stats (Read-only with Reaction Breakdown) */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {liveLikesCount > 0 && (
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              <span>{liveLikesCount}</span>
              {/* Show top 3 reaction types */}
              {Object.keys(reactionBreakdown).length > 0 && (
                <div className="flex gap-1 ml-2">
                  {Object.entries(reactionBreakdown)
                    .filter(([_, count]) => count > 0)
                    .sort(([_, a], [__, b]) => b - a)
                    .slice(0, 3)
                    .map(([type, count]) => {
                      const reaction = REACTIONS.find(r => r.type === type);
                      if (!reaction) return null;
                      const Icon = reaction.icon;
                      return (
                        <div key={type} className="flex items-center gap-1">
                          <Icon className={cn("w-3 h-3", reaction.color)} />
                          <span>{count}</span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
          <div className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            <span>{liveCommentsCount}</span>
          </div>
        </div>

        {/* View Original Link */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-2 text-accent hover:text-accent hover:bg-accent/10"
          onClick={handleViewOriginal}
        >
          View original post
          <ExternalLink className="w-3 h-3" />
        </Button>
      </div>
    </Card>
  );
}

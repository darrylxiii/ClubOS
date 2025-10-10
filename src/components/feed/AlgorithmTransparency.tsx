import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Info, TrendingUp, Users, Clock, Star, Eye, ThumbsUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AlgorithmTransparencyProps {
  postId: string;
  reasons: {
    engagement?: boolean;
    trending?: boolean;
    following?: boolean;
    recent?: boolean;
    interests?: string[];
    similarContent?: boolean;
  };
}

export function AlgorithmTransparency({ postId, reasons }: AlgorithmTransparencyProps) {
  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'engagement': return <ThumbsUp className="w-4 h-4" />;
      case 'trending': return <TrendingUp className="w-4 h-4" />;
      case 'following': return <Users className="w-4 h-4" />;
      case 'recent': return <Clock className="w-4 h-4" />;
      case 'interests': return <Star className="w-4 h-4" />;
      case 'similarContent': return <Eye className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getReasonText = (reason: string) => {
    switch (reason) {
      case 'engagement': return 'High engagement from your network';
      case 'trending': return 'Trending in your industry';
      case 'following': return 'From people you follow';
      case 'recent': return 'Recently posted';
      case 'interests': return 'Matches your interests';
      case 'similarContent': return 'Similar to content you liked';
      default: return '';
    }
  };

  const activeReasons = Object.entries(reasons)
    .filter(([_, value]) => value === true)
    .map(([key]) => key);

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Info className="w-4 h-4" />
          <span className="text-xs font-medium">Why am I seeing this?</span>
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 glass-card p-4" side="bottom" align="start">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-5 h-5 text-primary" />
            <h4 className="font-semibold text-sm">Why you're seeing this post</h4>
          </div>
          
          <div className="space-y-2">
            {activeReasons.map((reason) => (
              <div key={reason} className="flex items-start gap-2 p-2 rounded-lg glass-subtle">
                <div className="text-primary mt-0.5">
                  {getReasonIcon(reason)}
                </div>
                <span className="text-sm text-foreground">{getReasonText(reason)}</span>
              </div>
            ))}
            
            {reasons.interests && reasons.interests.length > 0 && (
              <div className="p-2 rounded-lg glass-subtle">
                <p className="text-sm text-foreground mb-2">Matches your interests:</p>
                <div className="flex flex-wrap gap-1">
                  {reasons.interests.map((interest) => (
                    <Badge key={interest} variant="secondary" className="text-xs">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-border/30 mt-3">
            <p className="text-xs text-muted-foreground">
              Our algorithm personalizes your feed based on your activity, connections, and interests.
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

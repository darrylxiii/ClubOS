import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { LazyMedia } from "./LazyMedia";
import { cn } from "@/lib/utils";

interface RepostedPostCardProps {
  originalPost: any;
}

export function RepostedPostCard({ originalPost }: RepostedPostCardProps) {
  const navigate = useNavigate();

  const author = originalPost.profiles || originalPost.companies;
  const authorName = author?.full_name || author?.name || "Unknown";
  const authorImage = author?.avatar_url || author?.logo_url;
  const authorTitle = originalPost.profiles?.current_title || "Company";
  
  const mediaUrls = Array.isArray(originalPost.media_urls) ? originalPost.media_urls : [];
  const firstMedia = mediaUrls[0];
  const additionalMediaCount = mediaUrls.length - 1;

  const likesCount = originalPost.post_likes?.length || 0;
  const commentsCount = originalPost.post_comments?.length || 0;

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
          <p className="text-sm line-clamp-4 whitespace-pre-wrap break-words">
            {originalPost.content}
          </p>
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

        {/* Original Post Stats (Read-only) */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            <span>{likesCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            <span>{commentsCount}</span>
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

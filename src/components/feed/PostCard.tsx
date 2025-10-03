import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThumbsUp, MessageCircle, Share2, MoreHorizontal, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PostComments } from "./PostComments";

interface PostCardProps {
  post: any;
  onUpdate: () => void;
}

export function PostCard({ post, onUpdate }: PostCardProps) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [isLiked, setIsLiked] = useState(
    post.post_likes?.some((like: any) => like.user_id === user?.id)
  );
  const [likeCount, setLikeCount] = useState(post.post_likes?.length || 0);

  const author = post.profiles || post.companies;
  const authorName = author?.full_name || author?.name || "Unknown";
  const authorImage = author?.avatar_url || author?.logo_url;
  const authorTitle = post.profiles?.current_title || "Company";

  const handleLike = async () => {
    if (!user) return;

    try {
      if (isLiked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
        
        setLikeCount(likeCount - 1);
        setIsLiked(false);
      } else {
        await supabase
          .from('post_likes')
          .insert({
            post_id: post.id,
            user_id: user.id
          });
        
        setLikeCount(likeCount + 1);
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Avatar className="w-12 h-12">
          <AvatarImage src={authorImage} />
          <AvatarFallback>{authorName.charAt(0)}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold">{authorName}</h3>
              <p className="text-sm text-muted-foreground">{authorTitle}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
          
          <p className="mt-3 whitespace-pre-wrap">{post.content}</p>
          
          {post.media_urls && post.media_urls.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {post.media_urls.map((media: any, index: number) => (
                <div key={index} className="relative">
                  {media.type === 'image' ? (
                    <img 
                      src={media.url} 
                      alt={media.name || `Media ${index + 1}`}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  ) : media.type === 'video' ? (
                    <video 
                      src={media.url}
                      controls
                      className="w-full h-64 rounded-lg"
                    />
                  ) : (
                    <a 
                      href={media.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      <FileText className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{media.name}</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <div className="flex items-center gap-4 mt-4 pt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={isLiked ? "text-primary" : ""}
            >
              <ThumbsUp className={`w-4 h-4 mr-2 ${isLiked ? "fill-current" : ""}`} />
              {likeCount > 0 && likeCount}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              {post.post_comments?.length > 0 && post.post_comments.length}
            </Button>
            
            <Button variant="ghost" size="sm" disabled>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
          
          {showComments && (
            <PostComments 
              postId={post.id}
              onCommentAdded={onUpdate}
            />
          )}
        </div>
      </div>
    </Card>
  );
}
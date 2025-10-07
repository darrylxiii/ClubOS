import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Share2, MoreHorizontal, FileText, Bookmark, Trash2, Edit, Copy, Flag, Mail, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PostComments } from "./PostComments";
import { CreateConversationDialog } from "@/components/messages/CreateConversationDialog";
import { InteractiveReactions } from "./InteractiveReactions";
import { PollPost } from "./PollPost";
import { PostAnalyticsButton } from "@/components/analytics/PostAnalyticsButton";
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";

interface PostCardProps {
  post: any;
  onUpdate: () => void;
}

export function PostCard({ post, onUpdate }: PostCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [pollTotalVotes, setPollTotalVotes] = useState(0);

  const author = post.profiles || post.companies;
  const authorName = author?.full_name || author?.name || "Unknown";
  const authorImage = author?.avatar_url || author?.logo_url;
  const authorTitle = post.profiles?.current_title || "Company";

  const isOwnPost = user?.id === post.user_id;
  const mediaUrls = Array.isArray(post.media_urls) ? post.media_urls : [];
  const hasPoll = post.poll_question && post.poll_options;

  useEffect(() => {
    if (hasPoll) {
      fetchPollVotes();
    }
  }, [post.id]);

  const fetchPollVotes = async () => {
    const { data } = await supabase
      .from('poll_votes')
      .select('option_id')
      .eq('poll_id', post.id);
    
    if (data) {
      setPollTotalVotes(data.length);
    }
  };

  const handleDelete = async () => {
    if (!user || !isOwnPost) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);

      if (error) throw error;

      toast({
        title: "Post deleted",
        description: "Your post has been deleted successfully."
      });
      onUpdate();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Failed to delete",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    toast({
      title: isSaved ? "Removed from saved" : "Saved",
      description: isSaved ? "Post removed from your saved items" : "Post saved to your collection"
    });
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Post link copied to clipboard"
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleReport = () => {
    toast({
      title: "Report submitted",
      description: "Thank you for helping keep our community safe."
    });
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
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSave}>
                  <Bookmark className="w-4 h-4 mr-2" />
                  {isSaved ? "Remove from saved" : "Save post"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShare}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy link
                </DropdownMenuItem>
                {isOwnPost && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit post
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete post
                    </DropdownMenuItem>
                  </>
                )}
                {!isOwnPost && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleReport} className="text-destructive">
                      <Flag className="w-4 h-4 mr-2" />
                      Report post
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <p className="mt-3 whitespace-pre-wrap">{post.content}</p>
          
          {/* Media Carousel */}
          {mediaUrls.length > 0 && (
            <div className="mt-3 relative">
              {mediaUrls.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background"
                    onClick={() => setCurrentMediaIndex(Math.max(0, currentMediaIndex - 1))}
                    disabled={currentMediaIndex === 0}
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background"
                    onClick={() => setCurrentMediaIndex(Math.min(mediaUrls.length - 1, currentMediaIndex + 1))}
                    disabled={currentMediaIndex === mediaUrls.length - 1}
                  >
                    <ChevronRight className="w-6 h-6" />
                  </Button>
                </>
              )}
              
              {mediaUrls.map((media: any, index: number) => {
                if (index !== currentMediaIndex) return null;
                
                return (
                  <div key={index} className="relative">
                    {media.type === 'image' ? (
                      <img 
                        src={media.url} 
                        alt={media.name || `Media ${index + 1}`}
                        className="w-full max-h-[500px] object-contain rounded-lg bg-muted"
                      />
                    ) : media.type === 'video' ? (
                      <video 
                        src={media.url}
                        controls
                        autoPlay
                        muted
                        loop
                        className="w-full max-h-[500px] rounded-lg"
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
                );
              })}
              
              {mediaUrls.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                  {mediaUrls.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentMediaIndex 
                          ? 'bg-primary w-4' 
                          : 'bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Poll Display */}
          {hasPoll && (
            <div className="mt-3">
              <PollPost
                pollId={post.id}
                question={post.poll_question}
                options={post.poll_options.map((opt: any, idx: number) => ({
                  id: `option_${idx}`,
                  text: opt.text,
                  votes: opt.votes || 0
                }))}
                totalVotes={pollTotalVotes}
                onVote={() => {
                  fetchPollVotes();
                  onUpdate();
                }}
              />
            </div>
          )}
          
          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <div className="flex items-center gap-2">
              {/* Interactive Reactions */}
              <InteractiveReactions postId={post.id} />
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(!showComments)}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                {post.post_comments?.length > 0 && <span className="text-sm">{post.post_comments.length}</span>}
              </Button>
              
              {!isOwnPost && user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMessageDialogOpen(true)}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  <span className="text-sm">Message</span>
                </Button>
              )}
              
              <Button variant="ghost" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                <span className="text-sm">Share</span>
              </Button>
            </div>
            
            <div className="flex items-center gap-1">
              {isOwnPost && (
                <PostAnalyticsButton postId={post.id} variant="ghost" size="sm" showLabel={false} />
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                className={isSaved ? "text-primary" : ""}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
              </Button>
            </div>
          </div>
          
          {showComments && (
            <PostComments 
              postId={post.id}
              onCommentAdded={onUpdate}
            />
          )}
        </div>
      </div>

      <CreateConversationDialog
        open={messageDialogOpen}
        onOpenChange={setMessageDialogOpen}
        preselectedUserId={post.user_id}
        onConversationCreated={(conversationId) => {
          navigate('/messages');
        }}
      />
    </Card>
  );
}
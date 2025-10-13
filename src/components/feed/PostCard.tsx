import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Share2, MoreHorizontal, FileText, Bookmark, Trash2, Edit, Copy, Flag, Mail, ChevronLeft, ChevronRight, Sparkles, ChevronDown, Twitter, Linkedin, Send, Flame } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PostComments } from "./PostComments";
import { CreateConversationDialog } from "@/components/messages/CreateConversationDialog";
import { InteractiveReactions } from "./InteractiveReactions";
import { PollPost } from "./PollPost";
import { PostAnalyticsButton } from "@/components/analytics/PostAnalyticsButton";
import { LiveViewerCounter } from "@/components/analytics/LiveViewerCounter";
import { useNavigate } from 'react-router-dom';
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { UserProfilePreview } from "@/components/UserProfilePreview";
import { CompanyProfilePreview } from "@/components/CompanyProfilePreview";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LazyMedia } from "./LazyMedia";
import { toast } from "@/hooks/use-toast";
import { useEngagementTracking } from "@/hooks/useEngagementTracking";
import { cn } from "@/lib/utils";
import { AlgorithmTransparency } from "./AlgorithmTransparency";
import { PostPinning } from "./PostPinning";
import { RepostButton } from "./RepostButton";
import { EditPostDialog } from "./EditPostDialog";
import { YouTubeEmbed } from "@/components/messages/YouTubeEmbed";
import { SocialEmbed } from "./SocialEmbed";

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
  const [showSummary, setShowSummary] = useState(false);
  const [userStreak, setUserStreak] = useState<number | null>(null);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showFullPost, setShowFullPost] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [repostCount, setRepostCount] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Engagement tracking
  const { trackLike, trackComment, trackShare, trackSave: trackSaveEngagement } = useEngagementTracking({
    postId: post.id,
    postAuthorId: post.user_id,
  });

  const author = post.profiles || post.companies;
  const authorName = author?.full_name || author?.name || "Unknown";
  const authorImage = author?.avatar_url || author?.logo_url;
  const authorTitle = post.profiles?.current_title || "Company";

  const isOwnPost = user?.id === post.user_id;
  const mediaUrls = Array.isArray(post.media_urls) ? post.media_urls : [];
  const hasPoll = post.poll_question && post.poll_options;

  // Check if content is longer than 4 lines (approximately 280 characters)
  const contentLines = post.content?.split('\n').length || 0;
  const isLongContent = contentLines > 4 || (post.content?.length || 0) > 280;

  useEffect(() => {
    if (hasPoll) {
      fetchPollVotes();
    }
    if (user) {
      checkIfSaved();
      fetchUserStreak();
      checkIfPinned();
      fetchRepostCount();
    }
  }, [post.id, user]);

  const checkIfPinned = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('pinned_posts')
      .select('id')
      .eq('user_id', user.id)
      .eq('post_id', post.id)
      .single();
    setIsPinned(!!data);
  };

  const fetchRepostCount = async () => {
    const { count } = await supabase
      .from('post_reposts')
      .select('*', { count: 'exact', head: true })
      .eq('original_post_id', post.id);
    setRepostCount(count || 0);
  };

  const checkIfSaved = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('saved_posts')
      .select('id')
      .eq('user_id', user.id)
      .eq('post_id', post.id)
      .single();
    setIsSaved(!!data);
  };

  const fetchUserStreak = async () => {
    if (!post.user_id) return;
    const { data } = await supabase
      .from('user_engagement')
      .select('current_streak')
      .eq('user_id', post.user_id)
      .single();
    if (data) {
      setUserStreak(data.current_streak);
    }
  };

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

  const handleSave = async () => {
    if (!user) {
      toast({ title: "Please sign in to save posts", variant: "destructive" });
      return;
    }

    try {
      if (isSaved) {
        await supabase
          .from('saved_posts')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', post.id);
        setIsSaved(false);
        trackSaveEngagement(false);
        toast({ title: "Removed from saved" });
      } else {
        await supabase
          .from('saved_posts')
          .insert({ user_id: user.id, post_id: post.id });
        setIsSaved(true);
        trackSaveEngagement(true);
        toast({ title: "Post saved" });
      }
    } catch (error) {
      toast({ title: "Error saving post", variant: "destructive" });
    }
  };

  const getShareUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/post/${post.id}`;
  };

  const handleShare = async (platform?: 'twitter' | 'linkedin' | 'whatsapp') => {
    const shareUrl = getShareUrl();
    const shareText = post.content.substring(0, 100) + (post.content.length > 100 ? '...' : '');

    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
      trackSharePlatform('twitter');
    } else if (platform === 'linkedin') {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
      trackSharePlatform('linkedin');
    } else if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
      trackSharePlatform('whatsapp');
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied",
          description: "Share this post with others"
        });
        trackSharePlatform('copy');
      } catch (error) {
        toast({
          title: "Failed to copy",
          variant: "destructive"
        });
      }
    }
  };

  const trackSharePlatform = async (platform: string) => {
    try {
      await supabase.from('post_shares').insert({
        post_id: post.id,
        shared_by: user?.id || null,
        share_platform: platform
      });
      trackShare(); // Also track in engagement signals
    } catch (error) {
      console.error('Error tracking share:', error);
    }
  };

  const handleReport = () => {
    toast({
      title: "Report submitted",
      description: "Thank you for helping keep our community safe."
    });
  };

  const handleAuthorClick = () => {
    if (post.profiles) {
      navigate(`/profile/${post.user_id}`, { state: { from: 'feed' } });
    } else if (post.companies) {
      navigate(`/companies/${post.companies.slug}`);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        {/* Clickable Avatar with Hover Preview */}
        <HoverCard openDelay={200}>
          <HoverCardTrigger asChild>
            <Avatar 
              className="w-12 h-12 cursor-pointer ring-2 ring-transparent hover:ring-accent transition-all"
              onClick={handleAuthorClick}
            >
              <AvatarImage src={authorImage} />
              <AvatarFallback>{authorName.charAt(0)}</AvatarFallback>
            </Avatar>
          </HoverCardTrigger>
          <HoverCardContent side="left" className="w-auto p-0 border-0 bg-transparent shadow-none">
            {post.profiles ? (
              <UserProfilePreview 
                userId={post.user_id} 
                onMessageClick={() => setMessageDialogOpen(true)}
              />
            ) : post.companies ? (
              <CompanyProfilePreview companyId={post.company_id} />
            ) : null}
          </HoverCardContent>
        </HoverCard>
        
        <div className="flex-1">
          <div className="flex items-start justify-between">
            {/* Clickable Name with Hover Preview */}
            <HoverCard openDelay={200}>
              <HoverCardTrigger asChild>
                <div 
                  className="cursor-pointer group"
                  onClick={handleAuthorClick}
                >
                  <h3 className="font-semibold group-hover:text-accent transition-colors">
                    {authorName}
                  </h3>
                  <p className="text-sm text-muted-foreground">{authorTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </p>
                </div>
              </HoverCardTrigger>
              <HoverCardContent side="left" className="w-auto p-0 border-0 bg-transparent shadow-none">
                {post.profiles ? (
                  <UserProfilePreview 
                    userId={post.user_id} 
                    onMessageClick={() => setMessageDialogOpen(true)}
                  />
                ) : post.companies ? (
                  <CompanyProfilePreview companyId={post.company_id} />
                ) : null}
              </HoverCardContent>
            </HoverCard>
            
            <div className="flex items-center gap-2">
              {user?.id === post.user_id && (
                <LiveViewerCounter postId={post.id} />
              )}
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
                <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleShare(); }}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy link
                </DropdownMenuItem>
                {isOwnPost && (
                  <DropdownMenuItem asChild>
                    <PostPinning 
                      postId={post.id} 
                      isPinned={isPinned} 
                      onToggle={() => setIsPinned(!isPinned)} 
                    />
                  </DropdownMenuItem>
                )}
                {isOwnPost && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
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
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            {userStreak && userStreak >= 3 && (
              <Badge variant="secondary" className="gap-1">
                <Flame className="w-3 h-3" />
                {userStreak} day streak
              </Badge>
            )}
          </div>

          <div className="relative">
            <div 
              className={cn(
                "mt-3 whitespace-pre-wrap prose prose-sm max-w-none",
                "[&_ul]:list-disc [&_ul]:ml-6",
                "[&_ol]:list-decimal [&_ol]:ml-6",
                "[&_a]:text-primary [&_a]:underline",
                isLongContent && isCollapsed && "line-clamp-4"
              )}
              dangerouslySetInnerHTML={{ 
                __html: DOMPurify.sanitize(post.content, {
                  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'b', 'i'],
                  ALLOWED_ATTR: ['href', 'target', 'rel'],
                  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
                })
              }}
            />
            
            {isLongContent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="mt-2 text-primary hover:text-primary/80"
              >
                {isCollapsed ? "Show full post" : "Show less"}
              </Button>
            )}
          </div>

          {/* AI Summary */}
          {post.ai_summary && (
            <Collapsible open={showSummary} onOpenChange={setShowSummary} className="mt-3">
              <div className="flex items-center gap-2">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI Summary
                    <ChevronDown className={`w-4 h-4 transition-transform ${showSummary ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="mt-2">
                <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                  <p className="text-sm text-muted-foreground italic">{post.ai_summary}</p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
          
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
                    {media.type === 'youtube' ? (
                      <YouTubeEmbed videoId={media.videoId} title={`Post by ${authorName}`} />
                    ) : media.type === 'social_embed' ? (
                      <SocialEmbed 
                        platform={media.platform}
                        postId={media.embedId}
                        url={media.url}
                      />
                    ) : media.type === 'image' ? (
                      <LazyMedia
                        src={media.url}
                        alt={media.name || `Media ${index + 1}`}
                        type="image"
                        className="w-full max-h-[500px] rounded-lg bg-muted"
                      />
                    ) : media.type === 'video' ? (
                      <LazyMedia
                        src={media.url}
                        type="video"
                        autoPlay
                        muted
                        loop
                        controls
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
          
          {/* Algorithm Transparency */}
          {post.feed_type === 'algorithmic' && (
            <div className="mt-3">
              <AlgorithmTransparency 
                postId={post.id}
                reasons={{
                  engagement: (post.like_count || 0) > 10,
                  trending: (post.like_count || 0) > 50,
                  following: !!post.profiles && user?.id !== post.user_id,
                  recent: new Date(post.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000),
                  interests: post.hashtags || [],
                  similarContent: true
                }}
              />
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <div className="flex items-center gap-2">
              {/* Interactive Reactions */}
              <InteractiveReactions postId={post.id} postAuthorId={post.user_id} />
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(!showComments)}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                {post.post_comments?.length > 0 && <span className="text-sm">{post.post_comments.length}</span>}
              </Button>

              <RepostButton 
                postId={post.id}
                repostCount={repostCount}
                onUpdate={() => {
                  fetchRepostCount();
                  onUpdate();
                }}
              />

              {user?.id === post.user_id && (
                <PostAnalyticsButton postId={post.id} variant="ghost" size="sm" showLabel={false} />
              )}
              
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
              
              <DropdownMenu open={shareMenuOpen} onOpenChange={setShareMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Share2 className="w-4 h-4 mr-2" />
                    <span className="text-sm">Share</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleShare('twitter'); }}>
                    <Twitter className="w-4 h-4 mr-2" />
                    Share on Twitter
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleShare('linkedin'); }}>
                    <Linkedin className="w-4 h-4 mr-2" />
                    Share on LinkedIn
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleShare('whatsapp'); }}>
                    <Send className="w-4 h-4 mr-2" />
                    Share on WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleShare(); }}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
              postAuthorId={post.user_id}
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

      <EditPostDialog
        post={post}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUpdate={onUpdate}
      />
    </Card>
  );
}
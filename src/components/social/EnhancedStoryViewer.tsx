import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Heart, Share2, Bookmark, MessageCircle, X, 
  ChevronLeft, ChevronRight, Flame, Laugh, ThumbsUp,
  Sparkles, MoreHorizontal, Trash2, Send
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption?: string;
  interactive_type?: string;
  interactive_data?: any;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
}

interface EnhancedStoryViewerProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
}

const REACTION_TYPES = [
  { type: 'like', icon: Heart, label: 'Like', color: 'text-red-500' },
  { type: 'love', icon: Heart, label: 'Love', color: 'text-pink-500' },
  { type: 'fire', icon: Flame, label: 'Fire', color: 'text-orange-500' },
  { type: 'clap', icon: ThumbsUp, label: 'Clap', color: 'text-yellow-500' },
  { type: 'wow', icon: Sparkles, label: 'Wow', color: 'text-purple-500' },
  { type: 'laugh', icon: Laugh, label: 'Laugh', color: 'text-green-500' },
];

interface StoryComment {
  id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
}

export function EnhancedStoryViewer({ stories, initialIndex, onClose }: EnhancedStoryViewerProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [showReactions, setShowReactions] = useState(false);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [stats, setStats] = useState({ views: 0, reactions: 0, shares: 0, saves: 0 });
  const [viewStartTime] = useState(Date.now());
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [replyText, setReplyText] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressInterval = useRef<NodeJS.Timeout>();

  const currentStory = stories[currentIndex];

  useEffect(() => {
    // Lock ALL scrolling when story viewer is open
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    
    const mainElement = document.querySelector('main');
    if (mainElement) {
      (mainElement as HTMLElement).style.overflow = 'hidden';
    }
    
    return () => {
      // Restore scrolling when story viewer closes
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
      
      if (mainElement) {
        (mainElement as HTMLElement).style.overflow = '';
      }
    };
  }, []);

  useEffect(() => {
    recordView();
    fetchStoryStats();
    checkUserInteractions();
    fetchComments();
    startProgress();

    return () => {
      recordViewDuration();
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [currentIndex]);

  const startProgress = () => {
    setProgress(0);
    const duration = currentStory.media_type === 'video' ? 15000 : 5000;
    const interval = 50;
    const increment = (interval / duration) * 100;

    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + increment;
      });
    }, interval);
  };

  const recordView = async () => {
    try {
      const supabaseAny = supabase as any;
      await supabaseAny.from('story_views').upsert({
        story_id: currentStory.id,
        viewer_id: user?.id,
        viewed_at: new Date().toISOString()
      }, {
        onConflict: 'story_id,viewer_id'
      });
    } catch (error) {
      console.error('[StoryViewer] Error recording view:', error);
    }
  };

  const recordViewDuration = async () => {
    try {
      const duration = Math.floor((Date.now() - viewStartTime) / 1000);
      const supabaseAny = supabase as any;
      await supabaseAny.from('story_views')
        .upsert({
          story_id: currentStory.id,
          viewer_id: user?.id,
          watch_duration_seconds: duration,
          completed: progress >= 95,
          viewed_at: new Date().toISOString()
        }, {
          onConflict: 'story_id,viewer_id'
        });
    } catch (error) {
      console.error('[StoryViewer] Error recording view duration:', error);
    }
  };

  const fetchStoryStats = async () => {
    try {
      const supabaseAny = supabase as any;
      const [views, reactions, shares, saves] = await Promise.all([
        supabaseAny.from('story_views').select('id', { count: 'exact', head: true }).eq('story_id', currentStory.id),
        supabaseAny.from('story_reactions').select('id', { count: 'exact', head: true }).eq('story_id', currentStory.id),
        supabaseAny.from('story_shares').select('id', { count: 'exact', head: true }).eq('story_id', currentStory.id),
        supabaseAny.from('story_saves').select('id', { count: 'exact', head: true }).eq('story_id', currentStory.id),
      ]);

      setStats({
        views: views.count || 0,
        reactions: reactions.count || 0,
        shares: shares.count || 0,
        saves: saves.count || 0,
      });
    } catch (error) {
      console.error('[StoryViewer] Error fetching stats:', error);
      // Silent fail - don't break the viewer
    }
  };

  const checkUserInteractions = async () => {
    if (!user) return;

    try {
      const supabaseAny = supabase as any;
      const [reaction, save] = await Promise.all([
        supabaseAny.from('story_reactions')
          .select('reaction_type')
          .eq('story_id', currentStory.id)
          .eq('user_id', user.id)
          .maybeSingle(),
        supabaseAny.from('story_saves')
          .select('id')
          .eq('story_id', currentStory.id)
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      setUserReaction(reaction?.data?.reaction_type || null);
      setIsSaved(!!save.data);
    } catch (error) {
      console.error('[StoryViewer] Error checking interactions:', error);
      // Silent fail
    }
  };

  const handleReaction = async (reactionType: string) => {
    if (!user) return;

    const supabaseAny = supabase as any;
    if (userReaction === reactionType) {
      await supabaseAny.from('story_reactions')
        .delete()
        .eq('story_id', currentStory.id)
        .eq('user_id', user.id);
      setUserReaction(null);
    } else {
      await supabaseAny.from('story_reactions')
        .upsert({
          story_id: currentStory.id,
          user_id: user.id,
          reaction_type: reactionType,
        });
      setUserReaction(reactionType);
      
      if (stats.reactions === 99) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        toast({ title: "🎉 100 reactions milestone!" });
      }
    }
    
    setShowReactions(false);
    fetchStoryStats();
  };

  const handleSave = async () => {
    if (!user) return;

    const supabaseAny = supabase as any;
    if (isSaved) {
      await supabaseAny.from('story_saves')
        .delete()
        .eq('story_id', currentStory.id)
        .eq('user_id', user.id);
      setIsSaved(false);
      toast({ title: "Story removed from saves" });
    } else {
      await supabaseAny.from('story_saves').insert({
        story_id: currentStory.id,
        user_id: user.id,
      });
      setIsSaved(true);
      toast({ title: "Story saved!" });
    }
    fetchStoryStats();
  };

  const handleShare = async (shareType: 'repost' | 'dm' | 'external') => {
    if (!user) return;

    const supabaseAny = supabase as any;
    await supabaseAny.from('story_shares').insert({
      story_id: currentStory.id,
      user_id: user.id,
      share_type: shareType,
    });

    fetchStoryStats();
    toast({ title: `Story ${shareType === 'repost' ? 'reposted' : 'shared'}!` });
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const fetchComments = async () => {
    try {
      const { data: commentsData } = await supabase
        .from('story_comments')
        .select('*')
        .eq('story_id', currentStory.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (commentsData) {
        // Fetch profiles for comment users
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

        setComments(commentsData.map(c => ({
          ...c,
          profiles: profilesMap.get(c.user_id) || { full_name: 'Unknown', avatar_url: '' }
        })));
      }
    } catch (error) {
      console.error('[StoryViewer] Error fetching comments:', error);
    }
  };

  const handleSendReply = async () => {
    if (!user || !replyText.trim()) return;

    try {
      // Find existing conversation
      const { data: existingConversation } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id)
        .single();

      let conversationId = existingConversation?.conversation_id;

      // Check if the story owner is also in this conversation
      if (conversationId) {
        const { data: otherParticipant } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conversationId)
          .eq('user_id', currentStory.user_id)
          .maybeSingle();

        if (!otherParticipant) {
          conversationId = null; // Need to create new conversation
        }
      }

      // Create conversation if doesn't exist
      if (!conversationId) {
        const { data: newConversation } = await supabase
          .from('conversations')
          .insert({
            title: `Chat with ${currentStory.profiles?.full_name}`,
            metadata: { type: 'dm' }
          })
          .select()
          .single();
        
        conversationId = newConversation?.id;

        if (conversationId) {
          // Add both participants
          await supabase.from('conversation_participants').insert([
            { conversation_id: conversationId, user_id: user.id, role: 'member' },
            { conversation_id: conversationId, user_id: currentStory.user_id, role: 'member' }
          ]);
        }
      }

      if (conversationId) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: `Responded to story: ${replyText}`,
          metadata: { 
            story_id: currentStory.id,
            story_media_url: currentStory.media_url,
            type: 'story_reply'
          }
        });

        toast({ title: "Reply sent!" });
        setReplyText("");
      }
    } catch (error) {
      console.error('[StoryViewer] Error sending reply:', error);
      toast({ title: "Failed to send reply", variant: "destructive" });
    }
  };

  const handleDeleteStory = async () => {
    if (!user || currentStory.user_id !== user.id) return;

    try {
      await supabase.from('stories').delete().eq('id', currentStory.id);
      toast({ title: "Story deleted" });
      
      if (stories.length === 1) {
        onClose();
      } else {
        handleNext();
      }
    } catch (error) {
      console.error('[StoryViewer] Error deleting story:', error);
      toast({ title: "Failed to delete story", variant: "destructive" });
    }
  };

  return createPortal(
    <div 
      style={{ 
        position: 'fixed',
        top: '64px',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(4px)',
        overflow: 'hidden'
      }}
      onClick={onClose}
    >
      <div 
        style={{ 
          position: 'relative',
          width: '100%',
          maxWidth: '500px',
          height: '90vh',
          margin: '0 20px',
          backgroundColor: '#000',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bars */}
        <div className="flex gap-1 px-4 pt-4 pb-2 flex-shrink-0">
          {stories.map((_, idx) => (
            <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-100"
                style={{
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-white">
              <AvatarImage src={currentStory.profiles?.avatar_url} />
              <AvatarFallback>{currentStory.profiles?.full_name?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white font-semibold text-sm">{currentStory.profiles?.full_name}</p>
              <p className="text-white/70 text-xs">
                {new Date(currentStory.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur">
                {user?.id === currentStory.user_id && (
                  <DropdownMenuItem onClick={handleDeleteStory} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Story
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleShare('external')}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Story
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={onClose}>
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Story content - centered and visible */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          position: 'relative',
          minHeight: 0,
          backgroundColor: '#000',
          overflow: 'hidden'
        }}>
          {currentStory.media_type === 'video' ? (
            <video
              ref={videoRef}
              src={currentStory.media_url}
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain',
                display: 'block'
              }}
              autoPlay
              onEnded={handleNext}
            />
          ) : (
            <img
              src={currentStory.media_url}
              alt="Story"
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain',
                display: 'block'
              }}
            />
          )}

          {/* Navigation areas */}
          <button
            className="absolute left-0 top-0 bottom-0 w-1/3"
            onClick={handlePrevious}
          />
          <button
            className="absolute right-0 top-0 bottom-0 w-1/3"
            onClick={handleNext}
          />

          {/* Comments overlay */}
          {comments.length > 0 && (
            <div className="absolute top-4 left-4 max-w-[200px] max-h-[150px]">
              <div className="space-y-2">
                {comments.slice(0, 3).map((comment) => (
                  <div key={comment.id} className="flex items-start gap-2 bg-black/70 backdrop-blur-sm rounded-lg p-2">
                    <Avatar className="w-6 h-6 flex-shrink-0">
                      <AvatarImage src={comment.profiles?.avatar_url} />
                      <AvatarFallback className="text-xs">{comment.profiles?.full_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-semibold truncate">{comment.profiles?.full_name}</p>
                      <p className="text-white/90 text-xs line-clamp-2">{comment.comment_text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          {currentIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10"
              onClick={handlePrevious}
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>
          )}
          {currentIndex < stories.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10"
              onClick={handleNext}
            >
              <ChevronRight className="w-8 h-8" />
            </Button>
          )}
        </div>

        {/* Caption */}
        {currentStory.caption && (
          <div className="px-4 py-2 text-white flex-shrink-0">
            <p className="text-sm bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 line-clamp-2">
              {currentStory.caption}
            </p>
          </div>
        )}

        {/* Reply box */}
        <div className="px-4 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
            <Input
              placeholder="Send message..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendReply();
                }
              }}
              className="flex-1 bg-transparent border-none text-white placeholder:text-white/60 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSendReply}
              className="text-white hover:bg-white/20 flex-shrink-0"
              disabled={!replyText.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-4 pb-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => setShowReactions(!showReactions)}
            >
              <Heart className={cn("w-5 h-5", userReaction && "fill-current text-red-500")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => handleShare('dm')}
            >
              <MessageCircle className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => handleShare('repost')}
            >
              <Share2 className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={handleSave}
            >
              <Bookmark className={cn("w-5 h-5", isSaved && "fill-current")} />
            </Button>
          </div>

          <div className="text-white text-xs">
            {stats.views} • {stats.reactions}
          </div>
        </div>

        {/* Reactions popup */}
        {showReactions && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur-xl rounded-full px-4 py-2 flex gap-2 shadow-lg border animate-in slide-in-from-bottom-4 z-20">
            {REACTION_TYPES.map(({ type, icon: Icon, color }) => (
              <button
                key={type}
                onClick={() => handleReaction(type)}
                className={cn(
                  "p-2 rounded-full hover:scale-110 transition-transform",
                  userReaction === type && "ring-2 ring-primary"
                )}
              >
                <Icon className={cn("w-5 h-5", color)} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
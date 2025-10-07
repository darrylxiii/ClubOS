import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Heart, Share2, Bookmark, MessageCircle, X, 
  ChevronLeft, ChevronRight, Flame, Laugh, ThumbsUp,
  Sparkles, MoreHorizontal
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";

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

export function EnhancedStoryViewer({ stories, initialIndex, onClose }: EnhancedStoryViewerProps) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [showReactions, setShowReactions] = useState(false);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [stats, setStats] = useState({ views: 0, reactions: 0, shares: 0, saves: 0 });
  const [viewStartTime] = useState(Date.now());
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressInterval = useRef<NodeJS.Timeout>();

  const currentStory = stories[currentIndex];

  useEffect(() => {
    recordView();
    fetchStoryStats();
    checkUserInteractions();
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
    await supabase.from('story_views').insert({
      story_id: currentStory.id,
      user_id: user?.id,
      viewed_at: new Date().toISOString()
    });
  };

  const recordViewDuration = async () => {
    const duration = Math.floor((Date.now() - viewStartTime) / 1000);
    await supabase.from('story_views')
      .update({ 
        watch_duration_seconds: duration,
        completed: progress >= 95
      })
      .eq('story_id', currentStory.id)
      .eq('user_id', user?.id)
      .order('viewed_at', { ascending: false })
      .limit(1);
  };

  const fetchStoryStats = async () => {
    const [views, reactions, shares, saves] = await Promise.all([
      supabase.from('story_views').select('id', { count: 'exact', head: true }).eq('story_id', currentStory.id),
      supabase.from('story_reactions').select('id', { count: 'exact', head: true }).eq('story_id', currentStory.id),
      supabase.from('story_shares').select('id', { count: 'exact', head: true }).eq('story_id', currentStory.id),
      supabase.from('story_saves').select('id', { count: 'exact', head: true }).eq('story_id', currentStory.id),
    ]);

    setStats({
      views: views.count || 0,
      reactions: reactions.count || 0,
      shares: shares.count || 0,
      saves: saves.count || 0,
    });
  };

  const checkUserInteractions = async () => {
    if (!user) return;

    const [reaction, save] = await Promise.all([
      supabase.from('story_reactions')
        .select('reaction_type')
        .eq('story_id', currentStory.id)
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase.from('story_saves')
        .select('id')
        .eq('story_id', currentStory.id)
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    setUserReaction(reaction?.data?.reaction_type || null);
    setIsSaved(!!save.data);
  };

  const handleReaction = async (reactionType: string) => {
    if (!user) return;

    if (userReaction === reactionType) {
      await supabase.from('story_reactions')
        .delete()
        .eq('story_id', currentStory.id)
        .eq('user_id', user.id);
      setUserReaction(null);
    } else {
      await supabase.from('story_reactions')
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

    if (isSaved) {
      await supabase.from('story_saves')
        .delete()
        .eq('story_id', currentStory.id)
        .eq('user_id', user.id);
      setIsSaved(false);
      toast({ title: "Story removed from saves" });
    } else {
      await supabase.from('story_saves').insert({
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

    await supabase.from('story_shares').insert({
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

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Progress bars */}
      <div className="absolute top-4 left-4 right-4 flex gap-1 z-50">
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
      <div className="absolute top-10 left-4 right-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border-2 border-white">
            <AvatarImage src={currentStory.profiles?.avatar_url} />
            <AvatarFallback>{currentStory.profiles?.full_name?.[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white font-semibold">{currentStory.profiles?.full_name}</p>
            <p className="text-white/70 text-xs">
              {new Date(currentStory.created_at).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={onClose}>
            <MoreHorizontal className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={onClose}>
            <X className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Story content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {currentStory.media_type === 'video' ? (
          <video
            ref={videoRef}
            src={currentStory.media_url}
            className="max-w-full max-h-full object-contain"
            autoPlay
            onEnded={handleNext}
          />
        ) : (
          <img
            src={currentStory.media_url}
            alt="Story"
            className="max-w-full max-h-full object-contain"
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
      </div>

      {/* Caption */}
      {currentStory.caption && (
        <div className="absolute bottom-32 left-4 right-4 text-white">
          <p className="text-sm bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
            {currentStory.caption}
          </p>
        </div>
      )}

      {/* Reactions popup */}
      {showReactions && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur-xl rounded-full px-4 py-3 flex gap-3 shadow-lg border animate-in slide-in-from-bottom-4">
          {REACTION_TYPES.map(({ type, icon: Icon, color }) => (
            <button
              key={type}
              onClick={() => handleReaction(type)}
              className={cn(
                "p-2 rounded-full hover:scale-110 transition-transform",
                userReaction === type && "ring-2 ring-primary"
              )}
            >
              <Icon className={cn("w-6 h-6", color)} />
            </button>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="absolute bottom-6 left-4 right-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => setShowReactions(!showReactions)}
          >
            <Heart className={cn("w-6 h-6", userReaction && "fill-current text-red-500")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => handleShare('dm')}
          >
            <MessageCircle className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => handleShare('repost')}
          >
            <Share2 className="w-6 h-6" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-white text-sm">
            {stats.views} views • {stats.reactions} reactions
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={handleSave}
          >
            <Bookmark className={cn("w-6 h-6", isSaved && "fill-current")} />
          </Button>
        </div>
      </div>

      {/* Navigation buttons */}
      {currentIndex > 0 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
          onClick={handlePrevious}
        >
          <ChevronLeft className="w-8 h-8" />
        </Button>
      )}
      {currentIndex < stories.length - 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
          onClick={handleNext}
        >
          <ChevronRight className="w-8 h-8" />
        </Button>
      )}
    </div>
  );
}
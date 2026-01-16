import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Play, Share2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreateConversationDialog } from "./CreateConversationDialog";

interface StoryShareCardProps {
  storyId: string;
  storyUrl: string;
  storyType: 'image' | 'video';
  authorName: string;
  authorAvatar?: string;
  comment?: string;
  onStoryClick: () => void;
  isOwnMessage: boolean;
}

export const StoryShareCard = ({
  storyId,
  storyUrl,
  storyType,
  authorName,
  authorAvatar,
  comment,
  onStoryClick,
  isOwnMessage
}: StoryShareCardProps) => {
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [showForwardDialog, setShowForwardDialog] = useState(false);

  useEffect(() => {
    const loadSignedUrl = async () => {
      try {
        const { data, error } = await supabase.storage
          .from('stories')
          .createSignedUrl(storyUrl, 3600);
        
        if (data?.signedUrl) {
          setSignedUrl(data.signedUrl);
        } else {
          console.error('Failed to generate signed URL:', error);
        }
      } catch (err) {
        console.error('Error loading story URL:', err);
      }
    };

    loadSignedUrl();
  }, [storyUrl]);

  const handleForward = async (conversationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: comment || '',
        media_type: 'story_share',
        metadata: {
          story_id: storyId,
          story_url: storyUrl,
          story_type: storyType,
          author_name: authorName,
          author_avatar: authorAvatar
        }
      });

      toast.success('Story forwarded successfully');
      setShowForwardDialog(false);
    } catch (_error) {
      console.error('Error forwarding story:', _error);
      toast.error('Failed to forward story');
    }
  };

  return (
    <>
      <Card 
        className={`overflow-hidden max-w-sm cursor-pointer transition-all hover:shadow-lg ${
          isOwnMessage ? 'bg-white/10 border-white/20' : 'bg-muted/30 border-border/30'
        }`}
        onClick={onStoryClick}
      >
        {/* Story Preview */}
        <div className="relative aspect-[9/16] bg-black group">
          {signedUrl && (
            storyType === 'video' ? (
              <video
                src={signedUrl}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
            ) : (
              <img
                src={signedUrl}
                alt="Story"
                className="w-full h-full object-cover"
              />
            )
          )}
          
          {/* Play icon overlay for videos */}
          {storyType === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Play className="h-8 w-8 text-black ml-1" fill="black" />
              </div>
            </div>
          )}

          {/* Author info overlay */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
              <Avatar className="h-6 w-6">
                <AvatarImage src={authorAvatar} />
                <AvatarFallback className="bg-primary text-white text-xs">
                  <User className="h-3 w-3" />
                </AvatarFallback>
              </Avatar>
              <span className="text-white text-sm font-medium">{authorName}</span>
            </div>
          </div>
        </div>

        {/* Comment section */}
        {comment && (
          <div className={`p-3 ${isOwnMessage ? 'text-white' : 'text-foreground'}`}>
            <p className="text-sm">{comment}</p>
          </div>
        )}

        {/* Forward button */}
        <div className="p-2 border-t border-border/20">
          <Button
            variant="ghost"
            size="sm"
            className={`w-full gap-2 ${
              isOwnMessage 
                ? 'text-white hover:bg-white/10' 
                : 'hover:bg-muted/50'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setShowForwardDialog(true);
            }}
          >
            <Share2 className="h-4 w-4" />
            Forward Story
          </Button>
        </div>
      </Card>

      <CreateConversationDialog
        open={showForwardDialog}
        onOpenChange={setShowForwardDialog}
        onConversationCreated={handleForward}
        title="Forward Story To"
      />
    </>
  );
};

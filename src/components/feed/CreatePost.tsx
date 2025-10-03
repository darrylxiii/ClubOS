import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Image, Video, FileText, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface CreatePostProps {
  onPostCreated: () => void;
}

export function CreatePost({ onPostCreated }: CreatePostProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useState(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single()
        .then(({ data }) => setProfile(data));
    }
  });

  const handlePost = async () => {
    if (!content.trim() || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: content.trim()
        });

      if (error) throw error;

      setContent("");
      toast({
        title: "Posted successfully",
        description: "Your post is now live on the feed."
      });
      onPostCreated();
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Failed to post",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex gap-3">
        <Avatar>
          <AvatarImage src={profile?.avatar_url} />
          <AvatarFallback>
            {profile?.full_name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <Textarea
            placeholder="What do you want to talk about?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[80px] border-none focus-visible:ring-0 resize-none"
          />
          
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled>
                <Image className="w-4 h-4 mr-2" />
                Photo
              </Button>
              <Button variant="ghost" size="sm" disabled>
                <Video className="w-4 h-4 mr-2" />
                Video
              </Button>
              <Button variant="ghost" size="sm" disabled>
                <FileText className="w-4 h-4 mr-2" />
                Document
              </Button>
            </div>
            
            <Button 
              onClick={handlePost}
              disabled={!content.trim() || loading}
              size="sm"
            >
              <Send className="w-4 h-4 mr-2" />
              Post
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
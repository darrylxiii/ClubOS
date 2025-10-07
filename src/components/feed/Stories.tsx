import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { EnhancedStoryViewer } from "@/components/social/EnhancedStoryViewer";

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
}

export function Stories() {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [viewingStory, setViewingStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    const { data: storiesData } = await supabase
      .from('stories')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (storiesData) {
      // Fetch profiles for story users
      const userIds = [...new Set(storiesData.map(s => s.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      
      const enrichedStories = storiesData.map(story => ({
        ...story,
        profiles: profilesMap.get(story.user_id) || { full_name: 'Unknown', avatar_url: '' }
      }));

      setStories(enrichedStories);
    }
  };

  const handleCreateStory = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setLoading(true);
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user!.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('stories')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('stories')
          .getPublicUrl(fileName);

        const { error } = await supabase.from('stories').insert({
          user_id: user!.id,
          media_url: publicUrl,
          media_type: file.type.startsWith('image/') ? 'image' : 'video'
        });

        if (error) throw error;

        toast({ title: "Story posted!" });
        fetchStories();
      } catch (error) {
        toast({ title: "Failed to post story", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
        {/* Create Story Card */}
        <Card 
          className="flex-shrink-0 w-24 h-32 cursor-pointer hover:scale-105 transition-transform relative overflow-hidden group"
          onClick={handleCreateStory}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-primary/40" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="bg-primary rounded-full p-2">
              <Plus className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xs font-medium text-center">Create Story</span>
          </div>
        </Card>

        {/* Stories */}
        {stories.map((story) => (
          <Card 
            key={story.id}
            className="flex-shrink-0 w-24 h-32 cursor-pointer hover:scale-105 transition-transform relative overflow-hidden"
            onClick={() => setViewingStory(story)}
          >
            {story.media_type === 'image' ? (
              <img 
                src={story.media_url} 
                alt="Story"
                className="w-full h-full object-cover"
              />
            ) : (
              <video 
                src={story.media_url}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
            <div className="absolute bottom-2 left-2 right-2">
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6 border-2 border-white">
                  <AvatarImage src={story.profiles?.avatar_url} />
                  <AvatarFallback>{story.profiles?.full_name?.[0]}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-white font-medium truncate">
                  {story.profiles?.full_name}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Enhanced Story Viewer */}
      {viewingStory && (
        <EnhancedStoryViewer
          stories={stories}
          initialIndex={stories.findIndex(s => s.id === viewingStory.id)}
          onClose={() => setViewingStory(null)}
        />
      )}
    </>
  );
}

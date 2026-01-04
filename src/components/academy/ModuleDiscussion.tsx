import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { migrateToast as toast } from "@/lib/notify";
import {
  MessageSquare, ThumbsUp, CheckCircle2, Send, Plus
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Discussion {
  id: string;
  title: string;
  content: string;
  is_resolved: boolean;
  upvotes: number;
  views: number;
  created_at: string;
  user: {
    full_name: string;
    avatar_url: string;
  };
  _count: {
    replies: number;
  };
}

interface ModuleDiscussionProps {
  moduleId: string;
}

export function ModuleDiscussion({ moduleId }: ModuleDiscussionProps) {
  const { user } = useAuth();
  
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [showNewDiscussion, setShowNewDiscussion] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDiscussions();
  }, [moduleId]);

  const fetchDiscussions = async () => {
    try {
      const { data, error } = await supabase
        .from('module_discussions')
        .select(`
          *,
          user:profiles(full_name, avatar_url)
        `)
        .eq('module_id', moduleId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get reply counts
      const discussionsWithCounts = await Promise.all(
        (data || []).map(async (discussion) => {
          const { count } = await supabase
            .from('discussion_replies')
            .select('*', { count: 'exact', head: true })
            .eq('discussion_id', discussion.id);

          return {
            ...discussion,
            _count: { replies: count || 0 }
          };
        })
      );

      setDiscussions(discussionsWithCounts as any);
    } catch (error) {
      console.error('Error fetching discussions:', error);
    }
  };

  const handleCreateDiscussion = async () => {
    if (!user || !newTitle.trim() || !newContent.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('module_discussions')
        .insert({
          module_id: moduleId,
          user_id: user.id,
          title: newTitle,
          content: newContent,
        });

      if (error) throw error;

      toast({
        title: "Discussion created",
        description: "Your question has been posted to the community.",
      });

      setNewTitle('');
      setNewContent('');
      setShowNewDiscussion(false);
      fetchDiscussions();
    } catch (error) {
      console.error('Error creating discussion:', error);
      toast({
        title: "Error",
        description: "Failed to create discussion",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Module Discussion</h3>
        </div>
        <Button
          size="sm"
          onClick={() => setShowNewDiscussion(!showNewDiscussion)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Ask Question
        </Button>
      </div>

      {showNewDiscussion && (
        <Card className="squircle p-4 space-y-3">
          <Input
            placeholder="Question title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <Textarea
            placeholder="Describe your question in detail..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={4}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleCreateDiscussion}
              disabled={loading || !newTitle.trim() || !newContent.trim()}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Post Question
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowNewDiscussion(false)}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {discussions.length === 0 ? (
          <Card className="squircle p-8 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              No discussions yet. Be the first to ask a question!
            </p>
          </Card>
        ) : (
          discussions.map((discussion) => (
            <Card key={discussion.id} className="squircle p-4 hover-lift cursor-pointer">
              <div className="flex gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={discussion.user?.avatar_url} />
                  <AvatarFallback>
                    {discussion.user?.full_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{discussion.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {discussion.user?.full_name} •{' '}
                        {formatDistanceToNow(new Date(discussion.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {discussion.is_resolved && (
                      <Badge variant="outline" className="squircle-sm gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Resolved
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm line-clamp-2">{discussion.content}</p>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="h-4 w-4" />
                      {discussion.upvotes}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      {discussion._count.replies} replies
                    </div>
                    <div>{discussion.views} views</div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

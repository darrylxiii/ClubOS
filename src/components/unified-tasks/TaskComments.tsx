import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TaskCommentsProps {
    taskId: string;
}

interface Comment {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    profiles: {
        full_name: string | null;
        avatar_url: string | null;
    }
}

export const TaskComments = ({ taskId }: TaskCommentsProps) => {
    const { user } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadComments();

        // Subscribe to new comments
        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'task_comments',
                    filter: `task_id=eq.${taskId}`
                },
                () => {
                    loadComments();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [taskId]);

    const loadComments = async () => {
        const { data, error } = await supabase
            .from("task_comments")
            .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
            .eq("task_id", taskId)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Error loading comments:", error);
            return;
        }

        // Cast the response to match our interface
        // supabase returns profiles as an object, ensuring it matches
        const formattedData = (data as any[])?.map(item => ({
            ...item,
            profiles: item.profiles || { full_name: 'Unknown', avatar_url: null }
        })) as Comment[];

        setComments(formattedData);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !user) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from("task_comments")
                .insert({
                    task_id: taskId,
                    user_id: user.id,
                    content: newComment.trim()
                });

            if (error) throw error;
            setNewComment("");
        } catch (error) {
            console.error("Error adding comment:", error);
            toast.error("Failed to post comment");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[400px]">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm font-medium">Comments ({comments.length})</span>
            </div>

            <ScrollArea className="flex-1 pr-4 -mr-4 mb-4">
                <div className="space-y-4">
                    {comments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            No comments yet. Start the conversation!
                        </div>
                    ) : (
                        comments.map((comment) => (
                            <div key={comment.id} className="flex gap-3 bg-muted/30 p-3 rounded-lg border border-transparent hover:border-border transition-colors">
                                <Avatar className="h-8 w-8 mt-1">
                                    <AvatarImage src={comment.profiles.avatar_url || undefined} />
                                    <AvatarFallback className="text-xs">
                                        {comment.profiles.full_name?.charAt(0) || "?"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-foreground/90">
                                            {comment.profiles.full_name}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                                        {comment.content}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            <form onSubmit={handleSubmit} className="relative mt-auto">
                <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="pr-12 min-h-[80px] resize-none bg-background focus:ring-primary/20"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                        }
                    }}
                />
                <Button
                    type="submit"
                    size="icon"
                    disabled={loading || !newComment.trim()}
                    className="absolute right-2 bottom-2 h-8 w-8 transition-all hover:scale-105"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </div>
    );
};

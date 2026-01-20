import { useState } from 'react';
import { MessageSkeleton } from "@/components/LoadingSkeletons";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, X, Check, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface BlockComment {
  id: string;
  block_id: string;
  page_id: string;
  user_id: string;
  content: string;
  resolved_at: string | null;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
}

interface BlockCommentsProps {
  pageId: string;
  blockId: string;
  className?: string;
}

export function BlockComments({ pageId, blockId, className }: BlockCommentsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [newComment, setNewComment] = useState('');

  // Fetch comments for this block
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['block-comments', pageId, blockId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_comments')
        .select(`
          id,
          block_id,
          page_id,
          user_id,
          content,
          resolved_at,
          created_at,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('page_id', pageId)
        .eq('block_id', blockId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((c: any) => ({
        ...c,
        user_name: c.profiles?.full_name || 'Unknown',
        user_avatar: c.profiles?.avatar_url,
      })) as BlockComment[];
    },
    enabled: isOpen,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from('page_comments').insert({
        page_id: pageId,
        block_id: blockId,
        user_id: user?.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['block-comments', pageId, blockId] });
      setNewComment('');
      toast.success('Comment added');
    },
    onError: () => {
      toast.error('Failed to add comment');
    },
  });

  const resolveCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('page_comments')
        .update({ resolved_at: new Date().toISOString(), resolved_by: user?.id })
        .eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['block-comments', pageId, blockId] });
      toast.success('Comment resolved');
    },
  });

  const unresolvedCount = comments.filter(c => !c.resolved_at).length;

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
            unresolvedCount > 0 && "opacity-100",
            className
          )}
        >
          <div className="relative">
            <MessageSquare className="h-3.5 w-3.5" />
            {unresolvedCount > 0 && (
              <Badge 
                className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                variant="default"
              >
                {unresolvedCount}
              </Badge>
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Block Comments
          </h4>
        </div>

        <div className="max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              <MessageSkeleton />
              <MessageSkeleton />
            </div>
          ) : comments.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No comments yet
            </div>
          ) : (
            <div className="divide-y">
              {comments.map((comment) => (
                <div 
                  key={comment.id} 
                  className={cn(
                    "p-3",
                    comment.resolved_at && "opacity-60 bg-muted/30"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={comment.user_avatar} />
                      <AvatarFallback className="text-xs">
                        {comment.user_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium truncate">
                          {comment.user_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{comment.content}</p>
                      {!comment.resolved_at && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs mt-1"
                          onClick={() => resolveCommentMutation.mutate(comment.id)}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Resolve
                        </Button>
                      )}
                      {comment.resolved_at && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          Resolved
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t">
          <div className="flex gap-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[60px] resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSubmit();
                }
              }}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-muted-foreground">⌘+Enter to submit</span>
            <Button 
              size="sm" 
              onClick={handleSubmit}
              disabled={!newComment.trim() || addCommentMutation.isPending}
            >
              <Send className="h-3 w-3 mr-1" />
              Comment
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Indicator component for showing block has comments
export function BlockCommentIndicator({ 
  pageId, 
  blockId,
  onClick 
}: { 
  pageId: string; 
  blockId: string;
  onClick?: () => void;
}) {
  const { data: count = 0 } = useQuery({
    queryKey: ['block-comment-count', pageId, blockId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('page_comments')
        .select('*', { count: 'exact', head: true })
        .eq('page_id', pageId)
        .eq('block_id', blockId)
        .is('resolved_at', null);

      if (error) throw error;
      return count || 0;
    },
  });

  if (count === 0) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-5 px-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary"
      onClick={onClick}
    >
      <MessageSquare className="h-3 w-3 mr-1" />
      {count}
    </Button>
  );
}

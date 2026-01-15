import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageSquare,
  Send,
  Lock,
  Reply,
  Loader2,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Comment {
  id: string;
  application_id: string;
  user_id: string;
  comment: string;
  is_internal: boolean;
  parent_id: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
  replies?: Comment[];
}

interface ApplicationCommentsThreadProps {
  applicationId: string;
  candidateName?: string;
  compact?: boolean;
}

export function ApplicationCommentsThread({
  applicationId,
  candidateName,
  compact = false,
}: ApplicationCommentsThreadProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    fetchComments();
  }, [applicationId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('candidate_comments')
        .select('*, profiles:user_id(full_name, avatar_url)')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Organize into threads
      const topLevel = (data || []).filter((c: any) => !c.parent_id);
      const replies = (data || []).filter((c: any) => c.parent_id);

      const threaded = topLevel.map((comment: any) => ({
        ...comment,
        replies: replies.filter((r: any) => r.parent_id === comment.id),
      }));

      setComments(threaded);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (parentId: string | null = null) => {
    const text = parentId ? replyText : newComment;
    if (!text.trim() || !user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('candidate_comments').insert({
        application_id: applicationId,
        user_id: user.id,
        comment: text.trim(),
        is_internal: isInternal,
        parent_id: parentId,
      });

      if (error) throw error;

      toast.success(parentId ? 'Reply added' : 'Comment added');
      setNewComment('');
      setReplyText('');
      setReplyingTo(null);
      fetchComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('candidate_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast.success('Comment deleted');
      fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div
      key={comment.id}
      className={`flex gap-3 ${isReply ? 'ml-10 mt-3' : ''}`}
    >
      <Avatar className={isReply ? 'h-7 w-7' : 'h-9 w-9'}>
        <AvatarImage src={comment.profiles?.avatar_url || undefined} />
        <AvatarFallback className="text-xs">
          {comment.profiles?.full_name?.substring(0, 2).toUpperCase() || '?'}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{comment.profiles?.full_name}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
          {comment.is_internal && (
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              <Lock className="h-2.5 w-2.5 mr-0.5" />
              Internal
            </Badge>
          )}
        </div>

        <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>

        <div className="flex items-center gap-2 mt-2">
          {!isReply && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground"
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
            >
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>
          )}
          
          {comment.user_id === user?.id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => handleDelete(comment.id)}
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Reply Input */}
        {replyingTo === comment.id && (
          <div className="mt-3 flex gap-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              rows={2}
              className="text-sm"
            />
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                onClick={() => handleSubmit(comment.id)}
                disabled={submitting || !replyText.trim()}
              >
                {submitting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setReplyingTo(null);
                  setReplyText('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Replies */}
        {comment.replies?.map((reply) => renderComment(reply, true))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className={compact ? 'pb-2' : ''}>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          Comments
          {comments.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New Comment Input */}
        <div className="space-y-3">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={`Add a comment about ${candidateName || 'this candidate'}...`}
            rows={compact ? 2 : 3}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="internal"
                checked={isInternal}
                onCheckedChange={setIsInternal}
              />
              <Label htmlFor="internal" className="text-sm flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Internal only
              </Label>
            </div>
            <Button
              onClick={() => handleSubmit()}
              disabled={submitting || !newComment.trim()}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Post Comment
            </Button>
          </div>
        </div>

        {comments.length > 0 && <Separator />}

        {/* Comments List */}
        <div className="space-y-4">
          {comments.map((comment) => renderComment(comment))}
        </div>

        {comments.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No comments yet</p>
            <p className="text-xs">Be the first to add a comment</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

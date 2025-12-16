import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { usePageComments } from "@/hooks/usePageComments";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Check, MoreHorizontal, Reply, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface CommentsPanelProps {
  pageId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommentsPanel({ pageId, open, onOpenChange }: CommentsPanelProps) {
  const { user } = useAuth();
  const { comments, isLoading, addComment, deleteComment, resolveComment, unresolveComment } = usePageComments(pageId);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    await addComment.mutateAsync({ content: newComment, parentId: replyingTo || undefined });
    setNewComment("");
    setReplyingTo(null);
  };

  // Group comments by parent (threads)
  const topLevelComments = comments.filter((c) => !c.parent_id);
  const replies = comments.filter((c) => c.parent_id);

  const getReplies = (parentId: string) => replies.filter((r) => r.parent_id === parentId);

  const filteredComments = showResolved
    ? topLevelComments
    : topLevelComments.filter((c) => !c.resolved_at);

  const resolvedCount = topLevelComments.filter((c) => c.resolved_at).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments
            {resolvedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResolved(!showResolved)}
                className="ml-auto text-xs"
              >
                {showResolved ? "Hide resolved" : `Show ${resolvedCount} resolved`}
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex flex-col h-[calc(100vh-180px)]">
          <ScrollArea className="flex-1 pr-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading comments...</div>
            ) : filteredComments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No comments yet. Start a discussion!
              </div>
            ) : (
              <div className="space-y-4">
                {filteredComments.map((comment) => (
                  <CommentThread
                    key={comment.id}
                    comment={comment}
                    replies={getReplies(comment.id)}
                    currentUserId={user?.id}
                    onReply={() => setReplyingTo(comment.id)}
                    onDelete={(id) => deleteComment.mutate(id)}
                    onResolve={(id) => resolveComment.mutate(id)}
                    onUnresolve={(id) => unresolveComment.mutate(id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="mt-4 pt-4 border-t">
            {replyingTo && (
              <div className="flex items-center justify-between mb-2 text-sm text-muted-foreground">
                <span>Replying to comment</span>
                <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>
                  Cancel
                </Button>
              </div>
            )}
            <Textarea
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleSubmit();
                }
              }}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-muted-foreground">⌘ + Enter to submit</span>
              <Button onClick={handleSubmit} disabled={!newComment.trim() || addComment.isPending}>
                {addComment.isPending ? "Posting..." : "Comment"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface CommentThreadProps {
  comment: any;
  replies: any[];
  currentUserId?: string;
  onReply: () => void;
  onDelete: (id: string) => void;
  onResolve: (id: string) => void;
  onUnresolve: (id: string) => void;
}

function CommentThread({
  comment,
  replies,
  currentUserId,
  onReply,
  onDelete,
  onResolve,
  onUnresolve,
}: CommentThreadProps) {
  const isResolved = !!comment.resolved_at;
  const isOwner = comment.user_id === currentUserId;

  return (
    <div className={cn("rounded-lg border p-3", isResolved && "opacity-60 bg-muted/30")}>
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.user_avatar} />
          <AvatarFallback>{comment.user_name?.charAt(0) || "U"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{comment.user_name}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
            {isResolved && (
              <Badge variant="secondary" className="text-xs">
                Resolved
              </Badge>
            )}
          </div>
          <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
          <div className="flex items-center gap-2 mt-2">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onReply}>
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>
            {!isResolved && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onResolve(comment.id)}
              >
                <Check className="h-3 w-3 mr-1" />
                Resolve
              </Button>
            )}
            {isResolved && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onUnresolve(comment.id)}
              >
                Unresolve
              </Button>
            )}
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onDelete(comment.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="mt-3 ml-11 space-y-3 border-l-2 pl-3">
          {replies.map((reply) => (
            <div key={reply.id} className="flex items-start gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={reply.user_avatar} />
                <AvatarFallback>{reply.user_name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-xs">{reply.user_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm mt-0.5">{reply.content}</p>
              </div>
              {reply.user_id === currentUserId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => onDelete(reply.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { MessageEditor } from './MessageEditor';
import { MessageActions } from './MessageActions';

interface ThreadViewProps {
  parentMessageId: string | null;
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ThreadView({ parentMessageId, conversationId, open, onOpenChange }: ThreadViewProps) {
  const { user } = useAuth();
  const [replies, setReplies] = useState<any[]>([]);
  const [parentMessage, setParentMessage] = useState<any>(null);
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);

  useEffect(() => {
    if (parentMessageId && open) {
      loadThread();
    }
  }, [parentMessageId, open]);

  const loadThread = async () => {
    if (!parentMessageId) return;

    // Load parent message
    const { data: parent } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(full_name, avatar_url)')
      .eq('id', parentMessageId)
      .single();

    setParentMessage(parent);

    // Load replies
    const { data: threadReplies } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(full_name, avatar_url)')
      .eq('parent_message_id', parentMessageId)
      .order('created_at', { ascending: true });

    setReplies(threadReplies || []);
  };

  const sendReply = async () => {
    if (!replyContent.trim() || !user) return;

    setSending(true);
    try {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        parent_message_id: parentMessageId,
        sender_id: user.id,
        content: replyContent.trim(),
        message_type: 'text',
      });

      setReplyContent('');
      loadThread();
      toast.success('Reply sent');
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Thread</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-12rem)] mt-4">
          {parentMessage && (
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={parentMessage.sender?.avatar_url} />
                  <AvatarFallback>
                    {parentMessage.sender?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium text-sm">{parentMessage.sender?.full_name}</div>
                  <p className="text-sm mt-1">{parentMessage.content}</p>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(parentMessage.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {replies.map((reply) => {
              const isOwn = reply.sender_id === user?.id;
              
              if (editingReplyId === reply.id) {
                return (
                  <div key={reply.id} className="px-2">
                    <MessageEditor
                      messageId={reply.id}
                      currentContent={reply.content}
                      onSave={() => {
                        setEditingReplyId(null);
                        loadThread();
                      }}
                      onCancel={() => setEditingReplyId(null)}
                    />
                  </div>
                );
              }
              
              return (
                <div key={reply.id} className={cn('flex gap-3 group', isOwn && 'flex-row-reverse')}>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={reply.sender?.avatar_url} />
                    <AvatarFallback>{reply.sender?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 max-w-[80%]">
                    <div
                      className={cn(
                        'rounded-lg p-3',
                        isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      )}
                    >
                      <p className="text-sm">{reply.content}</p>
                      <div className={cn('text-xs mt-1', isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                        {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                        {reply.edited_at && <span className="ml-2">(edited)</span>}
                      </div>
                    </div>
                    {isOwn && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                        <MessageActions
                          message={reply}
                          isOwnMessage={true}
                          onEdit={() => setEditingReplyId(reply.id)}
                          onReply={() => {}}
                          onDelete={loadThread}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-background border-t">
          <div className="flex gap-2">
            <Textarea
              placeholder="Reply to thread..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendReply();
                }
              }}
              className="min-h-[60px] resize-none"
            />
            <Button onClick={sendReply} disabled={sending || !replyContent.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

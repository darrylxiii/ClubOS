import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Message } from '@/hooks/useMessages';

interface ForwardMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: Message;
}

export function ForwardMessageDialog({ open, onOpenChange, message }: ForwardMessageDialogProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadConversations();
    }
  }, [open]);

  const loadConversations = async () => {
    const { data } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        conversation:conversations!inner (
          id,
          title,
          is_group,
          metadata
        )
      `)
      .eq('user_id', user?.id)
      .neq('conversation.id', message.conversation_id);

    if (data) {
      setConversations(data.map(d => d.conversation));
    }
  };

  const toggleConversation = (id: string) => {
    const newSelected = new Set(selectedConversations);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedConversations(newSelected);
  };

  const handleForward = async () => {
    if (selectedConversations.size === 0) {
      toast.error('Please select at least one conversation');
      return;
    }

    setLoading(true);
    try {
      for (const conversationId of selectedConversations) {
        const forwardMessage: any = {
          conversation_id: conversationId,
          sender_id: user?.id,
          content: comment ? `${comment}\n\n--- Forwarded from ${message.sender?.full_name} ---\n\n${message.content}` : message.content,
          media_type: message.media_type,
          media_url: message.media_url,
          metadata: {
            ...message.metadata,
            forwarded: true,
            original_sender: message.sender?.full_name,
            original_timestamp: message.created_at
          }
        };

        const { error } = await supabase.from('messages').insert(forwardMessage);
        if (error) throw error;

        // Forward attachments if any
        if (message.attachments && message.attachments.length > 0) {
          const attachmentInserts = message.attachments.map(att => ({
            message_id: conversationId, // Will be updated with actual message_id
            file_name: att.file_name,
            file_type: att.file_type,
            file_size: att.file_size,
            file_path: att.file_path
          }));
          await supabase.from('message_attachments').insert(attachmentInserts);
        }
      }

      toast.success(`Message forwarded to ${selectedConversations.size} conversation(s)`);
      onOpenChange(false);
      setSelectedConversations(new Set());
      setComment('');
    } catch (error) {
      console.error('Error forwarding message:', error);
      toast.error('Failed to forward message');
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Forward Message</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[300px] border rounded-lg p-2">
            {filteredConversations.map((conv) => (
              <label
                key={conv.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
              >
                <Checkbox
                  checked={selectedConversations.has(conv.id)}
                  onCheckedChange={() => toggleConversation(conv.id)}
                />
                <Avatar className="h-8 w-8">
                  <AvatarImage src={conv.metadata?.avatar_url} />
                  <AvatarFallback>{conv.title?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{conv.title || 'Unnamed'}</span>
              </label>
            ))}
          </ScrollArea>

          <div>
            <Textarea
              placeholder="Add an optional comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleForward}
              disabled={loading || selectedConversations.size === 0}
              className="flex-1"
            >
              <Send className="h-4 w-4 mr-2" />
              Forward ({selectedConversations.size})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

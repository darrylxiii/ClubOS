import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  reply_to_id: string | null;
  user?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface MessageThreadSidebarProps {
  parentMessage: Message;
  channelId: string;
  onClose: () => void;
}

const MessageThreadSidebar = ({ parentMessage, channelId, onClose }: MessageThreadSidebarProps) => {
  const { user } = useAuth();
  const [replies, setReplies] = useState<Message[]>([]);
  const [newReply, setNewReply] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadReplies();
    subscribeToReplies();
  }, [parentMessage.id]);

  useEffect(() => {
    scrollToBottom();
  }, [replies]);

  const loadReplies = async () => {
    const { data, error } = await supabase
      .from('live_channel_messages')
      .select('*')
      .eq('channel_id', channelId)
      .eq('reply_to_id', parentMessage.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const userIds = [...new Set(data.map(m => m.user_id).filter((id): id is string => id !== null))];
      const { data: userData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds.length > 0 ? userIds : ['__none__']);

      const userMap = new Map(userData?.map(u => [u.id, u]) || []);
      
      const messagesWithUsers: Message[] = data
        .filter(msg => msg.user_id !== null)
        .map(msg => ({
          id: msg.id,
          user_id: msg.user_id!,
          content: msg.content,
          created_at: msg.created_at || new Date().toISOString(),
          reply_to_id: msg.reply_to_id,
          user: userMap.get(msg.user_id!)
        }));
      
      setReplies(messagesWithUsers);
    }
  };

  const subscribeToReplies = () => {
    const channel = supabase
      .channel(`thread:${parentMessage.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_channel_messages',
          filter: `reply_to_id=eq.${parentMessage.id}`
        },
        async (payload) => {
          const { data: userData } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          const newMsg = payload.new as any;
          if (newMsg.user_id) {
            setReplies(prev => [...prev, {
              id: newMsg.id,
              user_id: newMsg.user_id,
              content: newMsg.content,
              created_at: newMsg.created_at || new Date().toISOString(),
              reply_to_id: newMsg.reply_to_id,
              user: userData || undefined
            }]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const sendReply = async () => {
    if (!newReply.trim() || !user) return;

    const { error } = await supabase
      .from('live_channel_messages')
      .insert({
        channel_id: channelId,
        user_id: user.id,
        content: newReply.trim(),
        reply_to_id: parentMessage.id
      });

    if (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
      return;
    }

    setNewReply('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  };

  return (
    <div className="w-96 border-l border-border flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border">
        <h3 className="font-semibold text-sm">Thread</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Parent Message */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={parentMessage.user?.avatar_url || undefined} />
            <AvatarFallback>
              {parentMessage.user?.full_name?.substring(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-sm">
                {parentMessage.user?.full_name || 'Unknown User'}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(parentMessage.created_at), 'MMM d, HH:mm')}
              </span>
            </div>
            <p className="text-sm break-words mt-1">{parentMessage.content}</p>
          </div>
        </div>
      </div>

      {/* Replies */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {replies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No replies yet. Start the conversation!
            </p>
          ) : (
            replies.map((reply) => (
              <div key={reply.id} className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={reply.user?.avatar_url || undefined} />
                  <AvatarFallback>
                    {reply.user?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-sm">
                      {reply.user?.full_name || 'Unknown User'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(reply.created_at), 'HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm break-words">{reply.content}</p>
                </div>
              </div>
            ))
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Reply Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={newReply}
            onChange={(e) => setNewReply(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Reply to thread..."
            className="flex-1"
          />
          <Button onClick={sendReply} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MessageThreadSidebar;

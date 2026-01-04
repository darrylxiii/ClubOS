import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Send, ChevronLeft, MoreVertical, Pin, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useSwipeable } from 'react-swipeable';
import MessageReactions from './MessageReactions';
import { MessageFormatter } from './MessageFormatter';
import { useHaptics } from '@/hooks/useHaptics';

interface MobileTextChannelProps {
  channelId: string;
  onBack?: () => void;
}

interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  is_pinned: boolean | null;
  user?: {
    full_name: string;
    avatar_url: string | null;
  };
}

const MobileTextChannel = ({ channelId, onBack }: MobileTextChannelProps) => {
  const { user } = useAuth();
  const { impact } = useHaptics();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [channelName, setChannelName] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadChannel();
    loadMessages();
    subscribeToMessages();
  }, [channelId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Pull-to-refresh handlers
  const swipeHandlers = useSwipeable({
    onSwipedDown: (eventData) => {
      if (scrollRef.current?.scrollTop === 0 && !isRefreshing) {
        handleRefresh();
      }
    },
    trackMouse: false,
    trackTouch: true,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    impact('medium');
    await loadMessages();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const loadChannel = async () => {
    const { data } = await supabase
      .from('live_channels')
      .select('name')
      .eq('id', channelId)
      .single();

    if (data) setChannelName(data.name);
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('live_channel_messages')
      .select('*')
      .eq('channel_id', channelId)
      .is('reply_to_id', null)
      .order('created_at', { ascending: true })
      .limit(100);

    if (!error && data) {
      const userIds = [...new Set(data.map(m => m.user_id))];
      const { data: userData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const userMap = new Map(userData?.map(u => [u.id, u]) || []);
      const messagesWithUsers = data.map(msg => ({
        ...msg,
        user: userMap.get(msg.user_id)
      }));
      
      setMessages(messagesWithUsers);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`mobile-messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_channel_messages',
          filter: `channel_id=eq.${channelId}`
        },
        () => loadMessages()
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

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    impact('light');

    const { error } = await supabase
      .from('live_channel_messages')
      .insert([{
        channel_id: channelId,
        user_id: user.id,
        content: newMessage.trim(),
        reply_to_id: replyToMessage?.id || null,
      }]);

    if (error) {
      toast.error('Failed to send message');
      return;
    }

    setNewMessage('');
    setReplyToMessage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Pull-to-refresh indicator */}
      {isRefreshing && (
        <div className="h-8 flex items-center justify-center bg-muted/50">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4" {...swipeHandlers}>
        <div className="py-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className="flex gap-3 active:bg-muted/30 rounded-lg transition-colors"
            >
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={message.user?.avatar_url || undefined} />
                <AvatarFallback>
                  {message.user?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-semibold text-sm truncate">
                    {message.user?.full_name || 'Unknown User'}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(message.created_at), 'HH:mm')}
                  </span>
                  {message.is_pinned && (
                    <Pin className="w-3 h-3 text-muted-foreground shrink-0" />
                  )}
                </div>
                <div className="text-sm break-words">
                  <MessageFormatter content={message.content} />
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <MessageReactions messageId={message.id} />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setReplyToMessage(message)}
                  >
                    <Reply className="w-3 h-3 mr-1" />
                    Reply
                  </Button>
                </div>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Reply Preview */}
      {replyToMessage && (
        <div className="px-4 py-2 border-t border-border bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Reply className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground truncate">
                Replying to {replyToMessage.user?.full_name}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyToMessage(null)}
              className="h-7 px-2"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Message Input - Keyboard Aware */}
      <div className="border-t border-border bg-card px-4 py-3 safe-area-bottom">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            className="flex-1 min-h-[44px] max-h-32 px-4 py-3 bg-background border border-border rounded-full resize-none text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            rows={1}
            style={{
              fieldSizing: 'content'
            } as any}
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            size="icon"
            className="h-11 w-11 rounded-full shrink-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MobileTextChannel;

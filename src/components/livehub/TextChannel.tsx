import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Hash, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface TextChannelProps {
  channelId: string;
}

interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    full_name: string;
    avatar_url: string | null;
  };
}

const TextChannel = ({ channelId }: TextChannelProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [channelName, setChannelName] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChannel();
    loadMessages();
    subscribeToMessages();
  }, [channelId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChannel = async () => {
    const { data, error } = await supabase
      .from('live_channels')
      .select('name')
      .eq('id', channelId)
      .single();

    if (error) {
      console.error('Error loading channel:', error);
      return;
    }

    setChannelName(data.name);
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('live_channel_messages')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (!error && data) {
      // Fetch user data separately
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
      return;
    }

    if (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_channel_messages',
          filter: `channel_id=eq.${channelId}`
        },
        async (payload) => {
          // Fetch user data for the new message
          const { data: userData } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          setMessages(prev => [...prev, {
            ...payload.new as Message,
            user: userData || undefined
          }]);
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

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    const { error } = await supabase
      .from('live_channel_messages')
      .insert({
        channel_id: channelId,
        user_id: user.id,
        content: newMessage.trim()
      });

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return;
    }

    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Channel Header */}
      <div className="h-12 px-4 flex items-center border-b border-border">
        <Hash className="w-5 h-5 text-muted-foreground mr-2" />
        <h2 className="font-semibold">{channelName}</h2>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="flex gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={message.user?.avatar_url || undefined} />
                <AvatarFallback>
                  {message.user?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-sm">
                    {message.user?.full_name || 'Unknown User'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(message.created_at), 'HH:mm')}
                  </span>
                </div>
                <p className="text-sm break-words">{message.content}</p>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Message #${channelName}`}
            className="flex-1"
          />
          <Button onClick={sendMessage} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TextChannel;

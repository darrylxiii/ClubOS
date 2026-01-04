import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';

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

interface PinnedMessagesPanelProps {
  channelId: string;
  onClose: () => void;
  onJumpToMessage?: (messageId: string) => void;
}

const PinnedMessagesPanel = ({ channelId, onClose, onJumpToMessage }: PinnedMessagesPanelProps) => {
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);

  useEffect(() => {
    loadPinnedMessages();
    subscribeToPinnedMessages();
  }, [channelId]);

  const loadPinnedMessages = async () => {
    const { data, error } = await supabase
      .from('live_channel_messages')
      .select('*')
      .eq('channel_id', channelId)
      .eq('is_pinned', true)
      .order('created_at', { ascending: false });

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
      
      setPinnedMessages(messagesWithUsers);
    }
  };

  const subscribeToPinnedMessages = () => {
    const channel = supabase
      .channel(`pinned:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_channel_messages',
          filter: `channel_id=eq.${channelId}`
        },
        () => loadPinnedMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return (
    <div className="w-80 border-l border-border flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <Pin className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Pinned Messages</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close pinned messages">
          <X className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Pinned Messages */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {pinnedMessages.length === 0 ? (
            <div className="text-center py-8">
              <Pin className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No pinned messages</p>
            </div>
          ) : (
            pinnedMessages.map((message) => (
              <div 
                key={message.id} 
                className="p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onJumpToMessage?.(message.id)}
              >
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
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
                        {format(new Date(message.created_at), 'MMM d, HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm break-words mt-1 line-clamp-3">{message.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default PinnedMessagesPanel;

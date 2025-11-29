import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, User } from 'lucide-react';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { formatDistanceToNow } from 'date-fns';

interface DirectMessageListProps {
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId?: string;
}

export function DirectMessageList({
  onSelectConversation,
  selectedConversationId,
}: DirectMessageListProps) {
  const { conversations, loading } = useDirectMessages();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
        <MessageSquare className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No direct messages yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Click on a user to start a conversation
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-1">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={`
              w-full flex items-center gap-3 p-3 rounded-lg
              hover:bg-accent transition-colors text-left
              ${selectedConversationId === conversation.id ? 'bg-accent' : ''}
            `}
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={conversation.other_participant?.avatar_url || undefined} />
              <AvatarFallback>
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium truncate">
                  {conversation.other_participant?.full_name || 'Unknown User'}
                </span>
                {conversation.last_message_at && (
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(conversation.last_message_at), {
                      addSuffix: true,
                    })}
                  </span>
                )}
              </div>
              {conversation.unread_count! > 0 && (
                <Badge variant="default" className="h-5 min-w-5 px-1.5">
                  {conversation.unread_count}
                </Badge>
              )}
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}

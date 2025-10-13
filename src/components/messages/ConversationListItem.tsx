import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { OnlineStatusIndicator } from "./OnlineStatusIndicator";

interface ConversationListItemProps {
  conversation: {
    id: string;
    title: string;
    last_message_at: string | null;
    metadata?: {
      is_group?: boolean;
      group_avatar?: string;
      participant_count?: number;
    };
    participants?: Array<{
      user_id: string;
      profile: {
        full_name: string | null;
        avatar_url: string | null;
      };
    }>;
    last_message?: {
      content: string;
      sender: {
        full_name: string | null;
      };
    };
    unread_count?: number;
  };
  isSelected: boolean;
  onClick: () => void;
}

export const ConversationListItem = ({
  conversation,
  isSelected,
  onClick,
}: ConversationListItemProps) => {
  const { user } = useAuth();
  const isGroup = conversation.metadata?.is_group;
  
  // Filter out current user to show the OTHER person in 1:1 chats
  const otherParticipant = conversation.participants?.find(
    p => p.user_id !== user?.id
  );
  
  const displayName = isGroup 
    ? conversation.title 
    : otherParticipant?.profile?.full_name || "Unknown User";
    
  const avatarUrl = isGroup 
    ? conversation.metadata?.group_avatar 
    : otherParticipant?.profile?.avatar_url;

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const lastMessagePreview = conversation.last_message?.content
    ? `${conversation.last_message.sender?.full_name || "Someone"}: ${conversation.last_message.content.slice(0, 50)}${conversation.last_message.content.length > 50 ? "..." : ""}`
    : "No messages yet";

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg cursor-pointer transition-all duration-150",
        "hover:bg-muted/50",
        isSelected && "bg-muted"
      )}
    >
      <div className="relative flex-shrink-0">
        <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
          <AvatarImage src={avatarUrl || undefined} alt={displayName} className="object-cover" />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs sm:text-base">
            {isGroup ? <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : initials}
          </AvatarFallback>
        </Avatar>
        {!isGroup && otherParticipant && (
          <div className="absolute bottom-0 right-0">
            <OnlineStatusIndicator userId={otherParticipant.user_id} className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 ring-2 ring-background" />
          </div>
        )}
        {!!conversation.unread_count && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-[10px] sm:text-xs font-bold"
          >
            {conversation.unread_count > 9 ? "9+" : conversation.unread_count}
          </Badge>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
          <h4 className="font-semibold text-xs sm:text-sm truncate">{displayName}</h4>
          {conversation.last_message_at && (
            <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
              {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true }).replace('about ', '')}
            </span>
          )}
        </div>
        
        <p className={cn(
          "text-[10px] sm:text-sm line-clamp-1",
          conversation.unread_count ? "font-medium text-foreground" : "text-muted-foreground"
        )}>
          {lastMessagePreview}
        </p>
        
        {isGroup && (
          <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5 sm:mt-1">
            <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              {conversation.metadata?.participant_count || 0} members
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

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
        "flex items-start gap-3.5 p-3.5 rounded-2xl cursor-pointer transition-all duration-200",
        "hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10 hover:scale-[1.02]",
        "border border-transparent hover:border-primary/30 hover:shadow-glass-md",
        isSelected && "bg-gradient-to-r from-primary/15 to-accent/15 border-primary/40 shadow-glass-lg scale-[1.02]"
      )}
    >
      <div className="relative flex-shrink-0">
        <Avatar className="h-12 w-12 ring-2 ring-background shadow-glass-md hover:ring-primary/60 transition-all">
          <AvatarImage src={avatarUrl || undefined} alt={displayName} className="object-cover" />
          <AvatarFallback className="bg-gradient-accent text-white font-semibold text-sm">
            {isGroup ? <Users className="h-4 w-4" /> : initials}
          </AvatarFallback>
        </Avatar>
        {!isGroup && otherParticipant && (
          <div className="absolute bottom-0 right-0">
            <OnlineStatusIndicator userId={otherParticipant.user_id} className="w-4 h-4" />
          </div>
        )}
        {!!conversation.unread_count && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center p-0 text-xs font-bold shadow-glow animate-pulse"
          >
            {conversation.unread_count > 9 ? "9+" : conversation.unread_count}
          </Badge>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <h4 className="font-bold text-sm truncate text-foreground">{displayName}</h4>
          {conversation.last_message_at && (
            <span className="text-xs font-medium text-muted-foreground/80 whitespace-nowrap">
              {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
            </span>
          )}
        </div>
        
        <p className={cn(
          "text-xs line-clamp-2 font-medium",
          conversation.unread_count ? "text-foreground/90" : "text-muted-foreground/80"
        )}>
          {lastMessagePreview}
        </p>
        
        {isGroup && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <Users className="h-3 w-3 text-muted-foreground/70" />
            <span className="text-xs font-medium text-muted-foreground/70">
              {conversation.metadata?.participant_count || 0} members
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

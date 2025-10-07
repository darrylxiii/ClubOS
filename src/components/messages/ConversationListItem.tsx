import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const isGroup = conversation.metadata?.is_group;
  const participant = conversation.participants?.[0];
  
  const displayName = isGroup 
    ? conversation.title 
    : participant?.profile?.full_name || "Unknown User";
    
  const avatarUrl = isGroup 
    ? conversation.metadata?.group_avatar 
    : participant?.profile?.avatar_url;

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
        "flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all hover:bg-accent/50",
        "border border-transparent hover:border-primary/20",
        isSelected && "bg-accent border-primary/30 shadow-sm"
      )}
    >
      <div className="relative flex-shrink-0">
        <Avatar className="h-12 w-12 ring-2 ring-background">
          <AvatarImage src={avatarUrl || undefined} alt={displayName} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {isGroup ? <Users className="h-5 w-5" /> : initials}
          </AvatarFallback>
        </Avatar>
        {!!conversation.unread_count && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {conversation.unread_count > 9 ? "9+" : conversation.unread_count}
          </Badge>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h4 className="font-medium text-sm truncate">{displayName}</h4>
          {conversation.last_message_at && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
            </span>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground line-clamp-2">
          {lastMessagePreview}
        </p>
        
        {isGroup && (
          <div className="flex items-center gap-1 mt-1">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {conversation.metadata?.participant_count || 0} members
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

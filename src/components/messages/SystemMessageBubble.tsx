import { Message } from "@/hooks/useMessages";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Video, Phone, UserPlus, UserMinus, Calendar, Clock } from "lucide-react";

interface SystemMessageBubbleProps {
  message: Message;
}

const getSystemMessageIcon = (type?: string, metadata?: any) => {
  switch (type) {
    case 'meeting_created':
    case 'meeting_scheduled':
    case 'meeting_started':
    case 'meeting_ended':
      return <Calendar className="h-4 w-4" />;
    case 'call_started':
    case 'call_ended':
    case 'call_missed': {
      const callType = metadata?.call_type;
      return callType === 'video' ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />;
    }
    case 'participant_joined':
      return <UserPlus className="h-4 w-4" />;
    case 'participant_left':
      return <UserMinus className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

export const SystemMessageBubble = ({ message }: SystemMessageBubbleProps) => {
  const icon = getSystemMessageIcon(message.metadata?.system_message_type, message.metadata);
  
  return (
    <div className="flex items-center justify-center py-3 px-4">
      <div className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full",
        "bg-muted text-muted-foreground text-sm",
        "max-w-md text-center"
      )}>
        <span className="shrink-0">{icon}</span>
        <span>{message.content}</span>
        <span className="text-xs opacity-60">
          {format(new Date(message.created_at), 'h:mm a')}
        </span>
      </div>
    </div>
  );
};

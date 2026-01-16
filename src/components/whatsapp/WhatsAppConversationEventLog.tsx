import { formatDistanceToNow } from 'date-fns';
import { 
  MessageSquare, 
  FileText, 
  UserPlus, 
  Tag, 
  Shield, 
  Phone,
  Send,
  Bot,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useWhatsAppConversationEvents, ConversationEvent } from '@/hooks/useWhatsAppConversationEvents';
import { cn } from '@/lib/utils';

interface Props {
  conversationId: string | null;
  maxHeight?: string;
}

const eventConfig: Record<string, { icon: typeof MessageSquare; label: string; color: string }> = {
  message_sent: { icon: Send, label: 'Message sent', color: 'text-blue-500' },
  message_received: { icon: MessageSquare, label: 'Message received', color: 'text-green-500' },
  template_sent: { icon: FileText, label: 'Template sent', color: 'text-purple-500' },
  assigned: { icon: UserPlus, label: 'Assigned', color: 'text-amber-500' },
  tagged: { icon: Tag, label: 'Tag added', color: 'text-cyan-500' },
  consent_granted: { icon: Shield, label: 'Consent granted', color: 'text-green-600' },
  consent_revoked: { icon: Shield, label: 'Consent revoked', color: 'text-red-500' },
  call_scheduled: { icon: Phone, label: 'Call scheduled', color: 'text-indigo-500' },
  ai_response: { icon: Bot, label: 'AI response', color: 'text-violet-500' },
  window_expired: { icon: Clock, label: 'Window expired', color: 'text-muted-foreground' },
};

export function WhatsAppConversationEventLog({ conversationId, maxHeight = '300px' }: Props) {
  const { events, loading } = useWhatsAppConversationEvents(conversationId);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!conversationId) {
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-2 p-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No events recorded yet</p>
      </div>
    );
  }

  const displayEvents = isExpanded ? events : events.slice(0, 5);

  return (
    <div className="border rounded-lg bg-card">
      <div className="p-3 border-b flex items-center justify-between">
        <h4 className="text-sm font-medium">Activity Log</h4>
        <span className="text-xs text-muted-foreground">{events.length} events</span>
      </div>
      
      <ScrollArea style={{ maxHeight }} className={cn(!isExpanded && 'max-h-[200px]')}>
        <div className="p-3 space-y-3">
          {displayEvents.map((event) => (
            <EventItem key={event.id} event={event} />
          ))}
        </div>
      </ScrollArea>
      
      {events.length > 5 && (
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs h-7"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 mr-1" />
                Show {events.length - 5} more
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function EventItem({ event }: { event: ConversationEvent }) {
  const config = eventConfig[event.event_type] || {
    icon: Clock,
    label: event.event_type.replace(/_/g, ' '),
    color: 'text-muted-foreground',
  };
  
  const Icon = config.icon;
  const eventData = event.event_data as Record<string, unknown>;

  return (
    <div className="flex items-start gap-3 text-sm">
      <div className={cn('p-1.5 rounded-full bg-muted shrink-0', config.color)}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-xs">
          {config.label}
          {(eventData as Record<string, unknown>)?.template_name && (
            <span className="text-muted-foreground font-normal ml-1">
              &quot;{String((eventData as Record<string, unknown>).template_name)}&quot;
            </span>
          )}
          {(eventData as Record<string, unknown>)?.tag && (
            <span className="text-muted-foreground font-normal ml-1">
              &quot;{String((eventData as Record<string, unknown>).tag)}&quot;
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

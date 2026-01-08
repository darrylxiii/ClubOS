import { useMemo } from 'react';
import { differenceInMinutes, differenceInHours, formatDistanceToNow } from 'date-fns';
import { 
  Clock, 
  MessageSquare, 
  AlertTriangle, 
  TrendingUp,
  ChevronRight,
  Zap,
  Users,
  Timer
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { WhatsAppConversation } from '@/hooks/useWhatsAppConversations';
import { cn } from '@/lib/utils';

interface Props {
  conversations: WhatsAppConversation[];
  needsResponse?: WhatsAppConversation[];
  loading?: boolean;
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId?: string | null;
  onClose?: () => void;
}

interface SlaStatus {
  level: 'critical' | 'overdue' | 'warning' | 'ok';
  label: string;
  color: string;
  bgColor: string;
  waitMinutes: number;
}

function getSlaStatus(lastMessageAt: string | null, direction: string | null): SlaStatus | null {
  if (!lastMessageAt || direction !== 'inbound') return null;
  
  const waitMinutes = differenceInMinutes(new Date(), new Date(lastMessageAt));
  
  if (waitMinutes > 240) {
    return { 
      level: 'critical', 
      label: `${Math.floor(waitMinutes / 60)}h overdue`, 
      color: 'text-red-600',
      bgColor: 'bg-red-500/10 border-red-500/30',
      waitMinutes 
    };
  }
  if (waitMinutes > 120) {
    return { 
      level: 'overdue', 
      label: `${Math.floor(waitMinutes / 60)}h waiting`, 
      color: 'text-red-500',
      bgColor: 'bg-red-500/10 border-red-500/20',
      waitMinutes 
    };
  }
  if (waitMinutes > 60) {
    return { 
      level: 'warning', 
      label: `${waitMinutes}m`, 
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
      waitMinutes 
    };
  }
  if (waitMinutes > 30) {
    return { 
      level: 'ok', 
      label: `${waitMinutes}m`, 
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10 border-yellow-500/20',
      waitMinutes 
    };
  }
  
  return null;
}

export function WhatsAppOpsPanel({ 
  conversations, 
  needsResponse: needsResponseProp,
  loading = false, 
  onSelectConversation,
  selectedConversationId,
  onClose
}: Props) {
  // Use provided needsResponse or compute it
  const needsResponseQueue = useMemo(() => {
    if (needsResponseProp) {
      return needsResponseProp.map(c => ({
        ...c,
        sla: getSlaStatus(c.last_message_at, c.last_message_direction),
      })).filter(c => c.sla);
    }
    
    return conversations
      .filter(c => c.last_message_direction === 'inbound' && (c.unread_count || 0) > 0)
      .map(c => ({
        ...c,
        sla: getSlaStatus(c.last_message_at, c.last_message_direction),
      }))
      .filter(c => c.sla)
      .sort((a, b) => (b.sla?.waitMinutes || 0) - (a.sla?.waitMinutes || 0));
  }, [conversations, needsResponseProp]);

  // Compute stats
  const stats = useMemo(() => {
    const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
    const criticalCount = needsResponseQueue.filter(c => c.sla?.level === 'critical').length;
    const expiringSoon = conversations.filter(c => {
      if (!c.messaging_window_expires_at) return false;
      const hoursUntilExpiry = differenceInHours(new Date(c.messaging_window_expires_at), new Date());
      return hoursUntilExpiry > 0 && hoursUntilExpiry <= 4;
    }).length;

    return { totalUnread, needsResponse: needsResponseQueue.length, criticalCount, expiringSoon };
  }, [conversations, needsResponseQueue]);

  // Find highest priority action
  const topPriority = needsResponseQueue[0];

  if (loading) {
    return (
      <div className="w-80 border-l bg-card/50 flex flex-col">
        <div className="p-4 border-b">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-l bg-card/50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Ops Triage</h3>
        </div>
        <p className="text-xs text-muted-foreground">Prioritized response queue</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 p-3 border-b shrink-0">
        <div className="text-center p-2 rounded bg-muted/50">
          <p className="text-lg font-bold">{stats.totalUnread}</p>
          <p className="text-[10px] text-muted-foreground">Unread</p>
        </div>
        <div className="text-center p-2 rounded bg-muted/50">
          <p className="text-lg font-bold text-amber-500">{stats.needsResponse}</p>
          <p className="text-[10px] text-muted-foreground">Awaiting</p>
        </div>
        <div className="text-center p-2 rounded bg-muted/50">
          <p className="text-lg font-bold text-red-500">{stats.criticalCount}</p>
          <p className="text-[10px] text-muted-foreground">Critical</p>
        </div>
      </div>

      {/* Top Priority NBA */}
      {topPriority && (
        <div className="p-3 border-b shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <TrendingUp className="w-3 h-3" />
            <span>Next Best Action</span>
          </div>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start gap-3 h-auto py-3",
              topPriority.sla?.level === 'critical' && "border-red-500/50 bg-red-500/5"
            )}
            onClick={() => onSelectConversation(topPriority.id)}
          >
            <div className="relative">
              <Avatar className="h-8 w-8">
                <AvatarImage src={topPriority.profile_picture_url || undefined} />
                <AvatarFallback className="text-xs">
                  {topPriority.candidate_name?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              {topPriority.sla?.level === 'critical' && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-medium text-sm truncate">
                Reply to {topPriority.candidate_name || 'Contact'}
              </p>
              <p className={cn("text-xs", topPriority.sla?.color)}>
                {topPriority.sla?.label} waiting
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      )}

      {/* Response Queue */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="px-3 py-2 flex items-center justify-between shrink-0">
          <span className="text-xs font-medium text-muted-foreground">Response Queue</span>
          <Badge variant="outline" className="text-[10px] h-5">
            {needsResponseQueue.length}
          </Badge>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {needsResponseQueue.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">All caught up!</p>
              </div>
            ) : (
              needsResponseQueue.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors",
                    "hover:bg-muted/80",
                    selectedConversationId === conversation.id && "bg-muted",
                    conversation.sla?.level === 'critical' && "border",
                    conversation.sla?.bgColor
                  )}
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={conversation.profile_picture_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {conversation.candidate_name?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm truncate">
                        {conversation.candidate_name || conversation.candidate_phone}
                      </p>
                      {conversation.sla && (
                        <Badge 
                          variant="outline" 
                          className={cn("text-[10px] h-5 shrink-0", conversation.sla.color)}
                        >
                          <Timer className="w-2.5 h-2.5 mr-1" />
                          {conversation.sla.label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {conversation.last_message_preview}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Expiring Windows */}
      {stats.expiringSoon > 0 && (
        <div className="p-3 border-t shrink-0 bg-amber-500/5">
          <div className="flex items-center gap-2 text-xs text-amber-600">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{stats.expiringSoon} messaging window{stats.expiringSoon !== 1 ? 's' : ''} expiring soon</span>
          </div>
        </div>
      )}
    </div>
  );
}

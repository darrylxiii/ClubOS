import { useState, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
// import { ScrollArea } from "@/components/ui/scroll-area"; // Removed for virtual list
import { Skeleton } from "@/components/ui/skeleton";
import { WhatsAppConsentBadge } from "@/components/whatsapp/WhatsAppConsentBadge";
import {
  Search,
  Pin,
  Clock,
  MessageSquare,
  User,
  Flame,
  HelpCircle,
  Calendar,
  AlertTriangle,
  X,
  Timer
} from "lucide-react";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import type { WhatsAppConversation, SlaStatus } from "@/hooks/useWhatsAppConversations";

interface WhatsAppConversationListProps {
  conversations: WhatsAppConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
  sortBySla?: boolean;
}

type FilterType = 'all' | 'unread' | 'needs_response' | 'hot_leads' | 'expiring';

export function WhatsAppConversationList({
  conversations,
  selectedId,
  onSelect,
  loading,
  sortBySla = false
}: WhatsAppConversationListProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>('all');

  const getSlaLevelColor = (slaStatus: SlaStatus | null | undefined) => {
    if (!slaStatus) return '';
    switch (slaStatus.level) {
      case 'critical': return 'border-l-red-600';
      case 'overdue': return 'border-l-red-500';
      case 'warning': return 'border-l-amber-500';
      case 'attention': return 'border-l-yellow-500';
      default: return '';
    }
  };

  const getIntentIcon = (tags: string[]) => {
    if (tags.includes('interested') || tags.includes('hot')) return <Flame className="w-3.5 h-3.5 text-orange-400" />;
    if (tags.includes('question')) return <HelpCircle className="w-3.5 h-3.5 text-blue-400" />;
    if (tags.includes('reschedule')) return <Calendar className="w-3.5 h-3.5 text-amber-400" />;
    if (tags.includes('objection')) return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
    return null;
  };

  const getWindowStatus = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const hoursLeft = differenceInHours(new Date(expiresAt), new Date());
    if (hoursLeft <= 0) return { status: 'expired', color: 'bg-red-500', label: 'Expired' };
    if (hoursLeft <= 4) return { status: 'urgent', color: 'bg-amber-500', label: `${hoursLeft}h left` };
    if (hoursLeft <= 12) return { status: 'warning', color: 'bg-yellow-500', label: `${hoursLeft}h left` };
    return { status: 'ok', color: 'bg-emerald-500', label: `${hoursLeft}h` };
  };

  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(c =>
        c.candidate_name?.toLowerCase().includes(searchLower) ||
        c.candidate_phone.includes(search) ||
        c.last_message_preview?.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    switch (filter) {
      case 'unread':
        filtered = filtered.filter(c => c.unread_count > 0);
        break;
      case 'needs_response':
        filtered = filtered.filter(c => c.last_message_direction === 'inbound');
        break;
      case 'hot_leads':
        filtered = filtered.filter(c => c.tags.some(t => ['interested', 'hot', 'positive'].includes(t)));
        break;
      case 'expiring':
        filtered = filtered.filter(c => {
          if (!c.messaging_window_expires_at) return false;
          const hoursLeft = differenceInHours(new Date(c.messaging_window_expires_at), new Date());
          return hoursLeft > 0 && hoursLeft <= 12;
        });
        break;
    }

    // Sort: pinned first, then by SLA urgency or last message
    return filtered.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;

      // Sort by SLA urgency if enabled
      if (sortBySla) {
        const aWait = a.slaStatus?.waitMinutes || 0;
        const bWait = b.slaStatus?.waitMinutes || 0;
        if (aWait !== bWait) return bWait - aWait;
      }

      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [conversations, search, filter, sortBySla]);

  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: filteredConversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 92, // Approximate height of a conversation item
    overscan: 5,
  });

  const filterButtons: { key: FilterType; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { key: 'unread', label: 'Unread', icon: <Badge variant="secondary" className="w-4 h-4 p-0 flex items-center justify-center text-[10px]">!</Badge> },
    { key: 'needs_response', label: 'Needs Response', icon: <Clock className="w-3.5 h-3.5" /> },
    { key: 'hot_leads', label: 'Hot', icon: <Flame className="w-3.5 h-3.5" /> },
    { key: 'expiring', label: 'Expiring', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  ];

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 space-y-3">
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-20" />)}
          </div>
        </div>
        <div className="flex-1 p-4 space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* import useVirtualizer and useRef at top - doing it in separate chunk or assuming imports exist if possible? No I need to import them. */
  // I will assume I can update imports in one go.

  /* 
     Wait, I need to know where imports are.
     Lines 1-27 are imports.
     Lines 38 starts component.
     
     I will do a multi-replace.
  */

  return (
    <div className="min-h-[600px] h-full flex flex-col bg-card/50">
      {/* Search & Filters */}
      <div className="p-4 space-y-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-background/50"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearch("")}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {filterButtons.map(btn => (
            <Button
              key={btn.key}
              variant={filter === btn.key ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-8 text-xs whitespace-nowrap gap-1.5",
                filter === btn.key && "bg-[#25d366] hover:bg-[#25d366]/90 text-white border-[#25d366]"
              )}
              onClick={() => setFilter(btn.key)}
            >
              {btn.icon}
              {btn.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Virtual Conversation List */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto bg-background/50"
      >
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center h-full flex flex-col items-center justify-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#25d366]/20 to-[#128c7e]/20 flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-[#25d366]" />
            </div>
            <p className="font-semibold text-foreground mb-1">No conversations yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              {filter !== 'all' ? 'Try adjusting your filters' : 'Import chats or wait for incoming messages'}
            </p>
            {filter !== 'all' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilter('all')}
                className="text-xs"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const conversation = filteredConversations[virtualRow.index];
              const windowStatus = getWindowStatus(conversation.messaging_window_expires_at);
              const isSelected = selectedId === conversation.id;

              return (
                <div
                  key={conversation.id}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  onClick={() => onSelect(conversation.id)}
                  className={cn(
                    "flex items-center gap-3 p-4 cursor-pointer border-b border-border/50 transition-all border-l-2",
                    isSelected
                      ? "bg-[#25d366]/10 border-l-[#25d366]"
                      : conversation.slaStatus
                        ? getSlaLevelColor(conversation.slaStatus)
                        : "border-l-transparent hover:bg-muted/50"
                  )}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-12 h-12 border-2 border-background">
                      <AvatarImage src={conversation.profile_picture_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-[#25d366] to-[#128c7e] text-white">
                        {conversation.candidate_name?.[0] || <User className="w-5 h-5" />}
                      </AvatarFallback>
                    </Avatar>
                    {conversation.is_pinned && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                        <Pin className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-foreground truncate">
                          {conversation.candidate_name || conversation.candidate_phone}
                        </span>
                        {getIntentIcon(conversation.tags)}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                        {conversation.last_message_at
                          ? formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: false })
                          : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm text-muted-foreground truncate flex-1">
                        {conversation.last_message_direction === 'outbound' && (
                          <span className="text-muted-foreground/70">You: </span>
                        )}
                        {conversation.last_message_preview || 'No messages yet'}
                      </p>
                    </div>

                    {/* Tags, SLA & Status */}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <WhatsAppConsentBadge phoneNumber={conversation.candidate_phone} size="sm" />

                      {conversation.unread_count > 0 && (
                        <Badge className="bg-[#25d366] text-white h-5 min-w-[20px] px-1.5 text-xs">
                          {conversation.unread_count}
                        </Badge>
                      )}

                      {conversation.slaStatus && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-5 text-xs",
                            conversation.slaStatus.level === 'critical' && "border-red-600 text-red-600 bg-red-600/10",
                            conversation.slaStatus.level === 'overdue' && "border-red-500 text-red-500 bg-red-500/10",
                            conversation.slaStatus.level === 'warning' && "border-amber-500 text-amber-500 bg-amber-500/10",
                            conversation.slaStatus.level === 'attention' && "border-yellow-500 text-yellow-500"
                          )}
                        >
                          <Timer className="w-3 h-3 mr-1" />
                          {conversation.slaStatus.label}
                        </Badge>
                      )}
                      {windowStatus && windowStatus.status !== 'ok' && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-5 text-xs",
                            windowStatus.status === 'expired' && "border-red-500 text-red-500",
                            windowStatus.status === 'urgent' && "border-amber-500 text-amber-500",
                            windowStatus.status === 'warning' && "border-yellow-500 text-yellow-500"
                          )}
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          {windowStatus.label}
                        </Badge>
                      )}
                      {conversation.tags.slice(0, 2).map(tag => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="h-5 text-xs bg-muted/50"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

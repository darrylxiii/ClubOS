import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  Filter, 
  Pin, 
  Clock, 
  MessageSquare, 
  User,
  Flame,
  HelpCircle,
  Calendar,
  AlertTriangle,
  X
} from "lucide-react";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import type { WhatsAppConversation } from "@/hooks/useWhatsAppConversations";

interface WhatsAppConversationListProps {
  conversations: WhatsAppConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
}

type FilterType = 'all' | 'unread' | 'needs_response' | 'hot_leads' | 'expiring';

export function WhatsAppConversationList({ 
  conversations, 
  selectedId, 
  onSelect,
  loading 
}: WhatsAppConversationListProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>('all');

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
    
    // Sort: pinned first, then by last message
    return filtered.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [conversations, search, filter]);

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

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <AnimatePresence mode="popLayout">
          {filteredConversations.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-8 text-center"
            >
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
            </motion.div>
          ) : (
            filteredConversations.map((conversation, index) => {
              const windowStatus = getWindowStatus(conversation.messaging_window_expires_at);
              const isSelected = selectedId === conversation.id;
              
              return (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => onSelect(conversation.id)}
                  className={cn(
                    "flex items-center gap-3 p-4 cursor-pointer border-b border-border/50 transition-all",
                    isSelected 
                      ? "bg-[#25d366]/10 border-l-2 border-l-[#25d366]" 
                      : "hover:bg-muted/50"
                  )}
                >
                  {/* Avatar */}
                  <div className="relative">
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
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
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

                    {/* Tags & Status */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {conversation.unread_count > 0 && (
                        <Badge className="bg-[#25d366] text-white h-5 min-w-[20px] px-1.5 text-xs">
                          {conversation.unread_count}
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
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
}
